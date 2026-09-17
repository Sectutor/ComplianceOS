import '../env-loader';
import { getDb } from '../packages/core/src/db';
import { policyTemplates } from '../packages/core/src/schema';

async function checkPolicyTemplates() {
  const db = await getDb();
  const all = await db.select().from(policyTemplates);
  console.log('POLICY TEMPLATES IN DB:', all.length);
  all.slice(0, 50).forEach((t, i) => {
    console.log(`${i + 1}. [${t.framework || 'GENERAL'}] ${t.name} (ID: ${t.id})`);
  });
  process.exit(0);
}

checkPolicyTemplates().catch(err => {
  console.error(err);
  process.exit(1);
});
