import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const dotenv = await import('dotenv');
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) process.env[k] = envConfig[k];
}
const { config } = await import('dotenv');
config();

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'admin@intellfence.com',
  password: 'NKssnyw47!@',
});

const hdrs = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'x-client-id': '3' };
const base = 'http://localhost:3002/api/trpc';

// 1. Start trial
console.log('=== 1. startTrial ===');
const r1 = await fetch(`${base}/addons.startTrial?batch=1`, {
  method: 'POST', headers: hdrs,
  body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner' } } }),
});
const t1 = await r1.text();
console.log('Status:', r1.status);

// 2. Update settings
console.log('\n=== 2. updateSettings ===');
const settingsData = { awsAccounts: [{ name: 'Demo AWS', accessKeyId: 'AKIA123', secretAccessKey: 'secret123', regions: ['us-east-1'] }], frameworks: ['nist_csf_2.0', 'soc2'], schedule: 'weekly' };
const r2 = await fetch(`${base}/addons.updateSettings?batch=1`, {
  method: 'POST', headers: hdrs,
  body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner', settings: settingsData } } }),
});
const t2 = await r2.text();
console.log('Status:', r2.status, r2.ok ? 'OK' : t2.substring(0, 100));

// 3. Read subscription from DB to verify
const { default: postgres } = await import('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const subs = await sql`SELECT id, client_id, addon_slug, status, settings FROM addon_subscriptions WHERE client_id = 3 AND addon_slug = 'cloud-scanner' LIMIT 1`;
console.log('\n=== DB: subscriptions ===');
for (const s of subs) {
  console.log('settings.awsAccounts:', JSON.stringify(s.settings?.awsAccounts));
  console.log('awsAccounts?.length:', s.settings?.awsAccounts?.length);
}

// 4. Run Now
console.log('\n=== 3. runNow ===');
const r3 = await fetch(`${base}/addons.runNow?batch=1`, {
  method: 'POST', headers: hdrs,
  body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner' } } }),
});
const t3 = await r3.text();
console.log('Status:', r3.status);
const json3 = JSON.parse(t3);
if (json3[0]?.error) {
  console.log('Error:', json3[0].error.json.message);
} else {
  console.log('Success:', JSON.stringify(json3[0]?.result?.data?.json).substring(0, 200));
}

// 5. Check run status
const logs = await sql`SELECT id, status, error_message, risks_created, evidence_pushed FROM addon_run_logs WHERE client_id = 3 ORDER BY id DESC LIMIT 1`;
console.log('\n=== Last run log ===');
for (const l of logs) {
  console.log(`id=${l.id} status=${l.status} error=${l.error_message || 'none'} risks=${l.risks_created} evidence=${l.evidence_pushed}`);
}

// 6. Check risks & evidence created
const risks = await sql`SELECT COUNT(*)::int as c FROM risk_scenarios WHERE client_id = 3 AND title LIKE '%Prowler%' OR title LIKE '%[aws]%'`;
console.log('\nRisks from this run:', risks[0]?.c || 0);

// Cleanup
await sql`DELETE FROM risk_scenarios WHERE id IN (SELECT id FROM risk_scenarios WHERE client_id = 3 ORDER BY id DESC LIMIT 20)`;
await sql`DELETE FROM evidence WHERE id IN (SELECT id FROM evidence WHERE client_id = 3 ORDER BY id DESC LIMIT 20)`;
await sql`DELETE FROM addon_run_logs WHERE client_id = 3`;
await sql`DELETE FROM addon_subscriptions WHERE client_id = 3 AND addon_slug = 'cloud-scanner'`;
await sql.end();
console.log('\nCleaned up');
