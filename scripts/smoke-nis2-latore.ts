import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// 1. Ensure env vars are loaded
dotenv.config();
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

import { getDb } from "../packages/core/src/db";
import {
    clients,
    assets,
    riskAssessments,
    clientPolicies,
    clientControls,
    incidents,
    approvalRequests,
    approvalSignatures
} from "../packages/core/src/schema";
import { eq, ilike, desc } from "drizzle-orm";
import { createFrameworkRoadmapGatesRouter } from "../packages/core/src/server/routers/frameworkRoadmapGates";

async function runSmokeTest() {
    console.log("===============================================================");
    console.log("🚀 STARTING SMOKE TEST: LATORE LTD - NIS2 90-DAY ROADMAP");
    console.log("===============================================================");

    const db = await getDb();
    if (!db) {
        throw new Error("Failed to connect to database. Check DATABASE_URL.");
    }
    console.log("✅ Database connection established.");

    // Step 1: Find or Create Latore LTD
    console.log("\n--- [Step 1] Locating or provisioning client: Latore LTD ---");
    let latoreClients = await db.select().from(clients).where(ilike(clients.name, "%Latore%"));

    let latoreClient = latoreClients[0];
    if (!latoreClient) {
        console.log("Latore LTD not found. Provisioning new client record...");
        const [newClient] = await db.insert(clients).values({
            name: "Latore LTD",
            industry: "Critical Digital Infrastructure & Manufacturing",
            size: "250-999",
            contactEmail: "ciso@latore.example.eu",
            contactName: "Elena Rostova",
            targetDate: "2026-12-31",
            status: "active",
            tier: "enterprise",
            enabledModules: JSON.stringify(["nis2", "iso27001", "dora", "privacy"]),
        }).returning();
        latoreClient = newClient;
        console.log(`✅ Provisioned new client: ${latoreClient.name} (ID: ${latoreClient.id})`);
    } else {
        console.log(`✅ Found existing client: ${latoreClient.name} (ID: ${latoreClient.id})`);
    }

    const clientId = latoreClient.id;

    // Step 2: Seed realistic NIS2 operational telemetry if empty
    console.log("\n--- [Step 2] Validating operational NIS2 telemetry data ---");
    const existingAssets = await db.select().from(assets).where(eq(assets.clientId, clientId));
    if (existingAssets.length === 0) {
        console.log("Seeding sample assets for Latore LTD...");
        await db.insert(assets).values([
            {
                clientId,
                name: "Core OT SCADA Energy Management Gateway",
                type: "hardware",
                criticality: "critical",
                owner: "Elena Rostova",
                description: "Critical manufacturing operational telemetry system in scope for NIS2 Article 21.",
            },
            {
                clientId,
                name: "Corporate Entra ID & IAM Directory",
                type: "cloud_service",
                criticality: "high",
                owner: "IT Operations",
                description: "MFA and directory infrastructure for NIS2 workforce access control.",
            }
        ]);
    }

    const existingRisks = await db.select().from(riskAssessments).where(eq(riskAssessments.clientId, clientId));
    if (existingRisks.length === 0) {
        console.log("Seeding sample all-hazards risk assessment for Latore LTD...");
        await db.insert(riskAssessments).values([
            {
                clientId,
                assessmentId: "RA-NIS2-001",
                title: "NIS2 Supply Chain Disruption & Ransomware Attack",
                likelihood: 3,
                impact: 4,
                inherentScore: 12,
                residualScore: 4,
                treatmentStrategy: "mitigate",
                status: "approved",
            }
        ]);
    }

    const existingPolicies = await db.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId));
    if (existingPolicies.length === 0) {
        console.log("Seeding NIS2 cybersecurity policy...");
        await db.insert(clientPolicies).values([
            {
                clientId,
                name: "NIS2 Information Security & Incident Notification Policy",
                status: "approved",
                version: 1,
                content: "Policy mandating 24h early warning and 72h incident notification to competent CSIRT authorities.",
            }
        ]);
    }

    const existingIncidents = await db.select().from(incidents).where(eq(incidents.clientId, clientId));
    if (existingIncidents.length === 0) {
        console.log("Seeding verified incident response exercise record...");
        await db.insert(incidents).values([
            {
                clientId,
                title: "Simulated CSIRT Early Warning Notification Drill",
                severity: "medium",
                status: "resolved",
                detectedAt: new Date(),
                cause: "drill",
                description: "Quarterly dry run testing 24-hour Article 23 notification reporting to national authority.",
            }
        ]);
    }

    // Step 3: Instantiate Framework Roadmap Gates Router & Context
    console.log("\n--- [Step 3] Initializing Framework Roadmap Gates Router ---");
    // Mock minimal tRPC builder for direct invocation
    const mockT = {
        router: (routes: any) => routes,
    };
    const mockClientProcedure = {
        input: (schema: any) => ({
            query: (handler: any) => ({
                runQuery: (input: any, ctx: any) => handler({ input, ctx }),
            }),
            mutation: (handler: any) => ({
                runMutation: (input: any, ctx: any) => handler({ input, ctx }),
            }),
        }),
    };

    const router = createFrameworkRoadmapGatesRouter(mockT, mockClientProcedure);
    const mockCtx = {
        clientId,
        user: { id: 1, name: "Elena Rostova", email: "elena@latore.example.eu" }
    };

    // Step 4: Query Initial Milestone Gates & Live Telemetry
    console.log("\n--- [Step 4] Querying live milestone telemetry proof for NIS2 ---");
    const initialGates = await router.getMilestoneGates.runQuery({
        clientId,
        frameworkId: "nis2",
    }, mockCtx);

    console.log("Telemetry scan summary for Latore LTD:");
    console.log(`- Framework: ${initialGates.frameworkId}`);
    console.log(`- Telemetry Proof Counts in DB:`, initialGates.telemetryCounts);
    console.log("\nMilestone Gates Status before pass:");
    for (const month of [1, 2, 3]) {
        const gate = initialGates.gates[month];
        console.log(`  [Month ${month}] Status: ${gate?.status?.toUpperCase()} | Passed: ${gate?.passed}`);
    }

    // Step 5: Execute Month 1 Milestone Gate Sign-off
    console.log("\n--- [Step 5] Executing Month 1 Milestone Gate Sign-Off (Lead Implementer Attestation) ---");
    const signOffResult = await router.passMilestoneGate.runMutation({
        clientId,
        frameworkId: "nis2",
        month: 1,
        monthTitle: "Entity Scope, Governance Mandate & All-Hazards Risk",
        signerRole: "Lead Implementer / CISO",
        signOffNotes: "SMOKE TEST: Governing body training confirmed. Full all-hazards cyber risk assessment conducted per NIS2 Art. 21. Critical OT & IT asset inventory locked in ComplianceOS.",
        attestationConfirmed: true,
        evidenceSnapshot: {
            assets: initialGates.telemetryCounts.assetCount,
            risks: initialGates.telemetryCounts.riskCount,
            policies: initialGates.telemetryCounts.policyCount,
            incidents: initialGates.telemetryCounts.incidentCount,
        }
    }, mockCtx);

    console.log("✅ Milestone Gate Sign-Off completed!");
    console.log(`- Passed: ${signOffResult.passed}`);
    console.log(`- Approval Request ID: ${signOffResult.approvalRequestId}`);
    console.log(`- Signature ID: ${signOffResult.signatureId}`);
    console.log(`- Timestamp: ${signOffResult.signedAt}`);
    console.log(`- Message: ${signOffResult.message}`);

    // Step 6: Verify Gate State Updated & Telemetry Snapshot Saved
    console.log("\n--- [Step 6] Verifying updated gate status in DB ---");
    const updatedGates = await router.getMilestoneGates.runQuery({
        clientId,
        frameworkId: "nis2",
    }, mockCtx);

    const updatedMonth1 = updatedGates.gates[1];
    console.log(`Month 1 Status: ${updatedMonth1?.status?.toUpperCase()}`);
    console.log(`Passed By: ${updatedMonth1?.passedBy}`);
    console.log(`Signer Role: ${updatedMonth1?.signerRole}`);
    console.log(`Passed At: ${updatedMonth1?.passedAt}`);
    console.log(`Sign-off Notes: ${updatedMonth1?.notes}`);
    console.log(`Evidence Snapshot:`, updatedMonth1?.evidence);

    if (updatedMonth1?.status !== "passed" || !updatedMonth1?.passed) {
        throw new Error("❌ Assertion failed: Month 1 gate is not marked as 'passed'!");
    }
    console.log("✅ Assertion PASSED: Month 1 gate is officially passed and locked in DB.");

    // Step 7: Generate & Validate Audit Certificate
    console.log("\n--- [Step 7] Generating Official 90-Day Audit Certificate ---");
    const cert = await router.getAuditCertificate.runQuery({
        clientId,
        frameworkId: "nis2",
    }, mockCtx);

    console.log("✅ Audit Certificate Generated:");
    console.log(`- Verification Code: ${cert.verificationCode}`);
    console.log(`- Organization: ${cert.clientName} (${cert.industry})`);
    console.log(`- Framework: ${cert.frameworkId.toUpperCase()}`);
    console.log(`- Issued At: ${cert.issuedAt}`);
    console.log(`- Milestone Gates in Audit Dossier: ${cert.milestoneGates.length}`);
    console.log(`- All Gates Passed: ${cert.allPassed}`);

    console.log("\nMilestone Audit Details in Certificate:");
    for (const m of cert.milestoneGates) {
        console.log(`  * Month ${m.month}: Passed=${m.passed} | Signed By: ${m.passedBy} (${m.signerRole}) | Notes: ${m.signOffNotes || 'None'}`);
        if (m.evidenceSnapshot && Object.keys(m.evidenceSnapshot).length > 0) {
            console.log(`    Snapshot:`, m.evidenceSnapshot);
        }
    }

    if (!cert.verificationCode.startsWith("COS-CERT-NIS2-")) {
        throw new Error(`❌ Invalid certificate code format: ${cert.verificationCode}`);
    }
    console.log("\n===============================================================");
    console.log("🎉 ALL SMOKE TEST ASSERTIONS PASSED SUCCESSFULLY!");
    console.log(`Client ID: ${clientId} (${latoreClient.name})`);
    console.log(`NIS2 Hub URL: http://localhost:5173/clients/${clientId}/nis2`);
    console.log("===============================================================");

    return {
        clientId,
        clientName: latoreClient.name,
        verificationCode: cert.verificationCode,
        month1Passed: true,
        passedAt: updatedMonth1.passedAt,
    };
}

runSmokeTest()
    .then((res) => {
        fs.writeFileSync(
            path.resolve(process.cwd(), "scripts/smoke-nis2-latore.json"),
            JSON.stringify(res, null, 2)
        );
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Smoke test failed with error:", err);
        process.exit(1);
    });
