
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Starting DB connection debug script...");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL is NOT set in environment.");
        process.exit(1);
    }
    console.log(`DATABASE_URL is set (Length: ${dbUrl.length})`);

    // Set a timeout
    const timeout = setTimeout(() => {
        console.error("Connection attempt timed out after 5000ms!");
        process.exit(1);
    }, 5000);

    try {
        console.log("Attempting to connect...");
        const sql = postgres(dbUrl, {
            ssl: 'require',
            connect_timeout: 3,
            max: 1
        });

        const result = await sql`SELECT 1 as connected`;
        console.log("Connection successful!", result);

        await sql.end();
        console.log("Connection closed.");
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        clearTimeout(timeout);
    }
}

main();
