
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log("🚀 Refining GDPR PDCA Mapping (ISO 27701 Standards)...");
    const db = await getDb();
    if (!db) {
        console.error("❌ Database connection failed!");
        process.exit(1);
    }

    const gdprFw = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "GDPR")
    });

    if (!gdprFw) {
        console.error("❌ GDPR framework not found!");
        process.exit(1);
    }

    // 1. Clear old GDPR phases and requirements to ensure fresh mapping
    console.log("Clearing old GDPR records...");
    await db.delete(schema.frameworkRequirements).where(eq(schema.frameworkRequirements.frameworkId, gdprFw.id));
    await db.delete(schema.implementationPhases).where(eq(schema.implementationPhases.frameworkId, gdprFw.id));

    // 2. Define standard PDCA phases
    const pdcaPhases = [
        { name: "Plan", order: 1, description: "GOVERNANCE & ASSESSMENT: Establish data processing inventory, risk assessments (DPIA), and appoint a DPO." },
        { name: "Do", order: 2, description: "IMPLEMENTATION: Deploy technical and organizational measures, privacy notices, and data subject rights workflows." },
        { name: "Check", order: 3, description: "MONITORING: Verify compliance effectiveness, audit processing activities, and review privacy controls." },
        { name: "Act", order: 4, description: "RESPONSE & IMPROVEMENT: Manage personal data breaches, optimize data flows, and ensure continual improvement." }
    ];

    for (const phaseData of pdcaPhases) {
        const [phase] = await db.insert(schema.implementationPhases).values({
            frameworkId: gdprFw.id,
            ...phaseData
        }).returning();

        const reqs = getGDPRRequirements(phase.name);
        for (const r of reqs) {
            await db.insert(schema.frameworkRequirements).values({
                frameworkId: gdprFw.id,
                phaseId: phase.id,
                ...r
            });
        }
    }

    console.log("✅ GDPR PDCA v2 Seeding Complete!");
    process.exit(0);
}

function getGDPRRequirements(phase: string) {
    switch (phase) {
        case 'Plan':
            return [
                { identifier: "Art. 30", title: "Records of Processing Activities (ROPA)", description: "Compile a detailed inventory of all personal data categories and processing purposes.", mappingTags: ["Governance", "Inventory"] },
                { identifier: "Art. 35", title: "Data Protection Impact Assessment (DPIA)", description: "Identify and assess risks to data subjects before commencing high-risk processing.", mappingTags: ["Risk Assessment"] },
                { identifier: "Art. 37", title: "Designation of DPO", description: "Appoint a Data Protection Officer to oversee legal and regulatory compliance.", mappingTags: ["Governance"] },
                { identifier: "Art. 5 & 24", title: "Accountability Framework", description: "Establish the principles and overall responsibility for data protection compliance.", mappingTags: ["Principles"] },
                { identifier: "Art. 6", title: "Lawfulness of Processing", description: "Document the legal basis (Consent, Contract, Legitimate Interest) for all processing.", mappingTags: ["Lawfulness"] }
            ];
        case 'Do':
            return [
                { identifier: "Art. 12-14", title: "Transparency & Privacy Notices", description: "Deploy clear and accessible information to data subjects about processing activities.", mappingTags: ["Transparency"] },
                { identifier: "Art. 15-21", title: "Data Subject Rights Workflows", description: "Operationalize requests for Access, Rectification, Erasure, and Portability.", mappingTags: ["Rights"] },
                { identifier: "Art. 25", title: "Data Protection by Design & Default", description: "Integrate privacy controls into the technical design of products and services.", mappingTags: ["Privacy by Design"] },
                { identifier: "Art. 32", title: "Security of Processing (TOMs)", description: "Implement appropriate technical and organizational measures (Encryption, etc).", mappingTags: ["Security"] },
                { identifier: "Art. 44-49", title: "International Data Transfers", description: "Implement safeguards like SCCs or BCCs for data leaving the EEA.", mappingTags: ["Transfers"] }
            ];
        case 'Check':
            return [
                { identifier: "Art. 32 (Monitoring)", title: "Security Control Verification", description: "Regularly test and evaluate the effectiveness of security measures.", mappingTags: ["Monitoring"] },
                { identifier: "Art. 30 (Review)", title: "ROPA Maintenance & Audit", description: "Periodically audit the records of processing to ensure they reflect reality.", mappingTags: ["Audit"] },
                { identifier: "Compliance Monitoring", title: "Internal GDPR Compliance Audit", description: "Perform objective reviews of privacy management system performance.", mappingTags: ["Audit"] }
            ];
        case 'Act':
            return [
                { identifier: "Art. 33", title: "Data Breach Notification (72h)", description: "Procedures to notify Supervisory Authorities and Data Subjects of qualifying breaches.", mappingTags: ["Incident Management"] },
                { identifier: "Art. 10 (ISO style)", title: "Corrective Actions", description: "React to audit findings or incidents with formal remediation plans.", mappingTags: ["Improvement"] },
                { identifier: "Continual Improvement", title: "PIMS Optimization", description: "Regularly update privacy strategies based on internal reviews and regulatory changes.", mappingTags: ["Improvement"] }
            ];
        default: return [];
    }
}

main();
