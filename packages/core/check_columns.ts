
import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not set');
        return;
    }
    const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });
    try {
        const result = await sql`SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'checklist_states';`;
        console.log('Columns:', result);
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        await sql.end();
    }
}

check();
