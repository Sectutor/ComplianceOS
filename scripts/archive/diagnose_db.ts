import { getDb } from "./db";
import * as schema from "./schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const dbConn = await getDb();

    const tables = ['clients', 'vendors', 'userClients', 'users'];

    for (const table of tables) {
        try {
            const result = await dbConn.execute(sql`SELECT count(*), min(id), max(id) FROM ${schema[table]}`);
            console.log(`Table '${table}': ${JSON.stringify(result[0])}`);
        } catch (e) {
            console.log(`Error checking table '${table}': ${e.message}`);
        }
    }

    process.exit(0);
}

main().catch(console.error);
