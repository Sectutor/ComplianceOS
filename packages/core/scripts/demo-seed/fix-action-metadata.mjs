// Fix double-encoded metadata in autopilot_actions (v2 — handles all nesting)
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 2 });

const rows = await sql`
  SELECT id, client_id, metadata FROM autopilot_actions
  WHERE client_id IN (788, 789)`;

let fixed = 0;
for (const r of rows) {
  let obj = r.metadata;
  // unwrap up to 3 levels of string encoding
  let hops = 0;
  while (typeof obj === "string" && hops < 3) {
    try { obj = JSON.parse(obj); hops++; } catch { break; }
  }
  if (obj && typeof obj === "object" && (obj.botId || obj.dedupeKey)) {
    await sql`UPDATE autopilot_actions SET metadata = ${sql.json(obj)} WHERE id = ${r.id}`;
    fixed++;
  }
}
console.log("fixed:", fixed, "of", rows.length);

const check = await sql`
  SELECT jsonb_typeof(metadata) AS t,
         jsonb_extract_path_text(metadata, 'proposedAction', 'kind') AS kind,
         count(*)::int AS n
  FROM autopilot_actions WHERE client_id IN (788,789)
  GROUP BY 1, 2 ORDER BY 1`;
console.log(JSON.stringify(check));
await sql.end();
