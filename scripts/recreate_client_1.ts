
import "dotenv/config";
import { getDb } from "../db";
import { clients } from "../schema";

async function main() {
    const db = await getDb();
    console.log("Restoring Client 1...");

    try {
        // Attempt to insert with explicit ID 1
        const result = await db.insert(clients).values({
            id: 1,
            name: "Demo Client",
            description: "Restored Demo Client for testing",
            industry: "Technology",
            status: "active",
            clientTier: "pro",
            deploymentType: "standard"
        }).onConflictDoNothing().returning();

        if (result.length > 0) {
            console.log("Client 1 created successfully.");
        } else {
            console.log("Client 1 already exists via onConflict check (or insert failed silently).");
        }
    } catch (error) {
        console.error("Error creating Client 1:", error);
    }
    process.exit(0);
}

main().catch(console.error);
