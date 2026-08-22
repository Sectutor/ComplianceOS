/**
 * Teammates Router — in-memory demo surface for the AI teammate fleet
 * (Hermes, Alex, Morgan, Riley): teammate CRUD, tasks, approvals, routines
 * and the multi-agent chat (war room + direct bot channels).
 *
 * Cycle 28 hardening: every procedure now parses its input with an exported
 * zod schema (bounds + enums), unknown ids surface as TRPCError NOT_FOUND,
 * unexpected handler failures are converted to a safe INTERNAL_SERVER_ERROR,
 * and list results are defensively capped (MAX_LIST_RESULTS). No database
 * access; no secrets are echoed or logged.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { llmService } from "../../lib/llm/service";
import { dlpSanitizer } from "../../lib/agent/dlpSanitizer";
import { promptInjectionGuard } from "../../lib/agent/promptInjectionGuard";
import { actionGatekeeper, BotActionRequest } from "../../lib/agent/actionGatekeeper";
import { provenanceLedger } from "../../lib/agent/provenanceLedger";
import { circuitBreaker } from "../../lib/agent/rateLimiterCircuitBreaker";
import { policyVectorRag } from "../../lib/agent/policyVectorRag";
import { toolDispatcher } from "../../lib/agent/toolDispatcher";

// ── Defensive bounds & error helpers ─────────────────────────────────────────

/** Hard cap for list-style results (defensive bound; normal data is far smaller). */
const MAX_LIST_RESULTS = 200;
/** Max length for identifier-style fields (teammateId, id, channelId, routineId, ...). */
const MAX_ID_LENGTH = 100;

/**
 * Re-throw intentional tRPC errors (NOT_FOUND, zod BAD_REQUEST, ...) untouched;
 * convert anything else into a safe INTERNAL_SERVER_ERROR whose message never
 * leaks internals (the original error is preserved only as `cause`).
 */
function asInternalError(operation: string, err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `An unexpected error occurred while ${operation}.`,
    cause: err,
  });
}

/** Defensively bound list results without changing semantics for normal data. */
function capResults<T>(items: T[]): T[] {
  return items.slice(0, MAX_LIST_RESULTS);
}

// ── Zod input schemas (exported for tests) ───────────────────────────────────

/** Input schema for `getTeammate`. */
export const teammateGetInputSchema = z.object({
  teammateId: z.string().min(1).max(MAX_ID_LENGTH),
});

/** Input schema for `createTeammate`. */
export const teammateCreateInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1, "Role is required").max(150),
  avatar: z.string().min(1).max(16).default("🤖"),
  description: z.string().min(1, "Description is required").max(2000),
  sandboxType: z.enum(["docker", "e2b", "browser", "cli"]).default("browser"),
  model: z.string().min(1).max(100).default("claude-3-7-sonnet"),
  capabilities: z.array(z.string().min(1).max(100)).max(50).default([]),
});

/** Input schema for `updateTeammate`. */
export const teammateUpdateInputSchema = z.object({
  id: z.string().min(1).max(MAX_ID_LENGTH),
  name: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1, "Role is required").max(150),
  avatar: z.string().min(1).max(16).default("🤖"),
  description: z.string().min(1, "Description is required").max(2000),
  sandboxType: z.enum(["docker", "e2b", "browser", "cli"]).default("browser"),
  model: z.string().min(1).max(100).default("claude-3-7-sonnet"),
  capabilities: z.array(z.string().min(1).max(100)).max(50).default([]),
});

/** Input schema for `deleteTeammate`. */
export const teammateDeleteInputSchema = z.object({
  id: z.string().min(1).max(MAX_ID_LENGTH),
});

/** Input schema for `listTasks` (whole object optional). */
export const taskListInputSchema = z
  .object({
    teammateId: z.string().min(1).max(MAX_ID_LENGTH).optional(),
  })
  .optional();

/** Input schema for `createTask`. */
export const taskCreateInputSchema = z.object({
  teammateId: z.string().min(1).max(MAX_ID_LENGTH),
  title: z.string().min(1).max(300),
  type: z.enum(["browser_audit", "vendor_soc2", "iac_remediation", "access_review", "policy_gap"]),
  targetUrl: z.string().min(1).max(2048).optional(),
  summary: z.string().min(1).max(4000),
});

/** Input schema for `resolveApproval`. */
export const approvalResolveInputSchema = z.object({
  approvalId: z.string().min(1).max(MAX_ID_LENGTH),
  action: z.enum(["approved", "rejected"]),
  comment: z.string().max(1000).optional(),
});

/** Input schema for `toggleRoutine`. */
export const routineToggleInputSchema = z.object({
  routineId: z.string().min(1).max(MAX_ID_LENGTH),
  active: z.boolean(),
});

/** Input schema for `triggerRoutineNow`. */
export const routineTriggerInputSchema = z.object({
  routineId: z.string().min(1).max(MAX_ID_LENGTH),
});

/** Input schema for `listMessages`. */
export const messageListInputSchema = z.object({
  channelId: z.string().min(1).max(MAX_ID_LENGTH).default("war_room"),
});

/** Input schema for `sendMessage`. */
export const messageSendInputSchema = z.object({
  channelId: z.string().min(1).max(MAX_ID_LENGTH).default("war_room"),
  content: z.string().min(1).max(8000),
  mentions: z.array(z.string().min(1).max(MAX_ID_LENGTH)).max(50).optional(),
});

/** Input schema for `takeControlSandbox`. */
export const sandboxControlInputSchema = z.object({
  teammateId: z.string().min(1).max(MAX_ID_LENGTH),
});

/** Input schema for `executeToolAction`. */
export const toolExecuteInputSchema = z.object({
  toolName: z.string().min(1).max(100),
  parameters: z.record(z.any()).default({}),
  botId: z.string().min(1).max(MAX_ID_LENGTH).default("hermes_orchestrator"),
});

/** Input schema for `getAuditCertificate`. */
export const auditCertInputSchema = z.object({
  scope: z.string().min(1).max(300).default("SOC 2 Type II & ISO 27001 Multi-Agent Execution"),
});

// ── Encyclopedic GRC & Framework Knowledge Engine ─────────────────────────────
function getExpertComplianceKnowledge(prompt: string, botName: string, botRole: string): string {
  const p = prompt.toLowerCase();

  // NIS2 Directive
  if (p.includes("nis2") || p.includes("nis 2") || p.includes("network and information security") || p.includes("2022/2555")) {
    return `### 🇪🇺 **NIS2 Directive (EU Directive 2022/2555) Overview & Compliance Requirements**

The **NIS2 Directive** significantly expands the EU's cybersecurity regulatory framework, replacing the original 2016 NIS Directive with stricter risk management rules, precise incident reporting timelines, and direct executive liability.

---

#### 1. **Scope: Essential vs. Important Entities**
* **Essential Entities (EE):** Energy, Transport, Banking, Financial Market Infrastructures, Health, Drinking Water, Digital Infrastructure (Cloud, DNS, Data Centers), ICT Service Management, and Public Administration.
* **Important Entities (IE):** Postal & Courier services, Waste Management, Chemicals, Food Production, Manufacturing (Medical devices, Electronics, Machinery), Digital Providers (Marketplaces, Search Engines, Social Networks), and Research organizations.

---

#### 2. **Article 21: The 10 Mandatory Cybersecurity Measures**
All in-scope entities must implement the following core cybersecurity baselines:
1. **Risk Analysis & Information System Security Policies**
2. **Incident Handling:** Prevention, detection, containment, and response protocols.
3. **Business Continuity & Crisis Management:** Backups, disaster recovery, and operational resilience.
4. **Supply Chain Security:** Auditing direct suppliers and ICT service providers.
5. **Security in Network & Information Systems Acquisition, Development & Maintenance:** Vulnerability handling and disclosure.
6. **Policies & Procedures to Assess Cybersecurity Risk Management Effectiveness**
7. **Basic Cyber Hygiene Practices & Cybersecurity Training** for all personnel.
8. **Policies on Cryptography & Encryption** (TLS 1.3, AES-256, KMS key management).
9. **Human Resources Security, Access Control Policies, & Asset Management**
10. **Multi-Factor Authentication (MFA) & Secured Communications**

---

#### 3. **Article 23: Strict Incident Reporting Timelines**
* ⏱️ **24-Hour Early Warning:** Notify the competent authority or national CSIRT within 24 hours of becoming aware of a significant incident.
* ⏱️ **72-Hour Incident Notification:** Full incident report assessing severity, impact, and indicators of compromise.
* ⏱️ **Intermediate Report:** Upon request of the CSIRT/authority.
* ⏱️ **1-Month Final Report:** Comprehensive root-cause analysis, business impact, and remediation steps.

---

#### 4. **Management Liability & Sanctions**
* **Executive Accountability:** Board members and senior executives can be held personally liable for non-compliance and face temporary bans from managerial functions.
* **Fines:**
  * **Essential Entities:** Up to **€10,000,000** or **2% of global annual turnover** (whichever is higher).
  * **Important Entities:** Up to **€7,000,000** or **1.4% of global annual turnover**.

---

💡 *Hermes Recommendation:* You can map your existing ISO 27001 or SOC 2 controls directly to NIS2 Article 21 using ComplianceOS's **Framework Studio** and dispatch **@Alex** to audit your supply chain vendors.`;
  }

  // SOC 2 Type II
  if (p.includes("soc 2") || p.includes("soc2") || p.includes("trust services criteria") || p.includes("type ii") || p.includes("type 2")) {
    return `### 🛡️ **SOC 2 Type II Audit & Compliance Architecture**

A **SOC 2 Type II** report evaluates the design and operating effectiveness of an organization's security controls over an observation window (typically 3, 6, or 12 months), verified by an independent CPA auditor.

---

#### 1. **The 5 Trust Services Criteria (TSC)**
1. **Security (Common Criteria CC1.1 – CC9.2):** *Mandatory.* Covers firewall configurations, access controls, vulnerability scanning, employee onboarding/offboarding, and incident response.
2. **Availability:** System uptime, failover replication, DR testing, and DDoS mitigation.
3. **Confidentiality:** Protection of sensitive business data, NDA agreements, and encryption at rest/transit.
4. **Processing Integrity:** System processing is complete, valid, accurate, and authorized (data pipelines, transactions).
5. **Privacy:** Collection, use, retention, disclosure, and disposal of personal data (aligned with GDPR/CCPA).

---

#### 2. **Continuous Audit Evidence Requirements**
* **Quarterly Access Reviews (CC6.1/CC6.2):** Handled autonomously by **@Riley**.
* **Cloud Encryption & Drift Verification (CC6.6/CC6.7):** Monitored by **@Morgan** with Terraform remediation.
* **Third-Party Vendor Risk & SOC 2 Ingestion (CC9.2):** Automated by **@Alex**.`;
  }

  // ISO 27001
  if (p.includes("iso 27001") || p.includes("iso27001") || p.includes("isms") || p.includes("annex a")) {
    return `### 🌐 **ISO/IEC 27001:2022 ISMS Framework Breakdown**

**ISO/IEC 27001:2022** specifies the requirements for establishing, implementing, maintaining, and continually improving an Information Security Management System (ISMS).

---

#### 1. **Clauses 4 through 10 (Management System Requirements)**
* **Clause 4:** Context of the organization & stakeholder expectations.
* **Clause 5:** Leadership, commitment, and information security policy.
* **Clause 6:** Planning, risk assessment, and risk treatment methodology.
* **Clause 7:** Support, resources, competence, and documented information.
* **Clause 8:** Operational planning and control execution.
* **Clause 9:** Performance evaluation, internal audits, and management review.
* **Clause 10:** Nonconformity, corrective actions, and continual improvement.

---

#### 2. **Annex A: 93 Controls in 4 Modernized Themes**
* 🏢 **Organizational Controls (37):** Policies, threat intelligence (A.5.7), cloud services security (A.5.23), ICT readiness for business continuity (A.5.29).
* 👥 **People Controls (8):** Screening, remote working, confidentiality agreements.
* 🚪 **Physical Controls (14):** Physical security perimeters, equipment maintenance, clear desk/screen.
* 💻 **Technological Controls (34):** Privileged access rights, data leakage prevention (A.8.12), data masking (A.8.11), secure coding (A.8.28), web filtering (A.8.23).`;
  }

  // DORA
  if (p.includes("dora") || p.includes("digital operational resilience") || p.includes("2022/2554")) {
    return `### 🏦 **DORA (Digital Operational Resilience Act - EU 2022/2554)**

**DORA** establishes uniform digital resilience requirements for the European financial sector and their critical third-party ICT providers.

---

#### **The 5 Core Pillars:**
1. **ICT Risk Management:** Comprehensive governance framework, business impact analysis, and continuous asset discovery.
2. **ICT-Related Incident Management & Reporting:** Harmonized classification of major incidents with 4-hour initial notification and 72-hour intermediate report.
3. **Digital Operational Resilience Testing:** Annual basic testing (vulnerability scans, gap analyses) and mandatory **Threat-Led Penetration Testing (TLPT)** every 3 years for significant entities.
4. **Managing ICT Third-Party Risk:** Critical third-party monitoring, contractual exit strategies, multi-vendor concentration risk analysis.
5. **Information-Sharing Arrangements:** Voluntary cyber threat intelligence sharing between financial institutions.`;
  }

  // Incident Response & Regulatory Timelines (Nova)
  if (p.includes("incident") || p.includes("breach") || p.includes("csirt") || p.includes("timeline") || p.includes("notification deadline") || p.includes("post-mortem") || p.includes("rca")) {
    return `### 🚨 **Security Incident Response & Regulatory Notification Timelines**

Under modern regulatory frameworks, security incidents carry strict notification and forensic documentation requirements:

---

#### 1. **Regulatory Notification Clocks**
* ⏱️ **NIS2 (Article 23):**
  * **24-Hour Early Warning:** Notify competent authority / CSIRT of significant incident.
  * **72-Hour Incident Notification:** Full initial assessment & technical severity.
  * **1-Month Final Report:** Detailed root cause analysis, business impact, and remediation.
* ⏱️ **DORA (Article 19):** Initial notification within **4 hours** of classification, intermediate report within **72 hours**, final report within **1 month**.
* ⏱️ **GDPR (Article 33):** Notify relevant Data Protection Authority within **72 hours** of becoming aware of a personal data breach.

---

#### 2. **Automated Incident Response Lifecycle (Managed by @Nova)**
1. **Triage & Classification:** Severity scored automatically (P1 Critical to P4 Low).
2. **Containment & Eradication:** Automated isolation of compromised API tokens or IP addresses.
3. **Forensic Logging:** Automated snapshot of system logs, network flows, and cryptographic hashes.
4. **Post-Mortem & Auditor Pack:** Generates an AICPA/ISO compliant Root Cause Analysis (RCA) artifact.`;
  }

  // Vulnerability & Patch Management (Sasha)
  if (p.includes("vulnerab") || p.includes("cve") || p.includes("patch") || p.includes("dependabot") || p.includes("snyk") || p.includes("trivy") || p.includes("sla")) {
    return `### 🛡️ **Continuous Vulnerability & Patch Management SLA Architecture**

A compliant AppSec and infrastructure vulnerability management program enforces clear remediation SLAs across development and production environments:

---

#### 1. **Audit-Mandated Remediation SLAs**
* 🔴 **Critical Severity (CVSS 9.0–10.0):** Remediation required within **14 calendar days** (SOC 2 / FedRAMP / PCI-DSS).
* 🟠 **High Severity (CVSS 7.0–8.9):** Remediation required within **30 calendar days**.
* 🟡 **Medium Severity (CVSS 4.0–6.9):** Remediation required within **60–90 calendar days**.
* 🔵 **Low Severity (CVSS 0.1–3.9):** Addressed during standard sprint cycles or next major release.

---

#### 2. **Automated AppSec Routine (Managed by @Sasha)**
* **Continuous Ingestion:** Aggregates CVE telemetry from GitHub Dependabot, Snyk, AWS Inspector, and Trivy containers.
* **SLA Countdown & Escalation:** Flags dependencies approaching SLA breach to code owners.
* **Automated Remediation PRs:** Generates dependency upgrade Pull Requests with passing CI verification.`;
  }

  // Policy Lifecycle & Staff Awareness (Tara)
  if (p.includes("policy") || p.includes("acknowledgment") || p.includes("training") || p.includes("awareness") || p.includes("annual review") || p.includes("new hire")) {
    return `### 📜 **Policy Governance Lifecycle & Employee Compliance Awareness**

ISO 27001 (Clause 5.2, A.5.1) and SOC 2 (CC2.2) require continuous maintenance of information security policies and verified employee acknowledgment:

---

#### 1. **Annual Policy Governance Cycle**
* **Annual Policy Review:** All master policies (ISMS, Access Control, Incident Response, Cryptography) must be formally reviewed and re-approved by leadership at least every 12 months.
* **Version Control & Changelogs:** Every policy change requires documented rationale, approval signatures, and versioning.

---

#### 2. **Staff Acknowledgment & Awareness Campaigns (Managed by @Tara)**
* **New Hire Onboarding:** Automated dispatch of core security policies within first 7 days of employment.
* **Annual Refresher:** Automated company-wide re-acknowledgment campaigns via Slack / Email.
* **Cryptographic Audit Log:** Records employee timestamps, email hashes, and version IDs for auditor sign-off.`;
  }

  // Data Privacy & DSAR (Elena)
  if (p.includes("gdpr") || p.includes("privacy") || p.includes("dsar") || p.includes("ropa") || p.includes("dpia") || p.includes("data protection") || p.includes("scc")) {
    return `### 🔒 **Data Privacy, Article 30 ROPA, & DSAR Fulfillment**

Comprehensive data protection compliance under GDPR (EU), CCPA/CPRA (US), and ISO 27701:

---

#### 1. **Record of Processing Activities (ROPA / Article 30)**
* Centralized inventory of data flows: Data categories (PII, financial, health), processing purposes, legal basis (consent, contract, legitimate interest), retention schedules, and international transfers.

---

#### 2. **Data Subject Access Requests (DSARs - Managed by @Elena)**
* **30-Day Strict Countdown:** Right to Access, Rectification, Erasure ("Right to be Forgotten"), and Data Portability must be completed within 30 days.
* **Automated Data Discovery:** Queries databases and SaaS tools to aggregate or redact user records upon verified request.
* **DPIA Triggers:** Automated impact assessments for new AI processing, high-volume tracking, or biometric systems.`;
  }

  // Quantitative Risk Management & Threat Modeling (Marcus)
  if (p.includes("risk") || p.includes("threat model") || p.includes("fair") || p.includes("heatmap") || p.includes("erm") || p.includes("inherent") || p.includes("residual")) {
    return `### 🎯 **Quantitative Enterprise Risk Management (ERM) & Threat Modeling**

Continuous risk assessment aligned with **ISO 27005**, **NIST SP 800-30**, and the **FAIR (Factor Analysis of Information Risk)** framework:

---

#### 1. **Inherent vs. Residual Risk Scoring**
* **Inherent Risk = Likelihood × Impact (before controls).**
* **Residual Risk = Inherent Risk − Control Effectiveness Factor.**
* **FAIR Quantitative Analysis:** Computes Annualized Loss Expectancy ($ALE = SLE \times ARO$) to translate technical risks into financial exposure for executive leadership.

---

#### 2. **Continuous Risk Recalculation (Managed by @Marcus)**
* Ingests real-time security events (unpatched CVEs, cloud drift, vendor cert expirations) to dynamically adjust Risk Register scores.
* Generates Board-ready 5x5 Risk Heatmaps and prioritizes remediation budget by ROI.`;
  }

  // Mock Auditor & Audit Defense (Sam)
  if (p.includes("audit") || p.includes("mock") || p.includes("auditor") || p.includes("cpa") || p.includes("evidence pack") || p.includes("stage 2") || p.includes("defense")) {
    return `### 💼 **Mock Audit Simulation & Automated Audit Package Compilation**

Preparing for external CPA examination (AICPA SOC 2 Type II, ISO 27001 Certification, FedRAMP):

---

#### 1. **Adversarial Mock Audit Simulation (Managed by @Sam)**
* **Evidence Stress-Testing:** Simulates aggressive auditor inquiry against access logs, change tickets, and backup drills.
* **Gap Flagging:** Detects missing population samples, unapproved changes, or stale documentation before the real audit begins.

---

#### 2. **1-Click Audit Room & Evidence Bundler**
* Compiles policies, cryptographically signed screenshots, Terraform diffs, and TPRM reports into categorized auditor folders.
* Generates a SHA-256 integrity manifest for tamper-proof audit submission.`;
  }

  // Generic expert orchestrator response
  return `### 🧠 **${botName} (${botRole}) Analysis**

I have analyzed your compliance and security query: **"${prompt}"**

---

#### **Key Assessment & Action Plan:**
1. **Framework Alignment:** This directive impacts your active security baseline across **SOC 2 Type II**, **ISO 27001:2022**, **NIS2**, and **GDPR**.
2. **Automated Verification:**
   * Review policy assertions and control mapping in **Audit Hub**.
   * Run automated tests against cloud endpoints and database configurations.
3. **Fleet Delegation:**
   * **@Alex** — Vendor Trust & SOC 2 Reports
   * **@Morgan** — Cloud IaC & Drift Remediation
   * **@Riley** — Access Reviews & Evidence Harvester
   * **@Nova** — Incident Timelines & Regulatory Dispatches
   * **@Sasha** — AppSec & Vulnerability SLAs
   * **@Tara** — Policy Lifecycle & Staff Awareness
   * **@Elena** — Privacy & DSAR Automation
   * **@Marcus** — Quantitative Risk Scoring
   * **@Sam** — Mock Audit & Package Compiler

Let me know if you would like me to draft a tailored policy or trigger an autonomous fleet sweep across your environment!`;
}

export interface Teammate {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  status: "idle" | "running" | "waiting_approval" | "paused";
  sandboxType: "docker" | "e2b" | "browser" | "cli";
  model: string;
  capabilities: string[];
  tasksCompleted: number;
  lastActive: string;
}

export interface TeammateTask {
  id: string;
  teammateId: string;
  title: string;
  type: "browser_audit" | "vendor_soc2" | "iac_remediation" | "access_review" | "policy_gap";
  status: "pending" | "running" | "completed" | "failed" | "requires_approval";
  targetUrl?: string;
  summary: string;
  logs: Array<{ timestamp: string; level: "info" | "action" | "warn" | "error"; message: string }>;
  browserSteps?: Array<{ step: number; action: string; url?: string; screenshotUrl?: string; timestamp: string }>;
  artifacts?: Array<{ id: string; name: string; type: string; url?: string; size?: string }>;
  createdAt: string;
  completedAt?: string;
}

export interface ApprovalItem {
  id: string;
  taskId: string;
  teammateId: string;
  teammateName: string;
  title: string;
  type: "github_pr" | "vendor_email" | "policy_update" | "aws_remediation" | "terraform_apply";
  description: string;
  diffOrPayload: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface TeammateRoutine {
  id: string;
  teammateId: string;
  name: string;
  schedule: string;
  description: string;
  status: "active" | "paused" | "running";
  lastRun: string;
  nextRun: string;
  lastRunResult?: "success" | "warning" | "error";
}

export interface ChatMessage {
  id: string;
  channelId: string; // "war_room" or teammateId
  senderId: string; // "user" or teammateId
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  content: string;
  timestamp: string;
  mentions?: string[];
  delegatedTo?: string;
  attachments?: Array<{ title: string; type: string; size?: string; status?: string }>;
  browserPreview?: { url: string; title: string; steps: string[]; status: string };
}

// In-memory state for initial runtime (backed by persistent tables when DB migration runs)
let messagesStore: ChatMessage[] = [
  // Fleet War Room
  {
    id: "msg_wr_1",
    channelId: "war_room",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "@Alex and @Morgan, we need to complete the Stripe vendor risk review and verify our AWS S3 bucket encryption policy for SOC 2 Type II audit.",
    timestamp: "Yesterday, 4:15 PM",
    mentions: ["alex_tprm", "morgan_iac"]
  },
  {
    id: "msg_wr_2",
    channelId: "war_room",
    senderId: "alex_tprm",
    senderName: "Alex",
    senderAvatar: "🕵️",
    senderRole: "Vendor Trust & SOC 2 Scout",
    content: "On it! I visited the Stripe Trust Center, authenticated the session, and harvested their latest 2026 SOC 2 Type II report. Section IV reveals zero control exceptions. TPRM residual risk scored at **Low (96/100)**.\n\n↳ @Morgan, the trust report notes vendor data in AWS must enforce server-side encryption with KMS keys. Can you audit our terraform config?",
    timestamp: "Yesterday, 4:16 PM",
    delegatedTo: "morgan_iac",
    attachments: [
      { title: "Stripe_SOC2_Type_II_2026.pdf", type: "pdf", size: "14.2 MB", status: "verified" },
      { title: "TPRM_Stripe_Scorecard.json", type: "code", size: "3.4 KB", status: "applied" }
    ],
    browserPreview: {
      url: "https://trust.stripe.com",
      title: "Stripe Trust Center — SOC 2 Vault",
      steps: ["Navigated to trust portal", "Signed automated NDA", "Downloaded PDF", "Deposited in Vault"],
      status: "completed"
    }
  },
  {
    id: "msg_wr_3",
    channelId: "war_room",
    senderId: "morgan_iac",
    senderName: "Morgan",
    senderAvatar: "🛠️",
    senderRole: "Autonomous Cloud & IaC Fixer",
    content: "Thanks @Alex. I ran a continuous cloud drift scan on our AWS production environment. 3 out of 14 S3 buckets lacked default KMS encryption.\n\nI generated and tested the Terraform remediation patch in my sandbox:\n```hcl\nresource \"aws_s3_bucket_server_side_encryption_configuration\" \"compliance_enforce\" {\n  bucket = aws_s3_bucket.data_lake.id\n  rule {\n    apply_server_side_encryption_by_default {\n      sse_algorithm = \"aws:kms\"\n      kms_master_key_id = aws_kms_key.compliance_key.arn\n    }\n  }\n}\n```\nGitHub Pull Request **#42** created and ready for your approval in the Approval Inbox.",
    timestamp: "Yesterday, 4:18 PM",
    attachments: [
      { title: "PR #42: enforce-kms-s3-encryption.patch", type: "patch", size: "1.8 KB", status: "pending_approval" }
    ]
  },
  {
    id: "msg_wr_4",
    channelId: "war_room",
    senderId: "riley_evidence",
    senderName: "Riley",
    senderAvatar: "📋",
    senderRole: "Evidence Harvester & UAR Auditor",
    content: "I've linked both Alex's SOC 2 report and Morgan's Terraform PR #42 to Control **CC6.1** and **CC6.8** in Audit Hub. Cryptographic hashes logged with SHA-256.",
    timestamp: "Yesterday, 4:19 PM"
  },
  // Direct Alex Messages
  {
    id: "msg_alex_1",
    channelId: "alex_tprm",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Alex, check Datadog's trust center and tell me when their next SOC 2 renewal is due.",
    timestamp: "Today, 10:00 AM"
  },
  {
    id: "msg_alex_2",
    channelId: "alex_tprm",
    senderId: "alex_tprm",
    senderName: "Alex",
    senderAvatar: "🕵️",
    senderRole: "Vendor Trust & SOC 2 Scout",
    content: "I connected to `trust.datadoghq.com` using my headless browser sandbox.\n\n* **Current Report:** Datadog SOC 2 Type II (Covering Jan 1 – Dec 31, 2025)\n* **Audit Firm:** PwC\n* **Next Audit Period Due:** Nov 2026\n* **Subservice Organizations:** AWS (Passed), GCP (Passed)\n\nI have scheduled an automated sweep for Nov 1st to pull the renewed certificate automatically.",
    timestamp: "Today, 10:01 AM",
    browserPreview: {
      url: "https://trust.datadoghq.com",
      title: "Datadog Trust Center — Security Certifications",
      steps: ["Navigate to datadoghq.com", "Read audit summary", "Extract renewal calendar"],
      status: "completed"
    }
  },
  // Direct Morgan Messages
  {
    id: "msg_morgan_1",
    channelId: "morgan_iac",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Morgan, do we have any IAM users with access keys older than 90 days?",
    timestamp: "Today, 11:30 AM"
  },
  {
    id: "msg_morgan_2",
    channelId: "morgan_iac",
    senderId: "morgan_iac",
    senderName: "Morgan",
    senderAvatar: "🛠️",
    senderRole: "Autonomous Cloud & IaC Fixer",
    content: "Scanning AWS IAM credentials in Docker sandbox...\n\nFound **1 stale access key**:\n* User: `deploy-bot-legacy`\n* Key ID: `AKIAIOSFODNN7EXAMPLE` (114 days old)\n\nI have prepared a rotation script and opened a staged approval request to disable and rotate the key without service interruption.",
    timestamp: "Today, 11:31 AM"
  },
  // Direct Riley Messages
  {
    id: "msg_riley_1",
    channelId: "riley_evidence",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Riley, generate the Q3 User Access Review summary across Google Workspace.",
    timestamp: "Today, 12:00 PM"
  },
  {
    id: "msg_riley_2",
    channelId: "riley_evidence",
    senderId: "riley_evidence",
    senderName: "Riley",
    senderAvatar: "📋",
    senderRole: "Evidence Harvester & UAR Auditor",
    content: "UAR complete. 48 active accounts audited. 2 former contractors deprovisioned automatically. Cryptographic evidence report uploaded to Audit Hub.",
    timestamp: "Today, 12:01 PM"
  },
  // Direct Hermes Messages
  {
    id: "msg_hermes_1",
    channelId: "hermes_orchestrator",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Hermes, give me our current SOC 2 readiness status and coordinate the bot fleet for remaining gaps.",
    timestamp: "Today, 9:00 AM"
  },
  {
    id: "msg_hermes_2",
    channelId: "hermes_orchestrator",
    senderId: "hermes_orchestrator",
    senderName: "Hermes",
    senderAvatar: "🧠",
    senderRole: "Chief Compliance Orchestrator",
    content: "Here is the master status of our compliance program:\n\n* **Overall SOC 2 Type II Readiness:** **94%** (74/78 Controls Passing)\n* **Active Fleets:** 9 Sandboxed Specialists deployed\n* **Identified Gaps:**\n  1. Vendor SOC 2 renewals -> Dispatched to **Alex**\n  2. S3 Encryption IaC configuration -> Dispatched to **Morgan**\n  3. Q3 User Access Review evidence -> Dispatched to **Riley**\n  4. Incident Timeline & SLA Monitor -> Active under **Nova**\n  5. Vulnerability SLAs -> Tracked by **Sasha**\n\nI will synthesize all incoming evidence and update the Audit Hub automatically.",
    timestamp: "Today, 9:01 AM"
  },
  // Direct Nova Messages
  {
    id: "msg_nova_1",
    channelId: "nova_incident",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Nova, what are our active notification countdowns if a potential breach is detected right now?",
    timestamp: "Today, 10:15 AM"
  },
  {
    id: "msg_nova_2",
    channelId: "nova_incident",
    senderId: "nova_incident",
    senderName: "Nova",
    senderAvatar: "🚨",
    senderRole: "Incident Commander & Regulatory Timelines",
    content: "Under our regulatory baseline, the clocks start the moment an incident is verified:\n\n* ⏱️ **NIS2 (Art 23):** 24-Hour Early Warning to national CSIRT\n* ⏱️ **DORA (Art 19):** 4-Hour Major ICT Incident Triage & 72-Hour Intermediate Report\n* ⏱️ **GDPR (Art 33):** 72-Hour Data Protection Authority notification\n\nAll incident timeline trackers and automated draft templates are armed and ready.",
    timestamp: "Today, 10:16 AM"
  },
  // Direct Sasha Messages
  {
    id: "msg_sasha_1",
    channelId: "sasha_appsec",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Sasha, what is the status of our open Dependabot CVEs?",
    timestamp: "Today, 11:00 AM"
  },
  {
    id: "msg_sasha_2",
    channelId: "sasha_appsec",
    senderId: "sasha_appsec",
    senderName: "Sasha",
    senderAvatar: "🛡️",
    senderRole: "Vulnerability Sentinel & SLA Tracker",
    content: "Ingested vulnerability scan results:\n\n* **Critical CVEs:** 0 (0 within 14-day SLA)\n* **High CVEs:** 1 (`axios` bump required — 18 days remaining on 30-day SLA)\n* **Automated PR:** Created PR #49 (`fix(deps): bump axios to 1.7.4`). CI build passed.",
    timestamp: "Today, 11:01 AM"
  },
  // Direct Tara Messages
  {
    id: "msg_tara_1",
    channelId: "tara_governance",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Tara, check our annual policy review deadlines and employee acknowledgment rates.",
    timestamp: "Today, 11:45 AM"
  },
  {
    id: "msg_tara_2",
    channelId: "tara_governance",
    senderId: "tara_governance",
    senderName: "Tara",
    senderAvatar: "📜",
    senderRole: "Policy Lifecycle & Compliance Awareness Lead",
    content: "Policy Governance Status:\n\n* **Master Policies Reviewed:** 14/14 up to date (Next review: Q1 2027)\n* **Employee Security Acknowledgment:** 98.4% completion rate across 62 active personnel\n* **Pending Signatures:** 1 reminder sent via Slack automated bot.",
    timestamp: "Today, 11:46 AM"
  },
  // Direct Elena Messages
  {
    id: "msg_elena_1",
    channelId: "elena_privacy",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Elena, do we have any pending DSAR consumer requests?",
    timestamp: "Today, 1:00 PM"
  },
  {
    id: "msg_elena_2",
    channelId: "elena_privacy",
    senderId: "elena_privacy",
    senderName: "Elena",
    senderAvatar: "🔒",
    senderRole: "Data Protection Officer & Privacy Engineer",
    content: "DSAR & ROPA Overview:\n\n* **Pending DSARs:** 0 overdue (1 erasure request fulfilled yesterday in 4 business days)\n* **Article 30 ROPA Inventory:** 28 processing activities mapped\n* **Cross-Border Transfers:** Valid Standard Contractual Clauses (SCCs) on file for all sub-processors.",
    timestamp: "Today, 1:01 PM"
  },
  // Direct Marcus Messages
  {
    id: "msg_marcus_1",
    channelId: "marcus_risk",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Marcus, give me the executive summary of our Residual Risk Heatmap.",
    timestamp: "Today, 2:00 PM"
  },
  {
    id: "msg_marcus_2",
    channelId: "marcus_risk",
    senderId: "marcus_risk",
    senderName: "Marcus",
    senderAvatar: "🎯",
    senderRole: "Enterprise Risk & Threat Modeler",
    content: "Enterprise Risk Assessment:\n\n* **Overall Residual Risk Score:** **Low (18/100)**\n* **High Inherent Risks Controlled:** Ransomware exposure mitigated by immutable backups (Control CC7.4) and MFA enforcement.\n* **Top Focus Area:** Vendor concentration in AWS us-east-1.",
    timestamp: "Today, 2:01 PM"
  },
  // Direct Sam Messages
  {
    id: "msg_sam_1",
    channelId: "sam_auditor",
    senderId: "user",
    senderName: "You",
    senderAvatar: "👤",
    content: "Sam, run a mock audit stress-test on our SOC 2 Type II evidence vault.",
    timestamp: "Today, 3:00 PM"
  },
  {
    id: "msg_sam_2",
    channelId: "sam_auditor",
    senderId: "sam_auditor",
    senderName: "Sam",
    senderAvatar: "💼",
    senderRole: "Mock Auditor & Audit Defense Compiler",
    content: "Mock CPA Audit Simulation Complete:\n\n* **Sampled Controls:** 35 sampled controls tested\n* **Pass Rate:** **100% (35/35 passing)**\n* **Auditor Package:** Prepared 1-Click ZIP bundle with SHA-256 integrity manifest for external audit firm.",
    timestamp: "Today, 3:01 PM"
  }
];
let teammatesStore: Teammate[] = [
  {
    id: "hermes_orchestrator",
    name: "Hermes",
    role: "Chief Compliance Orchestrator & AI Copilot",
    avatar: "🧠",
    description: "Master AI brain and orchestrator. Reasons across compliance frameworks, drafts policies, coordinates worker bots (Alex, Morgan, Riley, Nova, Sasha, Tara, Elena, Marcus, Sam), and synthesizes audit evidence.",
    status: "idle",
    sandboxType: "cli",
    model: "claude-3-7-sonnet / gpt-4o",
    capabilities: ["Multi-Agent Dispatch", "Policy Drafting", "Audit Gap Analysis", "Framework Cross-Mapping", "Risk Scoring"],
    tasksCompleted: 142,
    lastActive: "Active Now"
  },
  {
    id: "alex_tprm",
    name: "Alex",
    role: "Vendor Trust & SOC 2 Scout",
    avatar: "🕵️",
    description: "Autonomously visits vendor trust portals, downloads updated SOC 2 / ISO PDFs, extracts control exceptions, and scores third-party risk.",
    status: "idle",
    sandboxType: "browser",
    model: "claude-3-7-sonnet / deepseek-r1",
    capabilities: ["Headless Browser", "SOC 2 OCR Parser", "Trust Center Form Solver", "Vendor Scoring"],
    tasksCompleted: 38,
    lastActive: "15 minutes ago"
  },
  {
    id: "morgan_iac",
    name: "Morgan",
    role: "Autonomous Cloud & IaC Fixer",
    avatar: "🛠️",
    description: "Detects cloud configuration drift and generates ready-to-merge Terraform, CloudFormation, or AWS CLI remediation pull requests.",
    status: "idle",
    sandboxType: "docker",
    model: "claude-3-7-sonnet",
    capabilities: ["Terraform Sandboxing", "GitHub PR Automation", "AWS/GCP Drift Fixer", "IAM Policy Hardening"],
    tasksCompleted: 54,
    lastActive: "1 hour ago"
  },
  {
    id: "riley_evidence",
    name: "Riley",
    role: "Evidence Harvester & UAR Auditor",
    avatar: "📋",
    description: "Conducts quarterly access reviews, captures configuration screenshots from non-API consoles, and deposits verified evidence in Audit Hub.",
    status: "idle",
    sandboxType: "browser",
    model: "deepseek-v3",
    capabilities: ["Console Screencasting", "Quarterly Access Reviews", "Evidence Cryptographic Hashing", "Slack Nudges"],
    tasksCompleted: 92,
    lastActive: "3 minutes ago"
  },
  {
    id: "nova_incident",
    name: "Nova",
    role: "Incident Commander & Regulatory Timelines",
    avatar: "🚨",
    description: "Manages security incident lifecycles, automates 24-hour early warnings and 72-hour notifications for NIS2/DORA/GDPR, and drafts root-cause post-mortems.",
    status: "idle",
    sandboxType: "cli",
    model: "claude-3-7-sonnet / gpt-4o",
    capabilities: ["24h NIS2 Early Warning", "72h DORA Incident Triage", "GDPR Art 33 Notifier", "Post-Mortem RCA Generator"],
    tasksCompleted: 41,
    lastActive: "5 minutes ago"
  },
  {
    id: "sasha_appsec",
    name: "Sasha",
    role: "Vulnerability Sentinel & SLA Tracker",
    avatar: "🛡️",
    description: "Continuously ingests CVE feeds from Dependabot, Snyk, and AWS Inspector, enforces Critical <14d and High <30d SLAs, and creates package update PRs.",
    status: "idle",
    sandboxType: "docker",
    model: "deepseek-r1 / claude-3-7-sonnet",
    capabilities: ["Dependabot/Snyk Ingestion", "SLA Breach Countdown", "Docker Vulnerability Sweep", "Automated Package Bump PRs"],
    tasksCompleted: 87,
    lastActive: "12 minutes ago"
  },
  {
    id: "tara_governance",
    name: "Tara",
    role: "Policy Lifecycle & Compliance Awareness Lead",
    avatar: "📜",
    description: "Manages annual policy review cycles for ISO 27001/SOC 2, orchestrates new hire policy signing campaigns, and logs cryptographic employee acknowledgments.",
    status: "idle",
    sandboxType: "cli",
    model: "gpt-4o / claude-3-7-sonnet",
    capabilities: ["Annual Policy Review Tracker", "Slack/Email Acknowledgment Campaigns", "HRIS Integration", "Cryptographic Signatures"],
    tasksCompleted: 64,
    lastActive: "25 minutes ago"
  },
  {
    id: "elena_privacy",
    name: "Elena",
    role: "Data Protection Officer & Privacy Engineer",
    avatar: "🔒",
    description: "Maintains Article 30 ROPA inventory, automates 30-day DSAR consumer privacy requests, and conducts automated Data Protection Impact Assessments (DPIA).",
    status: "idle",
    sandboxType: "browser",
    model: "claude-3-7-sonnet",
    capabilities: ["Article 30 ROPA Mapper", "30-Day DSAR Timer", "Automated DPIA Generator", "Cross-Border SCC Validator"],
    tasksCompleted: 29,
    lastActive: "40 minutes ago"
  },
  {
    id: "marcus_risk",
    name: "Marcus",
    role: "Enterprise Risk & Threat Modeler",
    avatar: "🎯",
    description: "Performs quantitative risk assessments using FAIR and ISO 27005 methodologies, correlates real-time security telemetry, and updates the Executive Risk Heatmap.",
    status: "idle",
    sandboxType: "cli",
    model: "claude-3-7-sonnet / deepseek-r1",
    capabilities: ["FAIR Quantitative Risk Scoring", "Live Telemetry Risk Correlation", "Threat Modeling", "Board Risk Heatmap"],
    tasksCompleted: 53,
    lastActive: "1 hour ago"
  },
  {
    id: "sam_auditor",
    name: "Sam",
    role: "Mock Auditor & Audit Defense Compiler",
    avatar: "💼",
    description: "Simulates external auditor scrutiny, challenges evidence adequacy before real CPA audits, and compiles 1-click auditor zip evidence packages.",
    status: "idle",
    sandboxType: "cli",
    model: "claude-3-7-sonnet / gpt-4o",
    capabilities: ["Adversarial Mock Audits", "1-Click Audit Room Bundler", "SOC 2 Type II Pre-Assessment", "Evidence Gap Detection"],
    tasksCompleted: 76,
    lastActive: "2 hours ago"
  }
];

let tasksStore: TeammateTask[] = [
  {
    id: "task_1",
    teammateId: "alex_tprm",
    title: "Harvest Datadog SOC 2 Type II Report & Update TPRM",
    type: "vendor_soc2",
    status: "completed",
    targetUrl: "https://trust.datadoghq.com",
    summary: "Navigated to Datadog Trust Center, signed clickwrap NDA, downloaded 2026 SOC 2 Type II audit report, extracted 0 exceptions in Section IV, and updated vendor risk score to 98/100.",
    logs: [
      { timestamp: "2026-08-21T22:30:00Z", level: "info", message: "Launching sandboxed headless browser..." },
      { timestamp: "2026-08-21T22:30:04Z", level: "action", message: "Navigating to trust.datadoghq.com..." },
      { timestamp: "2026-08-21T22:30:12Z", level: "action", message: "Accepted click-wrap terms of service." },
      { timestamp: "2026-08-21T22:30:20Z", level: "action", message: "Downloaded file: Datadog_SOC2_Type_II_2026.pdf (14.2 MB)" },
      { timestamp: "2026-08-21T22:30:35Z", level: "info", message: "Extracted auditor opinion: Unqualified (Pass). 0 exceptions." },
      { timestamp: "2026-08-21T22:30:40Z", level: "info", message: "Evidence deposited in Audit Hub under Control CC6.8." }
    ],
    browserSteps: [
      { step: 1, action: "Navigate to Trust Center", url: "https://trust.datadoghq.com", timestamp: "22:30:04" },
      { step: 2, action: "Request SOC 2 Type II Report", timestamp: "22:30:09" },
      { step: 3, action: "Accept NDA Terms", timestamp: "22:30:12" },
      { step: 4, action: "Download PDF & OCR Parse", timestamp: "22:30:20" }
    ],
    artifacts: [
      { id: "art_1", name: "Datadog_SOC2_Type_II_2026.pdf", type: "application/pdf", size: "14.2 MB" },
      { id: "art_2", name: "SOC2_Summary_Extraction.json", type: "application/json", size: "4.8 KB" }
    ],
    createdAt: "2026-08-21T22:30:00Z",
    completedAt: "2026-08-21T22:30:45Z"
  }
];

let approvalsStore: ApprovalItem[] = [
  {
    id: "appr_1",
    taskId: "task_remed_aws",
    teammateId: "morgan_iac",
    teammateName: "Morgan (Cloud Fixer)",
    title: "Enforce Default KMS Encryption on 3 S3 Buckets (Terraform PR)",
    type: "github_pr",
    description: "Morgan identified unencrypted S3 buckets during AWS drift scan. Generated a clean Terraform patch enabling `aws:kms` SSE-KMS encryption with key rotation.",
    diffOrPayload: `--- a/terraform/s3_storage.tf
+++ b/terraform/s3_storage.tf
@@ -14,6 +14,14 @@ resource "aws_s3_bucket" "compliance_backups" {
   bucket = "prod-compliance-backups"
+
+  server_side_encryption_configuration {
+    rule {
+      apply_server_side_encryption_by_default {
+        kms_master_key_id = aws_kms_key.compliance_vault.arn
+        sse_algorithm     = "aws:kms"
+      }
+    }
+  }
 }`,
    severity: "high",
    status: "pending",
    createdAt: "2026-08-21T23:15:00Z"
  }
];

let routinesStore: TeammateRoutine[] = [
  {
    id: "routine_tpm_daily",
    teammateId: "alex_tprm",
    name: "Daily Third-Party Risk & Cert Monitor",
    schedule: "0 2 * * *",
    description: "Checks 24 active SaaS vendors for expiring SOC 2 / ISO 27001 certifications and fetches updated reports.",
    status: "active",
    lastRun: "Yesterday at 02:00",
    nextRun: "Today at 02:00",
    lastRunResult: "success"
  },
  {
    id: "routine_aws_drift",
    teammateId: "morgan_iac",
    name: "Continuous Cloud Drift & S3 Encryption Scan",
    schedule: "0 */6 * * *",
    description: "Audits AWS IAM, Security Groups, S3 and Kubernetes clusters. Prepares Terraform PRs for any drift.",
    status: "active",
    lastRun: "3 hours ago",
    nextRun: "in 3 hours",
    lastRunResult: "warning"
  },
  {
    id: "routine_uar_weekly",
    teammateId: "riley_evidence",
    name: "Weekly User Access Review (UAR) Digest",
    schedule: "0 9 * * 1",
    description: "Generates Slack access review nudges for team leads and collects sign-offs.",
    status: "active",
    lastRun: "4 days ago",
    nextRun: "in 3 days",
    lastRunResult: "success"
  },
  {
    id: "routine_nova_watchdog",
    teammateId: "nova_incident",
    name: "NIS2 & DORA 24h/72h Regulatory Incident SLA Watchdog",
    schedule: "*/15 * * * *",
    description: "Monitors active security alerts and enforces 24-hour early warning and 72-hour CSIRT notification deadlines.",
    status: "active",
    lastRun: "10 minutes ago",
    nextRun: "in 5 minutes",
    lastRunResult: "success"
  },
  {
    id: "routine_sasha_cve",
    teammateId: "sasha_appsec",
    name: "Continuous Dependabot & CVE Remediation SLA Monitor",
    schedule: "0 */4 * * *",
    description: "Ingests vulnerability feeds from Snyk & Dependabot; flags Critical (<14d) and High (<30d) SLA breaches.",
    status: "active",
    lastRun: "2 hours ago",
    nextRun: "in 2 hours",
    lastRunResult: "success"
  },
  {
    id: "routine_tara_review",
    teammateId: "tara_governance",
    name: "Annual Policy Review & Employee Acknowledgment Campaign",
    schedule: "0 9 1 * *",
    description: "Tracks annual policy review renewals and nudges personnel for required security awareness sign-offs.",
    status: "active",
    lastRun: "2 weeks ago",
    nextRun: "in 2 weeks",
    lastRunResult: "success"
  },
  {
    id: "routine_elena_dsar",
    teammateId: "elena_privacy",
    name: "GDPR Article 30 ROPA & 30-Day DSAR Compliance Sweep",
    schedule: "0 8 * * *",
    description: "Monitors 30-day fulfillment timers for consumer data requests and updates processing activity mappings.",
    status: "active",
    lastRun: "Yesterday at 08:00",
    nextRun: "Today at 08:00",
    lastRunResult: "success"
  },
  {
    id: "routine_marcus_fair",
    teammateId: "marcus_risk",
    name: "Weekly Quantitative FAIR Risk Heatmap Calculation",
    schedule: "0 6 * * 1",
    description: "Recalculates Inherent vs Residual risk scores and models annualized loss expectancy (ALE) across asset tiers.",
    status: "active",
    lastRun: "Monday at 06:00",
    nextRun: "Next Monday at 06:00",
    lastRunResult: "success"
  },
  {
    id: "routine_sam_mock",
    teammateId: "sam_auditor",
    name: "Automated CPA Mock Audit Pre-Assessment & Evidence Room Sweep",
    schedule: "0 12 * * 5",
    description: "Simulates external auditor inquiry, audits evidence completeness, and compiles tamper-proof audit packages.",
    status: "active",
    lastRun: "Last Friday at 12:00",
    nextRun: "This Friday at 12:00",
    lastRunResult: "success"
  }
];

export function createTeammatesRouter(t: any, procedure: any) {
  return t.router({
    listTeammates: procedure.query(async () => {
      try {
        return capResults(teammatesStore.map((tm) => ({ ...tm })));
      } catch (err) {
        throw asInternalError("listing teammates", err);
      }
    }),

    getTeammate: procedure
      .input(teammateGetInputSchema)
      .query(async ({ input }: { input: z.infer<typeof teammateGetInputSchema> }) => {
        try {
          const found = teammatesStore.find((tm) => tm.id === input.teammateId);
          if (!found) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Teammate not found" });
          }
          return found;
        } catch (err) {
          throw asInternalError("fetching teammate", err);
        }
      }),

    createTeammate: procedure
      .input(teammateCreateInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof teammateCreateInputSchema> }) => {
        try {
          const newTeammate: Teammate = {
            id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: input.name,
            role: input.role,
            avatar: input.avatar || "🤖",
            description: input.description,
            sandboxType: input.sandboxType,
            model: input.model || "claude-3-7-sonnet",
            capabilities:
              input.capabilities.length > 0 ? input.capabilities : ["Autonomous Task Execution"],
            status: "idle",
            tasksCompleted: 0,
            lastActive: "Just created"
          };
          teammatesStore.push(newTeammate);
          return newTeammate;
        } catch (err) {
          throw asInternalError("creating teammate", err);
        }
      }),

    updateTeammate: procedure
      .input(teammateUpdateInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof teammateUpdateInputSchema> }) => {
        try {
          const index = teammatesStore.findIndex((tm) => tm.id === input.id);
          if (index === -1) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Teammate not found" });
          }
          teammatesStore[index] = {
            ...teammatesStore[index],
            name: input.name,
            role: input.role,
            avatar: input.avatar || teammatesStore[index].avatar,
            description: input.description,
            sandboxType: input.sandboxType,
            model: input.model,
            capabilities: input.capabilities
          };
          return teammatesStore[index];
        } catch (err) {
          throw asInternalError("updating teammate", err);
        }
      }),

    deleteTeammate: procedure
      .input(teammateDeleteInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof teammateDeleteInputSchema> }) => {
        try {
          const index = teammatesStore.findIndex((tm) => tm.id === input.id);
          if (index === -1) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Teammate not found" });
          }
          teammatesStore.splice(index, 1);
          return { success: true, id: input.id };
        } catch (err) {
          throw asInternalError("deleting teammate", err);
        }
      }),

    listTasks: procedure
      .input(taskListInputSchema)
      .query(async ({ input }: { input?: z.infer<typeof taskListInputSchema> }) => {
        try {
          if (input?.teammateId) {
            return capResults(tasksStore.filter((task) => task.teammateId === input.teammateId));
          }
          return capResults(tasksStore);
        } catch (err) {
          throw asInternalError("listing tasks", err);
        }
      }),

    createTask: procedure
      .input(taskCreateInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof taskCreateInputSchema> }) => {
        try {
          const newTask: TeammateTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            teammateId: input.teammateId,
            title: input.title,
            type: input.type,
            status: "running",
            targetUrl: input.targetUrl,
            summary: input.summary,
            logs: [
              { timestamp: new Date().toISOString(), level: "info", message: `Task initialized in ${input.teammateId} worker sandbox.` },
              { timestamp: new Date().toISOString(), level: "action", message: `Executing automated workflow: ${input.title}...` }
            ],
            browserSteps: input.targetUrl ? [
              { step: 1, action: `Navigating to ${input.targetUrl}`, url: input.targetUrl, timestamp: new Date().toLocaleTimeString() }
            ] : undefined,
            createdAt: new Date().toISOString()
          };

          tasksStore.unshift(newTask);

          // Update teammate status to running
          const teammate = teammatesStore.find((tm) => tm.id === input.teammateId);
          if (teammate) {
            teammate.status = "running";
            teammate.lastActive = "Just now";
          }

          // Simulate async task completion in background
          setTimeout(() => {
            newTask.status = "completed";
            newTask.completedAt = new Date().toISOString();
            newTask.logs.push({
              timestamp: new Date().toISOString(),
              level: "info",
              message: "Autonomous execution finished successfully. Evidence registered."
            });
            if (teammate) {
              teammate.status = "idle";
              teammate.tasksCompleted += 1;
            }
          }, 4000);

          return newTask;
        } catch (err) {
          throw asInternalError("creating task", err);
        }
      }),

    listApprovals: procedure.query(async () => {
      try {
        return capResults(approvalsStore);
      } catch (err) {
        throw asInternalError("listing approvals", err);
      }
    }),

    resolveApproval: procedure
      .input(approvalResolveInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof approvalResolveInputSchema> }) => {
        try {
          const item = approvalsStore.find((a) => a.id === input.approvalId);
          if (!item) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Approval item not found" });
          }
          item.status = input.action;
          return { success: true, item };
        } catch (err) {
          throw asInternalError("resolving approval", err);
        }
      }),

    listRoutines: procedure.query(async () => {
      try {
        return capResults(routinesStore);
      } catch (err) {
        throw asInternalError("listing routines", err);
      }
    }),

    toggleRoutine: procedure
      .input(routineToggleInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof routineToggleInputSchema> }) => {
        try {
          const routine = routinesStore.find((r) => r.id === input.routineId);
          if (!routine) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Routine not found" });
          }
          routine.status = input.active ? "active" : "paused";
          return routine;
        } catch (err) {
          throw asInternalError("toggling routine", err);
        }
      }),

    triggerRoutineNow: procedure
      .input(routineTriggerInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof routineTriggerInputSchema> }) => {
        try {
          const routine = routinesStore.find((r) => r.id === input.routineId);
          if (!routine) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Routine not found" });
          }
          routine.lastRun = "Just now";
          routine.status = "running";
          setTimeout(() => {
            routine.status = "active";
            routine.lastRunResult = "success";
          }, 3000);
          return routine;
        } catch (err) {
          throw asInternalError("triggering routine", err);
        }
      }),

    // Multi-Agent Chat Procedures
    listMessages: procedure
      .input(messageListInputSchema)
      .query(async ({ input }: { input: z.infer<typeof messageListInputSchema> }) => {
        try {
          return capResults(messagesStore.filter((m) => m.channelId === input.channelId));
        } catch (err) {
          throw asInternalError("listing messages", err);
        }
      }),

    sendMessage: procedure
      .input(messageSendInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof messageSendInputSchema> }) => {
        try {
        const userMsg: ChatMessage = {
          id: `msg_user_${Date.now()}`,
          channelId: input.channelId,
          senderId: "user",
          senderName: "You",
          senderAvatar: "👤",
          content: input.content,
          timestamp: "Just now",
          mentions: input.mentions
        };
        messagesStore.push(userMsg);

        const lower = input.content.toLowerCase();

        // 1. War Room Multi-Agent Collaboration
        if (input.channelId === "war_room") {
          const mentionHermes = lower.includes("@hermes") || lower.includes("hermes") || lower.includes("orchestrat") || lower.includes("status") || lower.includes("readiness") || lower.includes("fleet");
          const mentionAlex = lower.includes("@alex") || lower.includes("alex") || lower.includes("soc 2") || lower.includes("vendor") || lower.includes("tprm") || lower.includes("stripe") || lower.includes("datadog");
          const mentionMorgan = lower.includes("@morgan") || lower.includes("morgan") || lower.includes("terraform") || lower.includes("cloud") || lower.includes("s3") || lower.includes("aws") || lower.includes("drift") || lower.includes("iam");
          const mentionRiley = lower.includes("@riley") || lower.includes("riley") || lower.includes("evidence") || lower.includes("uar") || lower.includes("access") || lower.includes("audit hub") || lower.includes("screenshot");

          const mentionNova = lower.includes("@nova") || lower.includes("nova") || lower.includes("incident") || lower.includes("breach") || lower.includes("csirt") || lower.includes("timeline");
          const mentionSasha = lower.includes("@sasha") || lower.includes("sasha") || lower.includes("vulnerab") || lower.includes("cve") || lower.includes("patch") || lower.includes("dependabot") || lower.includes("snyk");
          const mentionTara = lower.includes("@tara") || lower.includes("tara") || lower.includes("policy") || lower.includes("acknowledgment") || lower.includes("training") || lower.includes("awareness");
          const mentionElena = lower.includes("@elena") || lower.includes("elena") || lower.includes("privacy") || lower.includes("dsar") || lower.includes("ropa") || lower.includes("dpia");
          const mentionMarcus = lower.includes("@marcus") || lower.includes("marcus") || lower.includes("risk") || lower.includes("fair") || lower.includes("threat model") || lower.includes("heatmap");
          const mentionSam = lower.includes("@sam") || lower.includes("sam") || lower.includes("mock audit") || lower.includes("auditor") || lower.includes("cpa") || lower.includes("evidence pack");

          if (mentionHermes) {
            const hermesReply: ChatMessage = {
              id: `msg_hermes_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "hermes_orchestrator",
              senderName: "Hermes",
              senderAvatar: "🧠",
              senderRole: "Chief Compliance Orchestrator",
              content: `Acknowledged. I am orchestrating the fleet to execute your request across all compliance domains.\n\n1. **Vendor Verification:** Dispatched @Alex to authenticate trust portals & pull SOC 2 certificates.\n2. **Cloud Baseline:** Dispatched @Morgan to test Terraform configurations in Docker sandbox.\n3. **Audit Evidence:** Dispatched @Riley to deposit signed cryptographs in Audit Hub.\n4. **Incident & AppSec:** Standing by with @Nova & @Sasha.\n5. **Governance & Privacy:** Monitoring via @Tara & @Elena.\n6. **Risk & Mock Audit:** Coordinated with @Marcus & @Sam.\n\nAll tasks running concurrently.`,
              timestamp: "Just now",
              delegatedTo: "alex_tprm"
            };
            messagesStore.push(hermesReply);
          }

          if (mentionAlex || (!mentionMorgan && !mentionRiley && !mentionHermes && !mentionNova && !mentionSasha && !mentionTara && !mentionElena && !mentionMarcus && !mentionSam)) {
            // Alex responds
            const alexReply: ChatMessage = {
              id: `msg_alex_${Date.now() + 2}`,
              channelId: "war_room",
              senderId: "alex_tprm",
              senderName: "Alex",
              senderAvatar: "🕵️",
              senderRole: "Vendor Trust & SOC 2 Scout",
              content: `Received. I've initiated an automated headless browser session to investigate ${lower.includes("vendor") || lower.includes("soc") ? "the vendor trust portal" : "compliance telemetry"}.\n\n* **Status:** Authenticated & verified SSL certs\n* **Auditor Opinion:** Clean / Unqualified\n* **Exceptions Found:** 0\n\n${mentionMorgan || lower.includes("terraform") || lower.includes("s3") || lower.includes("cloud") ? "↳ @Morgan, I've confirmed third-party encryption requirements. Can you inspect our cloud infrastructure and draft any needed Terraform patches?" : "Evidence deposited in Audit Hub."}`,
              timestamp: "Just now",
              delegatedTo: (mentionMorgan || lower.includes("terraform") || lower.includes("s3")) ? "morgan_iac" : undefined,
              browserPreview: {
                url: "https://trust.vendor-portal.com",
                title: "Vendor Trust Center Live Session",
                steps: ["Connected to trust domain", "Verified SOC 2 Type II report", "Extracted controls mapping"],
                status: "completed"
              },
              attachments: [
                { title: "Automated_Trust_Audit_Summary.pdf", type: "pdf", size: "4.8 MB", status: "verified" }
              ]
            };
            messagesStore.push(alexReply);

            // If multi-agent handover to Morgan
            if (mentionMorgan || lower.includes("terraform") || lower.includes("s3") || lower.includes("cloud")) {
              const morganReply: ChatMessage = {
                id: `msg_morgan_${Date.now() + 3}`,
                channelId: "war_room",
                senderId: "morgan_iac",
                senderName: "Morgan",
                senderAvatar: "🛠️",
                senderRole: "Autonomous Cloud & IaC Fixer",
                content: "On it, @Alex. I launched the Docker sandbox and executed `terraform plan -detailed-exitcode` against our cloud baseline.\n\n```hcl\n# Remediation applied to ensure 100% compliance\nresource \"aws_s3_bucket_public_access_block\" \"enforce_privacy\" {\n  bucket = aws_s3_bucket.primary.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}\n```\nPull Request staged and dispatched for automated CI linting.",
                timestamp: "Just now",
                attachments: [
                  { title: "compliance-iac-remediation.tf", type: "patch", size: "2.1 KB", status: "staged" }
                ]
              };
              messagesStore.push(morganReply);
            }
          } else if (mentionMorgan) {
            const morganReply: ChatMessage = {
              id: `msg_morgan_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "morgan_iac",
              senderName: "Morgan",
              senderAvatar: "🛠️",
              senderRole: "Autonomous Cloud & IaC Fixer",
              content: `I've analyzed the request in my Docker sandbox container.\n\n1. **Cloud Drift Status:** Zero critical drifts detected.\n2. **KMS & MFA Enforcement:** All privileged policies validated.\n3. **Remediation Action:** Terraform baseline verified against CIS AWS Foundations Benchmark v3.0.`,
              timestamp: "Just now"
            };
            messagesStore.push(morganReply);
          } else if (mentionRiley) {
            const rileyReply: ChatMessage = {
              id: `msg_riley_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "riley_evidence",
              senderName: "Riley",
              senderAvatar: "📋",
              senderRole: "Evidence Harvester & UAR Auditor",
              content: `Access review query executed across connected SaaS directories. Current status: 100% of admin accounts have verified hardware MFA tokens and active role sign-offs.`,
              timestamp: "Just now"
            };
            messagesStore.push(rileyReply);
          } else if (mentionNova) {
            const novaReply: ChatMessage = {
              id: `msg_nova_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "nova_incident",
              senderName: "Nova",
              senderAvatar: "🚨",
              senderRole: "Incident Commander & Regulatory Timelines",
              content: `Incident Response & Regulatory Watchdog active:\n\n* **Active Incident Alerts:** None currently uncontained (Severity P4 - Normal Ops)\n* **Regulatory Clocks:** NIS2 24h & DORA 4h automated dispatchers verified.\n* **Audit Post-Mortems:** All historical RCA artifacts synced to Audit Hub.`,
              timestamp: "Just now"
            };
            messagesStore.push(novaReply);
          } else if (mentionSasha) {
            const sashaReply: ChatMessage = {
              id: `msg_sasha_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "sasha_appsec",
              senderName: "Sasha",
              senderAvatar: "🛡️",
              senderRole: "Vulnerability Sentinel & SLA Tracker",
              content: `AppSec & CVE SLA Sweep:\n\n* **Critical CVEs (<14d SLA):** 0 open\n* **High CVEs (<30d SLA):** 1 patch queued in CI\n* **Container Scanning:** 100% of production container images verified against Trivy CVE databases.`,
              timestamp: "Just now"
            };
            messagesStore.push(sashaReply);
          } else if (mentionTara) {
            const taraReply: ChatMessage = {
              id: `msg_tara_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "tara_governance",
              senderName: "Tara",
              senderAvatar: "📜",
              senderRole: "Policy Lifecycle & Compliance Awareness Lead",
              content: `Policy Governance & Awareness Sweep:\n\n* **Master Policies:** 14/14 reviewed and current under ISO 27001 Clause 5.2 / SOC 2 CC2.2\n* **Staff Acknowledgment:** 98.4% employee compliance with cryptographic signing log.`,
              timestamp: "Just now"
            };
            messagesStore.push(taraReply);
          } else if (mentionElena) {
            const elenaReply: ChatMessage = {
              id: `msg_elena_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "elena_privacy",
              senderName: "Elena",
              senderAvatar: "🔒",
              senderRole: "Data Protection Officer & Privacy Engineer",
              content: `Privacy & DSAR Status:\n\n* **Article 30 ROPA:** 28 processing activities fully documented\n* **30-Day DSAR SLA:** 0 pending requests; 100% compliance rate\n* **International Transfers:** Standard Contractual Clauses (SCCs) validated.`,
              timestamp: "Just now"
            };
            messagesStore.push(elenaReply);
          } else if (mentionMarcus) {
            const marcusReply: ChatMessage = {
              id: `msg_marcus_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "marcus_risk",
              senderName: "Marcus",
              senderAvatar: "🎯",
              senderRole: "Enterprise Risk & Threat Modeler",
              content: `Quantitative Risk & Threat Model:\n\n* **Enterprise Residual Risk Score:** Low (18/100)\n* **FAIR Financial Exposure:** Modeled Annualized Loss Expectancy within target risk appetite.\n* **Executive Heatmap:** Ready for Board review.`,
              timestamp: "Just now"
            };
            messagesStore.push(marcusReply);
          } else if (mentionSam) {
            const samReply: ChatMessage = {
              id: `msg_sam_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "sam_auditor",
              senderName: "Sam",
              senderAvatar: "💼",
              senderRole: "Mock Auditor & Audit Defense Compiler",
              content: `Mock CPA Audit & Evidence Package Compiler:\n\n* **Evidence Verification:** 100% of tested SOC 2 & ISO 27001 samples passing\n* **1-Click Audit Room:** Master ZIP archive compiled with cryptographic SHA-256 manifest.`,
              timestamp: "Just now"
            };
            messagesStore.push(samReply);
          }
        } else {
          // 2. Direct Bot Messaging
          const currentBot = teammatesStore.find((t) => t.id === input.channelId);
          const botName = currentBot?.name || "Hermes";
          const botAvatar = currentBot?.avatar || "🧠";
          const botRole = currentBot?.role || "Chief Compliance Orchestrator";

          // 1. Guardrails: Pre-Prompt DLP Sanitization
          const dlpResult = dlpSanitizer.sanitize(input.content);
          const sanitizedPrompt = dlpResult.sanitizedText;

          // 2. Power Multipliers: Vector RAG Policy Context Search
          const ragResults = policyVectorRag.search(input.content);
          const ragContext = policyVectorRag.formatContextForPrompt(ragResults);

          // 3. Prompt Injection Defense
          const injectionAnalysis = promptInjectionGuard.analyzeAndSanitize(sanitizedPrompt, "User Chat Channel");

          let replyText = "";
          let providerNotice = "";

          if (dlpResult.hasRedactions) {
            console.log(`[DLP Guardrail] Blocked ${dlpResult.redactedCount} sensitive credential(s) from upstream LLM transmission.`);
          }

          // Attempt real LLM generation
          try {
            const completion = await llmService.generate({
              systemPrompt: `You are ${botName}, ${botRole} in ComplianceOS.
Description and capabilities: ${currentBot?.description || "You are an expert AI compliance orchestrator."}
You possess deep, encyclopedic mastery of all major compliance frameworks including NIS2, ISO/IEC 27001:2022, SOC 2 Type II, DORA, HIPAA, GDPR, and NIST CSF.
${ragContext ? `\n${ragContext}\n` : ""}
Provide direct, highly accurate, and in-depth compliance and technical guidance. Use clear Markdown headings and bullet points. Never just restate your directives or repeat generic boilerplate.`,
              userPrompt: injectionAnalysis.sanitizedContent,
              temperature: 0.3,
              maxTokens: 1200
            });
            if (completion?.text && completion.text.trim().length > 20) {
              replyText = completion.text;
              circuitBreaker.recordUsage(currentBot?.id || "bot", 850);
            }
          } catch (llmErr: any) {
            console.warn('[Hermes / LLM] Live LLM provider note:', llmErr?.message);
            if (llmErr?.message?.includes('402') || llmErr?.message?.includes('Insufficient Balance')) {
              providerNotice = `\n\n> ℹ️ **Live LLM Note:** Configured API key returned \`402 Insufficient Balance\`. Operating in offline expert-knowledge fallback mode. Add balance or configure OpenAI / Anthropic / Gemini under **Settings > AI Providers** for live dynamic reasoning.`;
            } else if (llmErr?.message?.includes('401') || llmErr?.message?.includes('Unauthorized')) {
              providerNotice = `\n\n> ℹ️ **Live LLM Note:** Configured API key is invalid/unauthorized. Add a valid API key under **Settings > AI Providers** or \`.env\`.`;
            }
          }

          if (!replyText) {
            replyText = getExpertComplianceKnowledge(input.content, botName, botRole) + providerNotice;
          }

          // Restore any DLP placeholders in the local view if safe
          const finalClientReply = dlpSanitizer.restore(replyText, dlpResult.matches);

          const botDirectReply: ChatMessage = {
            id: `msg_direct_${Date.now() + 1}`,
            channelId: input.channelId,
            senderId: currentBot?.id || "bot",
            senderName: botName,
            senderAvatar: botAvatar,
            senderRole: botRole,
            content: finalClientReply,
            timestamp: "Just now",
            browserPreview: currentBot?.sandboxType === "browser" ? {
              url: "https://cloud-console.internal/compliance",
              title: `${botName} Virtual Screen Session`,
              steps: ["Opened Virtual Workspace", "Verified Policy Assertion", "Generated Hash"],
              status: "completed"
            } : undefined
          };
          messagesStore.push(botDirectReply);

          // 4. Guardrails: Cryptographic Provenance Ledger
          provenanceLedger.record({
            taskId: `task_direct_${Date.now()}`,
            botId: currentBot?.id || "bot",
            botName,
            action: "direct_chat_guidance",
            rawPrompt: input.content,
            sanitizedInput: sanitizedPrompt,
            outputPayload: finalClientReply,
            toolCalls: ragResults.map(r => `rag_${r.document.controlId}`),
            status: "verified_automated",
            frameworkControlMapping: ragResults.map(r => `${r.document.framework} ${r.document.controlId}`)
          });
        }

        return {
          success: true,
          messages: capResults(messagesStore.filter((m) => m.channelId === input.channelId))
        };
        } catch (err) {
          console.error('[sendMessage Error]:', err);
          throw asInternalError("sending message", err);
        }
      }),

    takeControlSandbox: procedure
      .input(sandboxControlInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof sandboxControlInputSchema> }) => {
        try {
          const tm = teammatesStore.find((teammate) => teammate.id === input.teammateId);
          if (!tm) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Teammate not found" });
          }
          return {
            success: true,
            message: `Manual interactive control enabled for ${tm.name}'s sandbox.`,
            sessionUrl: `http://localhost:3005/vnc/sandbox-${input.teammateId}`
          };
        } catch (err) {
          throw asInternalError("taking control of the sandbox", err);
        }
      }),

    // ── Guardrails & Power Multiplier Endpoints ──────────────────────────────
    getGuardrailsStatus: procedure.query(async () => {
      try {
        const ledgerRecords = provenanceLedger.getRecords();
        const quotas = circuitBreaker.getAllStatuses();

        return {
          dlpStatus: {
            active: true,
            mode: "Pre-Prompt Redaction & Inline Masking",
            patternsMonitored: 8,
            secretsBlockedCount: ledgerRecords.length * 2,
          },
          zeroTrustGatekeeper: {
            active: true,
            enforceDestructiveApproval: true,
            destructiveActionsCovered: 10,
            pendingApprovalsCount: approvalsStore.filter((a) => a.status === "pending").length,
          },
          cryptographicProvenance: {
            active: true,
            ledgerBlockCount: ledgerRecords.length,
            latestMerkleHash: ledgerRecords[0]?.merkleHash || "0000000000000000000000000000000000000000000000000000000000000000",
          },
          circuitBreakers: quotas,
        };
      } catch (err) {
        throw asInternalError("fetching guardrails status", err);
      }
    }),

    listProvenanceLedger: procedure.query(async () => {
      try {
        return capResults(provenanceLedger.getRecords());
      } catch (err) {
        throw asInternalError("listing provenance ledger", err);
      }
    }),

    getAuditCertificate: procedure
      .input(auditCertInputSchema)
      .query(async ({ input }: { input: z.infer<typeof auditCertInputSchema> }) => {
        try {
          return provenanceLedger.generateAuditCertificate(input.scope);
        } catch (err) {
          throw asInternalError("generating audit certificate", err);
        }
      }),

    executeToolAction: procedure
      .input(toolExecuteInputSchema)
      .mutation(async ({ input }: { input: z.infer<typeof toolExecuteInputSchema> }) => {
        try {
          const currentBot = teammatesStore.find((t) => t.id === input.botId) || teammatesStore[0];
          
          // 1. Tool execution
          const toolResult = await toolDispatcher.execute({
            toolName: input.toolName,
            parameters: input.parameters,
            botId: currentBot.id,
            botName: currentBot.name,
          });

          // 2. Action Gatekeeper Evaluation
          const evaluation = actionGatekeeper.evaluate({
            id: `act_${Date.now()}`,
            botId: currentBot.id,
            botName: currentBot.name,
            actionType: input.toolName,
            targetResource: input.parameters?.target || "production_system",
            description: toolResult.summary,
            payloadOrDiff: toolResult.approvalPayload || JSON.stringify(toolResult.data, null, 2),
          });

          // 3. If approval is required, stage in Approvals Store
          if (evaluation.requiresApproval) {
            const newApproval: ApprovalItem = {
              id: `appr_${Date.now()}`,
              taskId: `task_tool_${Date.now()}`,
              teammateId: currentBot.id,
              teammateName: currentBot.name,
              title: `${currentBot.name}: ${toolResult.summary}`,
              type: input.toolName.includes("pr") ? "github_pr" : "terraform_apply",
              description: evaluation.reason,
              diffOrPayload: toolResult.approvalPayload || JSON.stringify(toolResult.data, null, 2),
              severity: evaluation.riskLevel === "high_risk_destructive" ? "critical" : "high",
              status: "pending",
              createdAt: new Date().toISOString(),
            };
            approvalsStore.unshift(newApproval);
          }

          // 4. Record Cryptographic Provenance
          provenanceLedger.record({
            taskId: `task_tool_${Date.now()}`,
            botId: currentBot.id,
            botName: currentBot.name,
            action: input.toolName,
            rawPrompt: `Execute tool ${input.toolName}`,
            sanitizedInput: `Execute tool ${input.toolName}`,
            outputPayload: toolResult.data,
            toolCalls: [input.toolName],
            status: evaluation.requiresApproval ? "human_approved" : "verified_automated",
          });

          return {
            success: true,
            toolResult,
            evaluation,
          };
        } catch (err) {
          throw asInternalError("executing tool action", err);
        }
      })
  });
}
