
import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../db";
import { controls } from "../schema";
import { eq, sql } from "drizzle-orm";

async function checkControls() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        return;
    }

    console.log("Checking all controls...");

    const allControls = await db.select().from(controls);
    console.log(`Total controls found: ${allControls.length}`);

    const nistControls = allControls.filter(c => c.framework === 'NIST CSF');
    console.log(`NIST CSF controls found: ${nistControls.length}`);

    if (nistControls.length > 0) {
        console.log("Sample:", nistControls[0]);
    } else {
        console.log("Available frameworks:", [...new Set(allControls.map(c => c.framework))]);
    }
}

checkControls();
