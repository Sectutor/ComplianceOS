import 'dotenv/config';
import { getDb } from '../db';
import { assets, threats, vulnerabilities, riskScenarios, riskAssessments, riskTreatments } from '../schema';
import { sql } from 'drizzle-orm';

async function seedRiskData() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    const clientId = 1; // Default to client 1 (Intellfence)
    console.log(`--- Seeding Risk Data for Client ${clientId} ---`);

    // 1. Assets
    const assetData = [
        { clientId, name: 'Customer Database', type: 'Information / Data', owner: 'CTO', location: 'AWS RDS - us-east-1', status: 'active' as any, valuationC: 5, valuationI: 5, valuationA: 4, description: 'Primary customer data including PII and payment history.' },
        { clientId, name: 'Production Web Servers', type: 'Hardware / Infrastructure', owner: 'DevOps Lead', location: 'AWS EC2', status: 'active' as any, valuationC: 3, valuationI: 4, valuationA: 5, description: 'Main web application servers handling customer traffic.' },
        { clientId, name: 'Employee Laptops', type: 'Hardware', owner: 'IT Manager', location: 'Remote / Office', status: 'active' as any, valuationC: 4, valuationI: 3, valuationA: 3, description: 'Company-issued laptops for employees.' },
        { clientId, name: 'Office Network', type: 'Infrastructure', owner: 'IT Manager', location: 'Main Office', status: 'active' as any, valuationC: 3, valuationI: 4, valuationA: 4, description: 'Internal corporate network and Wi-Fi.' },
        { clientId, name: 'Cloud Storage (S3)', type: 'Service', owner: 'CTO', location: 'AWS S3', status: 'active' as any, valuationC: 4, valuationI: 5, valuationA: 4, description: 'Long-term storage for documents and backups.' },
        { clientId, name: 'Email System (Google Workspace)', type: 'Software / Service', owner: 'IT Manager', location: 'SaaS', status: 'active' as any, valuationC: 4, valuationI: 4, valuationA: 5, description: 'Corporate communication and document collaboration.' },
        { clientId, name: 'Source Code Repository (GitHub)', type: 'Information / Service', owner: 'CTO', location: 'SaaS', status: 'active' as any, valuationC: 5, valuationI: 5, valuationA: 4, description: 'Proprietary source code and IP.' },
        { clientId, name: 'Finance System', type: 'Software / Data', owner: 'CFO', location: 'SaaS', status: 'active' as any, valuationC: 5, valuationI: 5, valuationA: 4, description: 'Accounting and financial management system.' },
        { clientId, name: 'Backup Storage System', type: 'Infrastructure', owner: 'IT Manager', location: 'AWS S3 Glacier', status: 'active' as any, valuationC: 5, valuationI: 5, valuationA: 5, description: 'Disconnected/Immutable backups of critical systems.' },
        { clientId, name: 'CRM System (Salesforce)', type: 'Software / Service', owner: 'VP Sales', location: 'SaaS', status: 'active' as any, valuationC: 4, valuationI: 4, valuationA: 4, description: 'Customer relationship management data.' },
    ];

    console.log("Inserting Assets...");
    const insertedAssets = await db.insert(assets).values(assetData).returning();

    // 2. Threats
    const threatData = [
        { clientId, threatId: 'THR-001', name: 'Ransomware Attack', category: 'Malware', source: 'Cybercriminals', intent: 'Deliberate', likelihood: 'Possible', potentialImpact: 'Critical data loss and business disruption.', status: 'active' as any },
        { clientId, threatId: 'THR-002', name: 'Phishing Campaign', category: 'Human / Social Engineering', source: 'External Actors', intent: 'Deliberate', likelihood: 'Likely', potentialImpact: 'Credential theft and initial access to network.', status: 'active' as any },
        { clientId, threatId: 'THR-003', name: 'Insider Threat (Malicious)', category: 'Human', source: 'Internal Employee', intent: 'Deliberate', likelihood: 'Rare', potentialImpact: 'Data exfiltration or system sabotage.', status: 'active' as any },
        { clientId, threatId: 'THR-004', name: 'Data Breach (Accidental)', category: 'Human / Error', source: 'Internal Employee', intent: 'Accidental', likelihood: 'Possible', potentialImpact: 'Leakage of sensitive customer or corporate data.', status: 'active' as any },
        { clientId, threatId: 'THR-005', name: 'DDoS Attack', category: 'Technical', source: 'Botnets', intent: 'Deliberate', likelihood: 'Possible', potentialImpact: 'Service unavailability for production systems.', status: 'active' as any },
    ];

    console.log("Inserting Threats...");
    const insertedThreats = await db.insert(threats).values(threatData).returning();

    // 3. Vulnerabilities
    const vulnerabilityData = [
        { clientId, vulnerabilityId: 'VULN-001', name: 'Unpatched Web Server', description: 'Web servers running versions with known vulnerabilities.', severity: 'High', status: 'open' as any, cvssScore: 75 },
        { clientId, vulnerabilityId: 'VULN-002', name: 'Weak Password Policy', description: 'Employees using easily guessable passwords.', severity: 'Medium', status: 'open' as any, cvssScore: 50 },
        { clientId, vulnerabilityId: 'VULN-003', name: 'Lack of MFA on SaaS', description: 'Critical SaaS accounts not requiring MFA.', severity: 'Critical', status: 'open' as any, cvssScore: 90 },
        { clientId, vulnerabilityId: 'VULN-004', name: 'Unencrypted Backups', description: 'Backups in S3 are not encrypted at rest.', severity: 'Medium', status: 'open' as any, cvssScore: 45 },
    ];

    console.log("Inserting Vulnerabilities...");
    const insertedVulns = await db.insert(vulnerabilities).values(vulnerabilityData).returning();

    // 4. Risk Scenarios
    const scenarioData = [
        {
            clientId,
            title: 'Ransomware on Customer Database',
            description: 'A ransomware attack encrypts the primary database via unpatched servers.',
            assessmentType: 'asset',
            assetId: insertedAssets.find(a => a.name === 'Customer Database')?.id,
            threatId: insertedThreats.find(t => t.name === 'Ransomware Attack')?.id,
            vulnerabilityId: insertedVulns.find(v => v.name === 'Unpatched Web Server')?.id,
            likelihood: 2,
            impact: 5,
            inherentRiskScore: 10,
            status: 'identified',
            owner: 'CISO'
        },
        {
            clientId,
            title: 'Unauthorized access to GitHub',
            description: 'External actor gains access to repositories via phishing and lack of MFA.',
            assessmentType: 'asset',
            assetId: insertedAssets.find(a => a.name === 'Source Code Repository (GitHub)')?.id,
            threatId: insertedThreats.find(t => t.name === 'Phishing Campaign')?.id,
            vulnerabilityId: insertedVulns.find(v => v.name === 'Lack of MFA on SaaS')?.id,
            likelihood: 3,
            impact: 4,
            inherentRiskScore: 12,
            status: 'identified',
            owner: 'CTO'
        }
    ];

    console.log("Inserting Risk Scenarios...");
    await db.insert(riskScenarios).values(scenarioData);

    // 5. Risk Assessments
    const assessmentData = [
        {
            clientId,
            assessmentId: 'RA-2024-001',
            title: 'Ransomware Risk Assessment',
            assessmentDate: new Date(),
            assessor: 'Security Team',
            method: 'Qualitative',
            threatId: insertedThreats[0].id,
            vulnerabilityId: insertedVulns[0].id,
            threatDescription: insertedThreats[0].description,
            vulnerabilityDescription: insertedVulns[0].description,
            affectedAssets: [insertedAssets[0].name, insertedAssets[8].name],
            likelihood: 'Possible',
            impact: 'Critical',
            inherentRisk: 'Very High',
            existingControls: 'Firewall, Regular Backups',
            controlEffectiveness: 'Partially Effective',
            residualRisk: 'High',
            riskOwner: 'CISO',
            treatmentOption: 'mitigate',
            recommendedActions: 'Deploy EDR, Enable MFA, Encrypt Backups',
            priority: 'High',
            status: 'approved' as any
        }
    ];

    console.log("Inserting Risk Assessments...");
    const insertedAssessments = await db.insert(riskAssessments).values(assessmentData).returning();

    // 6. Risk Treatments
    const treatmentData = [
        {
            clientId,
            riskAssessmentId: insertedAssessments[0].id,
            treatmentType: 'mitigate',
            strategy: 'Deploy EDR and implement offline backups.',
            status: 'in_progress',
            owner: 'IT Ops',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            priority: 'high'
        }
    ];

    console.log("Inserting Risk Treatments...");
    await db.insert(riskTreatments).values(treatmentData);

    console.log("--- Risk Data Seeding Complete ---");
    process.exit(0);
}

seedRiskData().catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
});
