import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import {
  sendSlackRemediationAlert,
  createJiraRemediationTicket,
} from "../../lib/integrations/remediationNotifier";

export const remediationRouter = router({
  /**
   * Trigger Slack alert for control drift
   */
  sendSlackAlert: publicProcedure
    .input(
      z.object({
        webhookUrl: z.string(),
        clientId: z.number(),
        controlId: z.string(),
        title: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]).default("high"),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const sent = await sendSlackRemediationAlert(input.webhookUrl, input);
      return { success: sent };
    }),

  /**
   * Create Jira Remediation Ticket
   */
  createJiraTicket: publicProcedure
    .input(
      z.object({
        jiraDomain: z.string().default("complianceos"),
        apiToken: z.string().optional().default("demo_token"),
        userEmail: z.string().default("admin@complianceos.local"),
        projectKey: z.string().default("COMP"),
        clientId: z.number(),
        controlId: z.string(),
        title: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]).default("high"),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await createJiraRemediationTicket(
        input.jiraDomain,
        input.apiToken,
        input.userEmail,
        input.projectKey,
        input
      );
      return res;
    }),
});
