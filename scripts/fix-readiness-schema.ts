import "dotenv/config";
import postgres from "postgres";

const connectionString = "postgresql://postgres.erjlkrtccmlrvsjtpppp:rDAO3DsFTjZyZJpj@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    prepare: false
});

async function main() {
    console.log("Adding questionnaire_data column to readiness_assessments table...");
    try {
        await sql`
            ALTER TABLE "readiness_assessments" 
            ADD COLUMN IF NOT EXISTS "questionnaire_data" jsonb DEFAULT '{}'::jsonb;
        `;
        console.log("✓ Added questionnaire_data column successfully");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

main();
