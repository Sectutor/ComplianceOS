
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspect() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    const sql = postgres(url, { ssl: { rejectUnauthorized: false } });

    try {
        const columns = await sql`
            SELECT table_schema, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'samm_stream_assessments'
        `;

        console.log('Columns in samm_stream_assessments:');
        columns.forEach(c => console.log(`- ${c.table_schema}.${c.column_name} (${c.data_type})`));

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await sql.end();
    }
}

inspect();
