import { z } from "zod";
import { computeHarmonization, listClientFrameworks } from "../../lib/framework-harmonization";
import { getDb } from "../../db";
import { complianceFrameworks } from "../../schema";
import { eq } from "drizzle-orm";

export const createFrameworkHarmonizationRouter = (t: any, clientProcedure: any) => {
  return t.router({
    listFrameworks: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const frameworks = await db.select()
          .from(complianceFrameworks)
          .where(eq(complianceFrameworks.type, 'framework'));
        return frameworks;
      }),

    calculate: clientProcedure
      .input(z.object({
        clientId: z.number(),
        sourceFrameworkCode: z.string(),
        targetFrameworkCode: z.string(),
      }))
      .query(async ({ input }) => {
        return computeHarmonization(input.clientId, input.sourceFrameworkCode, input.targetFrameworkCode);
      }),
  });
};
