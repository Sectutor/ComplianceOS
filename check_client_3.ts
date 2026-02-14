import { getDb } from "./packages/core/src/db";
import * as schema from "./packages/core/src/schema";
import { eq, count } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const db = await getDb();
    const clientId = 3;

    const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId)).limit(1);
    if (!client) {
        console.log(`Client ${clientId} not found.`);
    } else {
        console.log(`Client found: ${client.name} (ID: ${client.id})`);

        // Check controls
        const [controlsCount] = await db.select({ value: count() }).from(schema.clientControls).where(eq(schema.clientControls.clientId, clientId));
        console.log(`Controls count for Client ${clientId}: ${controlsCount.value}`);

        // Check policies
        const [policiesCount] = await db.select({ value: count() }).from(schema.clientPolicies).where(eq(schema.clientPolicies.clientId, clientId));
        console.log(`Policies count for Client ${clientId}: ${policiesCount.value}`);

        // Check evidence
        const [evidenceCount] = await db.select({ value: count() }).from(schema.evidence).where(eq(schema.evidence.clientId, clientId));
        console.log(`Evidence count for Client ${clientId}: ${evidenceCount.value}`);
    }

    process.exit(0);
}

main().catch(console.error);
