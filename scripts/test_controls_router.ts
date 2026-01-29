
import 'dotenv/config';
import { appRouter } from "../routers";
import * as db from '../db';

async function main() {
    console.log("Testing Controls Router...");

    // Mock Context
    const ctx = {
        req: {} as any,
        res: {} as any,
        user: { id: 1, email: "test@example.com", name: "Test User" },
        clientRole: 'admin'
    };

    const caller = appRouter.createCaller(ctx);

    try {
        if (!caller.controls) {
            console.error("ERROR: caller.controls is undefined");
            return;
        }

        console.log("Calling controls.list({})...");
        const result = await caller.controls.list({});
        console.log("Result Type:", typeof result);
        console.log("Is Array?", Array.isArray(result));

        if (!Array.isArray(result)) {
            console.log("Result Keys:", Object.keys(result));
            console.log("First key value:", (result as any)[Object.keys(result)[0]]);
        } else {
            console.log("Count:", result.length);
        }

    } catch (e: any) {
        console.error("TRPC Call Failed:", e);
    }
}

main().catch(console.error);
