import 'dotenv/config';
import { getDb, updateLLMProvider } from '../db';
import { llmProviders } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    const existing = await db.select().from(llmProviders).where(eq(llmProviders.provider, 'openai')).limit(1);

    if (existing.length > 0) {
        console.log(`Enabling embeddings for OpenAI provider (ID: ${existing[0].id})...`);
        await updateLLMProvider(existing[0].id, {
            supportsEmbeddings: true
        });
        console.log('Updated successfully.');
    } else {
        console.error('No OpenAI provider found to update.');
    }
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
