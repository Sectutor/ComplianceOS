
import 'dotenv/config';
import postgres from 'postgres';

async function verify() {
    if (!process.env.DATABASE_URL) process.exit(1);

    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

    try {
        console.log("🔍 Verifying Gap Analysis Data...");

        // Check Assessment
        const assessment = await sql`SELECT * FROM gap_assessments WHERE id = 4`;
        console.log("Assessment:", assessment.length ? "Found" : "Missing");

        // Check Responses
        const responses = await sql`SELECT count(*) as count FROM gap_responses WHERE assessment_id = 4`;
        console.log(`Responses Count: ${responses[0].count}`);

        if (responses[0].count > 0) {
            const sample = await sql`SELECT * FROM gap_responses WHERE assessment_id = 4 LIMIT 1`;
            console.log("Sample Response:", sample[0]);
        }

        await sql.end();
    } catch (e) {
        console.error(e);
    }
}

verify();
