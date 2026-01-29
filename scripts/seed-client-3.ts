
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function seedClient3() {
    console.log('🌱 Seeding Client 3 (Intellfence) - MAXIMAL DATA MODE...');
    const db = await getDb();

    // 1. Create Client with ALL fields populated
    console.log('Checking/Creating Client...');
    let clientId = 3;
    const existingClient = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId));

    const clientData = {
        id: clientId,
        name: 'Intellfence',
        industry: 'Cybersecurity',
        description: 'Global provider of advanced threat intelligence, managed SOC, and automated defense solutions.',
        status: 'active',
        planTier: 'enterprise',
        primaryContactName: 'Dr. Sarah Connor',
        primaryContactEmail: 'ciso@intellfence.com',
        primaryContactPhone: '+1-555-0199-8822',
        region: 'NA/EU',
        deploymentType: 'Hybrid Cloud',
        clientTier: 'Strategic',
        serviceModel: 'managed', // Managed Service
        weeklyFocus: 'Review ISO 27001 Audit Readiness gaps and finalize Q1 risk treatment plan.',

        targetComplianceScore: 95,
        cisoName: 'Dr. Sarah Connor',
        dpoName: 'Marcus Wright',
        headquarters: 'San Francisco, CA',
        mainServiceRegion: 'Global',

        policyLanguage: 'en',
        legalEntityName: 'Intellfence Systems, Inc.',
        regulatoryJurisdictions: ["US-CA", "EU-GDPR", "UK-DPA"],

        defaultDocumentClassification: 'Confidential',

        stripeCustomerId: 'cus_TEST12345678',
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date('2026-12-31'),

        activeModules: ["roadmap", "risk", "compliance", "policy", "assets"],

        notes: "Key strategic account. Beta tester for new 'Zero Trust' module.",

        createdAt: new Date(),
        updatedAt: new Date()
    };

    if (existingClient.length === 0) {
        await db.insert(schema.clients).values(clientData);
        console.log('✅ Client created with FULL details.');
    } else {
        // Optional: Update existing to ensure it has all fields
        await db.update(schema.clients).set(clientData).where(eq(schema.clients.id, clientId));
        console.log('ℹ️ Client 3 updated with FULL details.');
    }

    // 2. Clear existing demo data for clean slate
    await db.delete(schema.roadmaps).where(eq(schema.roadmaps.clientId, clientId));
    await db.delete(schema.threats).where(eq(schema.threats.clientId, clientId));

    // 3. Seed Threats with ALL fields
    console.log('Seeding Threats...');
    const threatsData = [
        {
            name: 'Supply Chain Compromise (SolarWinds style)',
            description: 'Compromise of software update mechanism in CI/CD pipeline leading to downstream infection of customer environments.',
            category: 'Technical',
            source: 'External', // Nation State
            intent: 'Deliberate',
            likelihood: 'Possible',
            potentialImpact: 'Critical',
            affectedAssets: 'Build Server, Release Pipeline, Customer Agents',
            relatedVulnerabilities: 'CVE-2024-XYZ, CVE-2025-ABC',
            associatedRisks: 'Reputational Damage, Legal Liability, Customer Churn',
            scenario: 'Attacker gains access to the build server via compromised developer credentials, injects malicious code into the update binary, which is then signed and distributed to 5000+ customers.',
            detectionMethod: 'Binary Integrity Monitoring, Behavioral Analysis of Build Process',
            owner: 'Head of DevOps',
            lastReviewDate: new Date('2025-11-15'),
            status: 'active'
        },
        {
            name: 'Insider IP Theft',
            description: 'Privileged user (admin/developer) exfiltrating proprietary threat intelligence algorithms or source code to a competitor or foreign entity.',
            category: 'Human',
            source: 'Insider',
            intent: 'Deliberate',
            likelihood: 'Possible',
            potentialImpact: 'High',
            affectedAssets: 'Threat Intel DB, Source Code Repo, Confluence',
            relatedVulnerabilities: 'Weak DLP Policies, Excessive Privileges',
            associatedRisks: 'Loss of Competitive Advantage, IP Loss',
            scenario: 'Disgruntled engineer downloads the core "Predictive Engine" source code to a personal USB drive before resigning.',
            detectionMethod: 'DLP Alerts, USB Blocking Logs, User Behavior Analytics (UBA)',
            owner: 'CISO',
            lastReviewDate: new Date('2025-12-01'),
            status: 'active'
        },
        {
            name: 'API Key Leakage',
            description: 'Accidental commit of production API keys or cloud credentials to public repositories (GitHub) or logs.',
            category: 'Technical',
            source: 'Internal',
            intent: 'Accidental',
            likelihood: 'Likely',
            potentialImpact: 'High',
            affectedAssets: 'AWS Production Environment, 3rd Party Integrations (Stripe, Twilio)',
            relatedVulnerabilities: 'Missing Pre-commit Hooks, Lack of Secret Scanning',
            associatedRisks: 'Cloud Resource Hijacking, Data Breach',
            scenario: 'Junior dev commits `.env` file containing AWS Admin keys to a public repo. Bots scrape it within 5 minutes and spin up crypto miners.',
            detectionMethod: 'GitHub Secret Scanning, AWS GuardDuty',
            owner: 'Lead Architect',
            lastReviewDate: new Date('2026-01-10'),
            status: 'active'
        },
        {
            name: 'Ransomware - Double Extortion',
            description: 'Attackers encrypt production databases and threaten to leak sensitive customer data unless ransom is paid.',
            category: 'Technical',
            source: 'Hacker',
            intent: 'Deliberate',
            likelihood: 'Possible',
            potentialImpact: 'Critical',
            affectedAssets: 'Customer DB, File Servers, Backup Systems',
            relatedVulnerabilities: 'Unpatched VPN Gateway, Weak RDP Passwords',
            associatedRisks: 'Operational Downtime, Financial Loss, Regulatory Fines',
            scenario: 'Attackers gain initial access via phishing, move laterally to DC, exfiltrate data, then deploy encryption across all Windows servers.',
            detectionMethod: 'EDR Alerts, Network Traffic Anomaly (Data Exfil)',
            owner: 'SecOps Lead',
            lastReviewDate: new Date('2025-10-20'),
            status: 'active'
        },
        {
            name: 'Regulatory Non-Compliance (GDPR/AI Act)',
            description: 'Failure to adhere to evolving privacy regulations, specifically regarding AI model training data.',
            category: 'Compliance',
            source: 'Internal',
            intent: 'Accidental',
            likelihood: 'Likely',
            potentialImpact: 'High',
            affectedAssets: 'AI Training Datasets, Marketing Database',
            relatedVulnerabilities: 'Lack of Data Governance, undocumented AI models',
            associatedRisks: 'Massive Fines (4% Global Revenue), Business Ban',
            scenario: 'Audit reveals that "Right to be Forgotten" requests were not propagated to the AI model training set, violating GDPR.',
            detectionMethod: 'Internal Audit, Privacy Impact Assessment (PIA)',
            owner: 'Privacy Officer (DPO)',
            lastReviewDate: new Date('2026-01-05'),
            status: 'monitored'
        }
    ];

    for (const t of threatsData) {
        await db.insert(schema.threats).values({
            clientId,
            ...t,
            threatId: `THR-${Math.floor(Math.random() * 10000)}`
        });
    }
    console.log(`✅ ${threatsData.length} Threats seeded with FULL details.`);


    // 4. Seed Strategic Roadmap with RICH objectives and FULL columns
    console.log('Seeding Roadmap...');

    const roadmapId = 101;
    const roadmapValues = {
        title: "2026 Security Maturity Evolution",
        vision: `GOALS: Market Expansion, AI-Driven Defense, IPO Readiness\nINDUSTRY: Cybersecurity\nRISK_APPETITE: 4/5 (Aggressive)\nMATURITY: Managed (Tier 2)`,
        framework: "ISO 27001:2022",

        startDate: new Date('2026-01-01'),
        targetDate: new Date('2026-12-31'),
        actualStartDate: new Date('2026-01-15'), // Started recently

        status: 'active',

        objectives: [
            "Achieve ISO 27001 Certification",
            "Implement Zero Trust Network Access",
            "Automate Threat Response (SOAR)",
            "AI Model Security Governance",
            "Cloud Security Posture Management (CSPM)"
        ],

        // The big JSON payload with ALL fields
        description: JSON.stringify({
            businessContext: {
                industry: "Cybersecurity",
                orgSize: "mid", // Mid-Market
                goals: ["Market Expansion", "AI-Driven Defense", "IPO Readiness"],
                riskAppetite: 4
            },
            posture: {
                maturityLevel: "Managed",
                keyAssets: ["Threat Intel DB", "Customer Agents", "AI Training Cluster", "Billing System"],
                recentIncidents: "Minor API rate limit incident in Q4. Prevented one phishing attempt targeting HR."
            },
            drivers: {
                frameworks: ["ISO 27001:2022", "SOC 2 Type II", "EU AI Act"],
                auditType: "initial", // Initial Certification
                deadline: "2026-10-01"
            },
            detailedObjectives: [
                {
                    id: "obj-1",
                    title: "Achieve ISO 27001 Certification",
                    alignment: "Market Expansion",
                    priority: "Critical",
                    horizon: "Q2",
                    owner: "Compliance Lead (Sarah C.)",
                    estimatedHours: 450,
                    budget: 35000,
                    complexity: "High",
                    linkedRisks: ["Insider IP Theft", "Regulatory Non-Compliance (GDPR/AI Act)"]
                },
                {
                    id: "obj-2",
                    title: "Implement Zero Trust Network Access",
                    alignment: "AI-Driven Defense",
                    priority: "High",
                    horizon: "H2",
                    owner: "Network Architect (Kyle R.)",
                    estimatedHours: 320,
                    budget: 65000,
                    complexity: "Very High",
                    linkedRisks: ["API Key Leakage", "Ransomware - Double Extortion"]
                },
                {
                    id: "obj-3",
                    title: "Automate Threat Response (SOAR)",
                    alignment: "AI-Driven Defense",
                    priority: "Medium",
                    horizon: "Next Year",
                    owner: "SecOps Lead (John D.)",
                    estimatedHours: 180,
                    budget: 15000,
                    complexity: "Medium",
                    linkedRisks: ["Supply Chain Compromise (SolarWinds style)"]
                },
                {
                    id: "obj-4",
                    title: "AI Model Security Governance",
                    alignment: "IPO Readiness",
                    priority: "High",
                    horizon: "Q2",
                    owner: "Chief AI Scientist",
                    estimatedHours: 200,
                    budget: 5000,
                    complexity: "High",
                    linkedRisks: ["Regulatory Non-Compliance (GDPR/AI Act)"]
                },
                {
                    id: "obj-5",
                    title: "Cloud Security Posture Management (CSPM)",
                    alignment: "AI-Driven Defense",
                    priority: "Medium",
                    horizon: "Q1",
                    owner: "Cloud Ops",
                    estimatedHours: 80,
                    budget: 12000,
                    complexity: "Low",
                    linkedRisks: ["API Key Leakage"]
                }
            ],
            metrics: [
                { id: "m1", name: "Audit Readiness Score", type: "Percentage", targetValue: 100, frequency: "Monthly" },
                { id: "m2", name: "Mean Time to Respond (MTTR)", type: "Count", targetValue: 15, frequency: "Weekly" },
                { id: "m3", name: "Vulnerability Patch Rate", type: "Percentage", targetValue: 95, frequency: "Monthly" },
                { id: "m4", name: "Policy Acknowledgement Rate", type: "Percentage", targetValue: 100, frequency: "Quarterly" }
            ],
            governance: {
                reviewCadence: "Monthly",
                oversightCommittee: "Executive Risk Committee (ERC)",
                reportingFormat: "Live Dashboard + QBR Slide Deck"
            }
        }),

        kpiTargets: [
            { name: "Audit Readiness Score", target: 100, unit: "percentage", current: 45 },
            { name: "Mean Time to Respond (MTTR)", target: 15, unit: "minutes", current: 42 },
            { name: "Vulnerability Patch Rate", target: 95, unit: "percentage", current: 78 }
        ],

        createdById: 1,
        approvedById: 1, // Approved (simulated)
        approvedAt: new Date('2026-01-20') // Approved recently
    };

    await db.insert(schema.roadmaps).values({
        clientId,
        ...roadmapValues
    });
    console.log('✅ Roadmap seeded with RICH, MAXIMAL data.');

    console.log('🏁 Seed Complete!');
    process.exit(0);
}

seedClient3().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
