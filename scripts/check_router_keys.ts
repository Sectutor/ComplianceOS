
import { appRouter } from '../routers';

console.log("Checking appRouter keys...");
try {
    // tRPC v10/v11 structure
    const procedures = appRouter._def.procedures;
    const keys = Object.keys(procedures);
    console.log("Total procedures:", keys.length);
    
    const integrationProcs = keys.filter(k => k.startsWith('integrations.'));
    console.log("Integration procedures:", integrationProcs);
    
    if (integrationProcs.length === 0) {
        console.error("❌ 'integrations' namespace NOT found in appRouter!");
        console.log("Available namespaces:", [...new Set(keys.map(k => k.split('.')[0]))].sort());
    } else {
        console.log("✅ 'integrations' namespace found!");
    }

} catch (e) {
    console.error("Error inspecting router:", e);
}
