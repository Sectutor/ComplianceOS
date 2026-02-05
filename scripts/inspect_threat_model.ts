
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import { threatModels, threatModelComponents, threatModelDataFlows } from '../packages/core/src/schema';
import { eq } from 'drizzle-orm';

async function inspectModel(id: number) {
    try {
        const db = await getDb();
        const model = await db.select().from(threatModels).where(eq(threatModels.id, id)).then(res => res[0]);

        if (!model) {
            console.log("Model not found");
            return;
        }

        const components = await db.select().from(threatModelComponents).where(eq(threatModelComponents.threatModelId, id));
        let flows = [];
        try {
            flows = await db.select().from(threatModelDataFlows).where(eq(threatModelDataFlows.threatModelId, id));
        } catch (e) { }

        console.log(`Model: ${model.name} (${model.methodology})`);
        console.log(`ProjectID: ${model.devProjectId} | ClientID: ${model.clientId}`);
        console.log(`Components (${components.length}):`);
    } catch (error) {
        console.error("Error inspecting model:", error);
    }
    process.exit(0);
}

const id = parseInt(process.argv[2]);
if (id) inspectModel(id);
else console.log("Please provide an ID");
