import dotenv from 'dotenv';
import path from 'path';

const projectRoot = 'D:/OneDrive - Intellfence/WebDev/ComplianceOS';
dotenv.config({ path: path.join(projectRoot, '.env') });
import postgres from 'postgres';
import fs from 'fs';

async function main() {
  const sqlFile = path.join(projectRoot, 'packages/core/drizzle/0027_action_center_hitl_escalation.sql');
  const statements = fs.readFileSync(sqlFile, 'utf8')
    .split(';')
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 0);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  for (const stmt of statements) {
    console.log('Executing:', stmt.slice(0, 60) + '...');
    await sql.unsafe(stmt);
  }
  console.log('Migration 0027 applied successfully!');
  await sql.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
