
import 'dotenv/config';
import { getDb } from '../db';
import { clients } from '../schema';
import { sql } from 'drizzle-orm';

async function checkAndSeedClient() {
    const db = await getDb();

    console.log('🔍 Checking for Client ID 1...');

    // Check if client 1 exists
    const existingClient = await db.select().from(clients).limit(1);

    if (existingClient.length > 0) {
        console.log(`✅ Found ${existingClient.length} clients.`);
        console.log('First client:', existingClient[0]);

        // If ID is not 1, we might need to adjust our tests or seed ID 1 specifically
        if (existingClient[0].id !== 1) {
            console.log('⚠️ First client ID is not 1. This might cause test failures.');
        }
    } else {
        console.log('❌ No clients found. Seeding Client ID 1...');

        try {
            await db.insert(clients).values({
                id: 1, // Force ID 1 if possible, or let serial handle it if we reset usage
                name: 'Demo Company',
                industry: 'Technology',
                description: 'A demo technology company for testing.',
                status: 'active',
                planTier: 'enterprise',
                primaryContactName: 'Admin User',
                primaryContactEmail: 'admin@demo.com',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('✅ Client ID 1 seeded successfully.');
        } catch (e: any) {
            console.error('Error seeding client:', e.message);
            // Fallback for serial columns where we can't force ID easily in some setups, 
            // though postgres usually allows explicit insert if not conflicting.
            await db.insert(clients).values({
                name: 'Demo Company',
                industry: 'Technology',
                status: 'active'
            });
            console.log('✅ Created a client (ID might not be 1, checking...)');
            const newClient = await db.select().from(clients).limit(1);
            console.log('New client ID:', newClient[0]?.id);
        }
    }
}

checkAndSeedClient().catch(console.error);
