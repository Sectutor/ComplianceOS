import 'dotenv/config';
import { llmService } from '../lib/llm/service';
import { getDb } from '../db';
import { llmProviders } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- Testing OpenAI Embeddings ---');
    console.log('1. Verifying Provider Configuration...');

    const db = await getDb();
    const providers = await db.select().from(llmProviders)
        .where(eq(llmProviders.provider, 'openai'));

    if (providers.length === 0) {
        console.error('ERROR: No OpenAI provider found in database.');
        process.exit(1);
    }

    const openai = providers[0];
    console.log(`Found OpenAI Provider: ${openai.name} (ID: ${openai.id})`);
    console.log(`Enabled: ${openai.isEnabled}`);
    console.log(`Supports Embeddings: ${openai.supportsEmbeddings}`);

    if (!openai.isEnabled) {
        console.error('ERROR: OpenAI provider is disabled.');
        process.exit(1);
    }

    console.log('\n2. Generating Embeddings...');
    const testText = "ComplianceOS is an advanced governance platform.";
    console.log(`Input Text: "${testText}"`);

    try {
        const embedding = await llmService.getEmbeddings(testText);
        console.log('\nSUCCESS! Embedding generated.');
        console.log(`Vector Dimensions: ${embedding.length}`);
        console.log(`Sample (first 5 values): [${embedding.slice(0, 5).join(', ')}...]`);

        if (embedding.length === 1536) {
            console.log('Dimension check passed (1536 for text-embedding-3-small/ada-002)');
        } else {
            console.warn(`WARNING: Unexpected dimension ${embedding.length}. Expected 1536 for standard OpenAI models.`);
        }
    } catch (error: any) {
        console.error('\nERROR: Failed to generate embeddings.');
        console.error(error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        process.exit(1);
    }

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
