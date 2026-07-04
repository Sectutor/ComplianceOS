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
const { default: postgres } = await import('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 2 });

try {
  // 1. Start trial for cloud-scanner
  console.log('=== 1. startTrial ===');
  const r1 = await fetch(`${base}/addons.startTrial?batch=1`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner' } } }),
  });
  const t1 = await r1.text();
  console.log('Status:', r1.status, r1.ok ? 'OK' : t1.substring(0, 100));

  // 2. Configure with a mock AWS account so the connector runs
  console.log('\n=== 2. updateSettings (add AWS account) ===');
  const r2 = await fetch(`${base}/addons.updateSettings?batch=1`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner', settings: { awsAccounts: [{ name: 'Demo AWS', accessKeyId: 'AKIA123', secretAccessKey: 'secret123', regions: ['us-east-1'] }], frameworks: ['nist_csf_2.0', 'soc2'], schedule: 'weekly' } } } }),
  });
  console.log('Status:', r2.status, r2.ok ? 'OK' : await r2.text().then(t => t.substring(0, 100)));

  // 3. Run Now — triggers the Prowler connector which uses mock data
  console.log('\n=== 3. runNow ===');
  const r3 = await fetch(`${base}/addons.runNow?batch=1`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner' } } }),
  });
  const t3 = await r3.text();
  console.log('Status:', r3.status, t3.substring(0, 300));

  // 4. Get run history
  console.log('\n=== 4. getRunHistory ===');
  const r4 = await fetch(`${base}/addons.getRunHistory?batch=1&input=${encodeURIComponent(JSON.stringify({0:{json:{slug:'cloud-scanner',limit:5,offset:0}}}))}`, { headers: hdrs });
  const t4 = await r4.text();
  console.log('Status:', r4.status, t4.substring(0, 400));

  // 5. Verify risks were created in the DB
  console.log('\n=== 5. Verifying risk_scenarios in DB ===');
  const risks = await sql`SELECT id, title, inherent_risk, status FROM risk_scenarios WHERE client_id = 3 ORDER BY id DESC LIMIT 10`;
  console.log('Risks created:', risks.length);
  for (const r of risks) {
    console.log(`  id=${r.id} title=${(r.title || '').substring(0, 60)} risk=${r.inherent_risk} status=${r.status}`);
  }

  // 6. Verify evidence
  console.log('\n=== 6. Verifying evidence in DB ===');
  const ev = await sql`SELECT id, evidence_id, type FROM evidence WHERE client_id = 3 ORDER BY id DESC LIMIT 5`;
  console.log('Evidence created:', ev.length);
  for (const e of ev) {
    console.log(`  id=${e.id} evidenceId=${e.evidence_id} type=${e.type}`);
  }

  // 7. Verify run logs
  console.log('\n=== 7. addon_run_logs ===');
  const logs = await sql`SELECT id, status, findings_count, risks_created, evidence_pushed, duration_seconds, error_message FROM addon_run_logs WHERE client_id = 3 ORDER BY id DESC LIMIT 5`;
  console.log('Run logs:', logs.length);
  for (const l of logs) {
    console.log(`  id=${l.id} status=${l.status} findings=${l.findings_count} risks=${l.risks_created} evidence=${l.evidence_pushed} duration=${l.duration_seconds}s error=${l.error_message || 'none'}`);
  }

} catch (e) {
  console.error('Error:', e.message);
} finally {
  // Cleanup test data
  await sql`DELETE FROM risk_scenarios WHERE id IN (SELECT id FROM risk_scenarios WHERE client_id = 3 ORDER BY id DESC LIMIT 10)`;
  await sql`DELETE FROM evidence WHERE id IN (SELECT id FROM evidence WHERE client_id = 3 ORDER BY id DESC LIMIT 10)`;
  await sql`DELETE FROM addon_run_logs WHERE client_id = 3`;
  await sql`DELETE FROM addon_subscriptions WHERE client_id = 3 AND addon_slug = 'cloud-scanner'`;
  await sql.end();
  console.log('\nCleaned up test data');
}
