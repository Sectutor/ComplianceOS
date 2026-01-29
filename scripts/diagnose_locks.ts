
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Diagnosing Database Locks...");
    try {
        const db = await getDb();

        // 1. Check for blocking PIDs
        const locks = await db.execute(sql`
            SELECT 
                pid, 
                usename, 
                pg_blocking_pids(pid) as blocked_by, 
                query as blocked_query,
                state
            FROM pg_stat_activity 
            WHERE array_length(pg_blocking_pids(pid), 1) > 0;
        `);

        console.log(`Found ${locks.length} blocked queries.`);
        if (locks.length > 0) {
            console.table(locks);
        }

        // 2. Check for long running queries (> 5 minutes)
        const longRunning = await db.execute(sql`
            SELECT pid, usename, state, query, now() - query_start as duration
            FROM pg_stat_activity
            WHERE (now() - query_start) > interval '5 minutes'
            AND state != 'idle'
            AND query NOT LIKE '%pg_stat_activity%';
        `);

        console.log(`Found ${longRunning.length} long-running queries.`);
        if (longRunning.length > 0) {
            console.table(longRunning);

            // Auto-kill logic for ddl_command_start which usually indicates hanging migration
            for (const q of longRunning) {
                // Safe generic check: if it looks like a hanging client connection or migration
                console.log(`Attempting to terminate PID ${q.pid}...`);
                await db.execute(sql`SELECT pg_terminate_backend(${q.pid})`);
                console.log(`Terminated PID ${q.pid}`);
            }
        }

        // 3. Check specifically for idle in transaction
        const idleInTx = await db.execute(sql`
            SELECT pid, usename, state, query, now() - query_start as duration
            FROM pg_stat_activity
            WHERE state = 'idle in transaction'
            AND (now() - query_start) > interval '1 minute';
        `);

        if (idleInTx.length > 0) {
            console.log(`Found ${idleInTx.length} idle-in-transaction connections. Terminating...`);
            for (const q of idleInTx) {
                await db.execute(sql`SELECT pg_terminate_backend(${q.pid})`);
                console.log(`Terminated Idle PID ${q.pid}`);
            }
        }

    } catch (error) {
        console.error("Error checking locks:", error);
    }
    process.exit(0);
}

main();
