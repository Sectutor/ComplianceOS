
import { vrmAgent } from '../lib/ai/vrm-agent';

async function testSupabase() {
    console.log("Testing Supabase Trust Center Discovery...");
    const url = await vrmAgent.discoverTrustCenter("Supabase", "https://supabase.com");
    console.log(`\nRESULT: ${url}`);
    
    if (url === 'https://www.supabase.com/trust' || url === 'https://trust.supabase.com') {
        console.log("✅ Success!");
    } else {
        console.log("❌ Failed to find the optimal trust center.");
    }
}

testSupabase().catch(console.error);
