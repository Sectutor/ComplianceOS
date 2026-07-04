import 'dotenv/config';
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

const { default: postgres } = await import('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 2 });

const subs = await sql`SELECT id, client_id, addon_slug, status, settings FROM addon_subscriptions WHERE client_id = 3 AND addon_slug = 'cloud-scanner' LIMIT 1`;
for (const s of subs) {
  console.log('id:', s.id);
  console.log('client_id:', s.client_id);
  console.log('addon_slug:', s.addon_slug);
  console.log('status:', s.status);
  console.log('settings:', JSON.stringify(s.settings, null, 2));
  console.log('awsAccounts:', s.settings?.awsAccounts);
  console.log('awsAccounts length:', s.settings?.awsAccounts?.length);
}
await sql.end();
