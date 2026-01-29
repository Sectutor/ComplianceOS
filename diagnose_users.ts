
import 'dotenv/config';
import { getDb } from './db';
import { users, userClients, clients } from './schema';
import { eq } from 'drizzle-orm';

async function diagnose() {
    try {
        const db = await getDb();

        console.log("--- USERS ---");
        const allUsers = await db.select().from(users);
        allUsers.forEach(u => {
            console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
        });

        console.log("\n--- USER-CLIENT ASSIGNMENTS ---");
        const assignments = await db.select({
            userName: users.name,
            userEmail: users.email,
            clientName: clients.name,
            role: userClients.role
        })
            .from(userClients)
            .innerJoin(users, eq(userClients.userId, users.id))
            .innerJoin(clients, eq(userClients.clientId, clients.id));

        if (assignments.length === 0) {
            console.log("No assignments found in user_clients table.");
        } else {
            assignments.forEach(a => {
                console.log(`User: ${a.userEmail} (${a.userName}) -> Client: ${a.clientName} [Role: ${a.role}]`);
            });
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

diagnose();
