import "dotenv/config";
import { getDb } from "../packages/core/src/db";
import * as schema from "../packages/core/src/schema";
import { eq, and } from "drizzle-orm";

async function seed() {
    console.log("🌱 Seeding Training Data...");
    const db = await getDb();
    const clientId = 3; // Intellfence
    const employeeEmail = "emmanuel@intellfence.com"; // Current user email from metadata

    // 1. Get Employee
    const [employee] = await db.select()
        .from(schema.employees)
        .where(and(
            eq(schema.employees.clientId, clientId),
            eq(schema.employees.email, employeeEmail)
        ))
        .limit(1);

    if (!employee) {
        console.error(`❌ Employee ${employeeEmail} not found! Run seed-client.ts first.`);
        process.exit(1);
    }

    console.log(`Found employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);

    // 2. Clear existing training for this client to avoid duplicates
    await db.delete(schema.trainingAssignments).where(eq(schema.trainingAssignments.clientId, clientId));
    await db.delete(schema.trainingModules).where(eq(schema.trainingModules.clientId, clientId));

    // 3. Create Training Modules
    const modules = [
        {
            clientId,
            title: "Security Awareness 101: Phishing & Engineering",
            description: "Learn how to identify and defend against modern social engineering attacks.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=GCpIallT92M", // Sample security video
            durationMinutes: 12,
            content: `# Phishing & Social Engineering\n\nPhishing is the most common way attackers gain access to our systems.\n\n## Key Identifiers of Phishing:\n1. **Urgency**: "Your account will be suspended in 1 hour!"\n2. **Suspicious Senders**: Check the actual email address, not just the display name.\n3. **Generic Greetings**: "Dear Customer" instead of your name.\n4. **Pressure**: Asking for sensitive information or money.\n\n### What to do?\nIf you suspect an email is phishing, **do not click any links** and report it to security@intellfence.com immediately.`,
            order: 1,
            active: true
        },
        {
            clientId,
            title: "Data Protection & GDPR Compliance",
            description: "An overview of how we handle personal data and our obligations under GDPR.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=_9vUuI98J7U", // GDPR Overview
            durationMinutes: 8,
            content: `# GDPR Compliance\n\nThe General Data Protection Regulation (GDPR) is a regulation in EU law on data protection and privacy.\n\n## Core Principles:\n- **Lawfulness, fairness, and transparency**\n- **Purpose limitation**\n- **Data minimization**\n- **Accuracy**\n- **Storage limitation**\n- **Integrity and confidentiality**\n\nAs an employee, you must ensure that any personal data you handle is treated according to these principles.`,
            order: 2,
            active: true
        },
        {
            clientId,
            title: "Secure Remote Work Policy",
            description: "Best practices for staying secure while working from home or public spaces.",
            type: "text",
            content: `# Secure Remote Work\n\nWorking remotely brings unique security challenges.\n\n## Mandatory Controls:\n1. **Use the VPN**: Always connect to the corporate VPN when accessing internal resources.\n2. **Home Network**: Ensure your home Wi-Fi is encrypted (WPA3 or WPA2) and has a strong password.\n3. **Public Wi-Fi**: NEVER use public Wi-Fi without the VPN.\n4. **Physical Security**: Do not leave your laptop unattended in public places.\n\n### Reporting Incidents\nIf your device is lost or stolen, report it immediately to IT.`,
            durationMinutes: 5,
            order: 3,
            active: true
        }
    ];

    console.log("Creating modules...");
    const createdModules = [];
    for (const m of modules) {
        const [module] = await db.insert(schema.trainingModules).values(m).returning();
        createdModules.push(module);
        console.log(`  - Created: ${module.title}`);
    }

    // 4. Assign to Employee
    console.log("Assigning modules to employee...");
    for (const m of createdModules) {
        await db.insert(schema.trainingAssignments).values({
            clientId,
            employeeId: employee.id,
            moduleId: m.id,
            status: "pending",
            assignedAt: new Date()
        });
    }

    console.log("✅ Training Data Seeded Successfully!");
    process.exit(0);
}

seed().catch(console.error);
