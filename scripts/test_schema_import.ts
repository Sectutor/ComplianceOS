
import { privacyAssessments } from "../schema";
import { getDb } from "../db";

async function main() {
    console.log("Testing schema import...");
    if (privacyAssessments) {
        console.log("privacyAssessments is DEFINED");
        console.log("Table name:", privacyAssessments._.name);
    } else {
        console.error("privacyAssessments is UNDEFINED");
        process.exit(1);
    }

    try {
        console.log("Testing getDb...");
        const db = await getDb();
        console.log("db obtained.");
        if (db.query.privacyAssessments) {
            console.log("db.query.privacyAssessments is DEFINED");
        } else {
            console.error("db.query.privacyAssessments is UNDEFINED. Keys:", Object.keys(db.query));
        }
    } catch (e) {
        console.error("Error in getDb:", e);
    }
}

main();
