
import { getDb } from "../packages/core/src/db";
import * as maturitySchema from "../packages/core/src/db/maturity-schema";
import { nist800171Controls } from "../packages/core/src/data/frameworks/nist-800-171";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Seeding FULL CMMC 2.0 Data (NIST 800-171 - 110 Practices)...");
    const db = await getDb();

    // CMMC 2.0 Domains (Categories)
    const cmmcDomains = [
        { code: "AC", name: "Access Control", order: 1 },
        { code: "AT", name: "Awareness and Training", order: 2 },
        { code: "AU", name: "Audit and Accountability", order: 3 },
        { code: "CM", name: "Configuration Management", order: 4 },
        { code: "IA", name: "Identification and Authentication", order: 5 },
        { code: "IR", name: "Incident Response", order: 6 },
        { code: "MA", name: "Maintenance", order: 7 },
        { code: "MP", name: "Media Protection", order: 8 },
        { code: "PS", name: "Personnel Security", order: 9 },
        { code: "PE", name: "Physical Protection", order: 10 },
        { code: "RA", name: "Risk Assessment", order: 11 },
        { code: "CA", name: "Security Assessment", order: 12 },
        { code: "SC", name: "System and Communications Protection", order: 13 },
        { code: "SI", name: "System and Information Integrity", order: 14 }
    ];

    console.log(`📦 Ensuring ${cmmcDomains.length} CMMC domains exist...`);
    for (const domain of cmmcDomains) {
        const catData = { ...domain, frameworkId: "cmmc-2", description: `CMMC Domain: ${domain.name}` };
        const existing = await db.select().from(maturitySchema.maturityCategories)
            .where(and(eq(maturitySchema.maturityCategories.frameworkId, "cmmc-2"), eq(maturitySchema.maturityCategories.name, domain.name)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityCategories).values(catData);
        } else {
            await db.update(maturitySchema.maturityCategories).set(catData).where(eq(maturitySchema.maturityCategories.id, existing[0].id));
        }
    }

    // Get category IDs
    const dbCats = await db.select().from(maturitySchema.maturityCategories).where(eq(maturitySchema.maturityCategories.frameworkId, "cmmc-2"));

    console.log(`⚙️ Seeding ${nist800171Controls.length} CMMC practices...`);
    for (const practice of nist800171Controls) {
        const catId = dbCats.find(c => c.name === practice.category)?.id;
        if (!catId) {
            console.warn(`⚠️ Domain not found for category: ${practice.category}`);
            continue;
        }

        const practiceData = {
            frameworkId: "cmmc-2",
            categoryId: catId,
            code: practice.id,
            title: practice.name.includes("-") ? practice.name.split("-")[1].trim() : practice.name,
            description: practice.description,
            level: 2, // NIST 800-171 maps to CMMC Level 2
            benefits: practice.implementationGuidance
        };

        const existing = await db.select().from(maturitySchema.maturityRequirements)
            .where(and(eq(maturitySchema.maturityRequirements.frameworkId, "cmmc-2"), eq(maturitySchema.maturityRequirements.code, practice.id)))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(maturitySchema.maturityRequirements).values(practiceData);
        } else {
            await db.update(maturitySchema.maturityRequirements).set(practiceData).where(eq(maturitySchema.maturityRequirements.id, existing[0].id));
        }
    }

    console.log("🏁 CMMC 2.0 Full Seeding Finished!");
    process.exit(0);
}

main().catch(e => {
    console.error("❌ Seeding Failed:", e);
    process.exit(1);
});
