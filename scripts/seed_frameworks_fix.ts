
import 'dotenv/config';
import { getDb } from "../db";
import * as schema from "../schema";
import { eq, isNull } from "drizzle-orm";

async function main() {
    console.log("Seeding Frameworks & Fixing Plans...");
    try {
        const db = await getDb();

        // 1. Insert Frameworks
        const frameworksData = [
            { name: "ISO/IEC 27001:2022", shortCode: "ISO27001", version: "2022", description: "Information Security Management System" },
            { name: "SOC 2 Type II", shortCode: "SOC2", version: "2017", description: "Service Organization Control" },
            { name: "GDPR", shortCode: "GDPR", version: "2018", description: "General Data Protection Regulation" }
        ];

        const createdFrameworks = [];
        for (const fw of frameworksData) {
            // Check if exists first to avoid dupes or constraint errors if I run this multiple times
            const existing = await db.query.complianceFrameworks.findFirst({
                where: eq(schema.complianceFrameworks.shortCode, fw.shortCode)
            });

            if (existing) {
                createdFrameworks.push(existing);
                console.log(`Framework exists: ${existing.name} (ID: ${existing.id})`);
            } else {
                const [inserted] = await db.insert(schema.complianceFrameworks).values(fw).returning();
                createdFrameworks.push(inserted);
                console.log(`Created framework: ${inserted.name} (ID: ${inserted.id})`);
            }
        }

        const isoId = createdFrameworks.find(f => f.shortCode === 'ISO27001')?.id;

        if (isoId) {
            // 2. Update Plans to point to ISO 27001
            console.log(`Updating plans to use ISO 27001 (ID: ${isoId})...`);

            const result = await db.update(schema.implementationPlans)
                .set({ frameworkId: isoId })
                .where(isNull(schema.implementationPlans.frameworkId))
                .returning({ id: schema.implementationPlans.id });

            console.log(`Updated ${result.length} plans successfully.`);
        }

    } catch (e) {
        console.error("Error seeding:", e);
    }
    process.exit(0);
}

main();
