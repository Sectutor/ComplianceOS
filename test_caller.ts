
import './env-loader';
import { appRouter } from './packages/core/src/routers';
import { createContext } from './packages/core/src/server/context';

async function testProcedure() {
    const caller = appRouter.createCaller({
        user: { id: 1, role: 'admin' },
        req: {} as any,
        res: {} as any,
    } as any);

    try {
        console.log('Testing notifications.getUnreadCount...');
        const count = await caller.notifications.getUnreadCount();
        console.log('Unread count result:', count);
        
        console.log('Testing cyber.autoSyncNis2FromIso (dry run check)...');
        // This will likely fail with DB error if not careful, but we want to see if the function exists
        if (typeof (caller as any).cyber?.autoSyncNis2FromIso === 'function') {
            console.log('cyber.autoSyncNis2FromIso exists as a function on caller');
        } else {
            console.log('cyber.autoSyncNis2FromIso MISSING on caller');
        }
    } catch (e: any) {
        console.error('Caller Test Error:', e.message);
    }
}

testProcedure().catch(console.error);
