import { z } from "zod";
import { MSSPCockpit } from "../../lib/mssp-cockpit";

export const createMsspCockpitRouter = (t: any, adminProcedure: any) => {
  return t.router({
    getSummary: adminProcedure
      .query(async () => MSSPCockpit.getSummary()),

    getAllClientHealths: adminProcedure
      .query(async () => MSSPCockpit.getAllClientHealths()),

    getClientHealth: adminProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => MSSPCockpit.getClientHealth(input.clientId)),

    getCommonGaps: adminProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => MSSPCockpit.getCommonGaps(input.limit)),
  });
};
