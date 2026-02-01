
import { config } from "dotenv";
config();
import { appRouter } from "../packages/core/src/routers";

async function main() {
    console.log("Testing NIST AI RMF Import via Router...");
    try {
        const result = await (appRouter as any).frameworks.importCustom._def.mutation({
            ctx: { user: { id: 1, role: 'admin' }, clientId: 1 },
            rawInput: { clientId: 1, type: "nist_ai_rmf" },
            input: { clientId: 1, type: "nist_ai_rmf" },
            path: "frameworks.importCustom"
        });

        console.log("Success! Result:", result);
        process.exit(0);
    } catch (e: any) {
        console.error("FAILED with error:", e);
        process.exit(1);
    }
}

main();
