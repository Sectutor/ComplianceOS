import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("No DATABASE_URL found");
        process.exit(1);
    }
    const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

    const clients = await sql`SELECT id, name, industry, size, created_at FROM clients ORDER BY id ASC`;
    console.log("ALL CLIENTS:", JSON.stringify(clients, null, 2));

    await sql.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
