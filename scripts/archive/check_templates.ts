import "dotenv/config";
import { getDb } from "./db";
import { dpaTemplates } from "./schema";

async function main() {
    try {
        const db = await getDb();
        const results = await db.select().from(dpaTemplates);
        console.log(`Found ${results.length} DPA templates`);
        results.forEach(t => console.log(`- ${t.name} (ID: ${t.id})`));
    } catch (err) {
        console.error("Error fetching templates:", err);
    } finally {
        process.exit();
    }
}

main();
