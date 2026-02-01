import * as db from "./packages/core/src/db";
import * as schema from "./packages/core/src/schema";
import "dotenv/config";

async function seedTrustCenter() {
    console.log("Seeding Trust Center data...");
    const d = await db.getDb();

    // Use Client ID 1 as default demo client
    const clientId = 1;

    // 1. Create Trust Documents
    const docs = [
        {
            clientId,
            name: "SOC 2 Type II Report - 2025",
            description: "Annual security, availability, and confidentiality audit report.",
            fileUrl: "https://example.com/soc2-2025.pdf",
            isLocked: true,
            category: "Audit Report"
        },
        {
            clientId,
            name: "ISO 27001:2022 Certification",
            description: "Official certificate for our Information Security Management System.",
            fileUrl: "https://example.com/iso27001-cert.pdf",
            isLocked: false,
            category: "Certification"
        },
        {
            clientId,
            name: "Standard Information Gathering (SIG) Lite",
            description: "Completed security questionnaire for vendor assessments.",
            fileUrl: "https://example.com/sig-lite.pdf",
            isLocked: true,
            category: "Questionnaire"
        },
        {
            clientId,
            name: "Privacy Policy & GDPR Statement",
            description: "Comprehensive overview of our data processing activities.",
            fileUrl: "https://example.com/privacy-gdpr.pdf",
            isLocked: false,
            category: "Privacy"
        },
        {
            clientId,
            name: "Annual Penetration Test Summary",
            description: "Executive summary of our latest infrastructure security test.",
            fileUrl: "https://example.com/pentest-2025.pdf",
            isLocked: true,
            category: "Security"
        }
    ];

    for (const doc of docs) {
        await d.insert(schema.trustDocuments).values(doc);
        console.log(`Inserted document: ${doc.name}`);
    }

    // 2. Add some mock visitors to show "Sales Intelligence"
    const visitors = [
        { clientId, email: "security@goldmansachs.com", name: "John Banker", company: "Goldman Sachs" },
        { clientId, email: "vrm@stripe.com", name: "Sarah Fintech", company: "Stripe" },
        { clientId, email: "compliance@nike.com", name: "Mike Runner", company: "Nike" }
    ];

    for (const v of visitors) {
        const [visitor] = await d.insert(schema.trustCenterVisitors).values(v).returning();

        // Add a signature for some
        if (v.email.includes("goldman")) {
            await d.insert(schema.ndaSignatures).values({
                clientId,
                visitorId: visitor.id,
                signatureText: "John Banker",
                ndaVersion: "v1.0"
            });
            console.log(`Added visitor and signature for: ${v.email}`);
        } else {
            console.log(`Added visitor: ${v.email}`);
        }
    }

    console.log("Trust Center seeding complete!");
    process.exit(0);
}

seedTrustCenter().catch(err => {
    console.error(err);
    process.exit(1);
});
