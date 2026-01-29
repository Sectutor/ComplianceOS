
import { getDb } from "../db";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Debugging Schema Loading...");
    try {
        const db = await getDb();
        console.log("DB Instance obtained.");

        // internal drizzle property to check schema
        const queryKeys = Object.keys(db.query);
        console.log("Registered Schema Keys:", queryKeys);

        if (db.query.privacyAssessments) {
            console.log("SUCCESS: privacyAssessments is present in db.query");
        } else {
            console.error("FAILURE: privacyAssessments is MISSING from db.query");
            process.exit(1);
        }
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

main();
