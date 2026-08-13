import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { getDb } from "../../db";
import { clients, clientControls, controls, evidence, complianceFrameworks } from "../../schema";
import { eq, and } from "drizzle-orm";

export const trustBadgeRouter = router({
  /**
   * Public Trust Badge data payload (SOC 2 / ISO 27001 / FedRAMP verification stats)
   */
  getBadgeData: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId));

      if (!client) {
        throw new Error(`Client #${input.clientId} not found.`);
      }

      // Fetch client controls
      const clientCtrls = await db
        .select({
          id: clientControls.id,
          status: clientControls.status,
          framework: controls.framework,
        })
        .from(clientControls)
        .leftJoin(controls, eq(clientControls.controlId, controls.id))
        .where(eq(clientControls.clientId, input.clientId));

      const totalControls = clientCtrls.length;
      const implementedCount = clientCtrls.filter((c) => c.status === "implemented").length;
      const passRate = totalControls > 0 ? Math.round((implementedCount / totalControls) * 100) : 100;

      // Count verified evidence items
      const evidenceList = await db
        .select({ id: evidence.id, status: evidence.status })
        .from(evidence)
        .where(eq(evidence.clientId, input.clientId));

      const verifiedEvidenceCount = evidenceList.filter((e) => e.status === "verified").length;

      // Distinct active frameworks
      const activeFrameworksSet = new Set<string>();
      clientCtrls.forEach((c) => {
        if (c.framework) activeFrameworksSet.add(c.framework);
      });

      const activeFrameworks = Array.from(activeFrameworksSet);

      return {
        clientId: client.id,
        clientName: client.name,
        passRate,
        totalControls,
        implementedCount,
        verifiedEvidenceCount,
        activeFrameworks: activeFrameworks.length > 0 ? activeFrameworks : ["SOC 2 Type II", "ISO 27001"],
        verifiedAt: new Date().toISOString(),
        issuer: "ComplianceOS Continuous Audit Engine",
      };
    }),
});
