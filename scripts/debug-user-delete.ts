
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../db';
import { users, userClients } from '../schema';

async function main() {
    console.log('Starting debug script...');
    const db = await getDb();

    // 1. Create a dummy user
    const email = `test.delete.${Date.now()}@example.com`;
    console.log(`Creating dummy user: ${email}`);

    const [user] = await db.insert(users).values({
        email,
        openId: `test-openid-${Date.now()}`,
        name: 'Test Delete Target',
        role: 'user',
        loginMethod: 'email'
    }).returning();

    console.log(`Created user ID: ${user.id}`);

    // 2. Add a dummy client membership
    await db.insert(userClients).values({
        userId: user.id,
        clientId: 1, // Assuming client 1 exists
        role: 'viewer'
    });
    console.log('Added client membership');

    // 3. Attempt the DELETE logic from routers/users.ts
    console.log('Attempting deletion logic...');
    try {
        // A. Hard Delete Memberships
        console.log('Deleting memberships...');
        await db.delete(userClients).where(eq(userClients.userId, user.id));
        console.log('Memberships deleted.');

        // B. Soft Delete User
        console.log('Soft deleting user...');
        await db.update(users)
            .set({ deletedAt: new Date() })
            .where(eq(users.id, user.id));
        console.log('User soft deleted.');

    } catch (error) {
        console.error('ERROR CAUGHT IN SCRIPT:', error);
    } finally {
        await closeDb();
        console.log('Done.');
    }
}

main().catch(console.error);
