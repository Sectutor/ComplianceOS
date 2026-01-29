
import "dotenv/config";
import { getDb } from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

async function seedTemplates() {
    const db = await getDb();
    console.log("🌱 Seeding Implementation Templates...");

    const templates = [
        {
            title: "ISO 27001 Foundation Kit",
            description: "A comprehensive baseline implementation of the ISO/IEC 27001:2022 Information Security Management System standard.",
            estimatedHours: 120,
            priority: "high",
            category: "Compliance",
            isSystem: true,
            tasks: [
                { title: "Define ISMS Scope and Boundaries", priority: "critical", description: "Document the organization, location, assets, and technology included in the ISMS." },
                { title: "Establish Information Security Policy", priority: "critical", description: "Draft the top-level policy approved by leadership." },
                { title: "Conduct Asset Inventory", priority: "high", description: "Identify and owner all information assets." },
                { title: "Perform Risk Assessment", priority: "high", description: "Identify threats and vulnerabilities using the risk register." },
                { title: "Draft Statement of Applicability (SoA)", priority: "critical", description: "Justify the inclusion or exclusion of Annex A controls." },
                { title: "Implement Access Control Policy", priority: "medium", description: "Define user registration, privilege management, and password policies." },
                { title: "Schedule Internal Audit", priority: "medium", description: "Plan the first internal audit cycle." },
            ]
        },
        {
            title: "SOC 2 Type 1 Sprint",
            description: "Rapid readiness plan for SOC 2 Type 1 attestation, focusing on Design of Controls.",
            estimatedHours: 80,
            priority: "critical",
            category: "Compliance",
            isSystem: true,
            tasks: [
                { title: "Define Trust Services Criteria Scope", priority: "critical", description: "Confirm strict scope: Security, Availability, and/or Confidentiality." },
                { title: "Draft System Description", priority: "high", description: "Write the comprehensive narrative description of the system." },
                { title: "Collect Policy Acknowledgments", priority: "medium", description: "Ensure all staff have signed the handbook/policies." },
                { title: "Vendor Risk Review (Critical Vendors)", priority: "high", description: "Review contracts and SOC reports for AWS, GSuite, etc." },
                { title: "Penetration Test", priority: "high", description: "Engage external firm for annual pen test." },
                { title: "Evidence Collection: Onboarding", priority: "medium", description: "Gather screenshots of background checks and access provisioning." },
                { title: "Management Assertion Letter", priority: "low", description: "Draft the formal assertion for the auditor." },
            ]
        },
        {
            title: "Ransomware Response Playbook",
            description: "Emergency incident response workflow for active ransomware detection.",
            estimatedHours: 48,
            priority: "critical",
            category: "Incident Response",
            isSystem: true,
            tasks: [
                { title: "Isolate Infected Systems", priority: "critical", description: "Immediately disconnect affected endpoints from the network." },
                { title: "Activate Incident Response Team", priority: "critical", description: "Page the IRT and establish a war room." },
                { title: "Verify Backup Integrity", priority: "critical", description: "Check offline backups for immutability and recent success." },
                { title: "Identify Patient Zero", priority: "high", description: "Analyze logs to find the entry point." },
                { title: "Notify Legal Counsel", priority: "high", description: "Determine regulatory reporting obligations (72h rules)." },
                { title: "Draft Internal Communication", priority: "medium", description: "Inform employees with clear instructions (do not reboot)." },
                { title: "Engage Forensics Retainer", priority: "medium", description: "Call external IR firm if scope exceeds internal capability." },
            ]
        },
        {
            title: "High-Risk Vendor Audit",
            description: "Deep-dive assessment workflow for vendors handling PII or PHI.",
            estimatedHours: 24,
            priority: "high",
            category: "TPRM",
            isSystem: true,
            tasks: [
                { title: "Request SOC 2 / ISO Certification", priority: "high", description: "Collect most recent attestation report." },
                { title: "Review Privacy Policy", priority: "medium", description: "Check compliance with GDPR/CCPA requirements." },
                { title: "Analyze Bridge Letter", priority: "medium", description: "Ensure coverage period spans the current gap." },
                { title: "Confirm Data Processing Agreement (DPA)", priority: "critical", description: "Verify DPA is signed and legally binding." },
                { title: "Check Insurance Coverage", priority: "low", description: "Verify cyber liability limits." },
            ]
        },
        {
            title: "Q1 Security Housekeeping",
            description: "Routine maintenance and governance tasks for the first quarter.",
            estimatedHours: 16,
            priority: "low",
            category: "Maintenance",
            isSystem: true,
            tasks: [
                { title: "Review User Access Rights", priority: "medium", description: "Deprovision stale accounts (<90 days activity)." },
                { title: "Test Backups", priority: "high", description: "Perform a restore test of a non-critical database." },
                { title: "Policy Review", priority: "low", description: "Annual review of Information Security Policy." },
                { title: "Update Threat Library", priority: "medium", description: "Add new emerging threats (e.g., AI Poisoning)." },
                { title: "Schedule License Renewals", priority: "low", description: "Check SSL certs and domain expiries." },
            ]
        }
    ];

    for (const t of templates) {
        // Check if exists
        const existing = await db.query.implementationTemplates.findFirst({
            where: eq(schema.implementationTemplates.title, t.title)
        });

        if (!existing) {
            await db.insert(schema.implementationTemplates).values(t as any);
            console.log(`✅ Created template: ${t.title}`);
        } else {
            console.log(`⏭️  Skipped (exists): ${t.title}`);
        }
    }

    console.log("✨ Seeding complete!");
    process.exit(0);
}

seedTemplates().catch(console.error);
