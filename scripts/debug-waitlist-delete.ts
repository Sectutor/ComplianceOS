
import 'dotenv/config';
import { getDb } from "../db";
import { waitingList } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Initializing debug script...");
    const db = await getDb();

    // 1. Create a dummy entry
    console.log("Creating dummy lead...");
    const [lead] = await db.insert(waitingList).values({
        email: `debug_delete_${Date.now()}@test.com`,
        firstName: "Debug",
        lastName: "DeleteMe",
        status: "pending",
        source: "debug_script"
    }).returning();

    console.log("Created lead:", lead);

    if (!lead || !lead.id) {
        console.error("Failed to create dummy lead!");
        return;
    }

    // 2. Try to delete it
    console.log(`Attempting to delete lead ID: ${lead.id}...`);
    try {
        const res = await db.delete(waitingList).where(eq(waitingList.id, lead.id)).returning();
        console.log("Delete operation result:", res);

        if (res.length > 0) {
            console.log("✅ SUCCESS: Lead deleted successfully.");
        } else {
            console.error("❌ FAILURE: Delete returned 0 rows. ID not found or transaction failed? (Wait, I just created it!)");
        }

    } catch (error) {
        console.error("❌ EXCEPTION during delete:", error);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error("Fatal script error:", err);
    process.exit(1);
});
