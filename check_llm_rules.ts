
import 'dotenv/config';
import { getDb } from './db';
import { llmRouterRules, llmProviders } from './schema';
import { eq } from 'drizzle-orm';

async function checkRules() {
    try {
        const db = await getDb();
        const rules = await db.select({
            rule: llmRouterRules,
            provider: llmProviders
        })
            .from(llmRouterRules)
            .leftJoin(llmProviders, eq(llmRouterRules.providerId, llmProviders.id));

        console.log('LLM Router Rules:', JSON.stringify(rules, null, 2));
    } catch (error: any) {
        console.error('Error checking rules:', error.message);
    }
    process.exit(0);
}

checkRules();
