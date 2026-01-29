
import 'dotenv/config';
import OpenAI from 'openai';
import { getDb } from '../db';
import { llmProviders } from '../schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/crypto';

async function testDeepSeekEmbeddings() {
    const db = await getDb();
    const providers = await db.select().from(llmProviders).where(eq(llmProviders.provider, 'deepseek'));

    if (providers.length === 0) {
        console.log('No DeepSeek provider found.');
        return;
    }

    const p = providers[0];
    const apiKey = decrypt(p.apiKey);
    const originalBaseUrl = p.baseUrl;

    const urlsToTest = [
        originalBaseUrl,
        originalBaseUrl.replace(/\/$/, '') + '/v1', // append /v1
        'https://api.deepseek.com/beta', // Try beta
    ];

    for (const url of urlsToTest) {
        if (!url) continue;
        console.log(`\n🧪 Testing Base URL: ${url} ...`);

        const client = new OpenAI({ apiKey, baseURL: url });

        try {
            const response = await client.embeddings.create({
                model: 'deepseek-embeddings', // Try this name
                input: 'Test embedding',
            });
            console.log('✅ Success! Model: deepseek-embeddings');
            console.log('Dimensions:', response.data[0].embedding.length);
            return; // Found it
        } catch (e: any) {
            console.log(`❌ Failed (deepseek-embeddings): ${e.status} ${e.message}`);
        }

        // Try fallback model name just in case 'deepseek-coder' or 'deepseek-chat' supports it (unlikely)
        try {
            // Some providers use the chat model name for embeddings too? Unlikely.
        } catch (e) { }
    }
}

testDeepSeekEmbeddings().catch(console.error);
