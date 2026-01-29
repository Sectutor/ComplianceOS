import dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { assets, threats, vulnerabilities, riskAssessments } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Seed script to populate Intellfence client with sample risk management data
 * Run with: npx tsx scripts/seed-risk-data.ts
 */

async function seedRiskData() {
    const db = await getDb();
    if (!db) {
        console.error('❌ Failed to connect to database');
        process.exit(1);
    }

    console.log('🌱 Starting to seed risk management data...\n');

    try {
        // Client #3 - Intellfence (Information Technology)
        const clientId = 3;

        // Clean up any existing risk management data for this client
        console.log('🧹 Cleaning up existing data for client #3...');
        await db.delete(riskAssessments).where(eq(riskAssessments.clientId, clientId));
        await db.delete(vulnerabilities).where(eq(vulnerabilities.clientId, clientId));
        await db.delete(threats).where(eq(threats.clientId, clientId));
        await db.delete(assets).where(eq(assets.clientId, clientId));
        console.log('✅ Cleanup complete\n');

        // ==================== ASSETS (10) ====================
        console.log('📦 Seeding Assets...');
        const assetsData = [
            { clientId, name: 'Customer Database', type: 'Information / Data', owner: 'CTO', location: 'AWS RDS - us-east-1', status: 'active' as const, valuationC: 5, valuationI: 5, valuationA: 4, description: 'Primary customer data including PII, payment history, and preferences', acquisitionDate: new Date('2022-01-15'), lastReviewDate: new Date('2024-11-20') },
            { clientId, name: 'Production Web Servers', type: 'Hardware', owner: 'IT Operations', location: 'AWS EC2 - us-east-1', status: 'active' as const, valuationC: 3, valuationI: 5, valuationA: 5, description: 'Load-balanced web servers hosting customer-facing applications', acquisitionDate: new Date('2023-03-10'), lastReviewDate: new Date('2024-12-01') },
            { clientId, name: 'Employee Laptops', type: 'Hardware', owner: 'IT Department', location: 'Remote/Distributed', status: 'active' as const, valuationC: 4, valuationI: 3, valuationA: 3, description: 'MacBook Pro laptops issued to all employees for daily work', acquisitionDate: new Date('2023-06-01'), lastReviewDate: new Date('2024-10-15') },
            { clientId, name: 'Source Code Repository', type: 'Information / Data', owner: 'Engineering Lead', location: 'GitHub Enterprise', status: 'active' as const, valuationC: 5, valuationI: 5, valuationA: 3, description: 'Private repositories containing proprietary application code', acquisitionDate: new Date('2021-08-20'), lastReviewDate: new Date('2024-11-30') },
            { clientId, name: 'Payment Processing API', type: 'Software', owner: 'VP Engineering', location: 'AWS Lambda', status: 'active' as const, valuationC: 5, valuationI: 5, valuationA: 5, description: 'Stripe integration handling all customer transactions', acquisitionDate: new Date('2022-05-12'), lastReviewDate: new Date('2024-12-10') },
            { clientId, name: 'Office Network Infrastructure', type: 'Hardware', owner: 'Network Admin', location: 'Main Office', status: 'active' as const, valuationC: 3, valuationI: 4, valuationA: 5, description: 'Routers, switches, and firewalls for office connectivity', acquisitionDate: new Date('2022-11-01'), lastReviewDate: new Date('2024-09-20') },
            { clientId, name: 'Backup Storage System', type: 'Hardware', owner: 'IT Operations', location: 'AWS S3 Glacier', status: 'active' as const, valuationC: 4, valuationI: 5, valuationA: 4, description: 'Encrypted backup storage for disaster recovery', acquisitionDate: new Date('2023-01-05'), lastReviewDate: new Date('2024-11-25') },
            { clientId, name: 'HR Management System', type: 'Software', owner: 'HR Director', location: 'SaaS - BambooHR', status: 'active' as const, valuationC: 5, valuationI: 4, valuationA: 3, description: 'Employee records, payroll, and performance data', acquisitionDate: new Date('2022-09-14'), lastReviewDate: new Date('2024-10-30') },
            { clientId, name: 'API Documentation Portal', type: 'Information / Data', owner: 'Product Manager', location: 'AWS CloudFront', status: 'active' as const, valuationC: 2, valuationI: 3, valuationA: 4, description: 'Public and internal API documentation', acquisitionDate: new Date('2023-04-20'), lastReviewDate: new Date('2024-11-15') },
            { clientId, name: 'Office Building', type: 'Site / Facility', owner: 'Facilities Manager', location: '123 Tech Street', status: 'active' as const, valuationC: 3, valuationI: 3, valuationA: 4, description: 'Main office building with 50-person capacity', acquisitionDate: new Date('2021-06-01'), lastReviewDate: new Date('2024-08-10') },
        ];

        await db.insert(assets).values(assetsData as any);
        console.log('✅ 10 Assets seeded\n');

        // ==================== THREATS (10) ====================
        console.log('⚠️  Seeding Threats...');
        const threatsData = [
            { clientId, threatId: 'THR-2024-001', name: 'Ransomware Attack', category: 'Malware', source: 'Cybercriminal Groups', intent: 'Financial Gain', capability: 'High', targeting: 'Opportunistic', likelihood: 'Possible', potentialImpact: 'Critical - Data encryption, business disruption, ransom demands', status: 'active' as const, owner: 'CISO', lastReviewDate: new Date('2024-12-15'), description: 'Sophisticated ransomware targeting cloud infrastructure and backups' },
            { clientId, threatId: 'THR-2024-002', name: 'Phishing Campaign', category: 'Social Engineering', source: 'External Attackers', intent: 'Credential Theft', capability: 'Medium', targeting: 'Targeted', likelihood: 'Likely', potentialImpact: 'High - Compromised accounts, data breach', status: 'active' as const, owner: 'Security Team', lastReviewDate: new Date('2024-12-10'), description: 'Spear phishing emails targeting employees with admin privileges' },
            { clientId, threatId: 'THR-2024-003', name: 'DDoS Attack', category: 'Network', source: 'Hacktivists', intent: 'Service Disruption', capability: 'High', targeting: 'Targeted', likelihood: 'Unlikely', potentialImpact: 'High - Service unavailability, revenue loss', status: 'monitored' as const, owner: 'IT Operations', lastReviewDate: new Date('2024-11-28'), description: 'Distributed denial of service targeting public APIs' },
            { clientId, threatId: 'THR-2024-004', name: 'Insider Threat', category: 'Human', source: 'Disgruntled Employee', intent: 'Data Theft', capability: 'Medium', targeting: 'Targeted', likelihood: 'Rare', potentialImpact: 'Very High - IP theft, data exfiltration', status: 'monitored' as const, owner: 'HR Director', lastReviewDate: new Date('2024-12-01'), description: 'Malicious insider with administrative access' },
            { clientId, threatId: 'THR-2024-005', name: 'SQL Injection', category: 'Application', source: 'External Attackers', intent: 'Data Breach', capability: 'Medium', targeting: 'Opportunistic', likelihood: 'Possible', potentialImpact: 'Critical - Database compromise', status: 'active' as const, owner: 'Engineering Lead', lastReviewDate: new Date('2024-12-12'), description: 'Exploitation of vulnerable web application endpoints' },
            { clientId, threatId: 'THR-2024-006', name: 'Supply Chain Attack', category: 'Third-Party', source: 'Nation State', intent: 'Espionage', capability: 'Very High', targeting: 'Targeted', likelihood: 'Unlikely', potentialImpact: 'Critical - Widespread compromise', status: 'monitored' as const, owner: 'CISO', lastReviewDate: new Date('2024-11-20'), description: 'Compromised software dependencies or vendors' },
            { clientId, threatId: 'THR-2024-007', name: 'Physical Breach', category: 'Physical', source: 'Opportunist', intent: 'Theft', capability: 'Low', targeting: 'Opportunistic', likelihood: 'Unlikely', potentialImpact: 'Medium - Hardware theft, data access', status: 'monitored' as const, owner: 'Facilities Manager', lastReviewDate: new Date('2024-10-15'), description: 'Unauthorized physical access to office premises' },
            { clientId, threatId: 'THR-2024-008', name: 'API Abuse', category: 'Application', source: 'Automated Bots', intent: 'Service Abuse', capability: 'Medium', targeting: 'Opportunistic', likelihood: 'Likely', potentialImpact: 'Medium - Resource exhaustion, data scraping', status: 'active' as const, owner: 'API Team', lastReviewDate: new Date('2024-12-08'), description: 'Excessive API calls and rate limit bypass attempts' },
            { clientId, threatId: 'THR-2024-009', name: 'Data Exfiltration', category: 'Data', source: 'APT Group', intent: 'Espionage', capability: 'Very High', targeting: 'Targeted', likelihood: 'Rare', potentialImpact: 'Critical - Loss of confidential data', status: 'monitored' as const, owner: 'Security Team', lastReviewDate: new Date('2024-11-25'), description: 'Advanced persistent threat targeting customer data' },
            { clientId, threatId: 'THR-2024-010', name: 'Credential Stuffing', category: 'Authentication', source: 'Cybercriminals', intent: 'Account Takeover', capability: 'Medium', targeting: 'Opportunistic', likelihood: 'Possible', potentialImpact: 'High - Customer account compromise', status: 'active' as const, owner: 'Security Team', lastReviewDate: new Date('2024-12-14'), description: 'Automated login attempts using leaked credentials' },
        ];

        await db.insert(threats).values(threatsData as any);
        console.log('✅ 10 Threats seeded\n');

        // ==================== VULNERABILITIES (10) ====================
        console.log('🔓 Seeding Vulnerabilities...');
        const vulnsData = [
            { clientId, vulnerabilityId: 'VULN-2025-001', name: 'Unpatched Web Server', description: 'Apache web server running outdated version with known CVEs', severity: 'High', cvssScore: 75, cveId: 'CWE-1104', affectedAssets: JSON.stringify(['Production Web Servers']), status: 'open' as const, discoveryDate: new Date('2024-12-01'), owner: 'IT Operations', remediationPlan: 'Schedule maintenance window for patching', dueDate: new Date('2024-12-30') },
            { clientId, vulnerabilityId: 'VULN-2025-002', name: 'Weak Password Policy', description: 'No password complexity requirements enforced', severity: 'Medium', cvssScore: 53, cveId: 'CWE-521', affectedAssets: JSON.stringify(['All Systems']), status: 'open' as const, discoveryDate: new Date('2024-11-15'), owner: 'Security Team', remediationPlan: 'Implement password policy in IAM', dueDate: new Date('2025-01-15') },
            { clientId, vulnerabilityId: 'VULN-2025-003', name: 'Missing MFA', description: 'Multi-factor authentication not enforced for admin accounts', severity: 'High', cvssScore: 81, cveId: 'CWE-308', affectedAssets: JSON.stringify(['Customer Database', 'HR System']), status: 'open' as const, discoveryDate: new Date('2024-11-20'), owner: 'CISO', remediationPlan: 'Roll out MFA for all privileged accounts', dueDate: new Date('2024-12-31') },
            { clientId, vulnerabilityId: 'VULN-2025-004', name: 'Unencrypted Backups', description: 'Backup data stored without encryption at rest', severity: 'Critical', cvssScore: 91, cveId: 'CWE-311', affectedAssets: JSON.stringify(['Backup Storage System']), status: 'open' as const, discoveryDate: new Date('2024-12-05'), owner: 'IT Operations', remediationPlan: 'Enable AWS S3 encryption', dueDate: new Date('2024-12-20') },
            { clientId, vulnerabilityId: 'VULN-2025-005', name: 'Insecure API Endpoints', description: 'Rate limiting not implemented on public APIs', severity: 'Medium', cvssScore: 65, cveId: 'CWE-770', affectedAssets: JSON.stringify(['Payment Processing API']), status: 'mitigated' as const, discoveryDate: new Date('2024-10-10'), owner: 'API Team', remediationPlan: 'Deployed API Gateway rate limits', dueDate: new Date('2024-11-30') },
            { clientId, vulnerabilityId: 'VULN-2025-006', name: 'Outdated Dependencies', description: 'NPM packages with known security vulnerabilities', severity: 'Medium', cvssScore: 61, cveId: 'CWE-1035', affectedAssets: JSON.stringify(['Source Code Repository']), status: 'open' as const, discoveryDate: new Date('2024-11-28'), owner: 'Engineering Lead', remediationPlan: 'Update to latest stable versions', dueDate: new Date('2025-01-10') },
            { clientId, vulnerabilityId: 'VULN-2025-007', name: 'No Network Segmentation', description: 'Flat network architecture without VLANs', severity: 'High', cvssScore: 78, cveId: 'CWE-923', affectedAssets: JSON.stringify(['Office Network Infrastructure']), status: 'open' as const, discoveryDate: new Date('2024-09-15'), owner: 'Network Admin', remediationPlan: 'Implement network segmentation', dueDate: new Date('2025-02-01') },
            { clientId, vulnerabilityId: 'VULN-2025-008', name: 'Insufficient Logging', description: 'Audit logs not enabled for sensitive operations', severity: 'Medium', cvssScore: 59, cveId: 'CWE-778', affectedAssets: JSON.stringify(['All Systems']), status: 'open' as const, discoveryDate: new Date('2024-10-20'), owner: 'Security Team', remediationPlan: 'Deploy centralized logging solution', dueDate: new Date('2025-01-20') },
            { clientId, vulnerabilityId: 'VULN-2025-009', name: 'No Data Loss Prevention', description: 'DLP controls not implemented', severity: 'High', cvssScore: 72, cveId: 'CWE-212', affectedAssets: JSON.stringify(['Employee Laptops']), status: 'open' as const, discoveryDate: new Date('2024-11-10'), owner: 'CISO', remediationPlan: 'Evaluate and deploy DLP software', dueDate: new Date('2025-03-01') },
            { clientId, vulnerabilityId: 'VULN-2025-010', name: 'Inadequate Access Controls', description: 'Overly permissive IAM roles', severity: 'Medium', cvssScore: 68, cveId: 'CWE-269', affectedAssets: JSON.stringify(['AWS Infrastructure']), status: 'remediated' as const, discoveryDate: new Date('2024-09-01'), owner: 'Cloud Architect', remediationPlan: 'Implemented least privilege access', dueDate: new Date('2024-10-15') },
        ];

        await db.insert(vulnerabilities).values(vulnsData as any);
        console.log('✅ 10 Vulnerabilities seeded\n');

        // ==================== RISK ASSESSMENTS (10) ====================
        console.log('📊 Seeding Risk Assessments...');
        const assessmentsData = [
            { clientId, assessmentId: 'RA-2025-001', assessmentDate: new Date('2024-12-01'), assessor: 'Security Team', method: 'Qualitative', threatDescription: 'Ransomware attack targeting cloud infrastructure', vulnerabilityDescription: 'Unencrypted backups and missing system patches', affectedAssets: JSON.stringify(['Customer Database', 'Backup Storage System']), likelihood: 'Possible', impact: 'Critical', inherentRisk: 'Very High', existingControls: 'Firewall, Antivirus, Backup procedures', controlEffectiveness: 'Partially Effective', residualRisk: 'High', riskOwner: 'CISO', treatmentOption: 'Mitigate', recommendedActions: 'Enable backup encryption, deploy EDR, implement offline backups', priority: 'Critical', status: 'approved' as const },
            { clientId, assessmentId: 'RA-2025-002', assessmentDate: new Date('2024-12-03'), assessor: 'CISO', method: 'Qualitative', threatDescription: 'Phishing campaign targeting employees with admin access', vulnerabilityDescription: 'Weak password policy and no MFA enforcement', affectedAssets: JSON.stringify(['Employee Laptops', 'HR Management System']), likelihood: 'Likely', impact: 'High', inherentRisk: 'High', existingControls: 'Email filtering, Security awareness training', controlEffectiveness: 'Partially Effective', residualRisk: 'Medium', riskOwner: 'Security Team', treatmentOption: 'Mitigate', recommendedActions: 'Enforce MFA, enhance phishing simulations, improve email security', priority: 'High', status: 'approved' as const },
            { clientId, assessmentId: 'RA-2025-003', assessmentDate: new Date('2024-11-28'), assessor: 'IT Operations', method: 'Qualitative', threatDescription: 'DDoS attack on public-facing services', vulnerabilityDescription: 'No DDoS protection or rate limiting', affectedAssets: JSON.stringify(['Production Web Servers', 'Payment Processing API']), likelihood: 'Unlikely', impact: 'High', inherentRisk: 'Medium', existingControls: 'CDN, Load balancer', controlEffectiveness: 'Effective', residualRisk: 'Low', riskOwner: 'IT Operations', treatmentOption: 'Mitigate', recommendedActions: 'Deploy AWS Shield, implement rate limiting', priority: 'Medium', status: 'draft' as const },
            { clientId, assessmentId: 'RA-2025-004', assessmentDate: new Date('2024-12-10'), assessor: 'CISO', method: 'Qualitative', threatDescription: 'Insider threat - malicious data exfiltration', vulnerabilityDescription: 'No DLP controls or privileged access monitoring', affectedAssets: JSON.stringify(['Customer Database', 'Source Code Repository']), likelihood: 'Rare', impact: 'Very High', inherentRisk: 'High', existingControls: 'Access controls, HR background checks', controlEffectiveness: 'Partially Effective', residualRisk: 'Medium', riskOwner: 'HR Director', treatmentOption: 'Mitigate', recommendedActions: 'Deploy DLP, implement PAM, enhance user activity monitoring', priority: 'High', status: 'approved' as const },
            { clientId, assessmentId: 'RA-2025-005', assessmentDate: new Date('2024-12-05'), assessor: 'Engineering Lead', method: 'Qualitative', threatDescription: 'SQL injection attack on web applications', vulnerabilityDescription: 'Outdated dependencies and insufficient input validation', affectedAssets: JSON.stringify(['Production Web Servers', 'Customer Database']), likelihood: 'Possible', impact: 'Critical', inherentRisk: 'Very High', existingControls: 'WAF, Input validation (partial)', controlEffectiveness: 'Ineffective', residualRisk: 'High', riskOwner: 'Engineering Lead', treatmentOption: 'Mitigate', recommendedActions: 'Update dependencies, implement parameterized queries, enhance WAF rules', priority: 'Critical', status: 'approved' as const },
            { clientId, assessmentId: 'RA-2025-006', assessmentDate: new Date('2024-11-25'), assessor: 'Security Team', method: 'Qualitative', threatDescription: 'Supply chain attack through compromised vendor', vulnerabilityDescription: 'Limited vendor security assessments', affectedAssets: JSON.stringify(['Payment Processing API', 'HR Management System']), likelihood: 'Unlikely', impact: 'Critical', inherentRisk: 'High', existingControls: 'Vendor contracts, SLA monitoring', controlEffectiveness: 'Partially Effective', residualRisk: 'Medium', riskOwner: 'CISO', treatmentOption: 'Mitigate', recommendedActions: 'Conduct security audits of critical vendors, implement SBOM', priority: 'High', status: 'reviewed' as const },
            { clientId, assessmentId: 'RA-2025-007', assessmentDate: new Date('2024-11-20'), assessor: 'Facilities Manager', method: 'Qualitative', threatDescription: 'Physical breach and hardware theft', vulnerabilityDescription: 'No visitor logs or security cameras in office', affectedAssets: JSON.stringify(['Office Building', 'Office Network Infrastructure']), likelihood: 'Unlikely', impact: 'Medium', inherentRisk: 'Low', existingControls: 'Door locks, Reception desk', controlEffectiveness: 'Effective', residualRisk: 'Low', riskOwner: 'Facilities Manager', treatmentOption: 'Accept', recommendedActions: 'Risk accepted - Install security cameras if budget allows', priority: 'Low', status: 'approved' as const },
            { clientId, assessmentId: 'RA-2025-008', assessmentDate: new Date('2024-12-12'), assessor: 'API Team', method: 'Qualitative', threatDescription: 'API abuse and resource exhaustion', vulnerabilityDescription: 'Rate limiting implemented but may be bypassed', affectedAssets: JSON.stringify(['Payment Processing API', 'API Documentation Portal']), likelihood: 'Likely', impact: 'Medium', inherentRisk: 'Medium', existingControls: 'API Gateway rate limits', controlEffectiveness: 'Partially Effective', residualRisk: 'Low', riskOwner: 'API Team', treatmentOption: 'Mitigate', recommendedActions: 'Implement advanced bot detection, enhance rate limiting', priority: 'Medium', status: 'draft' as const },
            { clientId, assessmentId: 'RA-2025-009', assessmentDate: new Date('2024-12-08'), assessor: 'Network Admin', method: 'Qualitative', threatDescription: 'Lateral movement after network breach', vulnerabilityDescription: 'Flat network with no segmentation', affectedAssets: JSON.stringify(['Office Network Infrastructure', 'Production Web Servers']), likelihood: 'Possible', impact: 'High', inherentRisk: 'High', existingControls: 'Firewall rules', controlEffectiveness: 'Ineffective', residualRisk: 'High', riskOwner: 'Network Admin', treatmentOption: 'Mitigate', recommendedActions: 'Implement network segmentation and VLANs', priority: 'High', status: 'approved' as const },
            { clientId, assessmentId: 'RA-2025-010', assessmentDate: new Date('2024-12-15'), assessor: 'Security Team', method: 'Qualitative', threatDescription: 'Credential stuffing attacks on customer accounts', vulnerabilityDescription: 'No account lockout or CAPTCHA on login', affectedAssets: JSON.stringify(['Customer Database', 'Production Web Servers']), likelihood: 'Possible', impact: 'High', inherentRisk: 'High', existingControls: 'Password hashing, Basic rate limiting', controlEffectiveness: 'Partially Effective', residualRisk: 'Medium', riskOwner: 'Security Team', treatmentOption: 'Mitigate', recommendedActions: 'Implement CAPTCHA, account lockout, breach monitoring', priority: 'High', status: 'approved' as const },
        ];

        await db.insert(riskAssessments).values(assessmentsData as any);
        console.log('✅ 10 Risk Assessments seeded\n');

        console.log('🎉 Successfully seeded all risk management data!');
        console.log('\n📈 Summary:');
        console.log('  - 10 Assets');
        console.log('  - 10 Threats');
        console.log('  - 10 Vulnerabilities');
        console.log('  - 10 Risk Assessments');
        console.log('\n✨ Your Intellfence client now has comprehensive demo data!');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }

    process.exit(0);
}

seedRiskData();
