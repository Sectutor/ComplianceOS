import { getDb } from "../db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function migrate() {
    try {
        const db = await getDb();
        console.log("Checking if column weakness_detector_source exists in poam_items...");

        // Check if column exists
        const columnCheck: any = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'poam_items' AND column_name = 'weakness_detector_source'
    `);

        if (columnCheck.length === 0) {
            console.log("Column weakness_detector_source missing. Adding it...");
            await db.execute(sql`
        ALTER TABLE poam_items ADD COLUMN weakness_detector_source varchar(255);
      `);
            console.log("Column added successfully.");
        } else {
            console.log("Column weakness_detector_source already exists.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
