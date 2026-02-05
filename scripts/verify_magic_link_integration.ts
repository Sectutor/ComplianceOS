import { getDb } from "../packages/core/src/db";
import { magicLinks } from "../packages/core/src/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";

async function verifyMagicLinkIntegration() {
    try {
        const db = await getDb();
        console.log("Verifying interaction with 'magic_links' table...");

        const testToken = `test-verify-${crypto.randomUUID()}`;

        // 1. Insert
        console.log("1. Attempting Insert...");
        const [inserted] = await db.insert(magicLinks).values({
            token: testToken,
            label: "Verification Test Link",
            createdById: 1, // Assuming user ID 1 exists, or use a known ID. If strict FK, this might fail.
            expiresAt: new Date(Date.now() + 86400000)
        }).returning();

        if (!inserted) throw new Error("Insert returned no result");
        console.log("   Insert successful:", inserted.id);

        // 2. Select
        console.log("2. Attempting Select...");
        const [fetched] = await db.select().from(magicLinks).where(eq(magicLinks.token, testToken));

        if (!fetched) throw new Error("Select returned no result");
        console.log("   Select successful:", fetched.label);

        // 3. Delete
        console.log("3. Attempting Delete...");
        await db.delete(magicLinks).where(eq(magicLinks.id, inserted.id));
        console.log("   Delete successful");

        console.log("SUCCESS: Application ORM is correctly mapped to the database table.");
        process.exit(0);
    } catch (e) {
        console.error("FAILURE: Magic Link integration test failed:", e);
        process.exit(1);
    }
}

verifyMagicLinkIntegration();
