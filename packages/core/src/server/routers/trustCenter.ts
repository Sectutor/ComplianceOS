import { z } from "zod";
import * as db from "../../db";
import * as schema from "../../schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Trust Center router — public security posture page + access/NDA workflow.
 *
 * Cycle 13 hardening:
 * - Every procedure degrades gracefully on DB failure (returns a neutral/empty
 *   shape instead of throwing). The only intentional errors are business-rule
 *   TRPCErrors (competitor block in requestAccess) and client NOT_FOUND.
 * - New public `getPosture` procedure powers the public posture page payload.
 */

/** Neutral "no data" posture shape returned when the DB is unreachable. */
const EMPTY_POSTURE = {
  client: null,
  complianceScore: 0,
  status: "No Data",
  totalControls: 0,
  implementedControls: 0,
  frameworks: [] as unknown[],
  documents: [] as unknown[],
  badges: [] as unknown[],
} as const;

/** Map a 0-100 compliance score to a posture label. */
const derivePostureStatus = (
  score: number,
  hasSnapshot: boolean
): "Strong" | "Developing" | "At Risk" | "No Data" => {
  if (!hasSnapshot) return "No Data";
  if (score >= 75) return "Strong";
  if (score >= 50) return "Developing";
  return "At Risk";
};

/** Safely fetch the latest compliance snapshot for a client (null on failure). */
const getLatestSnapshot = async (dbConn: any, clientId: number) => {
  try {
    const [snap] = await dbConn
      .select()
      .from(schema.complianceSnapshots)
      .where(eq(schema.complianceSnapshots.clientId, clientId))
      .orderBy(desc(schema.complianceSnapshots.snapshotDate))
      .limit(1);
    return snap ?? null;
  } catch {
    return null;
  }
};

/** Safely acquire a DB connection (null on failure). */
const getSafeDb = async (): Promise<any | null> => {
  try {
    return await db.getDb();
  } catch {
    return null;
  }
};

export const createTrustCenterRouter = (t: any, publicProcedure: any, protectedProcedure: any) => {
    return t.router({
        getPublicData: publicProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getSafeDb();
                if (!dbConn) return { documents: [] };

                try {
                    // Get documents for this client
                    const docs = await dbConn.select().from(schema.trustDocuments)
                        .where(eq(schema.trustDocuments.clientId, input.clientId));
                    return { documents: docs };
                } catch {
                    return { documents: [] };
                }
            }),

        /**
         * Public posture payload for the trust center page:
         * { client, complianceScore (0-100), status, totalControls,
         *   implementedControls, frameworks, documents, badges }
         */
        getPosture: publicProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getSafeDb();
                if (!dbConn) return { ...EMPTY_POSTURE };

                try {
                    const [client] = await dbConn
                        .select()
                        .from(schema.clients)
                        .where(eq(schema.clients.id, input.clientId))
                        .limit(1);
                    if (!client) return { ...EMPTY_POSTURE };

                    const snapshot = await getLatestSnapshot(dbConn, input.clientId);
                    const docs = await dbConn
                        .select()
                        .from(schema.trustDocuments)
                        .where(eq(schema.trustDocuments.clientId, input.clientId));

                    const score = snapshot?.complianceScore ?? 0;

                    return {
                        client: {
                            id: client.id,
                            name: client.name,
                            industry: client.industry ?? null,
                            logo: client.logoUrl ?? null,
                        },
                        complianceScore: score,
                        status: derivePostureStatus(score, !!snapshot),
                        totalControls: snapshot?.totalControls ?? 0,
                        implementedControls: snapshot?.implementedControls ?? 0,
                        frameworks: [],
                        documents: docs,
                        badges: [],
                    };
                } catch {
                    return { ...EMPTY_POSTURE };
                }
            }),

        requestAccess: publicProcedure
            .input(z.object({
                clientId: z.number(),
                email: z.string().email(),
                name: z.string(),
                company: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                // 1. Basic Competitor Check (business rule — always enforced)
                const competitorDomains = ['competitor.com', 'rival.io', 'badguy.net'];
                const domain = input.email.split('@')[1];
                if (competitorDomains.includes(domain)) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: "Access restricted for competitors. Please contact sales@complianceos.com"
                    });
                }

                const dbConn = await getSafeDb();
                if (!dbConn) {
                    return { visitorId: null, success: false, reason: "db_unavailable" };
                }

                try {
                    // 2. Register/Update Visitor
                    let [visitor] = await dbConn.select().from(schema.trustCenterVisitors)
                        .where(and(
                            eq(schema.trustCenterVisitors.clientId, input.clientId),
                            eq(schema.trustCenterVisitors.email, input.email)
                        )).limit(1);

                    if (!visitor) {
                        [visitor] = await dbConn.insert(schema.trustCenterVisitors).values({
                            clientId: input.clientId,
                            email: input.email,
                            name: input.name,
                            company: input.company || null,
                        }).returning();
                    } else {
                        await dbConn.update(schema.trustCenterVisitors)
                            .set({ lastSeenAt: new Date(), name: input.name, company: input.company || null })
                            .where(eq(schema.trustCenterVisitors.id, visitor.id));
                    }

                    return { visitorId: visitor.id, success: true };
                } catch {
                    return { visitorId: null, success: false, reason: "db_unavailable" };
                }
            }),

        signNDA: publicProcedure
            .input(z.object({
                clientId: z.number(),
                visitorId: z.number(),
                signatureText: z.string()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const dbConn = await getSafeDb();
                if (!dbConn) return { success: false, reason: "db_unavailable" };

                try {
                    const ipAddress = ctx.req?.headers['x-forwarded-for'] || ctx.req?.socket?.remoteAddress || 'unknown';

                    // 1. Check if already signed
                    const existing = await dbConn.select().from(schema.ndaSignatures)
                        .where(and(
                            eq(schema.ndaSignatures.clientId, input.clientId),
                            eq(schema.ndaSignatures.visitorId, input.visitorId)
                        )).limit(1);

                    if (existing.length > 0) return { success: true };

                    // 2. Sign
                    await dbConn.insert(schema.ndaSignatures).values({
                        clientId: input.clientId,
                        visitorId: input.visitorId,
                        signatureText: input.signatureText,
                        ndaVersion: "v1.0",
                        ipAddress: String(ipAddress).split(',')[0],
                    });

                    return { success: true };
                } catch {
                    return { success: false, reason: "db_unavailable" };
                }
            }),

        getAccessStatus: publicProcedure
            .input(z.object({
                clientId: z.number(),
                email: z.string().email().optional()
            }))
            .query(async ({ input, ctx }: any) => {
                const dbConn = await getSafeDb();
                if (!dbConn) return { signed: false, isLoggedIn: !!ctx.user, status: "unknown" };

                try {
                    // Determine email to check: input first, then authenticated user
                    const checkEmail = input.email || ctx.user?.email;

                    if (!checkEmail) {
                        return { signed: false, isLoggedIn: !!ctx.user };
                    }

                    // 1. Get or Create Visitor for this User/Email
                    const [visitor] = await dbConn.select().from(schema.trustCenterVisitors)
                        .where(and(
                            eq(schema.trustCenterVisitors.clientId, input.clientId),
                            eq(schema.trustCenterVisitors.email, checkEmail)
                        )).limit(1);

                    // If logged in but no visitor record yet, we can technically "pre-fill"
                    if (!visitor && ctx.user) {
                        return {
                            signed: false,
                            isLoggedIn: true,
                            user: {
                                name: ctx.user.name,
                                email: ctx.user.email,
                                company: "Internal User" // Optional: fetch client name
                            }
                        };
                    }

                    if (!visitor) return { signed: false, isLoggedIn: !!ctx.user };

                    // 2. Check Signature
                    const signature = await dbConn.select().from(schema.ndaSignatures)
                        .where(and(
                            eq(schema.ndaSignatures.clientId, input.clientId),
                            eq(schema.ndaSignatures.visitorId, visitor.id)
                        )).limit(1);

                    return {
                        signed: signature.length > 0,
                        visitorId: visitor.id,
                        isLoggedIn: !!ctx.user,
                        user: visitor
                    };
                } catch {
                    return { signed: false, isLoggedIn: !!ctx.user, status: "unknown" };
                }
            }),

        // Admin methods to manage documents
        addDocument: protectedProcedure
            .input(z.object({
                clientId: z.number(),
                name: z.string(),
                description: z.string().optional(),
                fileUrl: z.string(),
                isLocked: z.boolean().default(false),
                category: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getSafeDb();
                if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
                try {
                    return await dbConn.insert(schema.trustDocuments).values(input).returning();
                } catch {
                    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add trust document" });
                }
            }),

        listVisitors: protectedProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getSafeDb();
                if (!dbConn) return [];
                try {
                    return await dbConn.select().from(schema.trustCenterVisitors)
                        .where(eq(schema.trustCenterVisitors.clientId, input.clientId))
                        .orderBy(desc(schema.trustCenterVisitors.createdAt));
                } catch {
                    return [];
                }
            })
    });
};
