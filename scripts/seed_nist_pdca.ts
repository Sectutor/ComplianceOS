
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log("🚀 Seeding NIST CSF 2.0 PDCA Baseline...");
    const db = await getDb();
    if (!db) {
        console.error("❌ Database connection failed!");
        process.exit(1);
    }

    // 1. NIST CSF 2.0 Framework
    console.log("--- Seeding NIST CSF 2.0 ---");
    let nistFramework = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "NISTCSF")
    });

    if (!nistFramework) {
        const [inserted] = await db.insert(schema.complianceFrameworks).values({
            name: "NIST CSF 2.0",
            shortCode: "NISTCSF",
            version: "2.0",
            description: "NIST Cybersecurity Framework 2.0"
        }).returning();
        nistFramework = inserted;
    }

    const pdcaPhases = [
        { name: "Plan", order: 1, description: "GOVERN & IDENTIFY: Establish context, strategy, and risk management." },
        { name: "Do", order: 2, description: "PROTECT: Implement safeguards and security controls." },
        { name: "Check", order: 3, description: "DETECT: Monitor for anomalies and verify control effectiveness." },
        { name: "Act", order: 4, description: "RESPOND & RECOVER: Incident response and continuous improvement." }
    ];

    for (const phaseData of pdcaPhases) {
        let phase = await db.query.implementationPhases.findFirst({
            where: (phases: any, { and, eq }: any) => and(eq(phases.frameworkId, nistFramework!.id), eq(phases.name, phaseData.name))
        });

        if (!phase) {
            const [newPhase] = await db.insert(schema.implementationPhases).values({
                frameworkId: nistFramework!.id,
                ...phaseData
            }).returning();
            phase = newPhase;
        }

        const requirements = getNISTRequirements(phaseData.name);
        for (const req of requirements) {
            const existing = await db.query.frameworkRequirements.findFirst({
                where: (r: any, { and, eq }: any) => and(eq(r.frameworkId, nistFramework!.id), eq(r.identifier, req.identifier))
            });

            if (!existing) {
                await db.insert(schema.frameworkRequirements).values({
                    frameworkId: nistFramework!.id,
                    phaseId: phase.id,
                    ...req
                });
            }
        }
    }

    console.log("✅ NIST CSF 2.0 PDCA Seeding Complete!");
    process.exit(0);
}

function getNISTRequirements(phase: string) {
    switch (phase) {
        case 'Plan':
            return [
                { identifier: "NIST-GV-1", title: "Establish Cybersecurity Governance", description: "Define organizational cybersecurity policy and strategy." },
                { identifier: "NIST-ID-1", title: "Asset Management Inventory", description: "Identify and manage physical and software assets." },
                { identifier: "NIST-ID-RA", title: "Risk Assessment Process", description: "Establish a process to identify and evaluate cybersecurity risks." },
                { identifier: "NIST-ID-BE", title: "Business Environment Analysis", description: "Define organization's mission, objectives, and activities." }
            ];
        case 'Do':
            return [
                { identifier: "NIST-PR-AC", title: "Access Control Implementation", description: "Manage identities and logical/physical access." },
                { identifier: "NIST-PR-AT", title: "Awareness & Training", description: "Provide cybersecurity education to all personnel." },
                { identifier: "NIST-PR-DS", title: "Data Security Protection", description: "Implement technology to ensure information integrity and confidentiality." },
                { identifier: "NIST-PR-IP", title: "Information Protection Processes", description: "Maintain and manage security policies and procedures." }
            ];
        case 'Check':
            return [
                { identifier: "NIST-DE-AE", title: "Anomalies and Events Detection", description: "Monitor for anomalies and understand their impact." },
                { identifier: "NIST-DE-CM", title: "Continuous Security Monitoring", description: "Monitor information assets and networks for security events." },
                { identifier: "NIST-DE-DP", title: "Detection Processes Verification", description: "Maintain and test detection processes for effectiveness." }
            ];
        case 'Act':
            return [
                { identifier: "NIST-RS-RP", title: "Response Planning", description: "Maintain and test response processes for execution during events." },
                { identifier: "NIST-RS-CO", title: "Incident Communication", description: "Manage communications during and after a cybersecurity incident." },
                { identifier: "NIST-RC-RP", title: "Recovery Planning", description: "Execute recovery processes to ensure restoration of systems." },
                { identifier: "NIST-RC-IM", title: "Post-Incident Improvement", description: "Improve recovery planning and processes based on lessons learned." }
            ];
        default: return [];
    }
}

main();
