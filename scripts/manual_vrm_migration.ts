
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not found");
        return;
    }

    const sql = postgres(url);

    try {
        console.log("Adding trust_center_url column...");
        await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trust_center_url varchar(512);`;
        
        console.log("Adding trust_center_data column...");
        await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trust_center_data json;`;
        
        console.log("Adding trust_score column...");
        await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trust_score integer;`;
        
        console.log("Columns added successfully!");
    } catch (error) {
        console.error("Failed to add columns:", error);
    } finally {
        await sql.end();
    }
}

run();
