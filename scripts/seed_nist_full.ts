
import { getDb } from "../packages/core/src/db";
import * as maturitySchema from "../packages/core/src/db/maturity-schema";
import { nistCsf2FullData } from "./nist_2_0_full_data";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Seeding HIERARCHICAL NIST CSF 2.0 Data...");
    const db = await getDb();

    // 0. Clean start for NIST CSF 2.0 to avoid duplicates and fix hierarchy
    console.log("🧹 Cleaning old NIST CSV 2.0 data (including assessments)...");
    await db.delete(maturitySchema.maturityAssessments).where(eq(maturitySchema.maturityAssessments.frameworkId, "nist-csf-2"));
    await db.delete(maturitySchema.maturityClientFrameworks).where(eq(maturitySchema.maturityClientFrameworks.frameworkId, "nist-csf-2"));
    await db.delete(maturitySchema.maturitySimulations).where(eq(maturitySchema.maturitySimulations.frameworkId, "nist-csf-2"));
    await db.delete(maturitySchema.maturityRequirements).where(eq(maturitySchema.maturityRequirements.frameworkId, "nist-csf-2"));
    await db.delete(maturitySchema.maturityCategories).where(eq(maturitySchema.maturityCategories.frameworkId, "nist-csf-2"));

    // 1. NIST CSF 2.0 Functions (The 6 PARENT categories)
    const nistFunctions = [
        { code: "GV", name: "Govern", description: "Establish and monitor the organization's cybersecurity risk management strategy, expectations, and policy.", order: 1 },
        { code: "ID", name: "Identify", description: "Help determine the current cybersecurity risk to the organization.", order: 2 },
        { code: "PR", name: "Protect", description: "Use safeguards to prevent or reduce cybersecurity risk.", order: 3 },
        { code: "DE", name: "Detect", description: "Find and analyze possible cybersecurity attacks and compromises.", order: 4 },
        { code: "RS", name: "Respond", description: "Take action regarding a detected cybersecurity incident.", order: 5 },
        { code: "RC", name: "Recover", description: "Restore assets and operations that were impacted by a cybersecurity incident.", order: 6 }
    ];

    console.log(`📦 Creating 6 NIST parent functions...`);
    const functionIdMap = new Map<string, number>();
    for (const func of nistFunctions) {
        const [inserted] = await db.insert(maturitySchema.maturityCategories).values({
            ...func,
            frameworkId: "nist-csf-2"
        }).returning({ id: maturitySchema.maturityCategories.id });
        functionIdMap.set(func.name, inserted.id);
    }

    interface NistItem {
        function: string;
        category: string;
        id: string;
        description: string;
        implementation_examples: string;
        title?: string; // Added title as it's used in the new code
    }

    // 2. Create the 22 NIST Categories (CHILDREN)
    const categoryIdMap = new Map<string, number>();
    const uniqueCategories = [...new Set(nistCsf2FullData.map(d => d.category))];

    console.log(`📂 Creating ${uniqueCategories.length} NIST sub-categories...`);
    let orderCounter = 10; // Start children order after parents (1-6)
    for (const catName of uniqueCategories) {
        const firstItem = nistCsf2FullData.find(d => d.category === catName);
        const parentId = functionIdMap.get(firstItem!.function);

        const [inserted] = await db.insert(maturitySchema.maturityCategories).values({
            frameworkId: "nist-csf-2",
            parentId: parentId,
            code: firstItem!.id.split('-')[0], // e.g. GV.OC
            name: catName,
            description: `NIST Category under ${firstItem!.function}`,
            order: orderCounter++
        }).returning({ id: maturitySchema.maturityCategories.id });

        categoryIdMap.set(catName, inserted.id);
    }

    console.log(`⚙️ Seeding ${nistCsf2FullData.length} requirements into hierarchy...`);
    for (const item of nistCsf2FullData as NistItem[]) {
        const catId = categoryIdMap.get(item.category);
        if (!catId) continue;

        const reqData = {
            frameworkId: "nist-csf-2",
            categoryId: catId,
            code: item.id,
            title: item.title || item.description.split('.')[0],
            description: item.description,
            level: 2,
            benefits: item.implementation_examples
        };

        await db.insert(maturitySchema.maturityRequirements).values(reqData);
    }

    console.log("🏁 NIST CSF 2.0 Hierarchical Seeding Finished!");
    process.exit(0);
}

main().catch(e => {
    console.error("❌ Seeding Failed:", e);
    process.exit(1);
});
