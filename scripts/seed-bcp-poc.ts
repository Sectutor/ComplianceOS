
import 'dotenv/config';
import * as db from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

async function seedBCPPOC() {
    const CLIENT_ID = 3;
    console.log(`Starting BCP POC Seeding for Client ${CLIENT_ID}...`);

    const dbConn = await db.getDb();

    // 1. Create Business Process
    console.log("Creating Business Process...");
    const [process] = await dbConn.insert(schema.businessProcesses).values({
        clientId: CLIENT_ID,
        name: "SaaS Platform Operations",
        description: "Core infrastructure and application services for the Intellfence platform.",
        department: "Engineering",
        criticalityTier: "Tier 1", // Mission Critical
        rto: "4 hours",
        rpo: "1 hour",
        mtpd: "24 hours"
    }).returning();

    // 2. Create BIA
    console.log("Creating Business Impact Analysis (BIA)...");
    const [bia] = await dbConn.insert(schema.businessImpactAnalyses).values({
        clientId: CLIENT_ID,
        processId: process.id,
        title: "BIA - SaaS Platform Ops 2026",
        methodology: "Standard ISO 22301 Impact Assessment",
        status: "approved"
    }).returning();

    // 3. Add Recovery Objectives (Activities) to BIA
    console.log("Adding Recovery Objectives...");
    await dbConn.insert(schema.recoveryObjectives).values([
        {
            biaId: bia.id,
            activity: "Database Restoration",
            criticality: "Critical",
            rto: "1 hour",
            rpo: "15 minutes",
            mtpd: "4 hours",
            dependencies: "AWS RDS Snapshots, KMS Keys",
            resources: "DBA Team, Cloud Access"
        },
        {
            biaId: bia.id,
            activity: "Frontend Service Recovery",
            criticality: "High",
            rto: "2 hours",
            rpo: "N/A", // Stateless
            mtpd: "8 hours",
            dependencies: "Vercel / CDN, GitHub Repo",
            resources: "DevOps Engineer"
        },
        {
            biaId: bia.id,
            activity: "API Gateway Failover",
            criticality: "Critical",
            rto: "30 minutes",
            rpo: "N/A",
            mtpd: "2 hours",
            dependencies: "DNS Provider, Load Balancer",
            resources: "SRE Team"
        }
    ]);

    // 4. Create Strategies
    console.log("Creating Recovery Strategies...");
    const [strat1] = await dbConn.insert(schema.bcStrategies).values({
        clientId: CLIENT_ID,
        title: "Multi-Region Active-Passive Failover",
        description: "Failover critical services to us-west-2 region in case of us-east-1 outage.",
        resourceRequirements: "Standby infrastructure in secondary region, automated DNS switching.",
        estimatedCost: "$5,000/month",
        benefits: "Reduces RTO to < 30 mins for regional outages.",
        approvalStatus: "approved"
    }).returning();

    const [strat2] = await dbConn.insert(schema.bcStrategies).values({
        clientId: CLIENT_ID,
        title: "Immutable Backup Vault",
        description: "Daily backups replicated to a locked, immutable vault to prevent ransomware encryption.",
        resourceRequirements: "AWS Backup Vault Lock enabled.",
        estimatedCost: "$500/month",
        benefits: "Guarantees clean recovery point even after compromise.",
        approvalStatus: "approved"
    }).returning();

    // 5. Create Scenarios
    console.log("Creating Disruptive Scenarios...");
    const [scen1] = await dbConn.insert(schema.disruptiveScenarios).values({
        clientId: CLIENT_ID,
        title: "Ransomware Attack",
        description: "Malicious actor encrypts production databases and demands ransom.",
        likelihood: "Medium",
        potentialImpact: "High - Complete service loss, data unavailability.",
        mitigationStrategies: "Immutable backups, EDR, Network Segmentation."
    }).returning();

    const [scen2] = await dbConn.insert(schema.disruptiveScenarios).values({
        clientId: CLIENT_ID,
        title: "Cloud Region Outage",
        description: "Primary cloud provider region (us-east-1) goes offline significantly.",
        likelihood: "Low",
        potentialImpact: "High - Platform inacessible.",
        mitigationStrategies: "Multi-region failover strategy."
    }).returning();

    // 6. Create BC Plan
    console.log("Creating Business Continuity Plan...");
    // Mock Content JSON for PDF generation compatibility
    const planContent = {
        metadata: {
            department: "Engineering",
            generatedAt: new Date().toISOString()
        },
        callList: [
            { name: "John Doe", role: "Incident Commander", email: "john@intellfence.com", phone: "+1-555-0100" },
            { name: "Jane Smith", role: "Tech Lead", email: "jane@intellfence.com", phone: "+1-555-0102" }
        ],
        strategies: [strat1, strat2],
        scenarios: [scen1, scen2],
        criticalActivities: [
            { activity: "Database Restoration", rto: "1 hour" },
            { activity: "API Gateway Failover", rto: "30 minutes" }
        ]
    };

    const [plan] = await dbConn.insert(schema.bcPlans).values({
        clientId: CLIENT_ID,
        title: "SaaS Platform Recovery Plan",
        version: "1.0",
        status: "approved",
        content: JSON.stringify(planContent),
        lastTestedDate: new Date()
    }).returning();

    // 7. Link Relationships
    console.log("Linking Plan Relationships...");
    await dbConn.insert(schema.bcPlanBias).values({ planId: plan.id, biaId: bia.id });
    await dbConn.insert(schema.bcPlanStrategies).values([
        { planId: plan.id, strategyId: strat1.id },
        { planId: plan.id, strategyId: strat2.id }
    ]);
    await dbConn.insert(schema.bcPlanScenarios).values([
        { planId: plan.id, scenarioId: scen1.id },
        { planId: plan.id, scenarioId: scen2.id }
    ]);

    // 8. Create Version Snapshot
    console.log("Creating Version Snapshot...");
    await dbConn.insert(schema.planVersions).values({
        planId: plan.id,
        version: "1.0",
        changeSummary: "Initial approved release for Q1 2026.",
        contentSnapshot: {
            plan: plan,
            bias: [bia],
            strategies: [strat1, strat2],
            scenarios: [scen1, scen2]
        },
        createdAt: new Date() // Now
    });

    // 9. Log Exercise
    console.log("Logging Plan Exercise...");
    await dbConn.insert(schema.planExercises).values({
        clientId: CLIENT_ID,
        planId: plan.id,
        title: "Q4 Tabletop - Ransomware Simulation",
        type: "Tabletop",
        date: new Date(),
        status: "Completed",
        outcome: "Pass",
        notes: "Team successfully identified communication channels and restoration procedures. Identified need for faster access to offline backup keys."
    });

    console.log(`
    ✅ BC POC Created Successfully!
    --------------------------------
    Plan ID: ${plan.id}
    Title: ${plan.title}
    BIA: ${bia.title}
    Strategies: ${strat1.title}, ${strat2.title}
    Scenarios: ${scen1.title}, ${scen2.title}
    `);
}

seedBCPPOC()
    .catch(console.error)
    .finally(() => process.exit());
