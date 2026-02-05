
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq, and } from 'drizzle-orm';

async function seedDynamicProjects() {
    console.log('🌱 Seeding Dynamic Project Data for Client 3...');
    const db = await getDb();
    const clientId = 3;

    // 1. Projects to create
    const projectSpecs = [
        {
            name: "NextGen Mobile Banking",
            description: "High-stakes retail banking app with biometric auth and real-time fraud detection.",
            projectType: "it",
            securityCriticality: "critical",
            status: "active",
            owner: "Sarah Connor"
        },
        {
            name: "GenAI Loan Advisor",
            description: "AI-powered customer service agent for mortgage applications.",
            projectType: "ai",
            securityCriticality: "high",
            status: "active",
            owner: "Marcus Wright"
        },
        {
            name: "Cloud Edge Migration",
            description: "Moving core legacy services to multi-cloud serverless infrastructure.",
            projectType: "infra",
            securityCriticality: "high",
            status: "planning",
            owner: "Kyle Reese"
        },
        {
            name: "Global Customer Data Privacy Wrap",
            description: "GDPR/CCPA compliance audit and technical implementation for global data mesh.",
            projectType: "privacy",
            securityCriticality: "medium",
            status: "active",
            owner: "John Connor"
        },
        {
            name: "API Gateway Hardening",
            description: "Securing public-facing endpoints with WAF, mTLS, and advanced rate limiting.",
            projectType: "it",
            securityCriticality: "critical",
            status: "completed",
            owner: "Sarah Connor"
        }
    ];

    console.log('Inserting projects...');
    const createdProjects = [];
    for (const spec of projectSpecs) {
        const [project] = await db.insert(schema.projects).values({
            clientId,
            ...spec,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days out
        }).returning();
        createdProjects.push(project);
    }

    // 2. Seed Risks with Framework Context
    console.log('Seeding risks with OWASP and NIST CSF categories...');
    const owaspCategories = [
        "Broken Access Control",
        "Cryptographic Failures",
        "Injection",
        "Insecure Design",
        "Vulnerable Components",
        "Security Logging and Monitoring Failures",
        "Server-Side Request Forgery"
    ];

    const csfFunctions = ["Identify", "Protect", "Detect", "Respond", "Recover"];

    for (const project of createdProjects) {
        // Create 6-8 risks per project
        const riskCount = 6 + Math.floor(Math.random() * 3);
        for (let i = 0; i < riskCount; i++) {
            const likelihood = 1 + Math.floor(Math.random() * 5);
            const impact = 1 + Math.floor(Math.random() * 5);
            const score = likelihood * impact;

            let inherentRisk = 'Low';
            if (score >= 20) inherentRisk = 'Critical';
            else if (score >= 12) inherentRisk = 'High';
            else if (score >= 6) inherentRisk = 'Medium';

            await db.insert(schema.riskScenarios).values({
                clientId,
                projectId: project.id,
                title: `Risk ${i + 1} for ${project.name}`,
                description: `Potential threat related to ${project.projectType} implementation.`,
                likelihood,
                impact,
                inherentScore: score,
                inherentRisk,
                status: Math.random() > 0.3 ? 'identified' : 'treated',
                owaspCategory: owaspCategories[Math.floor(Math.random() * owaspCategories.length)],
                csfFunction: csfFunctions[Math.floor(Math.random() * csfFunctions.length)],
                privacyImpact: project.projectType === 'privacy' || Math.random() > 0.7
            });
        }

        // 3. Seed Compliance Mappings (NIST CSF)
        console.log(`Seeding compliance mappings for ${project.name}...`);
        const requirements = [
            { id: "ID.AM-1", func: "Identify" },
            { id: "ID.RA-1", func: "Identify" },
            { id: "PR.AC-1", func: "Protect" },
            { id: "PR.DS-1", func: "Protect" },
            { id: "DE.AE-1", func: "Detect" },
            { id: "RS.RP-1", func: "Respond" },
            { id: "RC.RP-1", func: "Recover" }
        ];

        for (const req of requirements) {
            await db.insert(schema.projectComplianceMappings).values({
                projectId: project.id,
                framework: "NIST CSF",
                requirementId: req.id,
                status: Math.random() > 0.5 ? 'implemented' : 'pending',
                notes: `Implementation status for ${req.id} in ${project.name}.`
            });
        }

        // 4. Seed Threat Models
        console.log(`Seeding threat models for ${project.name}...`);
        await db.insert(schema.threatModels).values({
            clientId,
            projectId: project.id,
            name: `${project.name} Architecture Model`,
            methodology: project.projectType === 'privacy' ? 'LINDDUN' : 'STRIDE',
            status: 'active'
        });
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
}

seedDynamicProjects().catch(err => {
    console.error('❌ Failed to seed:', err);
    process.exit(1);
});
