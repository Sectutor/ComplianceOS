import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { llmService } from "../../lib/llm/service";

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

  // GDPR
  if (p.includes("gdpr") || p.includes("data protection") || p.includes("dpia") || p.includes("dsar")) {
    return `### 🔒 **GDPR (General Data Protection Regulation EU 2016/679)**

---

#### **Core Compliance Architecture:**
* **Article 30 (ROPA):** Maintain a centralized Record of Processing Activities documenting data flows, purposes, categories, and retention periods.
* **Article 32 (TOMs):** Technical and organizational measures including pseudonymisation, encryption at rest/in transit, and resilience testing.
* **Article 33/34 (Breach Notification):** 72-hour notification to supervisory authorities (DPA) and prompt communication to data subjects if high risk.
* **Article 35 (DPIA):** Mandatory Data Protection Impact Assessment for high-risk processing (AI models, biometrics, large-scale tracking).
* **DSAR Rights:** Data subject requests (Access, Erasure, Portability) must be fulfilled within 30 days.`;
  }

  // Generic expert orchestrator response
  return `### 🧠 **${botName} (${botRole}) Analysis**

I have analyzed your compliance and security query: **"${prompt}"**

---

#### **Key Assessment & Action Plan:**
1. **Framework Alignment:** This directive impacts your active security baseline across **SOC 2 Type II**, **ISO 27001:2022**, and **NIS2**.
2. **Automated Verification:**
   * Review policy assertions and control mapping in **Audit Hub**.
   * Run automated tests against cloud endpoints and database configurations.
3. **Fleet Delegation:**
   * **@Alex** is ready to inspect external vendor trust documentation.
   * **@Morgan** is ready to generate IaC Terraform remediation pull requests.
   * **@Riley** is ready to capture cryptographically signed audit evidence.

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
  type: "github_pr" | "vendor_email" | "policy_update" | "aws_remediation";
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
    content: "Here is the master status of our compliance program:\n\n* **Overall SOC 2 Type II Readiness:** **94%** (74/78 Controls Passing)\n* **Active Fleets:** 3 Sandboxed Workers deployed\n* **Identified Gaps:**\n  1. Vendor SOC 2 renewals for Datadog & Stripe -> Dispatched to **Alex**\n  2. S3 Encryption IaC configuration -> Dispatched to **Morgan**\n  3. Q3 User Access Review evidence -> Dispatched to **Riley**\n\nI will synthesize all incoming evidence and update the Audit Hub automatically.",
    timestamp: "Today, 9:01 AM"
  }
];
let teammatesStore: Teammate[] = [
  {
    id: "hermes_orchestrator",
    name: "Hermes",
    role: "Chief Compliance Orchestrator & AI Copilot",
    avatar: "🧠",
    description: "Master AI brain and orchestrator. Reasons across compliance frameworks, drafts policies, coordinates worker bots (Alex, Morgan, Riley), and synthesizes audit evidence.",
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
  }
];

export function createTeammatesRouter(t: any, procedure: any) {
  return t.router({
    listTeammates: procedure.query(async () => {
      return teammatesStore;
    }),

    getTeammate: procedure
      .input(z.object({ teammateId: z.string() }))
      .query(async ({ input }: { input: { teammateId: string } }) => {
        const found = teammatesStore.find((tm) => tm.id === input.teammateId);
        if (!found) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Teammate not found" });
        }
        return found;
      }),

    createTeammate: procedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          role: z.string().min(1, "Role is required"),
          avatar: z.string().default("🤖"),
          description: z.string().min(1, "Description is required"),
          sandboxType: z.enum(["docker", "e2b", "browser", "cli"]).default("browser"),
          model: z.string().default("claude-3-7-sonnet"),
          capabilities: z.array(z.string()).default([])
        })
      )
      .mutation(async ({ input }: { input: any }) => {
        const newTeammate: Teammate = {
          id: `custom_${Date.now()}`,
          name: input.name,
          role: input.role,
          avatar: input.avatar || "🤖",
          description: input.description,
          sandboxType: input.sandboxType,
          model: input.model || "claude-3-7-sonnet",
          capabilities: input.capabilities.length > 0 ? input.capabilities : ["Autonomous Task Execution"],
          status: "idle",
          tasksCompleted: 0,
          lastActive: "Just created"
        };
        teammatesStore.push(newTeammate);
        return newTeammate;
      }),

    updateTeammate: procedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1, "Name is required"),
          role: z.string().min(1, "Role is required"),
          avatar: z.string().default("🤖"),
          description: z.string().min(1, "Description is required"),
          sandboxType: z.enum(["docker", "e2b", "browser", "cli"]).default("browser"),
          model: z.string().default("claude-3-7-sonnet"),
          capabilities: z.array(z.string()).default([])
        })
      )
      .mutation(async ({ input }: { input: any }) => {
        const index = teammatesStore.findIndex((t) => t.id === input.id);
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
      }),

    deleteTeammate: procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }: { input: { id: string } }) => {
        const index = teammatesStore.findIndex((t) => t.id === input.id);
        if (index === -1) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Teammate not found" });
        }
        teammatesStore.splice(index, 1);
        return { success: true, id: input.id };
      }),

    listTasks: procedure
      .input(z.object({ teammateId: z.string().optional() }).optional())
      .query(async ({ input }: { input?: { teammateId?: string } }) => {
        if (input?.teammateId) {
          return tasksStore.filter((t) => t.teammateId === input.teammateId);
        }
        return tasksStore;
      }),

    createTask: procedure
      .input(
        z.object({
          teammateId: z.string(),
          title: z.string(),
          type: z.enum(["browser_audit", "vendor_soc2", "iac_remediation", "access_review", "policy_gap"]),
          targetUrl: z.string().optional(),
          summary: z.string()
        })
      )
      .mutation(async ({ input }: { input: any }) => {
        const newTask: TeammateTask = {
          id: `task_${Date.now()}`,
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
        const teammate = teammatesStore.find((t) => t.id === input.teammateId);
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
      }),

    listApprovals: procedure.query(async () => {
      return approvalsStore;
    }),

    resolveApproval: procedure
      .input(
        z.object({
          approvalId: z.string(),
          action: z.enum(["approved", "rejected"]),
          comment: z.string().optional()
        })
      )
      .mutation(async ({ input }: { input: { approvalId: string; action: "approved" | "rejected"; comment?: string } }) => {
        const item = approvalsStore.find((a) => a.id === input.approvalId);
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Approval item not found" });
        }
        item.status = input.action;
        return { success: true, item };
      }),

    listRoutines: procedure.query(async () => {
      return routinesStore;
    }),

    toggleRoutine: procedure
      .input(z.object({ routineId: z.string(), active: z.boolean() }))
      .mutation(async ({ input }: { input: { routineId: string; active: boolean } }) => {
        const routine = routinesStore.find((r) => r.id === input.routineId);
        if (!routine) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Routine not found" });
        }
        routine.status = input.active ? "active" : "paused";
        return routine;
      }),

    triggerRoutineNow: procedure
      .input(z.object({ routineId: z.string() }))
      .mutation(async ({ input }: { input: { routineId: string } }) => {
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
      }),

    // Multi-Agent Chat Procedures
    listMessages: procedure
      .input(z.object({ channelId: z.string().default("war_room") }))
      .query(async ({ input }: { input: { channelId: string } }) => {
        return messagesStore.filter((m) => m.channelId === input.channelId);
      }),

    sendMessage: procedure
      .input(
        z.object({
          channelId: z.string().default("war_room"),
          content: z.string(),
          mentions: z.array(z.string()).optional()
        })
      )
      .mutation(async ({ input }: { input: { channelId: string; content: string; mentions?: string[] } }) => {
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

          if (mentionHermes) {
            const hermesReply: ChatMessage = {
              id: `msg_hermes_${Date.now() + 1}`,
              channelId: "war_room",
              senderId: "hermes_orchestrator",
              senderName: "Hermes",
              senderAvatar: "🧠",
              senderRole: "Chief Compliance Orchestrator",
              content: `Acknowledged. I am orchestrating the fleet to execute your request across all compliance domains.\n\n1. **Vendor Verification:** Dispatched @Alex to authenticate trust portals & pull SOC 2 certificates.\n2. **Cloud Baseline:** Dispatched @Morgan to test Terraform configurations in Docker sandbox.\n3. **Audit Evidence:** Dispatched @Riley to deposit signed cryptographs in Audit Hub.\n\nAll tasks running concurrently.`,
              timestamp: "Just now",
              delegatedTo: "alex_tprm"
            };
            messagesStore.push(hermesReply);
          }

          if (mentionAlex || (!mentionMorgan && !mentionRiley && !mentionHermes)) {
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
          }
        } else {
          // 2. Direct Bot Messaging
          const currentBot = teammatesStore.find((t) => t.id === input.channelId);
          const botName = currentBot?.name || "Hermes";
          const botAvatar = currentBot?.avatar || "🧠";
          const botRole = currentBot?.role || "Chief Compliance Orchestrator";

          let replyText = "";

          let providerNotice = "";
          // Attempt real LLM generation first
          try {
            const completion = await llmService.generate({
              systemPrompt: `You are ${botName}, ${botRole} in ComplianceOS.
Description and capabilities: ${currentBot?.description || "You are an expert AI compliance orchestrator."}
You possess deep, encyclopedic mastery of all major compliance frameworks including NIS2, ISO/IEC 27001:2022, SOC 2 Type II, DORA, HIPAA, GDPR, and NIST CSF.
Provide direct, highly accurate, and in-depth compliance and technical guidance. Use clear Markdown headings and bullet points. Never just restate your directives or repeat generic boilerplate.`,
              userPrompt: input.content,
              temperature: 0.3,
              maxTokens: 1200
            });
            if (completion?.text && completion.text.trim().length > 20) {
              replyText = completion.text;
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

          const botDirectReply: ChatMessage = {
            id: `msg_direct_${Date.now() + 1}`,
            channelId: input.channelId,
            senderId: currentBot?.id || "bot",
            senderName: botName,
            senderAvatar: botAvatar,
            senderRole: botRole,
            content: replyText,
            timestamp: "Just now",
            browserPreview: currentBot?.sandboxType === "browser" ? {
              url: "https://cloud-console.internal/compliance",
              title: `${botName} Virtual Screen Session`,
              steps: ["Opened Virtual Workspace", "Verified Policy Assertion", "Generated Hash"],
              status: "completed"
            } : undefined
          };
          messagesStore.push(botDirectReply);
        }

        return { success: true, messages: messagesStore.filter((m) => m.channelId === input.channelId) };
      }),

    takeControlSandbox: procedure
      .input(z.object({ teammateId: z.string() }))
      .mutation(async ({ input }: { input: { teammateId: string } }) => {
        const tm = teammatesStore.find((t) => t.id === input.teammateId);
        return {
          success: true,
          message: `Manual interactive control enabled for ${tm?.name || "Agent"}'s sandbox.`,
          sessionUrl: `http://localhost:3005/vnc/sandbox-${input.teammateId}`
        };
      })
  });
}
