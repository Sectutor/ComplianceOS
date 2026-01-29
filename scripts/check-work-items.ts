import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function checkWorkItems() {
    const db = await getDb();

    const result = await db.execute(sql`
        SELECT id, title, status, priority, due_date, created_at 
        FROM work_items 
        WHERE client_id = 3 
        ORDER BY created_at DESC 
        LIMIT 10
    `);

    console.log("Work Items for Client 3:");
    console.log(JSON.stringify(result.rows, null, 2));
}

checkWorkItems().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
