
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
        const result = await sql`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE  table_schema = 'public'
            AND    table_name   = 'checklist_states'
        );`;
        console.log('Table existence check:', result);
    } catch (err) {
        console.error('Error checking table:', err);
    } finally {
        await sql.end();
    }
}

check();
