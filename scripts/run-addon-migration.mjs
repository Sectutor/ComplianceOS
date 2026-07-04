// Run addon migration
import { readFileSync } from 'fs';
import { Pool } from 'pg';

// Read env manually
const envRaw = readFileSync('.env.local', 'utf-8');
const DATABASE_URL = envRaw.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

if (!DATABASE_URL) {
  console.error('No DATABASE_URL found in .env.local');
  process.exit(1);
}

// Redact password for logging
const masked = DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASS@');
console.log('Using:', masked);

const sql = readFileSync('packages/addons/migrations/001_addon_subscriptions.sql', 'utf-8');

const pool = new Pool({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

pool.query(sql)
  .then(r => {
    console.log('✓ Migration applied successfully');
    console.log(`  Statements executed: ${r.length}`);
    process.exit(0);
  })
  .catch(e => {
    console.error('✗ Migration failed:', e.message);
    console.error('  Hint:', e.hint || 'none');
    process.exit(1);
  });
