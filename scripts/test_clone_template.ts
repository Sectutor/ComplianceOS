
import "dotenv/config";
import { getDb } from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

async function testClone() {
    try {
        const db = await getDb();
        console.log("🔍 Finding a template to clone...");

        const [source] = await db.select().from(schema.implementationTemplates).limit(1);
        if (!source) {
            console.error("❌ No templates found to clone.");
            return;
        }
        console.log(`Found template: ${source.title} (ID: ${source.id})`);

        console.log("🧬 Attempting clone...");
        const [cloned] = await db.insert(schema.implementationTemplates).values({
            clientId: source.clientId || 1, // Default to client 1 if system
            title: `${source.title} (Copy Test)`,
            description: source.description,
            estimatedHours: source.estimatedHours,
            priority: source.priority,
            category: source.category,
            tasks: source.tasks,
            riskMitigationFocus: source.riskMitigationFocus,
            isSystem: false,
            createdById: 1
        }).returning();

        console.log(`✅ Clone successful! New ID: ${cloned.id}, Title: ${cloned.title}`);

        // Cleanup
        await db.delete(schema.implementationTemplates).where(eq(schema.implementationTemplates.id, cloned.id));
        console.log("🧹 Cleanup complete.");

    } catch (e: any) {
        console.error("💥 Error during clone:", e);
    }
    process.exit(0);
}

testClone();
