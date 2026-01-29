
import 'dotenv/config';
import { getDb } from '../db';
import { policyTemplates } from '../schema';
import { eq } from 'drizzle-orm';

const newTemplates = [
    // Operational
    { name: "Clean Desk and Clear Screen Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Clean Desk Requirements", "Clear Screen Requirements", "Enforcement"] },
    { name: "Malware Protection Policy", frameworks: ["ISO 27001", "SOC 2", "NIST CSF"], sections: ["Purpose", "Scope", "Antivirus Software", "Scanning Frequency", "Reporting", "Enforcement"] },
    { name: "Vulnerability Management Policy", frameworks: ["ISO 27001", "SOC 2", "PCI DSS"], sections: ["Purpose", "Scope", "Scanning", "Patching", "Remediation Timelines", "Exceptions"] },
    { name: "Patch Management Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Patch Testing", "Deployment Schedule", "Emergency Patches", "Enforcement"] },
    { name: "Backup and Recovery Policy", frameworks: ["ISO 27001", "SOC 2", "HIPAA"], sections: ["Purpose", "Scope", "Backup Frequency", "Retention", "Restoration Testing", "Offsite Storage"] },
    { name: "Secure Disposal Policy", frameworks: ["ISO 27001", "SOC 2", "HIPAA"], sections: ["Purpose", "Scope", "Media Sanitization", "Paper Shredding", "Hardware Disposal", "Enforcement"] },
    { name: "Capacity Management Policy", frameworks: ["ISO 27001"], sections: ["Purpose", "Scope", "Monitoring", "Projections", "Scaling", "Enforcement"] },

    // Network & Access
    { name: "Network Security Policy", frameworks: ["ISO 27001", "SOC 2", "NIST CSF"], sections: ["Purpose", "Scope", "Network Segmentation", "Access Control", "Monitoring", "Enforcement"] },
    { name: "Remote Access Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "VPN Usage", "Device Requirements", "Approvals", "Enforcement"] },
    { name: "Password Policy", frameworks: ["ISO 27001", "SOC 2", "PCI DSS"], sections: ["Purpose", "Scope", "Complexity Requirements", "Rotation", "MFA", "Enforcement"] },
    { name: "Wireless Security Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Encryption", "Guest Access", "Monitoring", "Enforcement"] },
    { name: "Firewall Configuration Policy", frameworks: ["ISO 27001", "SOC 2", "PCI DSS"], sections: ["Purpose", "Scope", "Rule Management", "Review Frequency", "Change Control", "Enforcement"] },
    { name: "Access Control Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Authorization", "User Signup", "Privilege Management", "Review"] },

    // Software & Dev
    { name: "Secure SDLC Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Security Requirements", "Code Review", "Testing", "Deployment"] },
    { name: "Source Code Protection Policy", frameworks: ["ISO 27001"], sections: ["Purpose", "Scope", "Access Control", "Versioning", "Backup", "Enforcement"] },
    { name: "API Security Policy", frameworks: ["SOC 2", "NIST CSF"], sections: ["Purpose", "Scope", "Authentication", "Rate Limiting", "Monitoring", "Enforcement"] },
    { name: "Open Source Software Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Approval Process", "License Compliance", "Vulnerability Monitoring", "Enforcement"] },

    // Data & Privacy
    { name: "Data Protection Policy", frameworks: ["ISO 27001", "GDPR", "SOC 2"], sections: ["Purpose", "Scope", "Principles", "Rights", "Data Transfer", "Enforcement"] },
    { name: "Data Loss Prevention (DLP) Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Data Classification", "Blocking Rules", "Monitoring", "Enforcement"] },
    { name: "Data Breach Notification Policy", frameworks: ["GDPR", "HIPAA", "ISO 27001"], sections: ["Purpose", "Scope", "Detection", "Reporting Timeline", "Notification Procedures", "Enforcement"] },
    { name: "Records Management Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Retention Schedule", "Storage", "Disposal", "Enforcement"] },

    // Governance & People
    { name: "Code of Conduct", frameworks: ["SOC 2", "ISO 27001"], sections: ["Purpose", "Scope", "Ethical Standards", "Conflicts of Interest", "Reporting Violations", "Enforcement"] },
    { name: "Disciplinary Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Violation Types", "Sanction Process", "Appeals", "Enforcement"] },
    { name: "Security Awareness Training Policy", frameworks: ["ISO 27001", "SOC 2", "HIPAA"], sections: ["Purpose", "Scope", "Onboarding", "Annual Training", "Phishing Sims", "Enforcement"] },
    { name: "Social Media Policy", frameworks: ["ISO 27001"], sections: ["Purpose", "Scope", "Official Accounts", "Personal Use", "Confidentiality", "Enforcement"] },
    { name: "AI Acceptable Use Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Approved Tools", "Data Privacy", "Quality Control", "Enforcement"] },
    { name: "Visitor Access Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Sign-in", "Escorts", "Badging", "Enforcement"] },
    { name: "Segregation of Duties Policy", frameworks: ["SOC 2", "ISO 27001"], sections: ["Purpose", "Scope", "Conflicting Roles", "Controls", "Monitoring", "Enforcement"] },

    // Compliance & Third Party
    { name: "Intellectual Property Policy", frameworks: ["ISO 27001"], sections: ["Purpose", "Scope", "Ownership", "Protection", "Violations", "Enforcement"] },
    { name: "Cloud Security Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Vendor Selection", "Configuration", "Encryption", "Enforcement"] },
    { name: "Shadow IT Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Discovery", "Approval", "Risks", "Enforcement"] },
    { name: "Supply Chain Security Policy", frameworks: ["ISO 27001", "SOC 2"], sections: ["Purpose", "Scope", "Vendor Assessment", "Contractual Reqs", "Monitoring", "Enforcement"] },
    { name: "Start-up Security Policy", frameworks: ["SOC 2"], sections: ["Purpose", "Scope", "Baseline Controls", "Risk Appetite", "Enforcement"] },

    // Physical
    { name: "Equipment Policy", frameworks: ["ISO 27001"], sections: ["Purpose", "Scope", "Siting", "Maintenance", "Off-Premise Use", "Enforcement"] },
    { name: "Cabling Security Policy", frameworks: ["ISO 27001"], sections: ["Purpose", "Scope", "Protection", "Labeling", "Inspection", "Enforcement"] }
];

async function run() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    console.log(`Checking existing templates...`);
    const existing = await db.select().from(policyTemplates);
    const existingNames = new Set(existing.map(t => t.name));

    let count = 0;
    for (const t of newTemplates) {
        if (!existingNames.has(t.name)) {
            // Generate a simple ID logic or random. 
            // Existing had simple IDs "1", "2". We'll use random string or increment if parsed.
            // Let's use `Date.now() + index` based ID to avoid collision.
            const tid = Math.floor(Math.random() * 1000000).toString();

            await db.insert(policyTemplates).values({
                templateId: tid,
                name: t.name,
                frameworks: t.frameworks,
                sections: t.sections.map((secTitle, idx) => ({
                    id: `sec-${Date.now()}-${idx}`,
                    title: secTitle,
                    content: `Standard procedure for ${secTitle}...`,
                    optional: false,
                    defaultEnabled: true
                })),
                content: `
# ${t.name}

## 1. Purpose
The purpose of this ${t.name} is to establish the standards and procedures for [Context] at [Company Name].

## 2. Scope
This policy applies to all employees, contractors, and third parties who access [Company Name] systems or data.

## 3. Policy Statement
[Company Name] is committed to implementing strict controls regarding ${t.name} to ensure the security and confidentiality of our data.

## 4. Enforcement
Violations of this policy may result in disciplinary action.
`
            });
            console.log(`Inserted: ${t.name}`);
            count++;
        } else {
            console.log(`Skipped (Exists): ${t.name}`);
        }
    }
    console.log(`Added ${count} new templates.`);
    process.exit(0);
}

run().catch(console.error);
