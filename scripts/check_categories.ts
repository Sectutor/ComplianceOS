import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkCategories() {
    try {
        // Check what categories exist for NIST controls
        const result = await pool.query(`
            SELECT DISTINCT category, framework, COUNT(*) as count 
            FROM controls 
            WHERE framework ILIKE '%NIST%' OR framework ILIKE '%CSF%'
            GROUP BY category, framework
            ORDER BY framework, category
        `);

        console.log("NIST/CSF Controls by Category:");
        console.log(JSON.stringify(result.rows, null, 2));

        // Also check what the assessment framework is
        const assessments = await pool.query(`
            SELECT id, name, framework FROM gap_assessments LIMIT 5
        `);
        console.log("\nGap Assessments:");
        console.log(JSON.stringify(assessments.rows, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await pool.end();
    }
}

checkCategories();
