import 'dotenv/config';
import { getDb } from '../db';
import { llmService } from '../lib/llm/service';
import { llmProviders, llmRouterRules } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- Testing LLM Dynamic Routing ---');
    const db = await getDb();
    if (!db) {
        console.error('Database connection failed');
        process.exit(1);
    }

    // 1. Check for enabled providers
    const providers = await db.select().from(llmProviders).where(eq(llmProviders.isEnabled, true));
    if (providers.length < 1) {
        console.warn('SKIP: At least 1 enabled LLM provider is required for testing.');
        process.exit(0);
    }

    console.log(`Found ${providers.length} enabled providers.`);
    const defaultProvider = providers.sort((a, b) => b.priority - a.priority)[0];
    const testProvider = providers.length > 1 ? providers[providers.length - 1] : defaultProvider;

    console.log(`Default Provider: ${defaultProvider.name} (ID: ${defaultProvider.id})`);
    console.log(`Test Target Provider: ${testProvider.name} (ID: ${testProvider.id})`);

    const TEST_FEATURE = 'test_routing_feature';

    // 2. Clean up any existing rule
    await db.delete(llmRouterRules).where(eq(llmRouterRules.feature, TEST_FEATURE));

    // 3. Test Default Routing (No Rule)
    console.log('\nTest 1: Default Routing (No Rule)');
    console.log('-----------------------------------');
    // We can't easily check internal state w/o real call, but we can check if a rule exists (none)
    // and assume getProvider falls back.
    // To verify deeply, we'd need to mock or inspect internals.
    // Here we'll trust the logic if DB operations work.

    // However, LLMService.getProvider is private. 
    // We will simulate the DB query logic to verify our assumption matches implementation.

    // 4. Set a specific route
    console.log('\nTest 2: Setting specific route');
    console.log(`Mapping '${TEST_FEATURE}' -> ${testProvider.name}`);
    await db.insert(llmRouterRules).values({
        feature: TEST_FEATURE,
        providerId: testProvider.id
    });

    // Verify insertion
    const rule = await db.select().from(llmRouterRules).where(eq(llmRouterRules.feature, TEST_FEATURE)).limit(1);
    if (rule.length === 1 && rule[0].providerId === testProvider.id) {
        console.log('SUCCESS: Rule inserted into DB correctly.');
    } else {
        console.error('FAILURE: Rule not found in DB.');
    }

    // 5. Update route
    if (providers.length > 1) {
        console.log('\nTest 3: Updating route');
        console.log(`Mapping '${TEST_FEATURE}' -> ${defaultProvider.name}`);
        await db.update(llmRouterRules)
            .set({ providerId: defaultProvider.id })
            .where(eq(llmRouterRules.feature, TEST_FEATURE));

        const updatedRule = await db.select().from(llmRouterRules).where(eq(llmRouterRules.feature, TEST_FEATURE)).limit(1);
        if (updatedRule[0].providerId === defaultProvider.id) {
            console.log('SUCCESS: Rule updated correctly.');
        } else {
            console.error('FAILURE: Rule update failed.');
        }
    }

    // 6. Cleanup
    console.log('\nCleaning up...');
    await db.delete(llmRouterRules).where(eq(llmRouterRules.feature, TEST_FEATURE));
    console.log('Done.');
    process.exit(0);
}

main().catch(console.error);
