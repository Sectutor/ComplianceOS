import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🛠️  Adding content column to roadmap_reports table...");
    const db = await getDb();

    try {
        // Add content column
        await db.execute(sql`ALTER TABLE "roadmap_reports" ADD COLUMN IF NOT EXISTS "content" TEXT`);
        console.log("✅ Added 'content' column to roadmap_reports table.");

        // Update existing reports with basic content
        await db.execute(sql`
            UPDATE "roadmap_reports" 
            SET "content" = CONCAT(
                '<h1>', "title", '</h1>',
                '<p><strong>Version:</strong> ', COALESCE("version", 'draft'), '</p>',
                '<p><strong>Generated:</strong> ', TO_CHAR("generated_at", 'YYYY-MM-DD HH24:MI:SS'), '</p>',
                '<hr>',
                '<h2>Report Content</h2>',
                '<p>This report was generated as a DOCX/PDF file. You can now edit it here in the rich text editor.</p>',
                '<p>Changes you make will be saved as HTML content in the database.</p>',
                '<p>You can still download the original generated file using the "Download Original" button.</p>'
            )
            WHERE "content" IS NULL
        `);
        console.log("✅ Updated existing reports with basic content template.");

        // Count how many reports were updated
        const result: any = await db.execute(sql`SELECT COUNT(*) as count FROM "roadmap_reports" WHERE "content" IS NOT NULL`);
        console.log(`✅ ${result.rows?.[0]?.count || 0} reports now have content.`);

    } catch (e) {
        console.error("Error adding content column:", e);
        process.exit(1);
    }

    console.log("🏁 Migration complete.");
    process.exit(0);
}

main().catch(console.error);