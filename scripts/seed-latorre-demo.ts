/**
 * Seeds the LaTorre LTD demo source dataset (clientId = 7) into a fresh database.
 *
 * provisionLaTorreDemo() (packages/core/src/lib/demo-provisioning.ts) copies the
 * dataset from clientId = 7 into every newly created client workspace. On a fresh
 * deployment the source client does not exist, so this script creates it together
 * with a realistic framework/control/vendor/evidence/incident dataset.
 *
 * Idempotent: exits early when client 7 already exists.
 * Run before the server starts (see Dockerfile CMD).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
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
} from "../packages/core/src/schema";

const LATORRE_CLIENT_ID = 7;

async function main() {
    const connectionString = process.env.DATABASE_URL || "";
    if (!connectionString) {
        console.error("[SeedLaTorre] DATABASE_URL is not set — skipping seed.");
        process.exit(1);
    }

    const sql = postgres(connectionString, { max: 1, ssl: false });
    const db = drizzle(sql);

    const existing = await db.select().from(clients).where(eq(clients.id, LATORRE_CLIENT_ID));
    if (existing.length > 0) {
        console.log("[SeedLaTorre] LaTorre source client already exists — skipping seed.");
        await sql.end();
        process.exit(0);
    }

    console.log("[SeedLaTorre] Seeding LaTorre LTD demo source dataset (clientId 7)...");

    // 1. Source client, pinned to id 7 so provisionLaTorreDemo can find it
    await db.insert(clients).values({
        id: LATORRE_CLIENT_ID,
        name: "LaTorre LTD",
        description: "Demo MSP client — LaTorre family of businesses",
        industry: "Technology",
        size: "50-200",
        status: "active",
        primaryContactName: "Marco LaTorre",
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
        console.log(`[SeedLaTorre] Seeded controls library with ${libraryIds.length} controls.`);
    } else {
        const all = await db.select({ id: controls.id }).from(controls);
        libraryIds = all.map((r) => r.id);
        console.log(`[SeedLaTorre] Controls library already present (${libraryIds.length} controls).`);
    }

    // 3. Frameworks for LaTorre
    await db.insert(clientFrameworks).values([
        { clientId: LATORRE_CLIENT_ID, name: "ISO 27001:2022", status: "active" },
        { clientId: LATORRE_CLIENT_ID, name: "SOC 2 Type II", status: "audit_ready" },
        { clientId: LATORRE_CLIENT_ID, name: "GDPR", status: "active" },
        { clientId: LATORRE_CLIENT_ID, name: "EU NIS2", status: "in_progress" },
    ]);

    // 4. Client controls — reference the controls library, mixed statuses
    const statuses = ["implemented", "implemented", "passed", "in_progress", "in_progress", "pending"];
    const ccRows = libraryIds.map((controlId, idx) => ({
        clientId: LATORRE_CLIENT_ID,
        controlId,
        status: statuses[idx % statuses.length],
        owner: idx % 2 === 0 ? "IT Security" : "Compliance Lead",
    }));
    const insertedCC = await db.insert(clientControls).values(ccRows).returning({ id: clientControls.id });
    console.log(`[SeedLaTorre] Inserted ${insertedCC.length} client controls.`);

    // 5. Vendors + assessments
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
    console.log(`[SeedLaTorre] Inserted ${insertedVendors.length} vendors with assessments.`);

    // 6. Evidence — one item against the first 30 client controls
    const evRows = insertedCC.slice(0, 30).map((cc, idx) => ({
        clientId: LATORRE_CLIENT_ID,
        clientControlId: cc.id,
        evidenceId: `LTR-E-${String(idx + 1).padStart(3, "0")}`,
        description: `Evidence package for control requirement #${idx + 1} (screenshot, config export, or policy document)`,
        framework: idx % 2 === 0 ? "ISO 27001" : "SOC 2",
        type: "Document",
        status: idx % 3 === 0 ? "verified" : "pending_review",
        owner: "IT Security",
    }));
    await db.insert(evidence).values(evRows);
    console.log(`[SeedLaTorre] Inserted ${evRows.length} evidence items.`);

    // 7. Incidents
    await db.insert(incidents).values([
        { clientId: LATORRE_CLIENT_ID, title: "Phishing email campaign targeting finance team", description: "Credential-harvesting wave blocked at mail gateway.", severity: "medium", status: "resolved", detectedAt: new Date("2026-07-14") },
        { clientId: LATORRE_CLIENT_ID, title: "Unpatched VPN appliance (CVE-2026-1183)", description: "Edge VPN patched within SLA after scanner alert.", severity: "high", status: "resolved", detectedAt: new Date("2026-06-02") },
        { clientId: LATORRE_CLIENT_ID, title: "Expired third-party SOC 2 report", description: "Vendor assessment paused pending renewed report.", severity: "low", status: "open", detectedAt: new Date("2026-08-11") },
        { clientId: LATORRE_CLIENT_ID, title: "Lost laptop with full-disk encryption", description: "Device remotely wiped; no data exposure confirmed.", severity: "low", status: "resolved", detectedAt: new Date("2026-05-20") },
        { clientId: LATORRE_CLIENT_ID, title: "Anomalous admin-role elevation", description: "Privileged access reviewed; legitimate break-glass usage.", severity: "medium", status: "resolved", detectedAt: new Date("2026-08-28") },
        { clientId: LATORRE_CLIENT_ID, title: "DDoS attempt on client portal", description: "Mitigated automatically by CDN provider.", severity: "medium", status: "resolved", detectedAt: new Date("2026-07-30") },
    ]);

    // 8. Risk treatments
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

    // 9. Compliance certificates
    await db.insert(complianceCertificates).values([
        { clientId: LATORRE_CLIENT_ID, frameworkId: 1, status: "valid", certificateNumber: "ISO27001-2026-LTR", issueDate: new Date("2025-09-01"), expiryDate: new Date("2027-09-01") },
        { clientId: LATORRE_CLIENT_ID, frameworkId: 2, status: "valid", certificateNumber: "SOC2-2026-LTR", issueDate: new Date("2026-02-15"), expiryDate: new Date("2026-12-31") },
    ]);

    console.log("[SeedLaTorre] ✅ LaTorre LTD demo dataset seeded (clientId 7).");
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
    console.error("[SeedLaTorre] Seed failed:", err?.message || err);
    process.exit(1);
});
