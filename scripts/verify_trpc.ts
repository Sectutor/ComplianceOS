import 'dotenv/config';
import { appRouter } from '../routers';

async function verifyTrpc() {
    console.log("Starting TRPC Verification...");
    try {
        // Mock context for public procedure
        const caller = appRouter.createCaller({
            req: {} as any,
            res: {} as any,
            user: undefined,
            clientId: undefined
        });

        console.log("Caller created. Calling controls.listPaginated...");
        const result = await caller.controls.listPaginated({
            limit: 10,
            offset: 0,
            framework: "all",
            search: ""
        });
        console.log(`Success! Retrieved ${result.items.length} controls. Total: ${result.total}`);
        process.exit(0);
    } catch (e) {
        console.error("TRPC Verification Failed:", e);
        process.exit(1);
    }
}

verifyTrpc();
