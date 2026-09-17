import { getDb } from "../src/db";
import { users, personalAccessTokens } from "../src/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function main() {
    const db = await getDb();
    
    // 1. Find an admin/premium user
    const user = await db.query.users.findFirst({
        where: eq(users.role, 'admin')
    });

    if (!user) {
        console.error("No admin user found to test with.");
        process.exit(1);
    }

    console.log(`Found user: ${user.email} (${user.id})`);

    // 2. Generate a test PAT
    const secret = crypto.randomBytes(24).toString('hex');
    const token = `cos_${secret}`;
    const prefix = token.substring(0, 8);
    
    await db.insert(personalAccessTokens).values({
        userId: user.id,
        name: "INTEGRATION_TEST_TOKEN",
        token: token,
        prefix: prefix,
    });

    console.log("\n--- TEST CREDENTIALS ---");
    console.log(`PAT: ${token}`);
    console.log(`USER_ID: ${user.id}`);
    console.log("------------------------\n");
    
    console.log("You can now test the API with:");
    console.log(`curl -X GET "http://localhost:3002/api/trpc/mcp.listProjects?batch=1&input=%7B%220%22%3A%7B%22clientId%22%3A1%7D%7D" -H "Authorization: Bearer ${token}"`);
    
    process.exit(0);
}

main().catch(console.error);
