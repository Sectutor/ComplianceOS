

import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../packages/core/src/db";
import { threatModelComponents, threatModelDataFlows } from "../packages/core/src/schema";
import { eq } from "drizzle-orm";

async function seed() {
    const db = await getDb();
    const modelId = 30;

    console.log(`Seeding robust architecture for Threat Model ${modelId}...`);

    // 1. Clear existing data
    await db.delete(threatModelDataFlows).where(eq(threatModelDataFlows.threatModelId, modelId));
    await db.delete(threatModelComponents).where(eq(threatModelComponents.threatModelId, modelId));

    // 2. Define Components
    const components = [
        { name: "Mobile App", type: "Mobile Client", x: 50, y: 200, description: "Customer facing mobile application" },
        { name: "Cloud WAF", type: "Firewall/WAF", x: 250, y: 200, description: "Web Application Firewall filtering traffic" },
        { name: "API Gateway", type: "API Gateway", x: 450, y: 200, description: "Central entry point for backend services" },
        { name: "Auth Service", type: "Identity Provider", x: 450, y: 50, description: "Handles OIDC authentication" },
        { name: "Core Banking API", type: "Microservice", x: 650, y: 200, description: "Main business logic processing" },
        { name: "Customer DB", type: "Database", x: 650, y: 400, description: "PostgreSQL storing PII and transactions" },
        { name: "AI Financial Advisor", type: "AI Agent", x: 850, y: 200, description: "LLM agent for financial advice" },
        { name: "Knowledge Base", type: "Vector DB", x: 850, y: 400, description: "Embeddings for RAG implementation" },
        { name: "Payment Processor", type: "External Service", x: 650, y: 50, description: "Stripe/PayPal integration" }
    ];

    // 3. Insert Components and keep mapping of Name -> ID
    const idMap: Record<string, number> = {};

    for (const c of components) {
        const [inserted] = await db.insert(threatModelComponents).values({
            threatModelId: modelId,
            name: c.name,
            type: c.type,
            description: c.description,
            x: c.x,
            y: c.y
        }).returning();
        idMap[c.name] = inserted.id;
        console.log(`Created component: ${c.name}`);
    }

    // 4. Define Flows
    const flows = [
        { src: "Mobile App", dst: "Cloud WAF", proto: "HTTPS", desc: "User requests" },
        { src: "Cloud WAF", dst: "API Gateway", proto: "HTTPS", desc: "Filtered traffic" },
        { src: "API Gateway", dst: "Auth Service", proto: "OIDC", desc: "Token validation" },
        { src: "API Gateway", dst: "Core Banking API", proto: "gRPC", desc: "Routed requests" },
        { src: "Core Banking API", dst: "Customer DB", proto: "TCP/SQL", desc: "Read/Write transactions" },
        { src: "Core Banking API", dst: "AI Financial Advisor", proto: "HTTPS", desc: "Advice query" },
        { src: "AI Financial Advisor", dst: "Knowledge Base", proto: "HTTPS", desc: "Context retrieval (RAG)" },
        { src: "Core Banking API", dst: "Payment Processor", proto: "HTTPS", desc: "Payment execution" },
    ];

    // 5. Insert Flows
    for (const f of flows) {
        if (idMap[f.src] && idMap[f.dst]) {
            await db.insert(threatModelDataFlows).values({
                threatModelId: modelId,
                sourceComponentId: idMap[f.src],
                targetComponentId: idMap[f.dst],
                protocol: f.proto,
                description: f.desc,
                isEncrypted: true
            });
            console.log(`Created flow: ${f.src} -> ${f.dst}`);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
