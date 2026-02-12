
import { getDb } from "../packages/core/src/db";
import * as maturitySchema from "../packages/core/src/db/maturity-schema";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Refining NIST CSF 2.0 & ZTMM 2.0 Data...");
    const db = await getDb();

    // ========================================================================
    // 1. REFINING NIST CSF 2.0
    // ========================================================================
    const nistCategories = [
        { code: "GV", name: "Govern", description: "Establish and monitor the organization's cybersecurity risk management strategy, expectations, and policy." },
        { code: "ID", name: "Identify", description: "Help determine the current cybersecurity risk to the organization." },
        { code: "PR", name: "Protect", description: "Use safeguards to prevent or reduce cybersecurity risk." },
        { code: "DE", name: "Detect", description: "Find and analyze possible cybersecurity attacks and compromises." },
        { code: "RS", name: "Respond", description: "Take action regarding a detected cybersecurity incident." },
        { code: "RC", name: "Recover", description: "Restore assets and operations that were impacted by a cybersecurity incident." }
    ].map((c, i) => ({ ...c, frameworkId: "nist-csf-2", order: i + 1 }));

    for (const c of nistCategories) {
        const existing = await db.select().from(maturitySchema.maturityCategories)
            .where(and(eq(maturitySchema.maturityCategories.frameworkId, "nist-csf-2"), eq(maturitySchema.maturityCategories.code, c.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityCategories).values(c);
        } else {
            await db.update(maturitySchema.maturityCategories).set(c).where(eq(maturitySchema.maturityCategories.id, existing[0].id));
        }
    }

    const nistReqs = [
        // GOVERN
        { categoryCode: "GV", code: "GV.OC-01", title: "Organizational Context", description: "The organizational mission is understood and informs cybersecurity risk management.", level: 1 },
        { categoryCode: "GV", code: "GV.RR-01", title: "Roles & Responsibilities", description: "Cybersecurity roles and responsibilities are clearly defined, communicated, and understood.", level: 1 },
        { categoryCode: "GV", code: "GV.PO-01", title: "Policy Management", description: "Cybersecurity policies are established and communicated.", level: 2 },

        // IDENTIFY
        { categoryCode: "ID", code: "ID.AM-01", title: "Physical Asset Inventory", description: "Inventories of physical devices and systems within the organization are maintained.", level: 1 },
        { categoryCode: "ID", code: "ID.RA-01", title: "Risk Assessment", description: "Cybersecurity risks to the organization are identified and documented.", level: 2 },
        { categoryCode: "ID", code: "ID.SC-01", title: "Supply Chain Risk", description: "Cybersecurity risks associated with the supply chain are identified and prioritized.", level: 2 },

        // PROTECT
        { categoryCode: "PR", code: "PR.AA-01", title: "Identity Management", description: "Identities and credentials for authorized users, services, and hardware are managed.", level: 1 },
        { categoryCode: "PR.AC-01", categoryCode: "PR", code: "PR.AC-01", title: "Access Control", description: "Access to physical and logical assets is limited to authorized users.", level: 1 },
        { categoryCode: "PR.DS-01", categoryCode: "PR", code: "PR.DS-01", title: "Data Security", description: "Data-at-rest and data-in-transit are protected using cryptographic mechanisms.", level: 2 },
        { categoryCode: "PR.AT-01", categoryCode: "PR", code: "PR.AT-01", title: "Awareness Training", description: "All users are informed and trained on their cybersecurity responsibilities.", level: 1 },

        // DETECT
        { categoryCode: "DE", code: "DE.CM-01", title: "Continuous Monitoring", description: "The network and physical environment are monitored to detect potential cybersecurity events.", level: 2 },
        { categoryCode: "DE", code: "DE.AE-01", title: "Analysis of Anomalies", description: "Anomalous activity is detected and the potential impact of events is understood.", level: 3 },

        // RESPOND
        { categoryCode: "RS", code: "RS.RP-01", title: "Incident Response Planning", description: "Response processes and procedures are maintained and tested.", level: 2 },
        { categoryCode: "RS", code: "RS.AN-01", title: "Incident Analysis", description: "Incidents are analyzed to ensure effective response and support recovery activities.", level: 2 },

        // RECOVER
        { categoryCode: "RC", code: "RC.RP-01", title: "Recovery Planning", description: "Recovery processes and procedures are executed and maintained to ensure timely restoration of systems.", level: 2 }
    ];

    const nistCats = await db.select().from(maturitySchema.maturityCategories).where(eq(maturitySchema.maturityCategories.frameworkId, "nist-csf-2"));
    const getNistCatId = (code: string) => nistCats.find((c: any) => c.code === code)?.id;

    for (const r of nistReqs) {
        const { categoryCode, ...rest } = r;
        const catId = getNistCatId(categoryCode);
        if (!catId) continue;

        const data = { ...rest, categoryId: catId, frameworkId: "nist-csf-2" };
        const existing = await db.select().from(maturitySchema.maturityRequirements)
            .where(and(eq(maturitySchema.maturityRequirements.frameworkId, "nist-csf-2"), eq(maturitySchema.maturityRequirements.code, r.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityRequirements).values(data);
        } else {
            await db.update(maturitySchema.maturityRequirements).set(data).where(eq(maturitySchema.maturityRequirements.id, existing[0].id));
        }
    }
    console.log("✅ Refined NIST CSF 2.0 data");

    // ========================================================================
    // 2. REFINING ZTMM 2.0
    // ========================================================================
    const ztCategories = [
        { code: "ID", name: "Identity", description: "Verifying and authenticating users and their attributes." },
        { code: "DV", name: "Devices", description: "Securing and managing hardware and endpoints." },
        { code: "NW", name: "Networks", description: "Managing internal and external network traffic." },
        { code: "APP", name: "Applications & Workloads", description: "Protecting and isolating software services." },
        { code: "DT", name: "Data", description: "Protecting information at rest and in motion." }
    ].map((c, i) => ({ ...c, frameworkId: "cisa-ztmm-2", order: i + 1 }));

    for (const c of ztCategories) {
        const existing = await db.select().from(maturitySchema.maturityCategories)
            .where(and(eq(maturitySchema.maturityCategories.frameworkId, "cisa-ztmm-2"), eq(maturitySchema.maturityCategories.code, c.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityCategories).values(c);
        } else {
            await db.update(maturitySchema.maturityCategories).set(c).where(eq(maturitySchema.maturityCategories.id, existing[0].id));
        }
    }

    const ztReqs = [
        // IDENTITY
        { categoryCode: "ID", code: "ZT.ID.1", title: "MFA Implementation", description: "Multi-factor authentication is required for all access to organizational resources.", level: 2 },
        { categoryCode: "ID", code: "ZT.ID.2", title: "Identity Store", description: "Centralized identity store is used across the entire enterprise.", level: 2 },
        { categoryCode: "ID", code: "ZT.ID.3", title: "Risk-based Auth", description: "Authentication decisions are made dynamically based on user behavior and risk context.", level: 3 },

        // DEVICES
        { categoryCode: "DV", code: "ZT.DV.1", title: "Asset Inventory", description: "A real-time inventory of all physical and virtual devices is maintained.", level: 1 },
        { categoryCode: "DV", code: "ZT.DV.2", title: "Compliance Monitoring", description: "Devices must pass health and compliance checks before accessing the network.", level: 2 },

        // NETWORKS
        { categoryCode: "NW", code: "ZT.NW.1", title: "Micro-segmentation", description: "Internal network is partitioned into small, isolated segments to limit lateral movement.", level: 2 },
        { categoryCode: "NW", code: "ZT.NW.2", title: "Traffic Encryption", description: "All internal and external network traffic is encrypted following industry standards.", level: 2 },

        // APPLICATIONS
        { categoryCode: "APP", code: "ZT.APP.1", title: "Application Sandboxing", description: "Applications run in isolated environments to prevent cross-contamination.", level: 3 },
        { categoryCode: "APP", code: "ZT.APP.2", title: "DevSecOps Integration", description: "Security testing is integrated into the automated software delivery pipeline.", level: 2 },

        // DATA
        { categoryCode: "DT", code: "ZT.DT.1", title: "Data Encryption", description: "Sensitive data is encrypted at rest and in transit using strong cryptography.", level: 1 },
        { categoryCode: "DT", code: "ZT.DT.2", title: "DLP Implementation", description: "Data Loss Prevention tools are implemented to detect and prevent unauthorized data exfiltration.", level: 2 }
    ];

    const ztCats = await db.select().from(maturitySchema.maturityCategories).where(eq(maturitySchema.maturityCategories.frameworkId, "cisa-ztmm-2"));
    const getZtCatId = (code: string) => ztCats.find((c: any) => c.code === code)?.id;

    for (const r of ztReqs) {
        const { categoryCode, ...rest } = r;
        const catId = getZtCatId(categoryCode);
        if (!catId) continue;

        const data = { ...rest, categoryId: catId, frameworkId: "cisa-ztmm-2" };
        const existing = await db.select().from(maturitySchema.maturityRequirements)
            .where(and(eq(maturitySchema.maturityRequirements.frameworkId, "cisa-ztmm-2"), eq(maturitySchema.maturityRequirements.code, r.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityRequirements).values(data);
        } else {
            await db.update(maturitySchema.maturityRequirements).set(data).where(eq(maturitySchema.maturityRequirements.id, existing[0].id));
        }
    }
    console.log("✅ Refined ZTMM 2.0 data");

    console.log("🏁 Refining Finished!");
    process.exit(0);
}

main().catch(e => {
    console.error("❌ Refining Failed:", e);
    process.exit(1);
});
