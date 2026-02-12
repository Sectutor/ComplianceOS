
import { getDb } from "../packages/core/src/db";
import * as maturitySchema from "../packages/core/src/db/maturity-schema";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Seeding Comprehensive ZTMM 2.0 Data...");
    const db = await getDb();

    // ZTMM Pillars
    const ztPillars = [
        { code: "ID", name: "Identity", description: "Verifying and authenticating users and their attributes.", order: 1 },
        { code: "DV", name: "Devices", description: "Securing and managing hardware and endpoints.", order: 2 },
        { code: "NW", name: "Networks", description: "Managing internal and external network traffic.", order: 3 },
        { code: "APP", name: "Applications & Workloads", description: "Protecting and isolating software services.", order: 4 },
        { code: "DT", name: "Data", description: "Protecting information at rest and in motion.", order: 5 }
    ];

    console.log(`📦 Ensuring ${ztPillars.length} ZTMM pillars exist...`);
    for (const pillar of ztPillars) {
        const catData = { ...pillar, frameworkId: "cisa-ztmm-2" };
        const existing = await db.select().from(maturitySchema.maturityCategories)
            .where(and(eq(maturitySchema.maturityCategories.frameworkId, "cisa-ztmm-2"), eq(maturitySchema.maturityCategories.code, pillar.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityCategories).values(catData);
        } else {
            await db.update(maturitySchema.maturityCategories).set(catData).where(eq(maturitySchema.maturityCategories.id, existing[0].id));
        }
    }

    const dbCats = await db.select().from(maturitySchema.maturityCategories).where(eq(maturitySchema.maturityCategories.frameworkId, "cisa-ztmm-2"));

    const ztRequirements = [
        // IDENTITY
        { categoryCode: "ID", code: "ZT.ID.V1", title: "Authentication", description: "Method of verifying identity (Passwords, MFA, Phishing-resistant MFA).", level: 1 },
        { categoryCode: "ID", code: "ZT.ID.V2", title: "Identity Store", description: "Centralization of identity management across the enterprise.", level: 2 },
        { categoryCode: "ID", code: "ZT.ID.V3", title: "Risk-Based Access", description: "Dynamic authentication decisions based on risk context.", level: 3 },
        { categoryCode: "ID", code: "ZT.ID.V4", title: "Just-In-Time Access", description: "Provisioning access precisely when needed for a limited duration.", level: 4 },

        // DEVICES
        { categoryCode: "DV", code: "ZT.DV.V1", title: "Inventory Management", description: "Tracking of physical and virtual assets.", level: 1 },
        { categoryCode: "DV", code: "ZT.DV.V2", title: "Device Health", description: "Monitoring device configuration and posture before access.", level: 2 },
        { categoryCode: "DV", code: "ZT.DV.V3", title: "Endpoint Detection", description: "Advanced threat detection and response on all endpoints.", level: 3 },
        { categoryCode: "DV", code: "ZT.DV.V4", title: "Automated Remediation", description: "Self-healing and automated containment of compromised devices.", level: 4 },

        // NETWORKS
        { categoryCode: "NW", code: "ZT.NW.V1", title: "Network Segmentation", description: "Static segmentation between internal and external networks.", level: 1 },
        { categoryCode: "NW", code: "ZT.NW.V2", title: "Micro-segmentation", description: "Granular isolation of workloads and applications.", level: 3 },
        { categoryCode: "NW", code: "ZT.NW.V3", title: "Traffic Encryption", description: "End-to-end encryption of all internal communications.", level: 2 },
        { categoryCode: "NW", code: "ZT.NW.V4", title: "Software-Defined Perimeters", description: "Dynamic, policy-driven network access control.", level: 4 },

        // APPLICATIONS
        { categoryCode: "APP", code: "ZT.APP.V1", title: "App Visibility", description: "Inventory of all authorized applications.", level: 1 },
        { categoryCode: "APP", code: "ZT.APP.V2", title: "Secure Delivery", description: "Integrated security testing in CI/CD pipelines.", level: 2 },
        { categoryCode: "APP", code: "ZT.APP.V3", title: "Isolation", description: "Sandboxing and containerization of critical applications.", level: 3 },
        { categoryCode: "APP", code: "ZT.APP.V4", title: "Dynamic Policies", description: "Application-level access policies updated in real-time.", level: 4 },

        // DATA
        { categoryCode: "DT", code: "ZT.DT.V1", title: "Data Discovery", description: "Identification and manual classification of sensitive data.", level: 1 },
        { categoryCode: "DT", code: "ZT.DT.V2", title: "Data Protection", description: "Encryption of data at rest and in transit.", level: 2 },
        { categoryCode: "DT", code: "ZT.DT.V3", title: "DLP", description: "Automated Data Loss Prevention and exfiltration monitoring.", level: 3 },
        { categoryCode: "DT", code: "ZT.DT.V4", title: "Dynamic Governance", description: "Automated data lifecycle management and dynamic access controls.", level: 4 }
    ];

    console.log(`⚙️ Seeding ${ztRequirements.length} ZTMM requirements...`);
    for (const req of ztRequirements) {
        const catId = dbCats.find(c => c.code === req.categoryCode)?.id;
        if (!catId) continue;

        const reqData = {
            frameworkId: "cisa-ztmm-2",
            categoryId: catId,
            code: req.code,
            title: req.title,
            description: req.description,
            level: req.level,
            benefits: "Maturity aligns with CISA Zero Trust Maturity Model 2.0 criteria."
        };

        const existing = await db.select().from(maturitySchema.maturityRequirements)
            .where(and(eq(maturitySchema.maturityRequirements.frameworkId, "cisa-ztmm-2"), eq(maturitySchema.maturityRequirements.code, req.code)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityRequirements).values(reqData);
        } else {
            await db.update(maturitySchema.maturityRequirements).set(reqData).where(eq(maturitySchema.maturityRequirements.id, existing[0].id));
        }
    }

    console.log("🏁 ZTMM 2.0 Full Seeding Finished!");
    process.exit(0);
}

main().catch(e => {
    console.error("❌ Seeding Failed:", e);
    process.exit(1);
});
