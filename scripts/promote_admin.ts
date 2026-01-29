
import { getDb } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

async function run() {
    const db = await getDb();
    await db.update(users).set({ role: 'admin' });
    console.log("Promoted all users to admin");
    process.exit(0);
}

run().catch(console.error);
