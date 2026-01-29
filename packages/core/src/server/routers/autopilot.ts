
import { AutopilotService } from "../../lib/advisor/autopilot";
import { getDb } from "../../db";
import { auditLogs } from "../../schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const createAutopilotRouter = (router: any, procedure: any) => {
    return router({
        trigger: procedure
            .input(z.object({ clientId: z.number() }))
            .mutation(async ({ ctx, input }: any) => {
                const clientId = input.clientId;
                const userId = ctx.user.id;

                // 1. Run the checks
                const results = await AutopilotService.runAllChecks(clientId);

                // 2. Log the run
                const db = await getDb();
                await db.insert(auditLogs).values({
                    clientId,
                    userId, // The user who triggered it
                    action: 'autopilot_run',
                    entityType: 'system',
                    entityId: 0,
                    details: results,
                    severity: 'info'
                });

                return results;
            }),

        getLastRun: procedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ ctx, input }: any) => {
                const clientId = input.clientId;
                const db = await getDb();

                const lastRun = await db.query.auditLogs.findFirst({
                    where: and(
                        eq(auditLogs.clientId, clientId),
                        eq(auditLogs.action, 'autopilot_run')
                    ),
                    orderBy: [desc(auditLogs.createdAt)]
                });

                return lastRun || null; // Return null instead of undefined
            })
    });
};
