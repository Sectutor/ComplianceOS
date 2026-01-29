
import dotenv from 'dotenv';
dotenv.config();

import { getDb } from "../db";
import { users } from "../schema";
import { desc } from "drizzle-orm";

async function main() {
    const db = await getDb();
    const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(5);

    console.log("Recent Users:");
    recentUsers.forEach(u => {
        console.log(`- ID: ${u.id}, Email: ${u.email}, Tier: ${u.planTier}, Status: ${u.subscriptionStatus}`);
    });
}

main();
