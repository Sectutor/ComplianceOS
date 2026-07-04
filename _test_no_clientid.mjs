import fs from 'fs';
import path from 'path';

// Load .env.local with real values FIRST
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

const base = 'http://localhost:3002/api/trpc';

// Test WITHOUT x-client-id — simulating frontend behavior
const hdrs = {
  'Authorization': `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
};

console.log('=== 1. startTrial WITHOUT x-client-id (frontend scenario) ===');
const r1 = await fetch(`${base}/addons.startTrial?batch=1`, {
  method: 'POST',
  headers: hdrs,
  body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner' } } }),
});
const t1 = await r1.text();
console.log('Status:', r1.status, t1.substring(0, 500));

console.log('\n=== 2. listMySubscriptions WITHOUT x-client-id ===');
const r2 = await fetch(`${base}/addons.listMySubscriptions?batch=1`, { headers: hdrs });
const t2 = await r2.text();
console.log('Status:', r2.status, t2.substring(0, 500));

// Now test WITH clientId in input
console.log('\n=== 3. startTrial WITH clientId in input ===');
const r3 = await fetch(`${base}/addons.startTrial?batch=1`, {
  method: 'POST',
  headers: hdrs,
  body: JSON.stringify({ "0": { json: { slug: 'cloud-scanner', clientId: 3 } } }),
});
const t3 = await r3.text();
console.log('Status:', r3.status, t3.substring(0, 500));

// Cleanup
const { default: postgres } = await import('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
await sql`DELETE FROM addon_subscriptions WHERE addon_slug IN ('cloud-scanner')`;
console.log('\nCleaned up');
await sql.end();
