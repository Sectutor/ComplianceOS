
import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

    // Check what is inside content
    const templates = await sql`SELECT name, SUBSTRING(content::text FROM 1 FOR 150) as preview FROM policy_templates LIMIT 5`;
    console.log("Template contents:", templates);

    await sql.end();
}

main().catch(console.error);
