
import { getDb } from './packages/core/src/db';
import { llmProviders } from './packages/core/src/schema';

async function checkProviders() {
  const db = await getDb();
  const providers = await db.select().from(llmProviders);
  console.log("Providers:", JSON.stringify(providers, null, 2));
}

checkProviders();
