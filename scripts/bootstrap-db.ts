/**
 * Bootstraps a fresh database for ComplianceOS:
 *   1. Applies the full schema DDL from scripts/schema-init.sql
 *      (generated with `drizzle-kit generate:pg`; idempotent — statements that
 *      fail with "already exists" style errors are skipped so this is safe to
 *      re-run on every boot).
 *   2. Seeds the LaTorre LTD demo source dataset (clientId = 7).
 *
 * provisionLaTorreDemo() (packages/core/src/lib/demo-provisioning.ts) copies the
 * dataset from clientId = 7 into every newly created client workspace.
 *
 * Why not `drizzle-kit push`? The drizzle-kit version pinned in this repo
 * hangs on an interactive prompt in non-TTY environments (CI/Docker), which
 * killed the container before the server could start.
 *
 * Run before the server starts (see Dockerfile CMD).
 */
import "../env-loader";
import { readFileSync } from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, ne } from "drizzle-orm";
import {
    clients,
    controls,
    clientFrameworks,
    clientControls,
    vendors,
    vendorAssessments,
    evidence,
    incidents,
    riskTreatments,
    complianceCertificates,
    complianceFrameworks,
    userClients,
    users,
    clientPolicies,
    riskScenarios,
    assets,
    processingActivities,
    dsarRequests,
    businessProcesses,
    reportLogs,
} from "../packages/core/src/schema";

const LATORRE_CLIENT_ID = 7;

const IGNORED_ERROR_CODES = new Set([
    "42P07", // duplicate_table
    "42710", // duplicate_object
    "42701", // duplicate_column
    "42P06", // duplicate_schema
    "42712", // duplicate_alias
]);

async function applySchema(sql: postgres.Sql) {
    // pgvector-backed columns (embeddings table) need the extension enabled per database.
    // The pgvector images ship it but do not enable it automatically. Non-fatal if missing.
    try {
        await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
        console.log("[BootstrapDB] pgvector extension ensured.");
    } catch (err: any) {
        console.warn("[BootstrapDB] Could not create pgvector extension (vector columns will be skipped):", (err?.message || err).toString().slice(0, 160));
    }

    const schemaPath = path.join(process.cwd(), "scripts", "schema-init.sql");
    let raw = readFileSync(schemaPath, "utf-8");
    // Old drizzle-kit renders pgvector typmods as quoted identifiers ("vector(1536)"),
    // which Postgres can never resolve as a type. Unquote them.
    raw = raw.replace(/"vector\((\d+)\)"/g, "vector($1)").replace(/"vector"/g, "vector");
    const statements = raw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    let applied = 0;
    let skipped = 0;
    for (const stmt of statements) {
        try {
            await sql.unsafe(stmt);
            applied++;
        } catch (err: any) {
            const msg = (err?.message || err).toString();
            if (IGNORED_ERROR_CODES.has(err?.code) || /already exists/i.test(msg)) {
                skipped++;
                continue;
            }
            // Missing pgvector: skip vector-dependent statements instead of aborting the boot
            if (/type "vector/i.test(msg) && stmt.includes("vector")) {
                console.warn("[BootstrapDB] Skipping vector-dependent statement (pgvector unavailable).");
                skipped++;
                continue;
            }
            console.error("[BootstrapDB] Statement failed:", msg.slice(0, 300));
            console.error("[BootstrapDB] Offending statement:", stmt.slice(0, 200));
            throw err;
        }
    }
    console.log(`[BootstrapDB] Schema applied (${applied} statements, ${skipped} already-exists skipped).`);
}


/**
 * DEMO SHARED WORKSPACE mode (DEMO_SHARED_WORKSPACE=true): the demo exposes a
 * single shared workspace (LaTorre LTD, clientId 7) that every signup joins.
 * On boot, remove everything else: any other client + its data, and any user
 * account other than the configured admin — keeping the demo pristine and
 * clearing visitor test workspaces.
 */
async function demoReset(sql: postgres.Sql, db: ReturnType<typeof drizzle>) {
    if (process.env.DEMO_SHARED_WORKSPACE !== "true") return;
    console.log("[BootstrapDB] DEMO_SHARED_WORKSPACE=true — resetting to a single shared workspace...");

    const adminEmail = (process.env.COMPLIANCE_ADMIN_EMAIL || "admin@complianceos.local").toLowerCase();

    // 1. user_memberships for non-LaTorre clients, and for non-admin users
    await sql.unsafe(`DELETE FROM user_clients WHERE client_id <> ${LATORRE_CLIENT_ID}`);
    await sql.unsafe(`DELETE FROM user_clients WHERE user_id IN (SELECT id FROM users WHERE lower(email) <> '${adminEmail}')`);

    // 2. per-client data for every client except LaTorre
    const dataTables = [
        "vendor_assessments", "evidence", "client_controls", "client_frameworks",
        "incidents", "risk_treatments", "compliance_certificates", "vendors",
        "client_policies", "assets", "risk_scenarios", "risk_assessments",
        "processing_activities", "dsar_requests", "business_processes", "report_logs"
    ];
    for (const t of dataTables) {
        try {
            await sql.unsafe(`DELETE FROM ${t} WHERE client_id <> ${LATORRE_CLIENT_ID}`);
        } catch (err: any) {
            // table may not exist in this schema build; non-fatal
            if (!/does not exist/i.test(err?.message || "")) throw err;
        }
    }

    // 3. non-LaTorre clients
    await sql.unsafe(`DELETE FROM clients WHERE id <> ${LATORRE_CLIENT_ID}`);

    // 4. non-admin users (auth store re-creates rows on next login)
    await sql.unsafe(`DELETE FROM users WHERE lower(email) <> '${adminEmail}'`);

    const remaining = await db.select({ id: clients.id, name: clients.name }).from(clients);
    console.log(`[BootstrapDB] Demo reset complete. Remaining clients:`, remaining.map((c) => `${c.id}:${c.name}`).join(", ") || "(none)");
}

async function main() {
    const connectionString = process.env.DATABASE_URL || "";
    if (!connectionString) {
        console.error("[BootstrapDB] DATABASE_URL is not set — cannot bootstrap.");
        process.exit(1);
    }

    const sql = postgres(connectionString, { max: 1, ssl: false });
    const db = drizzle(sql);

    await applySchema(sql);
    await demoReset(sql, db);

    const existing = await db.select().from(clients).where(eq(clients.id, LATORRE_CLIENT_ID));
    if (existing.length > 0) {
        // Completeness check: check if policies and certs are present
        const seededCerts = await db.select({ id: complianceCertificates.id }).from(complianceCertificates).where(eq(complianceCertificates.clientId, LATORRE_CLIENT_ID));
        const seededPolicies = await db.select({ id: clientPolicies.id }).from(clientPolicies).where(eq(clientPolicies.clientId, LATORRE_CLIENT_ID));
        const seededRisks = await db.select({ id: riskScenarios.id }).from(riskScenarios).where(eq(riskScenarios.clientId, LATORRE_CLIENT_ID));
        if (seededCerts.length > 0 && seededPolicies.length >= 10 && seededRisks.length >= 8) {
            console.log("[BootstrapDB] LaTorre source client already fully enriched — skipping seed.");
            await sql.end();
            process.exit(0);
        }
        console.log("[BootstrapDB] Resetting and re-enriching LaTorre LTD demo source dataset (clientId 7)...");
        // Purge children explicitly, deepest first
        await db.delete(reportLogs).where(eq(reportLogs.clientId, LATORRE_CLIENT_ID));
        await db.delete(dsarRequests).where(eq(dsarRequests.clientId, LATORRE_CLIENT_ID));
        await db.delete(processingActivities).where(eq(processingActivities.clientId, LATORRE_CLIENT_ID));
        await db.delete(businessProcesses).where(eq(businessProcesses.clientId, LATORRE_CLIENT_ID));
        await db.delete(riskScenarios).where(eq(riskScenarios.clientId, LATORRE_CLIENT_ID));
        await db.delete(assets).where(eq(assets.clientId, LATORRE_CLIENT_ID));
        await db.delete(clientPolicies).where(eq(clientPolicies.clientId, LATORRE_CLIENT_ID));
        await db.delete(vendorAssessments).where(eq(vendorAssessments.clientId, LATORRE_CLIENT_ID));
        await db.delete(evidence).where(eq(evidence.clientId, LATORRE_CLIENT_ID));
        await db.delete(clientControls).where(eq(clientControls.clientId, LATORRE_CLIENT_ID));
        await db.delete(clientFrameworks).where(eq(clientFrameworks.clientId, LATORRE_CLIENT_ID));
        await db.delete(incidents).where(eq(incidents.clientId, LATORRE_CLIENT_ID));
        await db.delete(riskTreatments).where(eq(riskTreatments.clientId, LATORRE_CLIENT_ID));
        await db.delete(complianceCertificates).where(eq(complianceCertificates.clientId, LATORRE_CLIENT_ID));
        await db.delete(vendors).where(eq(vendors.clientId, LATORRE_CLIENT_ID));
        await db.delete(clients).where(eq(clients.id, LATORRE_CLIENT_ID));
    }

    console.log("[BootstrapDB] Seeding enriched LaTorre LTD demo source dataset (clientId 7)...");

    // 1. Source client, pinned to id 7 so provisionLaTorreDemo can find it
    await db.insert(clients).values({
        id: LATORRE_CLIENT_ID,
        name: "LaTorre LTD",
        description: "Enterprise Cloud & Managed Services Provider — Global Showcase Demo Workspace",
        industry: "Technology",
        size: "50-200",
        status: "active",
        primaryContactName: "Marco LaTorre",
        primaryContactEmail: "marco@latorre.local",
        cisoName: "Marco LaTorre",
        dpoName: "Elena Rostova",
        headquarters: "London, UK",
        planTier: "enterprise",
        targetComplianceScore: 95,
        activeModules: ["soc2", "iso27001", "gdpr", "tprm", "bcp", "risk", "policies", "incident", "board_summary", "dsar"],
    });

    // 2. Controls library (needed so clientControls can reference real control ids)
    const libraryCount = await db.select({ id: controls.id }).from(controls).limit(1);
    let libraryIds: number[] = [];
    if (libraryCount.length === 0) {
        const isoControls = [
            "A.5.1 Policies for information security",
            "A.5.9 Inventory of information and assets",
            "A.5.10 Acceptable use of information assets",
            "A.5.11 Return of assets",
            "A.5.12 Classification of information",
            "A.5.13 Labelling of information",
            "A.5.14 Information transfer",
            "A.5.15 Access control",
            "A.5.16 Identity management",
            "A.5.17 Authentication information",
            "A.5.18 Access rights",
            "A.6.1 Screening",
            "A.6.3 Information security awareness",
            "A.6.5 Responsibilities after termination",
            "A.6.7 Remote working",
            "A.7.1 Physical security perimeters",
            "A.7.2 Physical entry",
            "A.7.6 Working in secure areas",
            "A.7.8 Equipment siting and protection",
            "A.7.9 Security of assets off-premises",
            "A.7.10 Storage media",
            "A.7.13 Equipment maintenance",
            "A.8.1 User endpoint devices",
            "A.8.2 Privileged access rights",
            "A.8.3 Information access restriction",
            "A.8.5 Secure authentication",
            "A.8.7 Protection against malware",
            "A.8.8 Management of technical vulnerabilities",
            "A.8.9 Configuration management",
            "A.8.12 Data leakage prevention",
            "A.8.13 Information backup",
            "A.8.15 Logging",
            "A.8.16 Monitoring activities",
            "A.8.24 Use of cryptography",
            "A.8.25 Secure development life cycle",
            "A.8.26 Application security requirements",
            "A.8.28 Secure coding",
            "A.8.29 Security testing in development",
            "A.8.32 Change management",
            "A.8.16 Capacity management",
        ];
        const socControls = [
            "CC1.1 COSO Principle 1 — Control Environment",
            "CC1.2 Board oversight responsibilities",
            "CC1.3 Organizational structure",
            "CC1.4 Competence of personnel",
            "CC1.5 Accountability",
            "CC2.1 Quality of information",
            "CC2.2 Internal communication",
            "CC2.3 External communication",
            "CC3.1 Specifies objectives",
            "CC3.2 Identifies risks",
            "CC3.3 Assesses fraud risk",
            "CC3.4 Identifies significant changes",
            "CC4.1 Ongoing evaluations",
            "CC4.2 Evaluates deficiencies",
            "CC5.1 Remediates deficiencies",
            "CC6.1 Logical access security",
            "CC6.2 User registration",
            "CC6.3 Role-based access removal",
            "CC6.6 External access protection",
            "CC6.7 Transmission of data",
            "CC6.8 Unauthorized software prevention",
            "CC7.1 Vulnerability detection configuration",
            "CC7.2 Anomaly monitoring",
            "CC7.4 Incident response",
        ];
        const rows = [
            ...isoControls.map((name) => ({
                controlId: `ISO-${name.split(" ")[0]}-${Math.abs(hash(name)) % 10000}`,
                name,
                description: name,
                framework: "ISO 27001",
                owner: "CISO",
                frequency: "Annual",
                evidenceType: "Document",
                status: "active",
                category: "Governance",
            })),
            ...socControls.map((name) => ({
                controlId: `SOC2-${Math.abs(hash(name)) % 10000}`,
                name,
                description: name,
                framework: "SOC 2",
                owner: "Compliance Lead",
                frequency: "Annual",
                evidenceType: "Configuration",
                status: "active",
                category: "Security",
            })),
        ];
        const inserted = await db.insert(controls).values(rows).returning({ id: controls.id });
        libraryIds = inserted.map((r) => r.id);
        console.log(`[BootstrapDB] Seeded controls library with ${libraryIds.length} controls.`);
    } else {
        const all = await db.select({ id: controls.id }).from(controls);
        libraryIds = all.map((r) => r.id);
        console.log(`[BootstrapDB] Controls library already present (${libraryIds.length} controls).`);
    }

    // 3. Frameworks for LaTorre
    await db.insert(clientFrameworks).values([
        { clientId: LATORRE_CLIENT_ID, name: "ISO 27001:2022", status: "active" },
        { clientId: LATORRE_CLIENT_ID, name: "SOC 2 Type II", status: "audit_ready" },
        { clientId: LATORRE_CLIENT_ID, name: "GDPR", status: "active" },
        { clientId: LATORRE_CLIENT_ID, name: "EU NIS2", status: "in_progress" },
    ]);

    // 4. Client controls — reference the controls library, realistic distribution
    const statuses = ["implemented", "implemented", "implemented", "implemented", "in_progress", "not_implemented"];
    const ccRows = libraryIds.map((controlId, idx) => ({
        clientId: LATORRE_CLIENT_ID,
        controlId,
        status: statuses[idx % statuses.length],
        owner: idx % 2 === 0 ? "Marco LaTorre (CISO)" : "Compliance Lead",
    }));
    const insertedCC = await db.insert(clientControls).values(ccRows).returning({ id: clientControls.id });
    console.log(`[BootstrapDB] Inserted ${insertedCC.length} client controls.`);

    // 5. Enterprise Policies (12 Approved, complete policies)
    const policyData = [
        { code: "POL-001", name: "Information Security Management Policy", module: "governance" },
        { code: "POL-002", name: "Access Control & Authentication Policy", module: "access_control" },
        { code: "POL-003", name: "Data Protection & Privacy Policy (GDPR)", module: "privacy" },
        { code: "POL-004", name: "Incident Response & Breach Notification Policy", module: "incident_response" },
        { code: "POL-005", name: "Business Continuity & Disaster Recovery Policy", module: "bcp" },
        { code: "POL-006", name: "Vendor & Third-Party Risk Management Policy", module: "tprm" },
        { code: "POL-007", name: "Cryptography & Key Management Policy", module: "security" },
        { code: "POL-008", name: "Secure Software Development Lifecycle (SDLC) Policy", module: "engineering" },
        { code: "POL-009", name: "Asset Management & Acceptable Use Policy", module: "asset_management" },
        { code: "POL-010", name: "Vulnerability Management & Patching Policy", module: "security" },
        { code: "POL-011", name: "Change Management & Release Control Policy", module: "engineering" },
        { code: "POL-012", name: "Employee Security Training & Awareness Policy", module: "hr_security" },
    ];

    await db.insert(clientPolicies).values(
        policyData.map((p, idx) => ({
            clientId: LATORRE_CLIENT_ID,
            clientPolicyId: p.code,
            name: p.name,
            module: p.module,
            status: "approved",
            approvalStatus: "approved",
            version: 2,
            owner: "Marco LaTorre (CISO)",
            isAiGenerated: false,
            content: `# ${p.name}\n\n**Document Reference:** ${p.code}  \n**Version:** 2.0  \n**Effective Date:** 2026-01-15  \n**Classification:** Internal / Confidential  \n**Owner:** Marco LaTorre (CISO)\n\n---\n\n## 1. Executive Summary & Purpose\nThis policy establishes mandatory operational and technical requirements for LaTorre LTD to safeguard confidential assets, customer environments, and ensure strict alignment with ISO 27001:2022, SOC 2 Type II, and GDPR standards.\n\n## 2. Scope & Applicability\nApplies to all full-time employees, contractors, third-party service providers, and technological assets operated by or on behalf of LaTorre LTD globally.\n\n## 3. Core Policy Statements\n1. **Least Privilege & Zero Trust:** Access to sensitive production systems and client telemetry is granted strictly on a need-to-know basis and requires hardware-backed multi-factor authentication (FIDO2 / WebAuthn).\n2. **Cryptographic Standards:** All data in transit must enforce TLS 1.3. All data at rest must use AES-256 with automated KMS key rotation.\n3. **Continuous Monitoring:** Audit logs, network telemetry, and authentication events are retained for 365 days in tamper-evident SIEM storage.\n4. **Audit Readiness:** Control owners must produce verifiable evidence artifacts at least quarterly.\n\n## 4. Roles & Responsibilities\n- **CISO / Information Security Officer:** Policy ownership, annual review, and exception approval.\n- **Engineering & Operations Leads:** Technical control implementation and automated CI/CD guardrails.\n- **All Staff:** Strict adherence to acceptable use and mandatory security training completion.\n\n## 5. Compliance & Enforcement\nFailure to comply with this policy may result in revocation of access credentials and formal disciplinary action. Reviewed and approved annually by the Executive Committee.`,
            createdAt: new Date("2026-01-15"),
            updatedAt: new Date("2026-06-20"),
            nextReviewDate: new Date("2027-01-15"),
        }))
    );
    console.log(`[BootstrapDB] Inserted ${policyData.length} enterprise policies.`);

    // 6. Assets (Critical Infrastructure, Apps, Databases)
    const assetRows = [
        {
            clientId: LATORRE_CLIENT_ID,
            name: "AWS EKS Production Cluster",
            type: "Infrastructure",
            category: "Cloud Infrastructure",
            criticality: "critical",
            owner: "DevOps Lead",
            vendor: "Amazon Web Services",
            location: "eu-west-1 (Ireland)",
            status: "active",
            valuationC: 5,
            valuationI: 5,
            valuationA: 5,
            description: "Primary production Kubernetes cluster running microservices and API gateways.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "AWS RDS Aurora Postgres Cluster",
            type: "Database",
            category: "Data Store",
            criticality: "critical",
            owner: "Data Engineering Lead",
            vendor: "Amazon Web Services",
            location: "eu-west-1 (Ireland)",
            status: "active",
            isPersonalData: true,
            dataSensitivity: "Confidential",
            valuationC: 5,
            valuationI: 5,
            valuationA: 5,
            description: "Encrypted multi-AZ database cluster housing core tenancy datasets.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "Okta Identity Cloud (SSO & MFA)",
            type: "SaaS",
            category: "Identity & Access",
            criticality: "high",
            owner: "IT Security",
            vendor: "Okta, Inc.",
            location: "Cloud",
            status: "active",
            valuationC: 5,
            valuationI: 4,
            valuationA: 4,
            description: "Enterprise IAM provider enforcing Adaptive MFA and SAML/OIDC federated auth.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "GitHub Enterprise Workspace",
            type: "SaaS",
            category: "Source Code & CI/CD",
            criticality: "high",
            owner: "Head of Engineering",
            vendor: "GitHub / Microsoft",
            location: "Cloud",
            status: "active",
            valuationC: 4,
            valuationI: 5,
            valuationA: 4,
            description: "Source code repositories, automated SAST security scanners, and deployment pipelines.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "LaTorre Customer Portal Web App",
            type: "Application",
            category: "Core Product",
            criticality: "critical",
            owner: "Product Lead",
            vendor: "LaTorre Internal",
            location: "AWS EKS",
            status: "active",
            isPersonalData: true,
            dataSensitivity: "Confidential",
            valuationC: 5,
            valuationI: 5,
            valuationA: 5,
            description: "Customer-facing compliance analytics platform and administrative console.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "Corporate Endpoints Fleet (macOS/Win11)",
            type: "Hardware",
            category: "End-User Devices",
            criticality: "medium",
            owner: "IT Helpdesk",
            vendor: "Apple / Lenovo",
            location: "Distributed / Hybrid",
            status: "active",
            valuationC: 3,
            valuationI: 3,
            valuationA: 3,
            description: "MDM-enrolled corporate laptops with FileVault/BitLocker encryption and CrowdStrike EDR.",
        },
    ];
    await db.insert(assets).values(assetRows);
    console.log(`[BootstrapDB] Inserted ${assetRows.length} corporate assets.`);

    // 7. Quantified Risk Scenarios (Enterprise Risk Register & Heatmap)
    const riskData = [
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Ransomware / destructive malware propagation across corporate endpoint fleet",
            category: "Technical",
            assessmentType: "Enterprise",
            likelihood: 4,
            impact: 5,
            inherentScore: 20,
            inherentRisk: "High",
            residualLikelihood: 2,
            residualImpact: 3,
            residualScore: 6,
            residualRisk: "Low",
            inherentRiskScore: 20,
            status: "mitigated",
            owner: "Marco LaTorre (CISO)",
            customMitigationPlan: "CrowdStrike Falcon EDR deployed with automated host containment, daily immutable cloud backups, and network segmentation.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Third-Party SaaS vendor breach compromising API credentials",
            category: "Third Party",
            assessmentType: "Enterprise",
            likelihood: 4,
            impact: 4,
            inherentScore: 16,
            inherentRisk: "High",
            residualLikelihood: 2,
            residualImpact: 4,
            residualScore: 8,
            residualRisk: "Medium",
            inherentRiskScore: 16,
            status: "in_progress",
            owner: "Security Operations Lead",
            customMitigationPlan: "Mandatory annual SOC 2 Type II review, vendor continuous risk scoring, and zero-trust API credential rotation.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Unauthenticated API data exfiltration via broken object-level authorization (BOLA)",
            category: "Application",
            assessmentType: "Enterprise",
            likelihood: 5,
            impact: 5,
            inherentScore: 25,
            inherentRisk: "Critical",
            residualLikelihood: 1,
            residualImpact: 5,
            residualScore: 5,
            residualRisk: "Low",
            inherentRiskScore: 25,
            status: "mitigated",
            owner: "Head of Engineering",
            customMitigationPlan: "Automated DAST/SAST in CI pipeline, API gateway rate-limiting, and RBAC authorization unit test suite.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Phishing & credential harvesting campaign targeting executive & finance admins",
            category: "People",
            assessmentType: "Enterprise",
            likelihood: 4,
            impact: 4,
            inherentScore: 16,
            inherentRisk: "High",
            residualLikelihood: 2,
            residualImpact: 3,
            residualScore: 6,
            residualRisk: "Low",
            inherentRiskScore: 16,
            status: "mitigated",
            owner: "IT Security",
            customMitigationPlan: "Hardware FIDO2 WebAuthn keys enforced for all accounts; quarterly simulated phishing and awareness training.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Cloud availability zone / regional power outage disrupting customer SLAs",
            category: "Operational",
            assessmentType: "Enterprise",
            likelihood: 3,
            impact: 4,
            inherentScore: 12,
            inherentRisk: "Medium",
            residualLikelihood: 1,
            residualImpact: 4,
            residualScore: 4,
            residualRisk: "Low",
            inherentRiskScore: 12,
            status: "mitigated",
            owner: "DevOps Lead",
            customMitigationPlan: "Multi-AZ active-passive deployment on AWS with automated cross-region database replication and Route53 DNS failover.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Unauthorized database access via leaked dev credentials or stale IAM keys",
            category: "Access Control",
            assessmentType: "Enterprise",
            likelihood: 4,
            impact: 5,
            inherentScore: 20,
            inherentRisk: "High",
            residualLikelihood: 1,
            residualImpact: 4,
            residualScore: 4,
            residualRisk: "Low",
            inherentRiskScore: 20,
            status: "mitigated",
            owner: "DevOps Lead",
            customMitigationPlan: "HashiCorp Vault dynamic short-lived credentials, IAM role assumption without static API keys, and VPC private subnets.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "GDPR regulatory fine from unverified cross-border data transfers",
            category: "Compliance/Legal",
            assessmentType: "Enterprise",
            likelihood: 3,
            impact: 5,
            inherentScore: 15,
            inherentRisk: "High",
            residualLikelihood: 1,
            residualImpact: 5,
            residualScore: 5,
            residualRisk: "Low",
            inherentRiskScore: 15,
            status: "mitigated",
            owner: "Elena Rostova (DPO)",
            customMitigationPlan: "Standard Contractual Clauses (SCCs) and Transfer Impact Assessments (TIAs) executed for all non-EEA sub-processors.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            title: "Sensitive data leakage via unmanaged USB storage or personal cloud sync",
            category: "Data Loss",
            assessmentType: "Enterprise",
            likelihood: 3,
            impact: 4,
            inherentScore: 12,
            inherentRisk: "Medium",
            residualLikelihood: 1,
            residualImpact: 4,
            residualScore: 4,
            residualRisk: "Low",
            inherentRiskScore: 12,
            status: "mitigated",
            owner: "IT Helpdesk",
            customMitigationPlan: "MDM DLP policy disabling removable media storage write permissions and blocking unapproved cloud storage URLs.",
        },
    ];
    await db.insert(riskScenarios).values(riskData);
    console.log(`[BootstrapDB] Inserted ${riskData.length} quantified risk scenarios.`);

    // 8. Processing Activities (RoPA - GDPR Article 30)
    const ropaData = [
        {
            clientId: LATORRE_CLIENT_ID,
            activityId: "ROPA-001",
            activityName: "Customer Portal Account Management & SaaS Delivery",
            description: "Processing of customer user accounts, contact details, authentication credentials, and tenant configuration for SaaS application access.",
            role: "controller",
            controllerName: "LaTorre LTD",
            controllerContact: "privacy@latorre.local",
            dpoName: "Elena Rostova",
            dpoContact: "dpo@latorre.local",
            purposes: ["Service Delivery", "User Authentication", "Technical Support"],
            legalBasis: "Contract Performance (Art. 6(1)(b) GDPR)",
            dataCategories: ["Name", "Email Address", "IP Address", "Job Title", "Organization"],
            dataSubjectCategories: ["Customer Employees", "Account Administrators"],
            recipients: ["AWS (Cloud Hosting)", "Okta (Authentication)", "Datadog (Monitoring)"],
            hasInternationalTransfers: false,
            retentionPeriod: "Duration of active subscription + 2 years",
            status: "active",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            activityId: "ROPA-002",
            activityName: "Employee HR Administration & Payroll Processing",
            description: "Management of employment contracts, payroll, tax records, pension contributions, and employee performance records.",
            role: "controller",
            controllerName: "LaTorre LTD",
            controllerContact: "hr@latorre.local",
            dpoName: "Elena Rostova",
            purposes: ["Employment Contract Execution", "Statutory Tax & Legal Obligations", "Payroll"],
            legalBasis: "Legal Obligation (Art. 6(1)(c) GDPR)",
            dataCategories: ["Identity Data", "Financial/Bank Details", "National Insurance/Tax ID", "Contact Information"],
            dataSubjectCategories: ["Employees", "Contractors"],
            recipients: ["QuickBooks / Intuit", "Pension Providers", "HMRC"],
            hasInternationalTransfers: false,
            retentionPeriod: "7 years following termination of employment (statutory tax requirement)",
            status: "active",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            activityId: "ROPA-003",
            activityName: "Security Telemetry, Threat Detection & Audit Logging",
            description: "Collection and analysis of system access logs, firewall telemetry, and DNS queries to detect cyber threats and protect infrastructure.",
            role: "controller",
            controllerName: "LaTorre LTD",
            purposes: ["Network and Information Security", "Cyber Threat Detection", "Incident Investigation"],
            legalBasis: "Legitimate Interest (Art. 6(1)(f) GDPR / Recital 49)",
            dataCategories: ["IP Addresses", "User Activity Timestamps", "Device Identifiers", "Access Logs"],
            dataSubjectCategories: ["Portal Users", "Corporate Network Users"],
            recipients: ["CrowdStrike (EDR/SIEM)", "Cloudflare (WAF/CDN)", "AWS CloudWatch"],
            hasInternationalTransfers: false,
            retentionPeriod: "365 days rolling retention",
            status: "active",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            activityId: "ROPA-004",
            activityName: "Sales, Marketing & Prospective Client Communications",
            description: "Managing newsletter subscriptions, product demo requests, webinar attendees, and sales pipeline engagements.",
            role: "controller",
            controllerName: "LaTorre LTD",
            purposes: ["Direct Marketing", "Webinar Management", "Lead Qualification"],
            legalBasis: "Consent (Art. 6(1)(a) GDPR) & Legitimate Interest",
            dataCategories: ["Name", "Work Email", "Company Name", "Job Title"],
            dataSubjectCategories: ["Prospects", "Website Visitors"],
            recipients: ["HubSpot", "Salesforce"],
            hasInternationalTransfers: true,
            transferCountries: ["United States"],
            transferSafeguards: "EU-US Data Privacy Framework & Standard Contractual Clauses (SCCs)",
            retentionPeriod: "Until consent withdrawal or 24 months of inactivity",
            status: "active",
        },
    ];
    await db.insert(processingActivities).values(ropaData);
    console.log(`[BootstrapDB] Inserted ${ropaData.length} RoPA processing activities.`);

    // 9. DSARs (Data Subject Access Requests)
    const dsarData = [
        {
            clientId: LATORRE_CLIENT_ID,
            requestId: "DSAR-2026-001",
            requestType: "access",
            status: "completed",
            priority: "medium",
            subjectName: "Johnathan Doe",
            subjectEmail: "j.doe@examplecorp.com",
            verificationStatus: "verified",
            verificationMethod: "Email OTP & ID verification",
            submissionMethod: "web_form",
            requestDate: new Date("2026-06-10"),
            dueDate: new Date("2026-07-10"),
            completedDate: new Date("2026-06-25"),
            resolutionNotes: "Full archive of user profile data and activity logs securely exported and delivered via encrypted link.",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            requestId: "DSAR-2026-002",
            requestType: "erasure",
            status: "in_progress",
            priority: "high",
            subjectName: "Sarah Jenkins",
            subjectEmail: "sarah.j@marketingpartner.org",
            verificationStatus: "verified",
            verificationMethod: "Email OTP & Identity confirmation",
            submissionMethod: "email",
            requestDate: new Date("2026-08-15"),
            dueDate: new Date("2026-09-15"),
            resolutionNotes: "Marketing contact data purged from HubSpot; awaiting deletion confirmation from auxiliary CRM logs.",
        },
    ];
    await db.insert(dsarRequests).values(dsarData);
    console.log(`[BootstrapDB] Inserted ${dsarData.length} DSAR records.`);

    // 10. Business Impact Analysis (BIA & Critical Processes)
    const processData = [
        {
            clientId: LATORRE_CLIENT_ID,
            name: "Core SaaS Customer Portal & API Gateway",
            description: "High-availability customer portal and microservice API delivering compliance analytics and automated control evidence collection.",
            department: "Engineering & Product",
            criticalityTier: "Tier 1 - Mission Critical",
            rto: "2 hours",
            rpo: "15 minutes",
            mtpd: "8 hours",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "24/7 Security Operations & CSIRT Incident Response",
            description: "Continuous security monitoring, threat triage, EDR telemetry alerting, and rapid incident response orchestration.",
            department: "Cybersecurity Operations",
            criticalityTier: "Tier 1 - Mission Critical",
            rto: "1 hour",
            rpo: "1 hour",
            mtpd: "4 hours",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "Customer Billing, Invoicing & Subscription Management",
            description: "Monthly recurring billing, Stripe payment processing, and accounting reconciliation.",
            department: "Finance & Operations",
            criticalityTier: "Tier 2 - Business Critical",
            rto: "24 hours",
            rpo: "24 hours",
            mtpd: "72 hours",
        },
        {
            clientId: LATORRE_CLIENT_ID,
            name: "Employee Onboarding, Offboarding & HR Administration",
            description: "Workplace account provisioning, background check verifications, and employee benefits administration.",
            department: "Human Resources",
            criticalityTier: "Tier 3 - Standard Support",
            rto: "48 hours",
            rpo: "48 hours",
            mtpd: "120 hours",
        },
    ];
    await db.insert(businessProcesses).values(processData);
    console.log(`[BootstrapDB] Inserted ${processData.length} BIA business processes.`);

    // 11. Pre-generated Board Reports & Executive Summaries
    const reportData = [
        {
            clientId: LATORRE_CLIENT_ID,
            reportType: "executive_summary" as const,
            format: "pdf",
            timestamp: new Date("2026-08-15T10:00:00Z"),
            metadata: {
                title: "Q3 2026 Board of Directors Cybersecurity & Compliance Summary",
                complianceScore: 92,
                totalControls: 518,
                implementedControls: 440,
                riskCount: 8,
                status: "Ready for Board Review",
                auditor: "PwC UK",
            },
        },
        {
            clientId: LATORRE_CLIENT_ID,
            reportType: "soa" as const,
            format: "pdf",
            timestamp: new Date("2026-07-01T14:30:00Z"),
            metadata: {
                title: "ISO 27001:2022 Statement of Applicability (SoA) v2.4",
                includedControls: 93,
                excludedControls: 0,
                approvalDate: "2026-07-01",
                cisoApproval: "Marco LaTorre",
            },
        },
        {
            clientId: LATORRE_CLIENT_ID,
            reportType: "compliance_readiness" as const,
            format: "pdf",
            timestamp: new Date("2026-08-20T09:15:00Z"),
            metadata: {
                title: "SOC 2 Type II Pre-Audit Readiness Assessment",
                readinessScore: 96,
                trustServicesCriteria: ["Security", "Availability", "Confidentiality"],
            },
        },
    ];
    await db.insert(reportLogs).values(reportData);
    console.log(`[BootstrapDB] Inserted ${reportData.length} report log summaries.`);

    // 12. Vendors + assessments
    const vendorSeed = [
        ["Amazon Web Services", "Cloud Hosting", "High"],
        ["Microsoft 365", "Productivity", "High"],
        ["Google Workspace", "Productivity", "Medium"],
        ["Okta", "Identity", "High"],
        ["CrowdStrike", "Endpoint Security", "High"],
        ["GitHub", "DevOps", "Medium"],
        ["Cloudflare", "Network / CDN", "Medium"],
        ["Datadog", "Monitoring", "Low"],
        ["Salesforce", "CRM", "Medium"],
        ["HubSpot", "Marketing", "Low"],
        ["Intuit QuickBooks", "Finance", "Low"],
        ["Twilio", "Communications", "Medium"],
    ];
    const insertedVendors = await db
        .insert(vendors)
        .values(
            vendorSeed.map(([name, category, criticality]) => ({
                clientId: LATORRE_CLIENT_ID,
                name,
                category,
                criticality,
                status: "active",
            }))
        )
        .returning({ id: vendors.id });
    await db.insert(vendorAssessments).values(
        insertedVendors.map((v, idx) => ({
            clientId: LATORRE_CLIENT_ID,
            vendorId: v.id,
            type: "SOC 2 Report Review",
            status: idx % 3 === 0 ? "completed" : "in_progress",
            score: 70 + ((idx * 7) % 30),
        }))
    );
    console.log(`[BootstrapDB] Inserted ${insertedVendors.length} vendors with assessments.`);

    // 13. Evidence — items against client controls
    const evRows = insertedCC.slice(0, 30).map((cc, idx) => ({
        clientId: LATORRE_CLIENT_ID,
        clientControlId: cc.id,
        evidenceId: `LTR-E-${String(idx + 1).padStart(3, "0")}`,
        description: `Evidence package for control requirement #${idx + 1} (screenshot, config export, or policy document)`,
        framework: idx % 2 === 0 ? "ISO 27001" : "SOC 2",
        type: "Document",
        status: idx % 3 === 0 ? "verified" : "collected",
        owner: "Marco LaTorre (CISO)",
    }));
    await db.insert(evidence).values(evRows);
    console.log(`[BootstrapDB] Inserted ${evRows.length} evidence items.`);

    // 14. Incidents (CSIRT post-mortems)
    await db.insert(incidents).values([
        { clientId: LATORRE_CLIENT_ID, title: "Phishing email campaign targeting finance team", description: "Credential-harvesting wave blocked at mail gateway.", severity: "medium", status: "resolved", detectedAt: new Date("2026-07-14") },
        { clientId: LATORRE_CLIENT_ID, title: "Unpatched VPN appliance (CVE-2026-1183)", description: "Edge VPN patched within SLA after scanner alert.", severity: "high", status: "resolved", detectedAt: new Date("2026-06-02") },
        { clientId: LATORRE_CLIENT_ID, title: "Expired third-party SOC 2 report", description: "Vendor assessment paused pending renewed report.", severity: "low", status: "open", detectedAt: new Date("2026-08-11") },
        { clientId: LATORRE_CLIENT_ID, title: "Lost laptop with full-disk encryption", description: "Device remotely wiped; no data exposure confirmed.", severity: "low", status: "resolved", detectedAt: new Date("2026-05-20") },
        { clientId: LATORRE_CLIENT_ID, title: "Anomalous admin-role elevation", description: "Privileged access reviewed; legitimate break-glass usage.", severity: "medium", status: "resolved", detectedAt: new Date("2026-08-28") },
        { clientId: LATORRE_CLIENT_ID, title: "DDoS attempt on client portal", description: "Mitigated automatically by CDN provider.", severity: "medium", status: "resolved", detectedAt: new Date("2026-07-30") },
    ]);

    // 15. Risk treatments
    await db.insert(riskTreatments).values([
        { clientId: LATORRE_CLIENT_ID, treatmentType: "mitigate", strategy: "Deploy EDR to all servers", status: "completed" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "mitigate", strategy: "Enforce MFA for all remote access", status: "completed" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "transfer", strategy: "Cyber insurance renewal with higher limits", status: "in_progress" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "accept", strategy: "Residual risk on legacy file server", status: "accepted" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "mitigate", strategy: "Quarterly vendor security reviews", status: "in_progress" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "avoid", strategy: "Retire unsupported OS fleet", status: "completed" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "mitigate", strategy: "Backup restore testing program", status: "in_progress" },
        { clientId: LATORRE_CLIENT_ID, treatmentType: "transfer", strategy: "Outsource 24/7 SOC monitoring", status: "completed" },
    ]);

    // 16. Compliance certificates (frameworkId FK → compliance_frameworks; insert the frameworks first)
    const existingFrameworks = await db.select().from(complianceFrameworks);
    let fw1Id = existingFrameworks.find(f => f.shortCode === "ISO27001")?.id;
    let fw2Id = existingFrameworks.find(f => f.shortCode === "SOC2")?.id;

    if (!fw1Id || !fw2Id) {
        const frameworkRows = await db
            .insert(complianceFrameworks)
            .values([
                { name: "ISO 27001", shortCode: "ISO27001", version: "2022", type: "framework" },
                { name: "SOC 2", shortCode: "SOC2", version: "2017", type: "framework" },
            ])
            .returning({ id: complianceFrameworks.id });
        fw1Id = frameworkRows[0].id;
        fw2Id = frameworkRows[1].id;
    }

    await db.insert(complianceCertificates).values([
        { clientId: LATORRE_CLIENT_ID, frameworkId: fw1Id, status: "valid", certificateNumber: "ISO27001-2026-LTR", issueDate: new Date("2025-09-01"), expiryDate: new Date("2027-09-01") },
        { clientId: LATORRE_CLIENT_ID, frameworkId: fw2Id, status: "valid", certificateNumber: "SOC2-2026-LTR", issueDate: new Date("2026-02-15"), expiryDate: new Date("2026-12-31") },
    ]);

    console.log("[BootstrapDB] ✅ LaTorre LTD enriched demo dataset seeded (clientId 7).");
    await sql.end();
    process.exit(0);
}

function hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return h;
}

main().catch((err) => {
    console.error("[BootstrapDB] Seed failed:", err?.message || err);
    process.exit(1);
});

