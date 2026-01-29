import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../db";
import { controls } from "../schema";
import { eq } from "drizzle-orm";

async function verify() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        return;
    }
    const control = await db.select().from(controls).where(eq(controls.controlId, "GV.OC-01")).limit(1);

    if (control.length > 0) {
        console.log("Control ID:", control[0].controlId);
        console.log("Guidance Preview:", control[0].implementationGuidance?.substring(0, 100));
        console.log("Guidance Length:", control[0].implementationGuidance?.length);
    } else {
        console.log("Control GV.OC-01 not found");
    }
}

verify().catch(console.error);
