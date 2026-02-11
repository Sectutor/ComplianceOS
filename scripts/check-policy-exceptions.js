import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        // Check the two exceptions and their employee's clientId
        const result = await pool.query(`
            SELECT 
                pe.id, pe.policy_id, pe.employee_id, pe.status, pe.reason,
                e.first_name, e.last_name, e.client_id,
                cp.name as policy_name, cp.client_id as policy_client_id
            FROM policy_exceptions pe
            INNER JOIN employees e ON pe.employee_id = e.id
            LEFT JOIN client_policies cp ON pe.policy_id = cp.id
            ORDER BY pe.created_at DESC
        `);
        console.log('Exception data with joins:');
        result.rows.forEach(r => {
            console.log(`  Exception #${r.id}:`);
            console.log(`    Employee: ${r.first_name} ${r.last_name} (id=${r.employee_id}, clientId=${r.client_id})`);
            console.log(`    Policy: ${r.policy_name} (policyId=${r.policy_id}, policyClientId=${r.policy_client_id})`);
            console.log(`    Status: ${r.status}, Reason: ${r.reason}`);
        });

        // Check what clientId the PersonnelComplianceHub would be using
        console.log('\nAll clients with employees:');
        const clients = await pool.query(`SELECT DISTINCT e.client_id, c.name FROM employees e JOIN clients c ON e.client_id = c.id`);
        clients.rows.forEach(r => console.log(`  Client ${r.client_id}: ${r.name}`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}

main();
