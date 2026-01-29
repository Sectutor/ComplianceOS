import "dotenv/config";
import { db, getDb } from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

async function seed() {
    const dbConn = await getDb();
    const clientId = 3;

    console.log(`Seeding demo data for Client ${clientId}...`);

    // 1. Ensure Client Exists
    let client = await dbConn.query.clients.findFirst({
        where: (c, { eq }) => eq(c.id, clientId)
    });

    if (!client) {
        console.log("Client 3 not found, creating...");
        [client] = await dbConn.insert(schema.clients).values({
            id: clientId,
            name: "Demo Corp International",
            industry: "Technology",
            tier: "enterprise",
            status: "active"
        }).returning();
    } else {
        console.log("Client 3 found:", client.name);
    }

    // 2. Create Strategic Roadmap (ISO 27001)
    console.log("Creating Strategic Roadmap...");
    const [roadmap] = await dbConn.insert(schema.roadmaps).values({
        clientId: clientId,
        title: "ISO 27001 Certification FY2026",
        description: "Strategic initiative to achieve ISO 27001:2022 certification by Q4 2026 to unlock enterprise sales channels.",
        status: "active",
        vision: "To become a security-first organization trusted by global enterprises.",
        objectives: [
            "Establish an ISMS aligned with ISO 27001:2022",
            "Achieve 100% policy coverage by Q2",
            "Pass Stage 1 Audit by Q3",
            "Obtain Certification by Q4"
        ],
        kpiTargets: [
            { name: "Control Implementation", target: "100", unit: "%" },
            { name: "Audit Findings", target: "0", unit: "Major NCs" },
            { name: "Staff Training", target: "95", unit: "%" }
        ],
        createdById: 1
    }).returning();

    // 3. Create Roadmap Items
    const quarters = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
    const phases = ["Planning & Scope", "Implementation", "Internal Audit", "Certification"];

    for (let i = 0; i < 4; i++) {
        await dbConn.insert(schema.roadmapItems).values({
            roadmapId: roadmap.id,
            title: `${phases[i]} Phase`,
            description: `Key activities for ${quarters[i]} focusing on ${phases[i]}`,
            status: i === 0 ? "in_progress" : "planned",
            timelineQ: quarters[i],
            orderIndex: i
        });
    }

    // 4. Create Implementation Plan (Derived)
    console.log("Creating Implementation Plan...");
    const [plan] = await dbConn.insert(schema.implementationPlans).values({
        clientId: clientId,
        title: "Execution: ISO 27001 FY2026",
        description: "Tactical execution plan for the ISO 27001 strategic roadmap.",
        status: "in_progress",
        priority: "high",
        roadmapId: roadmap.id,
        createdById: 1
    }).returning();

    // 5. Create Comprehensive Tasks
    const tasks = [
        // Governance
        { title: "Define ISMS Scope", status: "done", priority: "high", category: "Governance" },
        { title: "Establish Information Security Committee", status: "done", priority: "medium", category: "Governance" },
        { title: "Draft Information Security Policy", status: "review", priority: "high", category: "Governance" },
        { title: "Approve Acceptable Use Policy", status: "in_progress", priority: "medium", category: "Governance" },

        // Risk
        { title: "Conduct Physical Security Risk Assessment", status: "in_progress", priority: "high", category: "Risk" },
        { title: "Perform Cloud Infrastructure Risk Analysis", status: "todo", priority: "high", category: "Risk" },
        { title: "Vendor Risk Assessment (Sample Vendors)", status: "backlog", priority: "medium", category: "Risk" },

        // HR Security
        { title: "Implement Background Checks Process", status: "done", priority: "medium", category: "HR" },
        { title: "Rollout Security Awareness Training", status: "in_progress", priority: "high", category: "HR" },
        { title: "Update Employment Contracts with NDA", status: "backlog", priority: "low", category: "HR" },

        // Technical Controls
        { title: "Enable MFA on all administrative accounts", status: "done", priority: "critical", category: "Tech" },
        { title: "Configure AWS CloudTrail Logging", status: "in_progress", priority: "high", category: "Tech" },
        { title: "Implement Endpoint Protection (EDR)", status: "blocked", priority: "high", category: "Tech" },
        { title: "Automate Access Review Process", status: "todo", priority: "medium", category: "Tech" },
        { title: "Setup Vulnerability Scanning Schedule", status: "todo", priority: "medium", category: "Tech" },

        // Audit Prep
        { title: "Select External Auditor", status: "backlog", priority: "high", category: "Audit" },
        { title: "Schedule Stage 1 Audit", status: "backlog", priority: "medium", category: "Audit" },
    ];

    console.log(`Creating ${tasks.length} implementation tasks...`);

    for (const t of tasks) {
        await dbConn.insert(schema.implementationTasks).values({
            implementationPlanId: plan.id,
            clientId: clientId,
            title: t.title,
            description: `Task focused on ${t.category} controls implementation.`,
            status: t.status,
            priority: t.priority,
            createdById: 1
        });
    }

    console.log("-----------------------------------");
    console.log("✅ Demo Data Generation Complete");
    console.log(`Roadmap ID: ${roadmap.id}`);
    console.log(`Plan ID: ${plan.id}`);
    console.log("-----------------------------------");
}

seed().catch(console.error);
