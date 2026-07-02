import 'dotenv/config';
import { getDb } from './db';
import { users, userClients } from './schema';
import { eq } from 'drizzle-orm';

async function diagnose() {
    const d = await getDb();

    console.log('--- USER DELETION DIAGNOSIS ---');

    // 1. Find a test user (not ID 1 usually)
    const allUsers = await d.select().from(users).limit(10);
    const target = allUsers.find(u => u.email === 'randomuser123@example.com' || u.id !== 1);

    if (!target) {
        console.log('No users to test with.');
        return;
    }

    console.log(`Targeting user: ${target.name} (Email: ${target.email}, ID: ${target.id})`);

    try {
        console.log('Attempting to delete user clients...');
        const deleteClientsRes = await d.delete(userClients).where(eq(userClients.userId, target.id));
        console.log('✅ User clients deleted.');

        console.log('Attempting to soft-delete user...');
        const deleteUserRes = await d.update(users)
            .set({ deletedAt: new Date() })
            .where(eq(users.id, target.id))
            .returning();

        if (deleteUserRes.length > 0) {
            console.log('✅ User soft-deleted successfully.');
        } else {
            console.log('⚠️ User soft-delete returned empty result.');
        }
    } catch (e: any) {
        console.error('❌ FAILURE DURING DELETION:', e);
        if (e.detail) console.error('Error detail:', e.detail);
        if (e.hint) console.error('Error hint:', e.hint);
    }

    console.log('--- DIAGNOSIS COMPLETE ---');
}

diagnose().catch(console.error);
