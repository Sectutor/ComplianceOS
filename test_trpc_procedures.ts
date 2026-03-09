
import './env-loader';
import { appRouter } from './packages/core/src/routers';

async function testRouter() {
    console.log('--- Router Test ---');
    const procedures = (appRouter as any)._def.procedures;
    const paths = Object.keys(procedures);
    console.log('Total procedures:', paths.length);
    
    const cyberPaths = paths.filter(p => p.startsWith('cyber.'));
    console.log('Cyber paths:', cyberPaths);
    
    const notifPaths = paths.filter(p => p.startsWith('notifications.'));
    console.log('Notifications paths:', notifPaths);

    if (paths.includes('cyber.autoSyncNis2FromIso')) {
        console.log('SUCCESS: cyber.autoSyncNis2FromIso found');
    } else {
        console.log('FAILURE: cyber.autoSyncNis2FromIso NOT found');
    }

    if (paths.includes('notifications.getUnreadCount')) {
        console.log('SUCCESS: notifications.getUnreadCount found');
    } else {
        console.log('FAILURE: notifications.getUnreadCount NOT found');
    }
}

console.log('Starting test...');
testRouter().then(() => console.log('Done.')).catch(e => {
    console.error('CRASH:', e);
    process.exit(1);
});
