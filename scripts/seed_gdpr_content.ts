
import "dotenv/config";
import { getDb } from "../db";
import { policyTemplates } from "../schema";
import { eq } from "drizzle-orm";

const gdprTemplates = [
    {
        templateId: "gdpr-privacy-policy",
        name: "GDPR Privacy Policy",
        frameworks: ["GDPR", "Privacy"],
        content: `# Privacy Policy

## 1. Introduction
We are committed to protecting your privacy. This policy details how we collect, use, and store your personal data.

## 2. Data We Collect
- Contact Information
- Usage Data
- Cookies

## 3. How We Use Your Data
- To provide services
- To improve our platform
- Marketing (with consent)

## 4. Your Rights
- Right to access
- Right to rectification
- Right to erasure
- Right to restrict processing
- Right to data portability
- Right to object

## 5. Contact Us
If you have any questions, please contact our Data Protection Officer (DPO).`,
        sections: [
            {
                id: "intro",
                title: "Introduction",
                content: "We are committed to protecting your privacy...",
                optional: false,
                defaultEnabled: true
            },
            {
                id: "rights",
                title: "Your Rights",
                content: "Under GDPR, you have the following rights...",
                optional: false,
                defaultEnabled: true
            }
        ]
    },
    {
        templateId: "gdpr-data-retention",
        name: "Data Retention Policy",
        frameworks: ["GDPR", "Privacy"],
        content: `# Data Retention Policy

## 1. Purpose
To ensure data is not kept longer than necessary.

## 2. Retention Periods
- Customer Records: 7 years
- Marketing Data: 2 years after last contact
- Employee Records: 7 years after termination

## 3. Disposal
Data must be securely destroyed when the retention period expires.`,
        sections: [
            {
                id: "periods",
                title: "Retention Periods",
                content: "We retain data for...",
                optional: false,
                defaultEnabled: true
            }
        ]
    },
    {
        templateId: "gdpr-breach-response",
        name: "Data Breach Response Policy",
        frameworks: ["GDPR", "Security"],
        content: `# Data Breach Response Policy

## 1. Purpose
To handle personal data breaches effectively and comply with the 72-hour notification requirement.

## 2. Detection & Reporting
All employees must report suspected breaches immediately.

## 3. Investigation
The DPO will investigate the scope and impact.

## 4. Notification
- To Supervisory Authority: Within 72 hours
- To Data Subjects: If high risk involved`,
        sections: []
    },
    {
        templateId: "gdpr-dpa",
        name: "Data Processing Agreement (DPA)",
        frameworks: ["GDPR", "Legal"],
        content: `# Data Processing Agreement

## 1. Definitions
...

## 2. Processing Instructions
The processor shall process data only on written instructions from the controller.

## 3. Confidentiality
...

## 4. Subprocessors
...`,
        sections: []
    },
    {
        templateId: "gdpr-dsar-procedure",
        name: "DSAR Handling Procedure",
        frameworks: ["GDPR", "Privacy"],
        content: `# DSAR Handling Procedure

1. **Verify Identity**: Ensure the requester is who they say they are.
2. **Clarify Request**: Understand what data is being requested.
3. **Search & Collect**: Gather data from all systems.
4. **Review & Redact**: Remove third-party data.
5. **Respond**: Within 30 days.`,
        sections: []
    },
    {
        templateId: "gdpr-lia",
        name: "Legitimate Interests Assessment (LIA)",
        frameworks: ["GDPR", "Privacy"],
        content: `# Legitimate Interests Assessment

## 1. Purpose Test
Why do you want to process the data?

## 2. Necessity Test
Is the processing necessary for that purpose?

## 3. Balancing Test
Do the individual's interests override the legitimate interest?`,
        sections: []
    }
];

async function seed() {
    console.log("🌱 Seeding GDPR Policy Templates...");
    const db = await getDb();

    for (const tmpl of gdprTemplates) {
        console.log(`Processing: ${tmpl.name}`);

        // Check if exists
        const existing = await db.select().from(policyTemplates).where(eq(policyTemplates.templateId, tmpl.templateId));

        if (existing.length > 0) {
            console.log(`Update existing template: ${tmpl.templateId}`);
            await db.update(policyTemplates)
                .set({
                    name: tmpl.name,
                    content: tmpl.content,
                    sections: tmpl.sections,
                    frameworks: tmpl.frameworks,
                })
                .where(eq(policyTemplates.templateId, tmpl.templateId));
        } else {
            console.log(`Creating new template: ${tmpl.templateId}`);
            await db.insert(policyTemplates).values({
                templateId: tmpl.templateId,
                name: tmpl.name,
                content: tmpl.content,
                sections: tmpl.sections,
                frameworks: tmpl.frameworks,
            });
        }
    }

    console.log("✅ Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
