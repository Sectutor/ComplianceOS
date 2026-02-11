import { getDb } from "../packages/core/src/db";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Starting manual migration to add magic link security columns...");

    try {
        const dbConn = await getDb();

        // 1. Add access_expires_at to users
        console.log("Adding access_expires_at to users...");
        await dbConn.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP;`);

        // 2. Add access_expires_at to user_clients
        console.log("Adding access_expires_at to user_clients...");
        await dbConn.execute(sql`ALTER TABLE user_clients ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP;`);

        // 3. Add columns to magic_links
        console.log("Adding columns to magic_links...");
        await dbConn.execute(sql`ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 1;`);
        await dbConn.execute(sql`ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;`);
        await dbConn.execute(sql`ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS restricted_domains JSONB;`);

        // 4. Create magic_link_redemptions table
        console.log("Creating magic_link_redemptions table...");
        await dbConn.execute(sql`
            CREATE TABLE IF NOT EXISTS magic_link_redemptions (
                id SERIAL PRIMARY KEY,
                magic_link_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                redeemed_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

main();
