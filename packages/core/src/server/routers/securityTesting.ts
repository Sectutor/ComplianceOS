import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "../../schema";
import { securityTests, securityTestFindings } from "../../schema";
import { logActivity } from "../../lib/audit";

export const createSecurityTestingRouter = (t: any, procedure: any, editorProcedure: any) => {
  return t.router({
    getTests: procedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        const { getDb } = await import("../../db");
        const db = await getDb();
        return db.select()
          .from(securityTests)
          .where(eq(securityTests.clientId, input.clientId))
          .orderBy(desc(securityTests.scheduledDate));
      }),

    getTestDetails: procedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }: any) => {
        const { getDb } = await import("../../db");
        const db = await getDb();
        const [test] = await db.select().from(securityTests).where(eq(securityTests.id, input.id));
        if (!test) throw new TRPCError({ code: "NOT_FOUND", message: "Test not found" });

        const findings = await db.select()
          .from(securityTestFindings)
          .where(eq(securityTestFindings.testId, input.id));

        return { ...test, findings };
      }),

    scheduleTest: editorProcedure
      .input(z.object({
        clientId: z.number(),
        title: z.string(),
        type: z.string(),
        frequency: z.string().optional(),
        scheduledDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const { getDb } = await import("../../db");
        const db = await getDb();
        const [test] = await db.insert(securityTests).values({
          clientId: input.clientId,
          title: input.title,
          type: input.type,
          frequency: input.frequency,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
          notes: input.notes,
          status: "scheduled",
        }).returning();

        await logActivity({
          userId: ctx.user.id,
          clientId: input.clientId,
          action: "create",
          entityType: "security_test",
          entityId: test.id,
          details: { title: test.title, type: test.type }
        });

        return test;
      }),

    updateTestStatus: editorProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
        completionDate: z.string().optional(),
        reportUrl: z.string().optional(),
      }))
      .mutation(async ({ input }: any) => {
        const { getDb } = await import("../../db");
        const db = await getDb();
        const [updated] = await db.update(securityTests)
          .set({
            status: input.status,
            completionDate: input.completionDate ? new Date(input.completionDate) : null,
            reportUrl: input.reportUrl,
            updatedAt: new Date(),
          })
          .where(eq(securityTests.id, input.id))
          .returning();
        return updated;
      }),

    addFinding: editorProcedure
      .input(z.object({
        clientId: z.number(),
        testId: z.number(),
        title: z.string(),
        severity: z.string(),
        description: z.string().optional(),
        targetAssetId: z.number().optional(),
      }))
      .mutation(async ({ input }: any) => {
        const { getDb } = await import("../../db");
        const db = await getDb();
        const [finding] = await db.insert(securityTestFindings).values({
          clientId: input.clientId,
          testId: input.testId,
          title: input.title,
          severity: input.severity,
          description: input.description,
          targetAssetId: input.targetAssetId,
        }).returning();

        // Update findings count on the test
        await db.update(securityTests)
          .set({
            findingsCount: sql`findings_count + 1`,
            updatedAt: new Date(),
          })
          .where(eq(securityTests.id, input.testId));

        return finding;
      }),

    getComplianceHealth: procedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        const { getDb } = await import("../../db");
        const db = await getDb();
        
        // Logic for "Compliance Health" (simplified for now)
        // Ratio of resolved vs unresolved findings weighted by severity
        const findings = await db.select().from(securityTestFindings).where(eq(securityTestFindings.clientId, input.clientId));
        
        if (findings.length === 0) return { score: 100, status: 'Healthy' };
        
        const unresolved = findings.filter(f => f.remediationStatus !== 'resolved');
        const critCount = unresolved.filter(f => f.severity === 'critical').length;
        const highCount = unresolved.filter(f => f.severity === 'high').length;
        
        let score = 100 - (critCount * 15) - (highCount * 5);
        score = Math.max(0, score);
        
        return {
            score,
            status: score > 80 ? 'Healthy' : score > 50 ? 'Warning' : 'Critical',
            findingsCount: findings.length,
            unresolvedCount: unresolved.length
        };
      })
  });
};
