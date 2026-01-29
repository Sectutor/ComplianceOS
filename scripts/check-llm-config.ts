
import 'dotenv/config';
import { getDb } from '../db';
import { llmProviders } from '../schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/crypto';

async function checkLLMConfig() {
    const db = await getDb();

    console.log('🔍 Checking enabled LLM providers...');

    const providers = await db.select().from(llmProviders).where(eq(llmProviders.isEnabled, true));

    if (providers.length === 0) {
        console.log('❌ No enabled LLM providers found.');
    } else {
        for (const p of providers) {
            console.log(`\nProvider: ${p.name} (${p.provider})`);
            console.log(`Model: ${p.model}`);
            console.log(`Base URL: ${p.baseUrl || 'Default (OpenAI)'}`);
            console.log(`Supports Embeddings: ${p.supportsEmbeddings}`);
            console.log(`API Key set: ${p.apiKey ? 'Yes' : 'No'}`);
        }
    }
}

checkLLMConfig().catch(console.error);
