import { getDb } from "../db.js";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function fixAndMigrateSAR() {
    console.log("[Migration] Starting SAR migration and cleanup...");
    const db = await getDb();

    try {
        // Step 1: Remove duplicate control_mappings
        console.log("[Step 1] Cleaning up duplicate control_mappings...");
        await db.execute(sql`
            DELETE FROM control_mappings a
            USING control_mappings b
            WHERE a.id > b.id
            AND a.source_control_id = b.source_control_id
            AND a.target_control_id = b.target_control_id;
        `);
        console.log("[Step 1] ✓ Duplicates removed");

        // Step 2: Add missing columns to federal_sars (if they don't exist)
        console.log("[Step 2] Adding columns to federal_sars...");

        const sarColumns = [
            { name: 'system_acronym', type: 'varchar(50)' },
            { name: 'system_identification', type: 'varchar(255)' },
            { name: 'system_type', type: 'varchar(50)' },
            { name: 'version', type: 'varchar(50)' },
            { name: 'agency', type: 'varchar(100)' },
            { name: 'assessment_completion_date', type: 'timestamp' },
            { name: 'system_owner_id', type: 'integer' },
            { name: 'confidentiality', type: 'varchar(20)' },
            { name: 'integrity', type: 'varchar(20)' },
            { name: 'availability', type: 'varchar(20)' },
            { name: 'impact', type: 'varchar(20)' },
            { name: 'package_type', type: 'varchar(100)' },
            { name: 'executive_summary', type: 'text' }
        ];

        for (const col of sarColumns) {
            try {
                await db.execute(sql.raw(`
                    ALTER TABLE federal_sars 
                    ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
                `));
                console.log(`  ✓ Added ${col.name}`);
            } catch (e: any) {
                if (e.message?.includes('already exists')) {
                    console.log(`  ⊙ ${col.name} already exists`);
                } else {
                    throw e;
                }
            }
        }

        // Step 3: Add missing columns to federal_sar_findings
        console.log("[Step 3] Adding columns to federal_sar_findings...");

        const findingColumns = [
            { name: 'overlay', type: 'varchar(100)' },
            { name: 'na_justification', type: 'text' },
            { name: 'vulnerability_summary', type: 'text' },
            { name: 'vulnerability_severity', type: 'varchar(20)' },
            { name: 'residual_risk_level', type: 'varchar(20)' },
            { name: 'recommendations', type: 'text' }
        ];

        for (const col of findingColumns) {
            try {
                await db.execute(sql.raw(`
                    ALTER TABLE federal_sar_findings 
                    ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
                `));
                console.log(`  ✓ Added ${col.name}`);
            } catch (e: any) {
                if (e.message?.includes('already exists')) {
                    console.log(`  ⊙ ${col.name} already exists`);
                } else {
                    throw e;
                }
            }
        }

        console.log("\n[Migration] ✓ All migrations completed successfully!");
        console.log("\nNext steps:");
        console.log("1. Restart your dev server if it's running");
        console.log("2. Refresh the SAR page in your browser");

    } catch (error: any) {
        console.error("[Migration] ✗ Error:", error.message);
        throw error;
    }
}

fixAndMigrateSAR()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
