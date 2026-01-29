import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function addEnumValues() {
    const db = await getDb();

    console.log("Adding new values to work_item_type enum...");

    try {
        // Add risk_review if it doesn't exist
        await db.execute(sql`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'risk_review' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'work_item_type')
                ) THEN
                    ALTER TYPE work_item_type ADD VALUE 'risk_review';
                    RAISE NOTICE 'Added risk_review';
                ELSE
                    RAISE NOTICE 'risk_review already exists';
                END IF;
            END$$;
        `);

        // Add control_assessment if it doesn't exist
        await db.execute(sql`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'control_assessment' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'work_item_type')
                ) THEN
                    ALTER TYPE work_item_type ADD VALUE 'control_assessment';
                    RAISE NOTICE 'Added control_assessment';
                ELSE
                    RAISE NOTICE 'control_assessment already exists';
                END IF;
            END$$;
        `);

        console.log("✅ Migration complete!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}

// Run migration
addEnumValues()
    .then(() => {
        console.log("Done!");
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
