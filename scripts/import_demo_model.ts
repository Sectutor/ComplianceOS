
import { config } from 'dotenv';
config(); // Load .env

import { getDb } from '../packages/core/src/db';
import { threatModels, threatModelComponents, threatModelDataFlows, devProjects } from '../packages/core/src/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function main() {
    const db = await getDb();
    const clientId = 3;

    // 1. Find a valid project for Client 3
    let project = await db.query.devProjects.findFirst({
        where: eq(devProjects.clientId, clientId)
    });

    if (!project) {
        console.log("No project found for Client 3, creating 'Demo Project'...");
        [project] = await db.insert(devProjects).values({
            clientId,
            name: "Threat Dragon Integration Demo",
            status: "active",
            description: "Auto-created for demo"
        }).returning();
    }

    console.log(`Using Project: ${project.name} (ID: ${project.id})`);

    // 2. Read JSON
    const jsonPath = path.join(process.cwd(), 'demo_architecture.json');
    const rawJson = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(rawJson);

    // 3. Import Logic (Ported from Router)
    const modelName = data.summary?.title || "Imported Threat Dragon Model";
    console.log(`Importing Model: ${modelName}`);

    const [newModel] = await db.insert(threatModels)
        .values({
            clientId,
            devProjectId: project.id,
            name: modelName,
            methodology: 'STRIDE',
            status: 'active',
            updatedAt: new Date(),
            createdAt: new Date()
        })
        .returning();

    const diagram = data.detail?.diagrams?.[0];
    if (!diagram) {
        console.log("No diagrams found in JSON.");
        return;
    }

    const componentMap = new Map();

    // Import Components
    const nodes = diagram.cells.filter((c: any) => c.shape !== 'flow');
    console.log(`Found ${nodes.length} components.`);

    for (const node of nodes) {
        let type = 'Process';
        if (node.shape === 'actor') type = 'Actor';
        if (node.shape === 'store') type = 'Store';
        if (node.data?.type) type = node.data.type;

        // Map TD generic types to our specific strings if needed, 
        // but we updated COMPONENT_TYPES to include Actor, Store, Process, so direct mapping is fine.
        // However, 'External Service' in JSON (Stripe API) should act as Actor but keep type string if valid.

        const [comp] = await db.insert(threatModelComponents).values({
            threatModelId: newModel.id,
            name: node.data?.name || 'Unnamed',
            type: type, // Ensure this matches allowed types or is Generic
            description: node.data?.description || '',
            x: node.position?.x || 0,
            y: node.position?.y || 0
        }).returning();
        componentMap.set(node.id, comp.id);
    }

    // Import Flows
    const edges = diagram.cells.filter((c: any) => c.shape === 'flow');
    console.log(`Found ${edges.length} flows.`);

    for (const edge of edges) {
        const sourceId = componentMap.get(edge.source?.cell);
        const targetId = componentMap.get(edge.target?.cell);

        if (sourceId && targetId) {
            await db.insert(threatModelDataFlows).values({
                threatModelId: newModel.id,
                sourceComponentId: sourceId,
                targetComponentId: targetId,
                protocol: edge.data?.protocol || 'HTTP',
                isEncrypted: edge.data?.isEncrypted || false,
                description: edge.data?.name || ''
            });
        }
    }

    console.log(`Successfully imported Threat Model ID: ${newModel.id}`);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
