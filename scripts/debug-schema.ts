
import { getDb } from "../db";
import * as schema from "../schema";

async function checkSchema() {
    console.log("Checking DB schema registration...");
    try {
        const db = await getDb();

        // Check if the table is exported in schema object
        if ('vendorAssessmentRequests' in schema) {
            console.log("✅ vendorAssessmentRequests is exported in schema module.");
        } else {
            console.error("❌ vendorAssessmentRequests is NOT exported in schema module.");
        }

        // Check if it's available in db.query
        // @ts-ignore
        if (db.query && db.query.vendorAssessmentRequests) {
            console.log("✅ db.query.vendorAssessmentRequests exists.");
        } else {
            console.error("❌ db.query.vendorAssessmentRequests is UNDEFINED.");
            if (db.query) {
                console.log("Available keys in db.query:", Object.keys(db.query));
            } else {
                console.log("db.query itself is undefined!");
            }
        }
    } catch (error) {
        console.error("Error connecting to DB:", error);
    }
    process.exit(0);
}

checkSchema();
