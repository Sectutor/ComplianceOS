import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sqlFile = path.resolve('scripts/db/2026-10-01-control-review-history.sql');
const statements = fs.readFileSync(sqlFile, 'utf8')
  .split(';')
  .map(s => s.replace(/--.*$/gm, '').trim())
  .filter(s => s.length > 0);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
for (const stmt of statements) {
  await sql.unsafe(stmt);
}
const check = await sql`
  select
    (select count(*)::int from client_control_history) as history_rows,
    (select count(*)::int from client_controls where next_review_date is not null) as with_review_date`;
console.log('migration ok:', check[0]);
await sql.end();
