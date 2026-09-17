/**
 * Seeds OWASP security requirements into framework_requirements with tech-stack
 * mapping_tags, powering the advisor.getOwaspIntelligence / "Compliance (OWASP)" tab.
 * Idempotent: skips if already seeded.
 * Usage: node --env-file=../../.env scripts/demo-seed/seed-owasp-requirements.mjs
 */
import postgres from "postgres";
import { agoDays } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });

const ex = await sql`SELECT count(*)::int n FROM framework_requirements`;
if (ex[0].n > 0) {
  console.log(JSON.stringify({ skipped: true, existing: ex[0].n }));
  await sql.end();
  process.exit(0);
}

// [identifier, title, description, guidance, tags]
const REQS = [
  ["OWASP-API1", "Broken Object Level Authorization (BOLA)", "API endpoints must verify that the authenticated user is authorized to access the requested object.", "Enforce object-level authorization checks on every endpoint that touches a user-owned resource; use server-side ownership validation.", ["API", "Microservice", "Node.js"]],
  ["OWASP-API2", "Broken Authentication", "Authentication mechanisms must resist credential stuffing and token replay.", "Use short-lived JWTs with rotation, MFA on privileged accounts, and account lockout thresholds.", ["API", "Identity Provider", "Node.js"]],
  ["OWASP-API3", "Broken Object Property Level Authorization", "API responses must not expose sensitive object properties to unauthorized roles.", "Whitelist response fields per role; avoid mass-assignment by explicit DTO mapping.", ["API", "Kong", "Node.js"]],
  ["OWASP-API4", "Unrestricted Resource Consumption", "APIs must limit request rate and payload size to prevent DoS.", "Apply rate limiting at the gateway (e.g. Kong rate-limiting plugin), cap payload sizes, set query timeouts.", ["Kong", "API Gateway", "Load Balancer", "Redis"]],
  ["OWASP-API8", "Security Misconfiguration", "Hardened configurations across the stack; verbose errors disabled in production.", "Automated config baselines, disable stack traces, TLS-only listeners, minimal plugin surface.", ["Kong", "API Gateway", "Container", "Serverless Function"]],
  ["OWASP-ASVS-V4", "Access Control Design & Verification", "Define and test access control at all trust boundaries.", "Deny-by-default policies; unit tests for authz paths; periodic access reviews.", ["API", "Web Client", "Mobile Client"]],
  ["OWASP-ASVS-V5", "Validation, Sanitization & Encoding", "All untrusted input validated server-side; output encoded per context.", "Schema validation on every endpoint, parameterized queries, context-aware output encoding.", ["Web Client", "Mobile Client", "API", "Node.js"]],
  ["OWASP-ASVS-V6", "Stored Cryptography", "Cryptographic modules used correctly for confidentiality and integrity.", "AES-256-GCM for data at rest; keys in managed KMS/HSM; no homegrown crypto.", ["Object Storage", "Database", "Cache", "S3"]],
  ["OWASP-ASVS-V7", "Error Handling & Logging", "Errors must not leak internals; security events logged tamper-evidently.", "Generic client error messages; structured server logs with integrity protection; alerting on anomaly.", ["API", "Microservice", "Process"]],
  ["OWASP-ASVS-V9", "Data Protection", "Sensitive data encrypted in transit and at rest; PII minimized.", "TLS 1.2+ everywhere including internal hops; classify data flows; retention automation.", ["Message Queue", "Database", "External Service", "IBM MQ"]],
  ["OWASP-ASVS-V14.4", "HTTP Security Headers", "Responses carry CSP, HSTS, X-Content-Type-Options, frame protections.", "Set headers at gateway/CDN layer; CSP report-only rollout then enforce.", ["Web Client", "Load Balancer", "Kong", "CDN"]],
  ["OWASP-MASTG-V8", "Mobile Data Storage & Privacy", "Mobile apps must not store secrets in local storage or logs.", "Encrypted storage (Keystore/Keychain), certificate pinning, no PII in crash logs.", ["Mobile Client", "React Native"]],
  ["OWASP-MASTG-V5", "Mobile Communication Security", "Mobile traffic pinned and mutually authenticated where feasible.", "Certificate pinning with backup pins; reject user-trusted CAs for app traffic.", ["Mobile Client", "React Native", "S3"]],
  ["OWASP-TOP10-A05", "Default Credentials & Known Vulnerable Components", "No default credentials; dependency scanning gates releases.", "SBOM generation, automated CVE scanning in CI with severity thresholds, patch SLAs.", ["Container", "Legacy System", "Java", "Seeburger BIS"]],
  ["OWASP-TOP10-A08", "Software & Data Integrity Failures", "Pipeline artifacts signed; message integrity verified between systems.", "Signed commits and container images; AS-2 SMIME signatures verified end-to-end.", ["Message Queue", "External Service", "IBM MQ"]],
];

const rows = REQS.map(([identifier, title, description, guidance, tags]) => ({
  framework_id: 0,
  identifier,
  title,
  description,
  guidance,
  mapping_tags: JSON.stringify(tags),
}));

await sql`INSERT INTO framework_requirements ${sql(rows)}`;
console.log(JSON.stringify({ seeded: rows.length }));
await sql.end();
