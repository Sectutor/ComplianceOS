import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { generateCustomPolicyDocument } from "../../lib/policies/policyGenerator";

export const policyGeneratorRouter = router({
  /**
   * Generate custom audit-ready security policy document
   */
  generatePolicy: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        companyName: z.string(),
        policyType: z.enum([
          "Access Control",
          "Incident Response",
          "Cryptography",
          "Vendor Security",
          "Data Privacy",
        ]),
        framework: z.string().optional().default("SOC 2 & ISO 27001"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateCustomPolicyDocument(
        input.clientId,
        input.companyName,
        input.policyType,
        input.framework
      );
      return result;
    }),
});
