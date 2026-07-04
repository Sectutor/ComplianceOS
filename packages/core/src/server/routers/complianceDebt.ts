import { z } from "zod";
import { computeComplianceDebt } from "../../lib/compliance-debt";
import { getDb } from "../../db";
import { complianceSnapshots } from "../../schema";
import { eq, desc } from "drizzle-orm";

export const createComplianceDebtRouter = (t: any, clientProcedure: any) => {
  return t.router({
    getDebt: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return computeComplianceDebt(input.clientId);
      }),
    getHistory: clientProcedure
      .input(z.object({ clientId: z.number(), limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        const snapshots = await db.select()
          .from(complianceSnapshots)
          .where(eq(complianceSnapshots.clientId, input.clientId))
          .orderBy(desc(complianceSnapshots.snapshotDate))
          .limit(input.limit);
        return snapshots;
      }),
  });
};
