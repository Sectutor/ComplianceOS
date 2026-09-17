import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getEvidenceExpiryStats } from "../../components/EvidenceExpiryService";

export const createEvidenceExpiryRouter = (t: any, clientProcedure: any) => {
  return t.router({
    getStats: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        const stats = await getEvidenceExpiryStats(input.clientId);
        return stats;
      }),
  });
};
