import { getDb } from "../db.js";
import { controls } from "../schema.js";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function checkFrameworks() {
  const db = await getDb();
  const result = await db.execute(sql`SELECT DISTINCT framework FROM controls ORDER BY framework`);
  console.log("Distinct Frameworks in DB:");
  result.forEach(r => console.log(`- '${r.framework}'`));
}

checkFrameworks()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
