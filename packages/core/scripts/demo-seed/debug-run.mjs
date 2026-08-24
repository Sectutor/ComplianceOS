import postgres from "postgres";
import { seedPhase1 } from "./phase1-governance.mjs";
const sql = postgres(process.env.DATABASE_URL, { max: 5 });
const c = await sql`select max(id) id from clients`;
await seedPhase1(sql, c[0].id).catch(e => {
  console.error("FAILED:", e.code, e.detail);
}).then(async r => { if (r) console.log("OK", JSON.stringify(r)); await sql.end(); });
