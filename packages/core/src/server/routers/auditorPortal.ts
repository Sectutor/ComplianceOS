import { z } from "zod";
import { createAuditorSession, getAuditorDashboard, revokeAuditorSession, getActiveSessions } from "../../lib/auditor-portal";
import { getDb } from "../../db";
import { auditorSessions, auditorComments } from "../../schema_auditor";
import { eq, and, desc } from "drizzle-orm";

export const createAuditorPortalRouter = (t: any, clientProcedure: any, adminProcedure: any, publicProcedure: any) => {
  return t.router({
    createSession: adminProcedure
      .input(z.object({
        clientId: z.number(),
        expiresInHours: z.number().min(1).max(720).default(168),
        scope: z.string().optional(),
        auditorEmail: z.string().email().optional(),
        auditorName: z.string().optional(),
      }))
      .mutation(async ({ input }) => createAuditorSession(input.clientId, {
        expiresInHours: input.expiresInHours,
        scope: input.scope,
        auditorEmail: input.auditorEmail,
        auditorName: input.auditorName,
      })),

    getActiveSessions: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => getActiveSessions(input.clientId)),

    revokeSession: adminProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => revokeAuditorSession(input.token)),

    getDashboard: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => getAuditorDashboard(input.token)),

    addComment: publicProcedure
      .input(z.object({ token: z.string(), controlId: z.number().optional(), evidenceId: z.number().optional(), comment: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const session = await db.query.auditorSessions.findFirst({
          where: and(eq(auditorSessions.token, input.token), eq(auditorSessions.isRevoked, false)),
        });
        if (!session || session.expiresAt < new Date()) throw new Error("Invalid or expired session");
        const [result] = await db.insert(auditorComments).values({
          sessionId: session.id,
          controlId: input.controlId ?? null,
          evidenceId: input.evidenceId ?? null,
          comment: input.comment,
          createdAt: new Date(),
        }).returning();
        return result;
      }),

    getComments: publicProcedure
      .input(z.object({ token: z.string(), controlId: z.number().optional(), evidenceId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const session = await db.query.auditorSessions.findFirst({
          where: and(eq(auditorSessions.token, input.token), eq(auditorSessions.isRevoked, false)),
        });
        if (!session) throw new Error("Invalid session");
        const conditions = [eq(auditorComments.sessionId, session.id)];
        if (input.controlId) conditions.push(eq(auditorComments.controlId, input.controlId));
        if (input.evidenceId) conditions.push(eq(auditorComments.evidenceId, input.evidenceId));
        return db.select().from(auditorComments)
          .where(and(...conditions))
          .orderBy(desc(auditorComments.createdAt));
      }),
  });
};
