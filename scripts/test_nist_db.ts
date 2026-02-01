
import { config } from "dotenv";
config();
import { getDb } from "../packages/core/src/db";
import { controls } from "../packages/core/src/schema";
import { nistAiRmfControls } from "../packages/core/src/data/frameworks/nist_ai_rmf";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("Testing NIST AI RMF DB insertion...");
    const clientId = 1;
    const frameworkName = "NIST AI RMF";

    try {
        const d = await getDb();

        const newControls = nistAiRmfControls.map(c => ({
            controlId: c.id,
            name: c.name,
            description: c.description,
            framework: frameworkName,
            category: c.category,
            implementationGuidance: "See NIST AI 100-1 for detailed guidance.",
            clientId: clientId,
            status: "active",
            version: 1,
            grouping: "NIST AI RMF"
        }));

        console.log(`Deleting existing controls for ${frameworkName} and client ${clientId}...`);
        await d.delete(controls).where(and(
            eq(controls.clientId, clientId),
            eq(controls.framework, frameworkName)
        ));

        console.log(`Inserting ${newControls.length} controls...`);
        await d.insert(controls).values(newControls as any);

        console.log("Success! DB insertion worked.");
        process.exit(0);
    } catch (e: any) {
        console.error("FAILED DB insertion with error:", e);
        process.exit(1);
    }
}

main();
