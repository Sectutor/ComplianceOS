
import 'dotenv/config';
import * as db from '../db';
import * as schema from '../schema';

async function main() {
    console.log("Starting Debug Process Create...");
    try {
        const input = {
            clientId: 3,
            name: "Debug Process " + Date.now(),
            department: "IT",
            description: "Testing insertion",
            criticalityTier: "Tier 2",
            rto: "24h",
            rpo: "4h",
            mtpd: "72h"
        };
        console.log("Input:", input);
        const result = await db.createBusinessProcess(input);
        console.log("Result:", result);
    } catch (e: any) {
        console.error("ERROR CAUGHT:", e);
    }
    process.exit(0);
}

main();
