
import { config } from "dotenv";
config();
import { appRouter } from "../packages/core/src/routers";

async function main() {
    console.log("Testing NIST AI RMF Import...");
    try {
        // Mock context
        const ctx = {
            user: { id: 1, role: 'admin' },
            clientId: 1
        };

        const result = await appRouter.frameworks.importCustom({
            ctx,
            rawInput: {
                clientId: 1,
                type: "nist_ai_rmf"
            },
            path: "frameworks.importCustom",
            type: "mutation"
        } as any);

        console.log("Import Success! Result:", result);
        process.exit(0);
    } catch (e: any) {
        console.error("FAILED with error:", e);
        if (e.cause) console.error("Cause:", e.cause);
        process.exit(1);
    }
}

main();
