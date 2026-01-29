import "dotenv/config";
import { getDb } from "../db";
import { riskReports } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Starting persistence test...");
    const db = await getDb();
    const clientId = 99999;

    try {
        await db.delete(riskReports).where(eq(riskReports.clientId, clientId));

        console.log("Inserting test report...");
        const [inserted] = await db.insert(riskReports).values({
            clientId,
            title: "Test Report",
            executiveSummary: "Test content persistence check."
        }).returning();

        console.log("Inserted ID:", inserted.id);

        console.log("Reading test report...");
        const [read] = await db.select().from(riskReports).where(eq(riskReports.clientId, clientId));

        console.log("Read result:", read);

        if (read && read.executiveSummary === "Test content persistence check.") {
            console.log("VERIFICATION SUCCESS: Data was saved and retrieved.");
        } else {
            console.error("VERIFICATION FAILED: Data mismatch.");
            process.exit(1);
        }

        // Cleanup
        await db.delete(riskReports).where(eq(riskReports.clientId, clientId));

    } catch (error) {
        console.error("Test failed with error:", error);
        process.exit(1);
    }
}

main();
