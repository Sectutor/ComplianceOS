
import "dotenv/config";
import { getDb } from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

const CLIENT_ID = 3;

async function main() {
    const db = await getDb();
    console.log(`Starting Comprehensive BCP Data Generation for Client ${CLIENT_ID} (Intellfence)...`);

    // CLEANUP FIRST
    console.log("-> 0. Cleaning up existing BCP data for Client...");
    await db.delete(schema.planExercises).where(eq(schema.planExercises.clientId, CLIENT_ID));
    const plans = await db.select().from(schema.bcPlans).where(eq(schema.bcPlans.clientId, CLIENT_ID));
    for (const p of plans) {
        await db.delete(schema.bcPlanSections).where(eq(schema.bcPlanSections.planId, p.id));
        await db.delete(schema.bcPlanAppendices).where(eq(schema.bcPlanAppendices.planId, p.id));
        await db.delete(schema.bcPlanBias).where(eq(schema.bcPlanBias.planId, p.id));
        await db.delete(schema.bcPlanStrategies).where(eq(schema.bcPlanStrategies.planId, p.id));
        await db.delete(schema.bcPlanScenarios).where(eq(schema.bcPlanScenarios.planId, p.id));
        await db.delete(schema.planExercises).where(eq(schema.planExercises.planId, p.id));
        await db.delete(schema.planVersions).where(eq(schema.planVersions.planId, p.id));
        await db.delete(schema.planChangeLog).where(eq(schema.planChangeLog.planId, p.id));
        await db.delete(schema.bcPlans).where(eq(schema.bcPlans.id, p.id));
    }

    await db.delete(schema.disruptiveScenarios).where(eq(schema.disruptiveScenarios.clientId, CLIENT_ID));
    await db.delete(schema.bcStrategies).where(eq(schema.bcStrategies.clientId, CLIENT_ID));

    const bias = await db.select().from(schema.businessImpactAnalyses).where(eq(schema.businessImpactAnalyses.clientId, CLIENT_ID));
    for (const b of bias) {
        await db.delete(schema.impactAssessments).where(eq(schema.impactAssessments.biaId, b.id));
        await db.delete(schema.recoveryObjectives).where(eq(schema.recoveryObjectives.biaId, b.id));
        await db.delete(schema.businessImpactAnalyses).where(eq(schema.businessImpactAnalyses.id, b.id));
    }

    await db.delete(schema.businessProcesses).where(eq(schema.businessProcesses.clientId, CLIENT_ID));
    await db.delete(schema.bcPrograms).where(eq(schema.bcPrograms.clientId, CLIENT_ID));

    // 1. SETUP GOVERNANCE
    console.log("-> 1. Setting up Program Governance...");

    const [program] = await db.insert(schema.bcPrograms).values({
        clientId: CLIENT_ID,
        programName: "Intellfence Global Resilience Program",
        scopeDescription: "Global operations including NY, London, and Singapore offices. Covers all critical IT infrastructure, payment processing systems, and customer support operations.",
        policyStatement: "Intellfence is committed to the resilience of its critical operations. This policy establishes the framework for Business Continuity Management (BCM) in accordance with ISO 22301 standards.",
        budgetAllocated: "$250,000",
        status: "active"
    }).returning();

    // 2. DEFINE PROCESSES (15 items)
    console.log("-> 2. Defining Business Processes...");
    const processesData = [
        { name: "Real-time Payment Settlement", criticality: "Tier 1 (Critical)", description: "Core transaction processing engine handling $5M+ daily volume." },
        { name: "Customer Support (Voice)", criticality: "Tier 1 (Critical)", description: "24/7 client helpline for blocking cards and reporting fraud." },
        { name: "IT Infrastructure Management", criticality: "Tier 1 (Critical)", description: "Maintenance of AWS/Azure production environments and network security." },
        { name: "SWIFT/Wire Transfers", criticality: "Tier 1 (Critical)", description: "High-value interbank transfers requiring dual-authorization." },
        { name: "Mobile App API Gateway", criticality: "Tier 1 (Critical)", description: "Connectivity for 500k+ mobile users." },
        { name: "Data Warehousing & Analytics", criticality: "Tier 2 (High)", description: "Daily reporting for executive decision making and fraud detection models." },
        { name: "Email & Internal Comms", criticality: "Tier 2 (High)", description: "Office365 and Slack used for internal coordination." },
        { name: "Payroll Processing", criticality: "Tier 2 (High)", description: "Bi-weekly employee payments and tax filings." },
        { name: "Vendor Management", criticality: "Tier 3 (Medium)", description: "Third-party risk assessments and procurement lifecycle." },
        { name: "Regulatory Reporting", criticality: "Tier 2 (High)", description: "Monthly compliance submissions to FinCEN and FCA." },
        { name: "Legal Counsel", criticality: "Tier 3 (Medium)", description: "Contract review, litigation support, and IP protection." },
        { name: "Office Security (Physical)", criticality: "Tier 3 (Medium)", description: "Access control systems, CCTV, and on-site guards." },
        { name: "Marketing & PR", criticality: "Tier 4 (Low)", description: "Brand management, social media campaigns, and press releases." },
        { name: "Dev/Test Environments", criticality: "Tier 4 (Low)", description: "Non-production sandboxes for QA and UAT." },
        { name: "Employee Onboarding", criticality: "Tier 3 (Medium)", description: "HR induction process, laptop provisioning, and badge issuance." },
    ];

    const createdProcesses = [];
    for (const p of processesData) {
        const [proc] = await db.insert(schema.businessProcesses).values({
            clientId: CLIENT_ID,
            name: p.name,
            description: p.description,
            criticalityTier: p.criticality,
            status: "active",
            ownerId: 1
        }).returning();
        createdProcesses.push(proc);
    }

    // 3. BIAs & RTOs (Linked to Processes)
    console.log("-> 3. conducting BIAs...");
    const biaIds = [];

    for (const proc of createdProcesses) {
        const rtoVal = proc.criticalityTier.includes("Tier 1") ? "4 Hours" :
            proc.criticalityTier.includes("Tier 2") ? "24 Hours" :
                proc.criticalityTier.includes("Tier 3") ? "72 Hours" : "1 Week";

        const rpoVal = proc.criticalityTier.includes("Tier 1") ? "15 Minutes" : "4 Hours";

        const [bia] = await db.insert(schema.businessImpactAnalyses).values({
            clientId: CLIENT_ID,
            processId: proc.id,
            title: `BIA: ${proc.name}`,
            status: "approved",
            approvedAt: new Date(),
            validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        }).returning();
        biaIds.push(bia.id);

        await db.insert(schema.recoveryObjectives).values({
            biaId: bia.id,
            activity: "Full Service Restoration",
            rto: rtoVal,
            rpo: rpoVal,
            mtpd: "2 Weeks",
            criticality: proc.criticalityTier
        });

        // Also set RTO/RPO directly on the process for dashboard calculations
        await db.update(schema.businessProcesses).set({
            rto: rtoVal,
            rpo: rpoVal
        }).where(eq(schema.businessProcesses.id, proc.id));

        await db.insert(schema.impactAssessments).values({
            biaId: bia.id,
            timeInterval: "4-24h",
            financialRating: proc.criticalityTier.includes("Tier 1") ? 9 : 5,
            operationalRating: proc.criticalityTier.includes("Tier 1") ? 10 : 4,
            reputationRating: proc.criticalityTier.includes("Tier 1") ? 8 : 3,
            financialValue: proc.criticalityTier.includes("Tier 1") ? "$100k - $500k" : "< $10k",
            notes: "Loss of this process impacts customer trust immediately. Regulatory fines apply after 4 hours of downtime."
        });
    }

    // 4. STRATEGIES (10 items)
    console.log("-> 4. Defining Strategies...");
    const strategiesData = [
        { title: "Active-Active Geo-Replication", type: "Technology", cost: "$50k/mo", desc: "Real-time replication of all transaction databases to the secondary region (us-west-2). Enables sub-minute RPO and RTO < 15 mins." },
        { title: "Cold Storage Restore", type: "Technology", cost: "$5k/mo", desc: "Daily snapshots sent to S3 Glacier Vault (Immutable). Use for ransomware recovery where data integrity is compromised." },
        { title: "Remote Work Activation (WFH)", type: "People", cost: "$0", desc: "All employees issued corporate laptops with VPN. Dept heads trigger call-tree to instruct staff to work from home." },
        { title: "Manual Payment Processing", type: "Process", cost: "High Effort", desc: "Fallback paper-based forms for high-value transactions. Strictly limited to <$100k amounts until systems restored." },
        { title: "Vendor Failover (Secondary Provider)", type: "Third-Party", cost: "Variable", desc: "Contract in place with 'BackupPay Ltd' to route traffic if primary gateway fails. Requires DNS switch." },
        { title: "Crisis Communcation Protocol", type: "Communications", cost: "$10k retainer", desc: "Pre-drafted templates for Twitter/X, Email, and SMS. PR Firm on retainer to handle media inquiries." },
        { title: "Emergency Hiring / Staffing Agency", type: "People", cost: "Market Rate", desc: "On-demand contract with 'TechStaffing' to supply 20 additional support agents within 24 hours." },
        { title: "Cyber Incident Response Team (CIRT)", type: "Security", cost: "$20k retainer", desc: "Retainer with 'SecureDefend'. 1-hour SLA for on-site (virtual) forensic analysis and containment." },
        { title: "Alternate Office Site (WeWork)", type: "Facilities", cost: "$5k/mo", desc: "Membership for 50 hot-desks at WeWork downtown. Use for critical ops staff if HQ is inaccessible." },
        { title: "Paper-based Operations", type: "Process", cost: "Low", desc: "General fallback for non-critical admin tasks. Logs kept manually and entered when systems return." }
    ];

    const strategyIds = [];
    for (const s of strategiesData) {
        const [strat] = await db.insert(schema.bcStrategies).values({
            clientId: CLIENT_ID,
            title: s.title,
            description: s.desc,
            resourceRequirements: "Requires updated contact list and active VPN tokens.",
            estimatedCost: s.cost,
            benefits: "Ensures continuity of operations within defined RTOs.",
            approvalStatus: "approved"
        }).returning();
        strategyIds.push(strat.id);
    }

    // 5. SCENARIOS (10 items)
    console.log("-> 5. Defining Scenarios...");
    const scenariosData = [
        { title: "Ransomware Attack", likelihood: "High", impact: "Critical", desc: "Malicious encryption of production databases by external actor. Systems locked and ransom demanded." },
        { title: "Data Center Fire (Primary)", likelihood: "Low", impact: "Critical", desc: "Physical destruction of primary availability zone (us-east-1) due to fire or thermal event." },
        { title: "Extended Power Outage", likelihood: "Medium", impact: "High", desc: "Loss of grid power at HQ for > 48 hours. Backup generators fail or run out of fuel." },
        { title: "Key Vendor Bankruptcy (Cloud)", likelihood: "Low", impact: "Critical", desc: "Sudden cessation of services by critical SaaS provider (e.g., Auth0 or Stripe). No notice given." },
        { title: "Mass Resignation / Strike", likelihood: "Low", impact: "High", desc: "Walkout by >50% of Customer Support staff due to labor dispute. Capacity severely reduced." },
        { title: "Global Pandemic / Lockdown", likelihood: "Low", impact: "Medium", desc: "Government mandate restricting access to physical offices. 100% remote work required immediately." },
        { title: "Supply Chain Compromise", likelihood: "Medium", impact: "Critical", desc: "Malicious code injected into a core library dependency (e.g., Log4j style event)." },
        { title: "DDoS Attack", likelihood: "High", impact: "High", desc: "Volumetric attack exceeding 100Gbps targeting public API endpoints, rendering them inaccessible." },
        { title: "Insider Threat / Leak", likelihood: "Medium", impact: "High", desc: "Disgruntled employee leaks sensitive customer database to dark web. Reputational crisis." },
        { title: "Natural Disaster (Flood/Quake)", likelihood: "Low", impact: "High", desc: "Severe flooding affecting the basement/ground floor of HQ. Server room 1 compromised." },
    ];

    const scenarioIds = [];
    for (const s of scenariosData) {
        const [scen] = await db.insert(schema.disruptiveScenarios).values({
            clientId: CLIENT_ID,
            title: s.title,
            description: s.desc,
            likelihood: s.likelihood,
            potentialImpact: s.impact,
            mitigationStrategies: "Execute 'Crisis Communcation Protocol' immediately. Then assess need for 'Active-Active Geo-Replication' failover."
        }).returning();
        scenarioIds.push(scen.id);
    }

    // 6. MASTER PLAN
    console.log("-> 6. Building Master BCP...");
    const [plan] = await db.insert(schema.bcPlans).values({
        clientId: CLIENT_ID,
        title: "Master Business Continuity Plan 2026",
        version: "2.1",
        status: "approved",
        content: {
            metadata: { department: "Global Operations" },
            callList: [
                { id: 101, name: "John Doe", role: "Incident Commander (CEO)", email: "john.doe@intellfence.com" },
                { id: 102, name: "Alice Smith", role: "Ops Lead (COO)", email: "alice.smith@intellfence.com" },
                { id: 103, name: "Michael Chen", role: "Tech Lead (CTO)", email: "michael.chen@intellfence.com" },
                { id: 104, name: "Sarah Lee", role: "Comms Lead (CMO)", email: "sarah.lee@intellfence.com" },
                { id: 105, name: "Lisa White", role: "HR Representative", email: "lisa.white@intellfence.com" }
            ]
        },
        lastTestDate: new Date(),
        nextTestDate: new Date(new Date().setMonth(new Date().getMonth() + 6))
    }).returning();

    if (biaIds.length) await db.insert(schema.bcPlanBias).values(biaIds.map(id => ({ planId: plan.id, biaId: id })));
    if (strategyIds.length) await db.insert(schema.bcPlanStrategies).values(strategyIds.map(id => ({ planId: plan.id, strategyId: id })));
    if (scenarioIds.length) await db.insert(schema.bcPlanScenarios).values(scenarioIds.map(id => ({ planId: plan.id, scenarioId: id })));

    // Add Sections - ENRICHED CONTENT
    await db.insert(schema.bcPlanSections).values([
        {
            planId: plan.id,
            sectionKey: "intro",
            order: 1,
            content: `## 1. Introduction
This Business Continuity Plan (BCP) establishes the procedures and resources required for Intellfence to recover critical business functions in the event of a significant disruption. The primary objective is to minimize financial loss, ensure the safety of personnel, and protect the company's reputation.

This plan has been approved by the Steering Committee and is maintained by the Risk Management Office. It covers all scenarios ranging from minor system outages to catastrophic regional disasters.`
        },
        {
            planId: plan.id,
            sectionKey: "scope",
            order: 2,
            content: `## 2. Scope & Applicability
**Geographic Scope:** This plan applies to all Intellfence locations, including the New York Headquarters, London Sales Office, and Singapore Operations Center.

**Functional Scope:** The plan prioritizes the recovery of "Tier 1 (Critical)" processes as defined in the Business Impact Analysis (BIA), specifically:
*   Real-time Payment Settlement
*   Customer Support (Voice)
*   IT Infrastructure Management
*   SWIFT/Wire Transfers`
        },
        {
            planId: plan.id,
            sectionKey: "activation",
            order: 3,
            content: `## 3. Activation Procedures

### 3.1 Activation Criteria
The Crisis Management Team (CMT) leader may activate this plan if any of the following criteria are met:
1.  **System Outage:** Unplanned downtime of payment processing systems exceeding 2 hours with no ETA for resolution.
2.  **Facility Inaccessibility:** Loss of physical access to HQ for more than one business day (e.g., fire, flood, police cordon).
3.  **Personnel unavailability:** Unavailability of >40% of critical staff due to illness or other factors.
4.  **Cyber Event:** Confirmed ransomware infection spreading laterally across the network.

### 3.2 Escalation Procedures
**Level 1 (Incident):** Handled by local IT/Ops management. No BCP activation. (e.g., Server reboot, minor bug).
**Level 2 (Emergency):** Escalated to Dept Heads. BCP Standby. (e.g., 1-hour outage, localized power loss).
**Level 3 (Crisis):** Escalated to CMT. BCP ACTIVATED. (e.g., Ransomware, building fire).

**Notification Call Tree:**
1.  Incident Detected -> Helpdesk
2.  Helpdesk -> IT Manager (within 15 mins)
3.  IT Manager -> CTO (within 30 mins)
4.  CTO -> CEO (Immediate if Level 3)`
        },
        {
            planId: plan.id,
            sectionKey: "roles",
            order: 4,
            content: `## 4. Roles & Responsibilities

### Crisis Management Team (CMT)
The CMT is responsible for strategic decision-making during a crisis.

| Role | Primary Contact | Alternate Contact | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Incident Commander** | CEO (J. Doe) | COO (A. Smith) | Final authority on activation/stand-down. Approves emergency budget. |
| **Ops Lead** | COO (A. Smith) | VP Ops (B. Jones) | Coordinates department recovery efforts and resource allocation. |
| **Comms Lead** | CMO (S. Lee) | PR Director (K. West) | Manages internal and external communications (Press, Clients, Staff). |
| **Tech Lead** | CTO (M. Chen) | VP Eng (R. Davis) | Oversees IT recovery, DR activation, and cyber response. |
| **Human Resources** | CHRO (L. White) | HR Director (T. Black) | Employee safety tracking, next-of-kin notification. |`
        },
        {
            planId: plan.id,
            sectionKey: "appendices",
            order: 99,
            content: `## 6. Appendices

### Appendix A: Emergency Contact List
*External contacts only. Internal list is in the HR system.*
*   **Police/Fire/Amb:** 911 / 999
*   **Building Mgmt:** 555-0199
*   **Electric Utility:** 555-0100
*   **ISP Support (Level 3):** 555-0123 (Acct #88392)

### Appendix B: Vital Records
*   Insurance Policy #993822 (Cyber Liability) - Saved in SharePoint /Legal
*   Vendor Contracts Master List - Saved in SharePoint /Procurement`
        }
    ]);

    // Add Exercise Records
    await db.insert(schema.planExercises).values([
        { planId: plan.id, clientId: CLIENT_ID, title: "Annual Tabletop Exercise 2025", type: "Tabletop", notes: "Successful test of communication flows and role clarity.", status: "Completed", startDate: new Date("2025-11-15") },
        { planId: plan.id, clientId: CLIENT_ID, title: "Ransomware Simulation", type: "Simulation", notes: "Identified gaps in database restoration time. RTO updated.", status: "Completed", startDate: new Date("2025-06-20") },
        { planId: plan.id, clientId: CLIENT_ID, title: "Q1 2026 Call Tree Test", type: "Drill", status: "Scheduled", startDate: new Date("2026-03-01") },
    ]);

    console.log("-> DONE! Data generation complete.");
    console.log(`Plan ID: ${plan.id} created with full, enriched dataset.`);
}

main().catch(console.error).finally(() => process.exit());
