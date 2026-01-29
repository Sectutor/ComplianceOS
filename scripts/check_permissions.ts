
import "dotenv/config";
import { getDb } from "../db";
import { users, userClients } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Checking User Permissions...");

    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users.`);

    for (const u of allUsers) {
        console.log(`User: ${u.name} (ID: ${u.id}, Role: ${u.role})`);
        const perms = await db.select().from(userClients).where(eq(userClients.userId, u.id));
        console.log(`  - Assigned to Clients: ${perms.map(p => p.clientId).join(", ")}`);
    }
    process.exit(0);
}

main().catch(console.error);
