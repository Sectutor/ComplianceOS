
import { getDb } from "../packages/core/src/db";
import * as maturitySchema from "../packages/core/src/db/maturity-schema";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Refining CMMC 2.0 Data...");
    const db = await getDb();

    // 1. Update Framework Metadata
    const cmmc2 = {
        id: "cmmc-2",
        name: "CMMC 2.0",
        description: "Cybersecurity Maturity Model Certification Version 2.0. A unified cybersecurity standard for Department of Defense (DoD) acquisitions to boost the security of the National Security Industrial Base.",
        version: "2.0",
        logo: "/cmmc-logo.png",
        levels: [
            { level: 1, name: "Foundational", description: "Basic safeguarding of FCI (Federal Contract Information). 17 practices." },
            { level: 2, name: "Advanced", description: "Protecting CUI (Controlled Unclassified Information). 110 practices aligned with NIST SP 800-171." },
            { level: 3, name: "Expert", description: "Protecting CUI against APTs (Advanced Persistent Threats). Based on NIST SP 800-172." }
        ],
        status: "active" as const
    };

    await db.insert(maturitySchema.maturityFrameworks).values(cmmc2 as any).onConflictDoUpdate({
        target: maturitySchema.maturityFrameworks.id,
        set: cmmc2 as any
    });

    // 2. Refined Categories (14 Domains of CMMC 2.0)
    const cmmcDomains = [
        { code: "AC", name: "Access Control", description: "Who can access what information and systems." },
        { code: "AT", name: "Awareness and Training", description: "Educating users on security risks and responsibilities." },
        { code: "AU", name: "Audit and Accountability", description: "Logging and monitoring system activity." },
        { code: "CM", name: "Configuration Management", description: "Managing system settings and changes." },
        { code: "IA", name: "Identification and Authentication", description: "Verifying the identity of users and devices." },
        { code: "IR", name: "Incident Response", description: "Detecting and responding to security incidents." },
        { code: "MA", name: "Maintenance", description: "Performing regular system maintenance safely." },
        { code: "MP", name: "Media Protection", description: "Protecting physical and digital media." },
        { code: "PS", name: "Personnel Security", description: "Protecting information systems from human risks." },
        { code: "PE", name: "Physical Protection", description: "Limiting physical access to systems." },
        { code: "RA", name: "Risk Assessment", description: "Identifying and evaluating security risks." },
        { code: "CA", name: "Security Assessment", description: "Testing and refining security controls." },
        { code: "SC", name: "System and Communications Protection", description: "Protecting transmitted information." },
        { code: "SI", name: "System and Information Integrity", description: "Protecting against malicious code and flaws." }
    ].map((d, i) => ({ ...d, frameworkId: "cmmc-2", order: i + 1 }));

    for (const d of cmmcDomains as any[]) {
        const existing = await db.select().from(maturitySchema.maturityCategories)
            .where(and(eq(maturitySchema.maturityCategories.frameworkId, d.frameworkId), eq(maturitySchema.maturityCategories.code, d.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityCategories).values(d);
        } else {
            await db.update(maturitySchema.maturityCategories).set(d).where(eq(maturitySchema.maturityCategories.id, existing[0].id));
        }
    }
    console.log(`✅ Updated ${cmmcDomains.length} CMMC domains`);

    // 3. Refined Requirements (A mix of Level 1 and Level 2)
    const cmmcReqs = [
        // --- ACCESS CONTROL (AC) ---
        { categoryCode: "AC", code: "AC.L1-3.1.1", title: "Authorized User Access", description: "Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).", level: 1 },
        { categoryCode: "AC", code: "AC.L1-3.1.2", title: "Transaction & Function Limits", description: "Limit information system access to the types of transactions and functions that authorized users are permitted to execute.", level: 1 },
        { categoryCode: "AC", code: "AC.L2-3.1.3", title: "Control CUI Flow", description: "Control the flow of CUI in accordance with approved authorizations.", level: 2 },
        { categoryCode: "AC", code: "AC.L2-3.1.7", title: "Privileged Access Prevention", description: "Prevent non-privileged users from executing privileged functions and audit the execution of such functions.", level: 2 },

        // --- IDENTIFICATION & AUTHENTICATION (IA) ---
        { categoryCode: "IA", code: "IA.L1-3.5.1", title: "User Identification", description: "Identify information system users, processes acting on behalf of users, or devices.", level: 1 },
        { categoryCode: "IA", code: "IA.L1-3.5.2", title: "User Authentication", description: "Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational information systems.", level: 1 },
        { categoryCode: "IA", code: "IA.L2-3.5.3", title: "Multi-Factor Authentication", description: "Use multi-factor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.", level: 2 },

        // --- PHYSICAL PROTECTION (PE) ---
        { categoryCode: "PE", code: "PE.L1-3.10.1", title: "Limit Physical Access", description: "Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals.", level: 1 },
        { categoryCode: "PE", code: "PE.L1-3.10.3", title: "Visitor Monitoring", description: "Escort visitors and monitor visitor activity.", level: 1 },
        { categoryCode: "PE", code: "PE.L1-3.10.4", title: "Physical Access Logs", description: "Maintain audit logs of physical access.", level: 1 },

        // --- SYSTEM & COMMUNICATIONS PROTECTION (SC) ---
        { categoryCode: "SC", code: "SC.L1-3.13.1", title: "Boundary Protection", description: "Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational information systems) at the external boundaries and key internal boundaries of the information systems.", level: 1 },
        { categoryCode: "SC", code: "SC.L2-3.13.8", title: "Data-in-Transit Cryptography", description: "Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission unless otherwise protected by alternative physical safeguards.", level: 2 },

        // --- SYSTEM & INFORMATION INTEGRITY (SI) ---
        { categoryCode: "SI", code: "SI.L1-3.14.1", title: "Flaw Remediation", description: "Identify, report, and correct information and information system flaws in a timely manner.", level: 1 },
        { categoryCode: "SI", code: "SI.L1-3.14.2", title: "Malicious Code Protection", description: "Provide protection from malicious code at appropriate locations within organizational information systems.", level: 1 },
        { categoryCode: "SI", code: "SI.L2-3.14.6", title: "System Monitoring", description: "Monitor the information system including inbound and outbound communications for unusual or unauthorized activities.", level: 2 },

        // --- CONFIGURATION MANAGEMENT (CM) ---
        { categoryCode: "CM", code: "CM.L2-3.4.1", title: "Baseline Configurations", description: "Establish and maintain baseline configurations and inventories of organizational information systems (including hardware, software, firmware, and documentation) throughout the respective system development life cycles.", level: 2 },
        { categoryCode: "CM", code: "CM.L2-3.4.2", title: "Security Configurations", description: "Establish and enforce security configuration settings for information technology products employed in organizational information systems.", level: 2 },

        // --- AUDIT & ACCOUNTABILITY (AU) ---
        { categoryCode: "AU", code: "AU.L2-3.3.1", title: "Create Audit Logs", description: "Create and retain system audit logs and records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful or unauthorized system activity.", level: 2 },
        { categoryCode: "AU", code: "AU.L2-3.3.2", title: "Unique User Traceability", description: "Ensure that the actions of individual system users can be uniquely traced to those users, so they can be held accountable for their actions.", level: 2 },

        // --- RISK ASSESSMENT (RA) ---
        { categoryCode: "RA", code: "RA.L2-3.11.1", title: "Vulnerability Scans", description: "Periodically assess the risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals, resulting from the operation of organizational information systems and the associated processing, storage, or transmission of CUI.", level: 2 },
        { categoryCode: "RA", code: "RA.L2-3.11.2", title: "Vulnerability Remediation", description: "Scan for vulnerabilities in organizational information systems and applications and remediate vulnerabilities in accordance with assessments of risk.", level: 2 }
    ];

    const insertedCats = await db.select().from(maturitySchema.maturityCategories).where(eq(maturitySchema.maturityCategories.frameworkId, "cmmc-2"));
    const getCatId = (code: string) => insertedCats.find((c: any) => c.code === code)?.id;

    for (const r of cmmcReqs as any[]) {
        const { categoryCode, ...rest } = r;
        const catId = getCatId(categoryCode);
        if (!catId) {
            console.warn(`⚠️ Category not found for code: ${categoryCode}`);
            continue;
        }

        const data = { ...rest, categoryId: catId, frameworkId: "cmmc-2" };

        const existing = await db.select().from(maturitySchema.maturityRequirements)
            .where(and(eq(maturitySchema.maturityRequirements.frameworkId, "cmmc-2"), eq(maturitySchema.maturityRequirements.code, r.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityRequirements).values(data);
        } else {
            await db.update(maturitySchema.maturityRequirements).set(data).where(eq(maturitySchema.maturityRequirements.id, existing[0].id));
        }
    }

    console.log(`✅ Seeded ${cmmcReqs.length} refined CMMC requirements`);
    console.log("🏁 Refining Finished!");
    process.exit(0);
}

main().catch(e => {
    console.error("❌ Refining Failed:", e);
    process.exit(1);
});
