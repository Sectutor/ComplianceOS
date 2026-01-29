
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log("🚀 Starting Comprehensive Framework Baseline Seeding...");
    const db = await getDb();
    if (!db) {
        console.error("❌ Database connection failed!");
        process.exit(1);
    }

    // 1. ISO 27001:2022 Framework
    console.log("--- Seeding ISO 27001:2022 ---");
    let isoFramework = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "ISO27001")
    });

    if (!isoFramework) {
        const [inserted] = await db.insert(schema.complianceFrameworks).values({
            name: "ISO/IEC 27001:2022",
            shortCode: "ISO27001",
            version: "2022",
            description: "Information Security Management System Standard"
        }).returning();
        isoFramework = inserted;
    }

    const isoPhases = [
        { name: "Plan", order: 1, description: "Establish ISMS context, scope, and risk assessment." },
        { name: "Do", order: 2, description: "Implement risk treatment and controls." },
        { name: "Check", order: 3, description: "Monitor, measure, and evaluate ISMS performance." },
        { name: "Act", order: 4, description: "Maintain and improve the ISMS." }
    ];

    for (const phaseData of isoPhases) {
        let phase = await db.query.implementationPhases.findFirst({
            where: (phases: any, { and, eq }: any) => and(eq(phases.frameworkId, isoFramework!.id), eq(phases.name, phaseData.name))
        });

        if (!phase) {
            const [newPhase] = await db.insert(schema.implementationPhases).values({
                frameworkId: isoFramework!.id,
                ...phaseData
            }).returning();
            phase = newPhase;
        }

        const requirements = getISORequirements(phaseData.name);
        for (const req of requirements) {
            const existing = await db.query.frameworkRequirements.findFirst({
                where: (r: any, { and, eq }: any) => and(eq(r.frameworkId, isoFramework!.id), eq(r.identifier, req.identifier))
            });

            if (!existing) {
                await db.insert(schema.frameworkRequirements).values({
                    frameworkId: isoFramework!.id,
                    phaseId: phase.id,
                    ...req
                });
            }
        }
    }

    // 2. SOC 2 Type II
    console.log("--- Seeding SOC 2 Type II ---");
    let soc2Framework = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "SOC2")
    });

    if (!soc2Framework) {
        const [inserted] = await db.insert(schema.complianceFrameworks).values({
            name: "SOC 2 Type II",
            shortCode: "SOC2",
            version: "2017",
            description: "Trust Services Criteria Audit"
        }).returning();
        soc2Framework = inserted;
    }

    const soc2Phases = [
        { name: "Preparation", order: 1, description: "Gap analysis and readiness assessment." },
        { name: "Remediation", order: 2, description: "Fixing identified gaps and implementing controls." },
        { name: "Observation", order: 3, description: "The period during which the auditor observes your controls." },
        { name: "Final Audit", order: 4, description: "Official audit and report issuance." }
    ];

    for (const phaseData of soc2Phases) {
        let phase = await db.query.implementationPhases.findFirst({
            where: (phases: any, { and, eq }: any) => and(eq(phases.frameworkId, soc2Framework!.id), eq(phases.name, phaseData.name))
        });

        if (!phase) {
            const [newPhase] = await db.insert(schema.implementationPhases).values({
                frameworkId: soc2Framework!.id,
                ...phaseData
            }).returning();
            phase = newPhase;
        }

        // Add 3 standard requirements per SOC 2 phase for now
        const requirements = getSOC2Requirements(phaseData.name);
        for (const req of requirements) {
            const existing = await db.query.frameworkRequirements.findFirst({
                where: (r: any, { and, eq }: any) => and(eq(r.frameworkId, soc2Framework!.id), eq(r.identifier, req.identifier))
            });

            if (!existing) {
                await db.insert(schema.frameworkRequirements).values({
                    frameworkId: soc2Framework!.id,
                    phaseId: phase.id,
                    ...req
                });
            }
        }
    }

    console.log("✅ Seeding Complete!");
    process.exit(0);
}

function getISORequirements(phase: string) {
    switch (phase) {
        case 'Plan':
            return [
                { identifier: "ISO-P1", title: "Define ISMS Scope", description: "Establish the boundaries and applicability of the Information Security Management System." },
                { identifier: "ISO-P2", title: "Develop ISMS Policy", description: "Create the core Information Security Policy endorsed by leadership." },
                { identifier: "ISO-P3", title: "Risk Assessment Methodology", description: "Define how to identify and evaluate security risks." },
                { identifier: "ISO-P4", title: "Asset Inventory", description: "Identify and document all critical information assets." },
                { identifier: "ISO-P5", title: "Legal & Regulatory Requirements", description: "Identify laws and regulations applicable to information security." },
                { identifier: "ISO-P6", title: "Statement of Applicability (SoA)", description: "Identify controls applicable to your organization." }
            ];
        case 'Do':
            return [
                { identifier: "ISO-D1", title: "Implement Risk Treatment", description: "Deploy controls defined in the Risk Treatment Plan." },
                { identifier: "ISO-D2", title: "Security Awareness Training", description: "Ensure all personnel understand their security responsibilities." },
                { identifier: "ISO-D3", title: "Access Control Management", description: "Enforce logical and physical access restrictions." },
                { identifier: "ISO-D4", title: "Incident Response Setup", description: "Establish procedures to identify and respond to security events." },
                { identifier: "ISO-D5", title: "Encryption & Key Management", description: "Implement cryptographic controls for data at rest and in transit." },
                { identifier: "ISO-D6", title: "Business Continuity Planning", description: "Establish procedures to maintain operations during disruptions." },
                { identifier: "ISO-D7", title: "Physical Security Controls", description: "Secure physical premises and sensitive information areas." },
                { identifier: "ISO-D8", title: "Supplier Security Management", description: "Ensure third-party vendors meet security standards." }
            ];
        case 'Check':
            return [
                { identifier: "ISO-C1", title: "Internal Audit Program", description: "Perform objective internal reviews of the ISMS." },
                { identifier: "ISO-C2", title: "Management Review", description: "Review ISMS performance with senior leadership." },
                { identifier: "ISO-C3", title: "Control Effectiveness Testing", description: "Verify that implemented controls are working as intended." },
                { identifier: "ISO-C4", title: "Vulnerability Scanning", description: "Perform regular technical scans to identify security weaknesses." },
                { identifier: "ISO-C5", title: "Security Log Monitoring", description: "Review audit logs and monitoring data for anomalies." }
            ];
        case 'Act':
            return [
                { identifier: "ISO-A1", title: "Non-conformity Management", description: "React to audit findings and implement corrective actions." },
                { identifier: "ISO-A2", title: "Root Cause Analysis", description: "Identify why failures occurred to prevent recurrence." },
                { identifier: "ISO-A3", title: "Continual Improvement", description: "Regularly update the ISMS to address new threats and changes." },
                { identifier: "ISO-A4", title: "Corrective Action Tracking", description: "Maintain a log of all security improvements and their status." }
            ];
        default: return [];
    }
}

function getSOC2Requirements(phase: string) {
    switch (phase) {
        case 'Preparation':
            return [
                { identifier: "SOC2-P1", title: "Readiness Assessment", description: "Initial gap analysis against TSC criteria." },
                { identifier: "SOC2-P2", title: "System Description Drafting", description: "Documenting the boundaries and components of the service system." },
                { identifier: "SOC2-P3", title: "Control Activity Mapping", description: "Linking existing controls to SOC 2 trust principles." }
            ];
        case 'Remediation':
            return [
                { identifier: "SOC2-R1", title: "TSC Control Alignment", description: "Mapping organization controls to SOC 2 Trust Services Criteria." },
                { identifier: "SOC2-R2", title: "Policy Formalization", description: "Updating policies to meet SOC 2 specific requirements." },
                { identifier: "SOC2-R3", title: "HR Security Onboarding", description: "Implementing background checks and NDAs for new staff." },
                { identifier: "SOC2-R4", title: "Change Management Process", description: "Formalizing how system changes are tracked and approved." }
            ];
        case 'Observation':
            return [
                { identifier: "SOC2-O1", title: "Evidence Collection Workflows", description: "Standardizing how evidence is captured during the review period." },
                { identifier: "SOC2-O2", title: "Internal Compliance Monitoring", description: "Regularly checking that controls are being followed." },
                { identifier: "SOC2-O3", title: "Security Council Meetings", description: "Regular governance sessions to review compliance health." }
            ];
        case 'Final Audit':
            return [
                { identifier: "SOC2-F1", title: "Management Assertion", description: "Formally asserting the system description and control effectiveness." },
                { identifier: "SOC2-F2", title: "Review of Findings", description: "Collaborating with auditors on the final Type II report." },
                { identifier: "SOC2-F3", title: "Response to Gaps", description: "Addressing any qualified findings in the auditor's report." }
            ];
        default: return [];
    }
}

main();
