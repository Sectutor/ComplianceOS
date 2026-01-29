import 'dotenv/config';
import { getDb } from "../db";
import { approvalRequests } from "../schema";

async function seed() {
    console.log("Seeding approval requests...");
    const db = await getDb();
    if (!db) process.exit(1);

    try {
        const requests = [
            {
                clientId: 1, // Assuming client 1 exists
                title: "Risk Treatment Plan - Q1 2026",
                description: "Comprehensive risk treatment plan including new mitigation strategies.",
                entityType: "risk-treatment",
                entityId: 101,
                status: "pending" as const,
                submitterId: 1, // Assuming user 1 exists
                requiredRoles: ["CISO", "CEO"]
            },
            {
                clientId: 1,
                title: "Information Security Policy v2.0",
                description: "Major update to the ISP regarding AI usage policies.",
                entityType: "policy",
                entityId: 202,
                status: "pending" as const,
                submitterId: 1,
                requiredRoles: ["CISO", "Legal"]
            },
            {
                clientId: 1,
                title: "SOC 2 Type II Report Review",
                description: "External audit report review and acceptance.",
                entityType: "audit-report",
                entityId: 303,
                status: "approved" as const, // Pre-approved one
                submitterId: 1,
                requiredRoles: ["CISO"]
            }
        ];

        await db.insert(approvalRequests).values(requests);
        console.log("Seeding complete!");
    } catch (error) {
        console.error("Seeding failed:", error);
    }
}

seed();
