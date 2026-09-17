
import { getDb } from './src/db';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function main() {
    try {
        const db = await getDb();
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND table_schema = 'public'
        `);
        console.log('Public Users table columns:');
        console.log(JSON.stringify(result, null, 2));

        const exists = result.some((c: any) => c.column_name === 'access_expires_at');
        console.log('access_expires_at exists:', exists);

    } catch (e) {
        console.error('FAILED:', e);
    }
}

main();
