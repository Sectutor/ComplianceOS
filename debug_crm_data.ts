
import { config } from "dotenv";
config();
import { getDb } from "./db";
import { crmEngagements, crmContacts, crmActivities, clients, users, userClients } from "./schema";
import { eq, and } from "drizzle-orm"; // Added 'and' check

async function main() {
    console.log("Starting Insert-Only Seed...");
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        return;
    }

    const uniqueSuffix = Date.now().toString().slice(-4);
    const domain = `acme-${uniqueSuffix}.com`;

    try {
        // 1. Client
        console.log("Creating Client...");
        const [newClient] = await db.insert(clients).values({
            name: `Acme Corp ${uniqueSuffix}`,
            domain: domain,
            industry: "FinTech",
            activeModules: ["crm", "controls", "policies"]
        }).returning();
        const clientId = newClient.id;
        console.log("Client ID:", clientId);

        // 2. User
        console.log("Creating User...");
        const [newUser] = await db.insert(users).values({
            email: `sarah@${domain}`,
            name: "Sarah Jenkins",
            openId: `sim-user-${uniqueSuffix}`,
            role: "admin"
        }).returning();
        const userId = newUser.id;

        await db.insert(userClients).values({ userId, clientId, role: "admin" });

        // 3. Engagement
        console.log("Creating Engagement...");
        await db.insert(crmEngagements).values({
            clientId,
            title: `SOC 2 Type 2 ${uniqueSuffix}`,
            framework: "SOC 2",
            stage: "audit_prep",
            priority: "high",
            progress: 85,
            controlsCount: 15,
            mitigatedRisksCount: 12,
            targetDate: new Date("2025-12-15")
        });

        // 4. Contact
        await db.insert(crmContacts).values({
            clientId,
            firstName: "Marcus",
            lastName: "Torres",
            email: `marcus.cto@${domain}`,
            jobTitle: "CTO",
            isPrimary: true
        });

        // 5. Activities
        const activities = [
            { type: "meeting", subject: "Kickoff", occurredAt: new Date("2025-01-15") },
            { type: "task", subject: "MFA Implemented", occurredAt: new Date("2025-03-10") },
            { type: "note", subject: "Audit Fix", occurredAt: new Date() }
        ];

        for (const act of activities) {
            await db.insert(crmActivities).values({
                clientId,
                userId,
                type: act.type as any,
                subject: act.subject,
                occurredAt: act.occurredAt
            });
        }
        console.log("Seed Complete!");

    } catch (e) {
        console.error("SEED FAILED:", e);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
