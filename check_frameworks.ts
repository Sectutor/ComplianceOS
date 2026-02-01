
import "dotenv/config";
import { getDb } from "./packages/core/src/db";
import { evidence, evidenceFiles, clientControls, controls } from "./packages/core/src/schema";
import { eq, and, sql } from "drizzle-orm";

async function checkFrameworks(clientId: number) {
    try {
        const db = await getDb();

        // Check for SOC 2
        const soc2Count = await db.select({ count: sql<number>`count(*)` })
            .from(evidence)
            .where(and(
                eq(evidence.clientId, clientId),
                eq(evidence.framework, "SOC 2")
            ));

        console.log(`[CHECK] Client ${clientId} SOC 2 items: ${soc2Count[0].count}`);

        // Check for PCI DSS
        const pciCount = await db.select({ count: sql<number>`count(*)` })
            .from(evidence)
            .where(and(
                eq(evidence.clientId, clientId),
                eq(evidence.framework, "PCI DSS")
            ));

        console.log(`[CHECK] Client ${clientId} PCI DSS items: ${pciCount[0].count}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkFrameworks(3);
