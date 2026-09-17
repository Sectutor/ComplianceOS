import { z } from "zod";
import { getActionItems } from "../../lib/action-center";

export const createActionCenterRouter = (t: any, clientProcedure: any) => {
  return t.router({
    getActions: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const userId = ctx.user?.id || 0;
        return getActionItems(input.clientId, userId);
      }),

    getActionCount: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const userId = ctx.user?.id || 0;
        const items = await getActionItems(input.clientId, userId);
        return {
          total: items.length,
          critical: items.filter(i => i.priority === 'critical').length,
          high: items.filter(i => i.priority === 'high').length,
          medium: items.filter(i => i.priority === 'medium').length,
          low: items.filter(i => i.priority === 'low').length,
        };
      }),

    dismissAction: clientProcedure
      .input(z.object({ actionId: z.string(), actionType: z.string() }))
      .mutation(async () => {
        // Stores dismissed actions per user — frontend can use localStorage
        // Future: persist to a dismissed_actions table
        return { success: true };
      }),
  });
};
