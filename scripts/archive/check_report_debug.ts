
import 'dotenv/config';
import { getDb } from "./db";
import * as schema from "./schema";
import { desc } from "drizzle-orm";

async function checkLastReport() {
    console.log("Checking last strategic report...");
    const db = await getDb();
    const [report] = await db.select().from(schema.strategicReports).orderBy(desc(schema.strategicReports.createdAt)).limit(1);

    if (report) {
        console.log("Found Report:");
        console.log("ID:", report.id);
        console.log("Title:", report.title);
        console.log("Content Length:", report.content?.length);
        console.log("Content Preview:", report.content?.substring(0, 100));
        console.log("Roadmap ID:", report.roadmapId);
    } else {
        console.log("No reports found.");
    }
    process.exit(0);
}

checkLastReport().catch(console.error);
