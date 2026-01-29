
import { getDb } from "../db";
import * as schema from "../schema";
import { eq, and } from "drizzle-orm";

async function seedIsoDetailed() {
    const db = await getDb();
    console.log("🌱 Seeding Detailed ISO 27001 Requirements...");

    // 1. Find ISO 27001 Framework
    const iso = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, 'ISO27001')
    });

    if (!iso) {
        console.error("❌ ISO 27001 framework not found. Run seed_framework_baselines.ts first.");
        return;
    }

    // 2. Ensure Phases Exist
    const phases = await db.select().from(schema.implementationPhases)
        .where(eq(schema.implementationPhases.frameworkId, iso.id));

    const planPhase = phases.find(p => p.name === 'Plan') || phases[0];
    const doPhase = phases.find(p => p.name === 'Do') || phases[1];

    if (!planPhase || !doPhase) {
        console.error("❌ Phases not found.");
        return;
    }

    // 3. Define the detailed requirements from the image
    const newRequirements = [
        // Phase 1: Plan
        {
            identifier: 'ISO-PLAN-1',
            title: '1. Gain Management Support and Form a Team',
            phaseId: planPhase.id,
            description: `**Key Activities:**
- Secure executive buy-in by presenting benefits (e.g., reduced risks, compliance).
- Appoint a project leader and cross-functional team (IT, HR, legal, etc.).
- Define roles and responsibilities.

**Deliverables:**
- Executive commitment letter
- Team charter with RACI matrix
- Project plan with timelines and budget

**Estimated Duration:** 2-4 weeks`,
            guidance: `**Tips:**
- Use a cybersecurity report to justify resources.
- Involve C-level early to avoid roadblocks.`
        },
        {
            identifier: 'ISO-PLAN-2',
            title: '2. Understand the Standard and Perform Gap Analysis',
            phaseId: planPhase.id,
            description: `**Key Activities:**
- Review ISO 27001:2022 structure: Clauses 0-10 (mandatory) and Annex A (93 controls).
- Assess current policies against requirements.

**Deliverables:**
- Gap analysis report
- Internal/external context documentation (e.g., risks, regulations)

**Estimated Duration:** 4-6 weeks`,
            guidance: `**Tips:**
- Compare against Annex A controls; prioritize high-impact gaps.`
        },
        {
            identifier: 'ISO-PLAN-3',
            title: '3. Define ISMS Scope and Risk Methodology',
            phaseId: planPhase.id,
            description: `**Key Activities:**
- Outline assets, locations, and processes in scope.
- Choose a risk assessment method (qualitative/quantitative).

**Deliverables:**
- Scope statement
- Risk assessment methodology document (criteria, scales)

**Estimated Duration:** 2-4 weeks`,
            guidance: `**Tips:**
- Limit scope initially to critical areas.
- Get management approval.`
        },
        {
            identifier: 'ISO-PLAN-4',
            title: '4. Conduct Initial Risk Assessment',
            phaseId: planPhase.id,
            description: `**Key Activities:**
- Identify assets, threats, vulnerabilities.
- Evaluate risks.

**Deliverables:**
- Risk register
- Preliminary risk treatment options

**Estimated Duration:** 4-6 weeks`,
            guidance: `**Tips:**
- Use tools like spreadsheets.
- Focus on likelihood and impact.`
        },
        // Phase 2: Do
        {
            identifier: 'ISO-DO-5',
            title: '5. Develop Policies and Procedures',
            phaseId: doPhase.id,
            description: `**Key Activities:**
- Create mandatory documents (e.g., Information Security Policy (ISP), Access Control).
- Align with business objectives.

**Deliverables:**
- Information Security Policy (ISP)
- Statement of Applicability (SoA) listing 93 controls

**Estimated Duration:** 4-8 weeks`,
            guidance: `**Tips:**
- Include policies for asset management, incident response, and supplier relationships.`
        }
    ];

    // 4. Upsert Requirements
    for (const req of newRequirements) {
        const existing = await db.query.frameworkRequirements.findFirst({
            where: and(
                eq(schema.frameworkRequirements.frameworkId, iso.id),
                eq(schema.frameworkRequirements.identifier, req.identifier)
            )
        });

        if (existing) {
            console.log(`Updating ${req.title}...`);
            await db.update(schema.frameworkRequirements)
                .set({
                    title: req.title,
                    description: req.description,
                    guidance: req.guidance,
                    phaseId: req.phaseId,
                    updatedAt: new Date()
                })
                .where(eq(schema.frameworkRequirements.id, existing.id));
        } else {
            console.log(`Creating ${req.title}...`);
            await db.insert(schema.frameworkRequirements).values({
                frameworkId: iso.id,
                phaseId: req.phaseId,
                identifier: req.identifier,
                title: req.title,
                description: req.description,
                guidance: req.guidance
            });
        }
    }

    console.log("✅ ISO 27001 Detailed Seeding Complete.");
}

seedIsoDetailed().catch(console.error);
