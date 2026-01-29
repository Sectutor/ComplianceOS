
import 'dotenv/config';
import postgres from 'postgres';

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

    try {
        console.log("🚀 Migrating gap_assessments table...");

        const addCol = async (col: string, type: string) => {
            try {
                await sql`ALTER TABLE gap_assessments ADD COLUMN ${sql(col)} ${sql.unsafe(type)}`;
                console.log(`Added ${col}`);
            } catch (err: any) {
                // Ignore if column exists (code 42701)
                if (err.code === '42701') {
                    console.log(`Column ${col} already exists`);
                } else {
                    console.warn(`Failed to add ${col}:`, err.message);
                }
            }
        };

        await addCol('executive_summary', 'TEXT');
        await addCol('introduction', 'TEXT');
        await addCol('key_recommendations', 'JSONB');
        await addCol('scope', 'TEXT');
        await addCol('methodology', 'TEXT');
        await addCol('assumptions', 'TEXT');
        await addCol('references', 'TEXT');

        console.log("✅ Migration successful: Added executive_summary, introduction, key_recommendations");
        await sql.end();
        process.exit(0);
    } catch (e) {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    }
}

migrate();
