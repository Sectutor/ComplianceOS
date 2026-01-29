import { getDb } from "../db";
import { clientFrameworks, clientFrameworkControls } from "../schema";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function clearFrameworks() {
    console.log("⚠️  Starting removal of ALL imported frameworks...");

    try {
        const db = await getDb();

        console.log("Deleting client framework controls...");
        // Delete all client framework controls
        const controlsResult = await db.delete(clientFrameworkControls);
        console.log(`✅ Deleted client framework controls.`);

        console.log("Deleting client frameworks...");
        const frameworksResult = await db.delete(clientFrameworks);
        console.log(`✅ Deleted client frameworks.`);

        console.log("SUCCESS: All imported frameworks and their controls have been removed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error clearing frameworks:", err);
        process.exit(1);
    }
}

clearFrameworks();
