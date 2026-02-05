
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq, and } from 'drizzle-orm';

const STRIDE_MAPPING: Record<string, any[]> = {
    'Web Client': [
        { title: 'Cross-Site Scripting (XSS)', category: 'Tampering', mitigations: ['Output encoding', 'CSP'] },
        { title: 'CSRF', category: 'Elevation of Privilege', mitigations: ['Anti-CSRF Tokens'] },
    ],
    'API': [
        { title: 'Broken Object Level Authorization', category: 'Information Disclosure', mitigations: ['Auth checks'] },
        { title: 'Injection Attacks', category: 'Tampering', mitigations: ['Parameterized queries'] },
    ],
    'Database': [
        { title: 'SQL Injection', category: 'Tampering', mitigations: ['ORM usage'] },
        { title: 'Weak Encryption', category: 'Information Disclosure', mitigations: ['AES-256'] },
    ],
};

const LINDDUN_MAPPING: Record<string, any[]> = {
    'Web Client': [
        { title: 'User Unawareness of Collection', category: 'Unawareness', mitigations: ['Privacy Notices'] },
        { title: 'Session Linkability', category: 'Linkability', mitigations: ['Anti-fingerprinting'] },
    ],
    'API': [
        { title: 'Data Leakage in API Responses', category: 'Disclosure of Information', mitigations: ['Data Minimization'] },
        { title: 'Traceable Identifiers', category: 'Identifiability', mitigations: ['UUIDs'] },
    ],
    'Database': [
        { title: 'Linkability of User Records', category: 'Linkability', mitigations: ['Anonymization'] },
        { title: 'Unauthorized Data Access', category: 'Disclosure of Information', mitigations: ['Row-level encryption'] },
    ],
};

async function seedFullAnalyses() {
    const db = await getDb();
    const clientId = 3;

    console.log('🧹 Cleaning up old project data for Client 3...');
    await db.delete(schema.projects).where(eq(schema.projects.clientId, clientId));
    await db.delete(schema.riskAssessments).where(eq(schema.riskAssessments.clientId, clientId));
    await db.delete(schema.riskTreatments).where(eq(schema.riskTreatments.clientId, clientId));
    await db.delete(schema.threatModels).where(eq(schema.threatModels.clientId, clientId));

    const projects = [
        { name: "NextGen Mobile Banking", type: "it", criticality: "critical", desc: "Flagship consumer banking application." },
        { name: "GenAI Loan Advisor", type: "ai", criticality: "high", desc: "Automated mortgage approval agent." },
        { name: "Cloud Edge Migration", type: "infra", criticality: "high", desc: "Legacy to multi-cloud migration." },
        { name: "Global Customer Data Privacy Wrap", type: "privacy", criticality: "medium", desc: "GDPR/CCPA Compliance alignment." },
        { name: "API Gateway Hardening", type: "it", criticality: "critical", desc: "Zero-trust API security implementation." }
    ];

    for (const p of projects) {
        console.log(`🚀 Seeding project: ${p.name}`);
        const [project] = await db.insert(schema.projects).values({
            clientId,
            name: p.name,
            description: p.desc,
            projectType: p.type,
            securityCriticality: p.criticality,
            status: 'active',
            owner: 'Sarah Connor',
            startDate: new Date(),
            endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }).returning();

        // 1. Create STRIDE Threat Model
        const [strideModel] = await db.insert(schema.threatModels).values({
            clientId,
            devProjectId: project.id,
            name: `${p.name} Security Model`,
            methodology: 'STRIDE',
            status: 'active'
        }).returning();

        const components = [
            { name: 'Web Portal', type: 'Web Client', x: 100, y: 100 },
            { name: 'Production API', type: 'API', x: 300, y: 100 },
            { name: 'Customer DB', type: 'Database', x: 500, y: 100 }
        ];

        const compIds: any = {};
        for (const c of components) {
            const [comp] = await db.insert(schema.threatModelComponents).values({
                threatModelId: strideModel.id,
                ...c
            }).returning();
            compIds[c.name] = comp.id;
        }

        // 2. Create LINDDUN Threat Model
        const [linddunModel] = await db.insert(schema.threatModels).values({
            clientId,
            devProjectId: project.id,
            name: `${p.name} Privacy Model`,
            methodology: 'LINDDUN',
            status: 'active'
        }).returning();

        for (const c of components) {
            await db.insert(schema.threatModelComponents).values({
                threatModelId: linddunModel.id,
                ...c
            });
        }

        // 3. Create Detailed Risk Assessments (Security)
        const owaspCats = ["Broken Access Control", "Cryptographic Failures", "Injection", "Insecure Design", "Vulnerable Components"];
        const csfFuncs = ["Identify", "Protect", "Detect", "Respond", "Recover"];
        const aiRmfCats = ["Govern", "Map", "Measure", "Manage"];

        for (const comp of components) {
            const rules = STRIDE_MAPPING[comp.type] || [];
            for (const rule of rules) {
                const likelihood = 2 + Math.floor(Math.random() * 3);
                const impact = 3 + Math.floor(Math.random() * 2);
                const inherentScore = likelihood * impact;
                const residualScore = Math.floor(inherentScore * 0.4);

                const [assessment] = await db.insert(schema.riskAssessments).values({
                    clientId,
                    projectId: project.id,
                    assessmentId: `RA-${project.id}-${Math.floor(Math.random() * 1000)}`,
                    title: `${rule.title} on ${comp.name}`,
                    threatDescription: `Potential ${rule.category} threat affecting the ${comp.name} component.`,
                    likelihood: String(likelihood),
                    impact: String(impact),
                    inherentScore,
                    inherentRisk: inherentScore >= 16 ? 'Critical' : inherentScore >= 10 ? 'High' : 'Medium',
                    residualScore,
                    residualRisk: residualScore >= 10 ? 'High' : residualScore >= 5 ? 'Medium' : 'Low',
                    riskOwner: 'Sarah Connor',
                    status: 'approved',
                    treatmentOption: 'mitigate',
                    owaspCategory: owaspCats[Math.floor(Math.random() * owaspCats.length)],
                    csfFunction: csfFuncs[Math.floor(Math.random() * csfFuncs.length)],
                    aiRmfCategory: project.projectType === 'ai' ? aiRmfCats[Math.floor(Math.random() * aiRmfCats.length)] : null,
                    privacyImpact: false,
                    updatedAt: new Date()
                } as any).returning();

                // Add treatments
                for (const mit of rule.mitigations) {
                    await db.insert(schema.riskTreatments).values({
                        clientId,
                        riskAssessmentId: assessment.id,
                        treatmentType: 'mitigate',
                        strategy: mit,
                        status: 'implemented',
                        completionPercentage: 100,
                        updatedAt: new Date()
                    });
                }
            }
        }

        // 4. Create Privacy Risks (LINDDUN)
        for (const comp of components) {
            const rules = LINDDUN_MAPPING[comp.type] || [];
            for (const rule of rules) {
                const likelihood = 2 + Math.floor(Math.random() * 2);
                const impact = 2 + Math.floor(Math.random() * 3);
                const inherentScore = likelihood * impact;

                await db.insert(schema.riskAssessments).values({
                    clientId,
                    projectId: project.id,
                    assessmentId: `PA-${project.id}-${Math.floor(Math.random() * 1000)}`,
                    title: `${rule.title} on ${comp.name}`,
                    threatDescription: `${rule.category}: Privacy risk regarding how ${comp.name} handles user PII.`,
                    likelihood: String(likelihood),
                    impact: String(impact),
                    inherentScore,
                    inherentRisk: inherentScore >= 12 ? 'High' : 'Medium',
                    residualScore: Math.floor(inherentScore * 0.5),
                    residualRisk: 'Medium',
                    riskOwner: 'John Connor',
                    status: 'reviewed',
                    treatmentOption: 'mitigate',
                    privacyImpact: true,
                    updatedAt: new Date()
                });
            }
        }
    }

    console.log('✅ Full analysis data seeded for all projects.');
    process.exit(0);
}

seedFullAnalyses().catch(console.error);
