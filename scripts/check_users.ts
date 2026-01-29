
import 'dotenv/config';
import { getDb } from '../db';
import { users } from '../schema';

async function run() {
    const db = await getDb();
    const allUsers = await db.select().from(users);
    console.log("Users:", allUsers);
    process.exit(0);
}

run().catch(console.error);
