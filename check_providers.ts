import 'dotenv/config';
import { getDb } from './db';
import { llmProviders } from './schema';

async function main() {
  try {
    const db = await getDb();
    const providers = await db.select().from(llmProviders);
    console.log('--- LLM Providers ---');
    console.table(providers.map(p => ({
       id: p.id,
       provider: p.provider,
       model: p.model,
       isEnabled: p.isEnabled,
       priority: p.priority,
       baseUrl: p.baseUrl
    })));
  } catch (e) {
    console.error(e);
  }
}

main().then(() => process.exit(0));
