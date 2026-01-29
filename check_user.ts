import { getDb } from "./db";
import { users, userClients } from "./schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const db = await getDb();
    const openId = "4510723e-3d54-4f63-9468-e3cfeb55b625";
    const email = "emmanuel@intellfence.com";

    console.log(`Checking user with openId: ${openId} and email: ${email}`);

    const foundUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (foundUser.length === 0) {
        console.log("User not found in DB.");
    } else {
        const user = foundUser[0];
        console.log(`User found: ID=${user.id}, email=${user.email}, role=${user.role}`);

        const memberships = await db.select().from(userClients).where(eq(userClients.userId, user.id));
        console.log(`Memberships found: ${memberships.length}`);
        memberships.forEach(m => {
            console.log(` - Client ID: ${m.clientId}, Role: ${m.role}`);
        });
    }

    process.exit(0);
}

main().catch(console.error);
