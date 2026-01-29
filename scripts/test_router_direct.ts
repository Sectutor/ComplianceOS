
import 'dotenv/config'; // Use the simple config that worked for .env
import { appRouter } from "../routers";
import * as db from '../db';

async function main() {
    console.log("Testing Gap Analysis Router (Simple Env)...");

    // Mock Context
    const ctx = {
        req: {} as any,
        res: {} as any,
        user: { id: 1, email: "test@example.com", name: "Test User" },
    };

    const caller = appRouter.createCaller(ctx);

    try {
        console.log("Calling gapAnalysis.list({ clientId: 3 })...");
        const result = await caller.gapAnalysis.list({ clientId: 3 });
        console.log("Result Success!");
        console.log("Count:", result.length);
        console.log("First item:", result[0]);

        if (result.length > 0) {
            console.log("CreatedAt type:", typeof result[0].createdAt);
            console.log("CreatedAt value:", result[0].createdAt);
            console.log("Is Date instance?", result[0].createdAt instanceof Date);
        }

    } catch (e: any) {
        console.error("TRPC Call Failed:", e);
    }
}

main().catch(console.error);
