/**
 * Additive, idempotent demo top-up for the shared LaTorre LTD workspace (clientId 7).
 *
 * Called from scripts/bootstrap-db.ts on every boot. It only INSERTs rows that are
 * missing (keyed by stable natural keys), never deletes or updates, and never touches
 * any client other than 7 or any user. Thresholds mean an already-populated workspace
 * is left alone. Fills the gaps the public demo showed:
 *   - risk register (risk_assessments) + treatments
 *   - client policies (>= 10)
 *   - vendor assessment requests
 */
import type postgres from "postgres";

const CLIENT_ID = 7;

type Risk = [code: string, title: string, category: string, l: number, i: number, rl: number, ri: number, owner: string, option: string, status: string, treatment: string, tStatus: string];

const RISKS: Risk[] = [
    ["DEMO-RA-001", "Ransomware outbreak encrypting production file shares", "Cyber", 4, 5, 2, 4, "CISO", "Mitigate", "approved", "Deploy immutable offsite backups and EDR auto-isolation on all servers", "in_progress"],
    ["DEMO-RA-002", "Phishing-led compromise of finance mailbox (BEC)", "Cyber", 4, 4, 2, 3, "IT Security Manager", "Mitigate", "approved", "Enforce phishing-resistant MFA and payment call-back verification", "implemented"],
    ["DEMO-RA-003", "Privileged AWS root credentials without hardware MFA", "Cloud", 3, 5, 1, 5, "Head of Platform", "Mitigate", "reviewed", "Move root to hardware keys, break-glass procedure and SCP guardrails", "verified"],
    ["DEMO-RA-004", "Public S3 bucket exposing customer exports", "Cloud", 3, 5, 1, 4, "Head of Platform", "Mitigate", "approved", "Enable S3 Block Public Access org-wide and Macie scanning", "implemented"],
    ["DEMO-RA-005", "Critical SaaS vendor outage (payments processor)", "Third Party", 3, 4, 2, 4, "COO", "Transfer", "approved", "Contract SLA credits plus secondary processor failover", "planned"],
    ["DEMO-RA-006", "Unpatched internet-facing VPN appliance", "Vulnerability", 4, 5, 2, 3, "IT Operations Lead", "Mitigate", "approved", "30-day critical patch SLA with external attack-surface monitoring", "in_progress"],
    ["DEMO-RA-007", "Insider data exfiltration by departing employee", "People", 2, 4, 1, 3, "HR Director", "Mitigate", "reviewed", "DLP on endpoints and same-day access revocation in leaver workflow", "implemented"],
    ["DEMO-RA-008", "GDPR breach notification missed 72-hour deadline", "Compliance", 2, 5, 1, 4, "DPO", "Mitigate", "approved", "Incident runbook with DPO on-call and notification templates", "implemented"],
    ["DEMO-RA-009", "Loss of unencrypted laptop with customer data", "Physical", 3, 3, 1, 2, "IT Operations Lead", "Mitigate", "approved", "Full-disk encryption enforced via MDM compliance policy", "verified"],
    ["DEMO-RA-010", "Single point of failure in primary data centre power", "Resilience", 2, 5, 1, 4, "Head of Infrastructure", "Mitigate", "draft", "Dual utility feed and quarterly generator load tests", "planned"],
    ["DEMO-RA-011", "Open-source dependency with known critical CVE in core API", "Application", 4, 4, 2, 2, "Engineering Manager", "Mitigate", "approved", "SCA scanning gate in CI and monthly dependency updates", "in_progress"],
    ["DEMO-RA-012", "SQL injection in legacy customer portal", "Application", 3, 5, 1, 4, "Engineering Manager", "Mitigate", "reviewed", "Parameterised queries refactor and WAF virtual patching", "implemented"],
    ["DEMO-RA-013", "Inadequate logging prevents incident investigation", "Detection", 3, 3, 2, 2, "SOC Lead", "Mitigate", "approved", "Centralise logs in SIEM with 12-month retention", "in_progress"],
    ["DEMO-RA-014", "Shadow IT: unsanctioned AI tools processing client data", "Governance", 4, 3, 2, 3, "CISO", "Mitigate", "draft", "Approved AI tool list, CASB discovery and staff guidance", "planned"],
    ["DEMO-RA-015", "Key-person dependency on sole database administrator", "People", 3, 4, 2, 3, "CTO", "Mitigate", "approved", "Cross-train second DBA and document runbooks", "in_progress"],
    ["DEMO-RA-016", "Backup restores never tested end to end", "Resilience", 3, 4, 1, 4, "Head of Infrastructure", "Mitigate", "approved", "Quarterly restore drills with documented RTO/RPO results", "implemented"],
    ["DEMO-RA-017", "DDoS against customer-facing web platform", "Cyber", 3, 4, 1, 4, "Head of Platform", "Transfer", "reviewed", "CDN-based DDoS protection with provider SLA", "verified"],
    ["DEMO-RA-018", "Fourth-party risk from vendor sub-processors", "Third Party", 3, 3, 2, 3, "Procurement Lead", "Accept", "approved", "Annual sub-processor attestation review (accepted residual)", "planned"],
    ["DEMO-RA-019", "Weak segregation between corporate and OT networks", "Network", 2, 5, 1, 4, "Network Architect", "Mitigate", "draft", "Firewall zoning and jump-host access for OT segment", "planned"],
    ["DEMO-RA-020", "Expired TLS certificates causing service outage", "Operations", 3, 2, 1, 2, "IT Operations Lead", "Mitigate", "approved", "Automated certificate renewal and 30-day expiry alerts", "implemented"],
];

const POLICIES: [name: string, status: string, owner: string][] = [
    ["Information Security Policy", "approved", "CISO"],
    ["Acceptable Use Policy", "approved", "HR Director"],
    ["Access Control Policy", "approved", "IT Security Manager"],
    ["Data Classification and Handling Policy", "approved", "DPO"],
    ["Incident Response Policy", "approved", "SOC Lead"],
    ["Business Continuity and Disaster Recovery Policy", "review", "COO"],
    ["Third-Party and Vendor Risk Management Policy", "approved", "Procurement Lead"],
    ["Cryptography and Key Management Policy", "review", "Head of Platform"],
    ["Secure Software Development Policy", "approved", "Engineering Manager"],
    ["Backup and Restore Policy", "approved", "Head of Infrastructure"],
    ["Data Retention and Disposal Policy", "draft", "DPO"],
    ["Artificial Intelligence Acceptable Use Policy", "draft", "CISO"],
];

const RISK_LEVEL = (score: number) => (score >= 15 ? "Critical" : score >= 9 ? "High" : score >= 4 ? "Medium" : "Low");
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);

async function count(sql: postgres.Sql, query: string): Promise<number> {
    const rows = await sql.unsafe(query);
    return Number((rows[0] as any)?.n || 0);
}

export async function demoTopUpClient7(sql: postgres.Sql): Promise<void> {
    if (process.env.DEMO_DISABLE_TOPUP === "true") return;
    const [client] = await sql`SELECT id FROM clients WHERE id = ${CLIENT_ID}`;
    if (!client) {
        console.log("[DemoTopUp] client 7 not present; skipping.");
        return;
    }

    // 1. Risk register + treatments (only when the register is thin)
    const riskCount = await count(sql, `SELECT count(*)::int AS n FROM risk_assessments WHERE client_id = ${CLIENT_ID}`);
    let risksAdded = 0, treatmentsAdded = 0;
    if (riskCount < 15) {
        for (const [idx, r] of RISKS.entries()) {
            const [code, title, category, l, i, rl, ri, owner, option, status, treatment, tStatus] = r;
            const inherent = l * i, residual = rl * ri;
            const inserted = await sql`
                INSERT INTO risk_assessments (client_id, assessment_id, title, category, assessment_date, assessor, method,
                    likelihood, impact, inherent_risk, inherent_score, residual_risk, residual_score, risk_owner,
                    treatment_option, priority, status, next_review_date, review_due_date)
                SELECT ${CLIENT_ID}, ${code}, ${title}, ${category}, ${daysFromNow(-60 + idx)}, ${owner}, 'ISO 27005',
                    ${String(l)}, ${String(i)}, ${RISK_LEVEL(inherent)}, ${inherent}, ${RISK_LEVEL(residual)}, ${residual}, ${owner},
                    ${option}, ${RISK_LEVEL(inherent)}, ${status}::risk_assessment_status, ${daysFromNow(idx % 4 === 0 ? -10 : 90 + idx)}, ${daysFromNow(180)}
                WHERE NOT EXISTS (SELECT 1 FROM risk_assessments WHERE client_id = ${CLIENT_ID} AND assessment_id = ${code})
                RETURNING id`;
            if (inserted.length) risksAdded++;
            const [ra] = await sql`SELECT id FROM risk_assessments WHERE client_id = ${CLIENT_ID} AND assessment_id = ${code} LIMIT 1`;
            if (!ra) continue;
            const t = await sql`
                INSERT INTO risk_treatments (client_id, risk_assessment_id, treatment_type, strategy, status, due_date, owner, priority)
                SELECT ${CLIENT_ID}, ${ra.id}, ${option.toLowerCase()}, ${treatment}, ${tStatus}, ${daysFromNow(idx % 5 === 0 ? -7 : 30 + idx * 3)}, ${owner}, ${RISK_LEVEL(inherent).toLowerCase()}
                WHERE NOT EXISTS (SELECT 1 FROM risk_treatments WHERE risk_assessment_id = ${ra.id})
                RETURNING id`;
            if (t.length) treatmentsAdded++;
        }
    }

    // 2. Client policies (>= 10)
    const policyCount = await count(sql, `SELECT count(*)::int AS n FROM client_policies WHERE client_id = ${CLIENT_ID}`);
    let policiesAdded = 0;
    if (policyCount < 10) {
        for (const [idx, [name, status, owner]] of POLICIES.entries()) {
            const p = await sql`
                INSERT INTO client_policies (client_id, client_policy_id, name, content, status, version, owner, module, review_due_date, next_review_date)
                SELECT ${CLIENT_ID}, ${"POL-" + String(idx + 1).padStart(3, "0")}, ${name},
                    ${`<h1>${name}</h1><p>This policy sets out how LaTorre LTD manages ${name.replace(/ Policy$/, "").toLowerCase()} in line with ISO/IEC 27001:2022 and SOC 2. It applies to all employees, contractors and systems in scope of the ISMS.</p>`},
                    ${status}::policy_status, 1, ${owner}, 'general', ${daysFromNow(365)}, ${daysFromNow(365)}
                WHERE NOT EXISTS (SELECT 1 FROM client_policies WHERE client_id = ${CLIENT_ID} AND name = ${name})
                RETURNING id`;
            if (p.length) policiesAdded++;
        }
    }

    // 3. Vendor assessment requests (a few, against existing client-7 vendors)
    const reqCount = await count(sql, `SELECT count(*)::int AS n FROM vendor_assessment_requests WHERE client_id = ${CLIENT_ID}`);
    let requestsAdded = 0;
    if (reqCount < 3) {
        const vendorRows = await sql`SELECT id, name FROM vendors WHERE client_id = ${CLIENT_ID} ORDER BY id LIMIT 4`;
        if (vendorRows.length) {
            let [tpl] = await sql`SELECT id FROM vendor_assessment_templates WHERE client_id = ${CLIENT_ID} ORDER BY id LIMIT 1`;
            if (!tpl) {
                [tpl] = await sql`
                    INSERT INTO vendor_assessment_templates (client_id, name, description, content)
                    VALUES (${CLIENT_ID}, 'Standard Vendor Security Assessment', 'Baseline security questionnaire for SaaS and service providers', ${sql.json({ sections: [] })})
                    RETURNING id`;
            }
            const plan: [string, number, number | null][] = [["completed", -20, 82], ["submitted", -5, 74], ["sent", -2, null], ["sent", -1, null]];
            for (const [idx, v] of vendorRows.entries()) {
                const [status, sentDays, score] = plan[idx];
                const email = `security@${String(v.name).toLowerCase().replace(/[^a-z0-9]+/g, "") || "vendor"}.example`;
                const r = await sql`
                    INSERT INTO vendor_assessment_requests (client_id, vendor_id, template_id, token, recipient_email, status, score, sent_at, expires_at, submitted_at, completed_at)
                    SELECT ${CLIENT_ID}, ${v.id}, ${tpl.id}, md5(random()::text || clock_timestamp()::text) || md5(random()::text), ${email}, ${status}, ${score}::int,
                        ${daysFromNow(sentDays)}, ${daysFromNow(sentDays + 30)},
                        ${status === "completed" || status === "submitted" ? daysFromNow(sentDays + 3) : null}::timestamp,
                        ${status === "completed" ? daysFromNow(sentDays + 6) : null}::timestamp
                    WHERE NOT EXISTS (SELECT 1 FROM vendor_assessment_requests WHERE client_id = ${CLIENT_ID} AND vendor_id = ${v.id} AND recipient_email = ${email})
                    RETURNING id`;
                if (r.length) requestsAdded++;
            }
        }
    }

    console.log(`[DemoTopUp] client 7: +${risksAdded} risks, +${treatmentsAdded} treatments, +${policiesAdded} policies, +${requestsAdded} assessment requests (had ${riskCount}/${policyCount}/${reqCount}).`);
}