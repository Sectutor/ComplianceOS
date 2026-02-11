import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        // Find the user
        const user = await pool.query(`SELECT id, name, email, role, max_clients, plan_tier FROM users WHERE email = 'big@intellfence.com'`);
        console.log('User:', user.rows[0]);

        if (user.rows[0]) {
            const userId = user.rows[0].id;

            // Count user_clients entries
            const uc = await pool.query(`
                SELECT uc.client_id, uc.role, c.name 
                FROM user_clients uc 
                JOIN clients c ON uc.client_id = c.id 
                WHERE uc.user_id = $1
                ORDER BY uc.client_id
            `, [userId]);
            console.log(`\nuser_clients entries: ${uc.rows.length}`);
            uc.rows.forEach(r => console.log(`  Client ${r.client_id}: ${r.name} (role: ${r.role})`));

            // Check clients where this user is the creator/owner
            const owned = await pool.query(`
                SELECT id, name FROM clients WHERE id IN (
                    SELECT client_id FROM user_clients WHERE user_id = $1
                )
            `, [userId]);
            console.log(`\nAccessible clients: ${owned.rows.length}`);
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}

main();
