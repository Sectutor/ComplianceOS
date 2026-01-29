
import 'dotenv/config';
import { getDb, getUserByOpenId } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    const targetOpenId = "4510723e-3d54-4f63-9468-e3cfeb55b625";
    console.log(`[Debug] Checking database for user with OpenID: ${targetOpenId}`);

    try {
        const db = await getDb();
        console.log("[Debug] DB Connection established.");

        // Direct query
        const result = await db.select().from(schema.users).where(eq(schema.users.openId, targetOpenId));
        console.log(`[Debug] Direct Query Result Count: ${result.length}`);
        if (result.length > 0) {
            console.log("[Debug] User found:", result[0]);
        } else {
            console.log("[Debug] User NOT found via direct query.");

            // List all users to see if we have ANY
            const allUsers = await db.select().from(schema.users).limit(5);
            console.log("[Debug] First 5 users in DB:", allUsers.map(u => ({ id: u.id, openId: u.openId, email: u.email })));
        }

        // Helper query
        console.log("[Debug] Testing helper function getUserByOpenId...");
        const helperResult = await getUserByOpenId(targetOpenId);
        console.log("[Debug] Helper Result:", helperResult);

    } catch (error) {
        console.error("[Debug] Error:", error);
    } finally {
        process.exit();
    }
}

main();
