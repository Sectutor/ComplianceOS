
import { config } from "dotenv";
config();
import { getControlsPaginated } from "../packages/core/src/db";

async function main() {
    console.log("Testing getControlsPaginated...");
    try {
        const result = await getControlsPaginated(
            ["CIS Critical Security Controls"],
            undefined,
            50,
            0,
            "firewall"
        );
        console.log("Success! Items count:", result.items.length, "Total:", result.total);
        process.exit(0);
    } catch (e: any) {
        console.error("FAILED with error:", e.message);
        console.error(e.stack);
        process.exit(1);
    }
}

main();
