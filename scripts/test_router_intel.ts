
import 'dotenv/config';
import { appRouter } from '../packages/core/src/routers';
import { getDb, closeDb } from '../packages/core/src/db';

async function testRouter() {
    console.log("Testing Router Call...");
    const db = await getDb();

    // Mock user context (Admin)
    const mockCtx = {
        user: { id: 'admin-user', role: 'admin', email: 'admin@intellfence.com' },
        clientId: 3, // Intellfence
        clientRole: 'owner',
        isPremium: true // Force premium just in case
    };

    try {
        const caller = appRouter.createCaller(mockCtx as any);
        console.log("Calling getSecurityFeeds...");
        const result = await caller.adversaryIntel.getSecurityFeeds({ limit: 10, clientId: 3 });
        console.log("Router Result:", JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error("Router Call Failed:", e);
        if (e.cause) console.error("Cause:", e.cause);
    } finally {
        await closeDb();
    }
}

testRouter();
