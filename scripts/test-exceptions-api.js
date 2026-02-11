import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        // This mimics EXACTLY what getExceptions does now
        const result = await pool.query(`
            SELECT 
                pe.id,
                pe.reason,
                pe.status,
                pe.expiration_date as "expirationDate",
                pe.created_at as "createdAt",
                pe.rejection_reason as "rejectionReason",
                e.first_name as "firstName",
                e.last_name as "lastName",
                e.job_title as "jobTitle",
                pe.policy_id as "policyId",
                cp.name as "policyName"
            FROM policy_exceptions pe
            INNER JOIN employees e ON pe.employee_id = e.id
            LEFT JOIN client_policies cp ON pe.policy_id = cp.id
            WHERE e.client_id = 726
            ORDER BY pe.created_at DESC
        `);

        console.log('Results:', result.rows.length);
        result.rows.forEach(r => {
            console.log(`  Exception #${r.id}:`);
            console.log(`    Employee: ${r.firstName} ${r.lastName}`);
            console.log(`    Policy: ${r.policyName || 'Compliance Document'} (id=${r.policyId})`);
            console.log(`    Status: ${r.status}`);
            console.log(`    Reason: ${r.reason}`);
            console.log(`    Created: ${r.createdAt}`);
        });

        // Also test for client 715
        const result2 = await pool.query(`
            SELECT pe.id, pe.status, e.first_name, e.client_id
            FROM policy_exceptions pe
            INNER JOIN employees e ON pe.employee_id = e.id
            WHERE e.client_id = 715
        `);
        console.log('\nClient 715 results:', result2.rows.length);
        result2.rows.forEach(r => console.log(`  #${r.id} ${r.first_name} status=${r.status}`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}

main();
