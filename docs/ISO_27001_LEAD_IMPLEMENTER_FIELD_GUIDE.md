# 📘 ISO/IEC 27001:2022 Lead Implementer Field Guide
### The Practical Playbook for CISOs, vCISOs, and MSP Compliance Leaders

> **A publication by ComplianceOS**  
> *Version 2026 Enterprise Edition* • Framework: ISO/IEC 27001:2022 & ISO/IEC 27002:2022

---

## 🎯 Executive Summary: The Modern Compliance Dilemma

Most organizations approaching ISO 27001 certification fall into the **"Cloud Scanner Trap."** 

They purchase generic compliance automation software, connect their AWS or GitHub accounts, collect passing checks on Annex A technological controls, and assume they are ready for their audit. 

Then comes the **Stage 1 Documentation Review**.

The accredited certification auditor (from BSI, TÜV, SGS, or Schellman) doesn't start by looking at AWS IAM policies. They open **Clauses 4 through 10** of the standard:
* *Where is your formalized ISMS Scope statement with boundary justifications? (Clause 4.3)*
* *Where is your ISO 27005 risk assessment methodology with documented risk appetite thresholds? (Clause 6.1.2)*
* *Where is your Statement of Applicability with formal justifications for excluded controls? (Clause 6.1.3)*
* *Where are the signed minutes and action logs from your executive Management Review? (Clause 9.3)*
* *Where is your independent Internal Audit report covering the entire scope? (Clause 9.2)*

When companies cannot produce these artifacts, **certification halts**, audit fees are forfeited, and enterprise deal cycles slip by quarters.

This Field Guide provides the complete, field-tested **7-Pillar Implementation Playbook** designed to take any cloud-first SaaS or MSP client from zero to accredited certification in 90 days.

---

## 🗺️ The ISO 27001:2022 Architecture

The 2022 standard represents the biggest architectural shift in modern compliance history:
1. **Clauses 4–10 (The Mandatory Management System Core):** Unchanged in principle, mandatory for all organizations.
2. **Annex A (The 93 Operational Controls):** Consolidated from 114 controls across 14 domains down to **93 controls across 4 modernized themes**:
   * **Organizational Controls (A.5):** 37 controls (policies, asset management, cloud governance, supplier relationships).
   * **People Controls (A.6):** 8 controls (screening, remote working, awareness training).
   * **Physical Controls (A.7):** 14 controls (perimeters, clear desk/screen, equipment protection).
   * **Technological Controls (A.8):** 34 controls (identity, encryption, backup, secure coding, vulnerability management).

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       ISO 27001:2022 ARCHITECTURE                      │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
   MANDATORY ISMS (Clauses 4-10)                          ANNEX A (93 Controls)
   ─────────────────────────────                          ─────────────────────
   • Clause 4: Context & Scope                            • A.5: Organizational (37)
   • Clause 5: Leadership & Policy                        • A.6: People (8)
   • Clause 6: Risk Assessment (27005)                    • A.7: Physical (14)
   • Clause 7: Support & Competence                       • A.8: Technological (34)
   • Clause 8: Operations
   • Clause 9: Internal Audit & Mgmt Review
   • Clause 10: Improvement & CAPA
```

---

## 🏛️ The 7-Pillar Implementation Playbook

### Pillar 1: ISMS Context, Scope & Governance (Clauses 4 & 5)
*Target Timeline: Weeks 1–2*

#### The Objective
Define the operational and technical perimeter of your Information Security Management System (ISMS), identify interested parties, and formalize top management commitment.

#### Step-by-Step Execution
1. **Draft the ISMS Scope Statement (Clause 4.3):**
   * Specify included entities, corporate business units, physical facilities, remote workers, and production cloud infrastructure.
   * *Field Example:* *"The ComplianceOS ISMS governs all corporate assets, source code repositories (GitHub), cloud infrastructure (AWS us-east-1 and eu-central-1), and customer-facing web applications supporting the ComplianceOS SaaS platform."*
2. **Document Internal & External Issues (Clause 4.1):**
   * Catalog business drivers, rapid headcount growth, cloud migration risks, and regional regulatory pressures (GDPR, NIS2, HIPAA).
3. **Register Interested Parties & Legal Requirements (Clause 4.2):**
   * Customers: SOC 2 / ISO 27001 contractual security commitments.
   * Regulators: Data protection laws, incident disclosure windows.
   * Vendors: SaaS dependencies and supply-chain continuity.
4. **Publish Top Management Security Policy (Clause 5.2):**
   * Secure CEO / Executive signature stating commitment to continuous security improvement.

> **Auditor Trap #1:** An ambiguous scope. If an auditor asks, *"Are your development laptops in-scope?"* and you hesitate or haven't formally documented exclusions with risk justification, they will fail your Stage 1 audit.

---

### Pillar 2: Information Asset Inventory & CIA Classification (Clause 8 / Annex A.5.9–A.5.14)
*Target Timeline: Weeks 2–3*

#### The Objective
Identify, classify, and assign executive accountability for all information assets handling organizational or customer data.

#### Step-by-Step Execution
1. **Categorize Assets into Standard Classes:**
   * **Services / Cloud Infrastructure:** AWS/GCP/Azure VPCs, Kubernetes clusters, Serverless functions.
   * **Information & Data Repositories:** Production PostgreSQL DBs, S3 buckets, secrets vaults.
   * **Software & Code:** GitHub repositories, CI/CD deployment pipelines.
   * **Endpoints / Hardware:** MDM-enrolled employee laptops (Mac/Windows), mobile devices.
   * **Productivity SaaS:** Google Workspace, Microsoft 365, Slack, Jira.
2. **Assign CIA Valuation (1–5 Scale):**
   * Rate every asset on **Confidentiality (C)**, **Integrity (I)**, and **Availability (A)** impact.
3. **Designate Named Asset Owners:**
   * Avoid assigning assets to generic teams. Assign directly to roles (e.g., *"Lead DevOps Engineer"*, *"Head of Engineering"*).

---

### Pillar 3: ISO 27005 Risk Assessment & Treatment Plan (Clause 6.1)
*Target Timeline: Weeks 3–4*

#### The Objective
Conduct a defensible, repeatable risk assessment that evaluates threats and vulnerabilities, establishes risk severity, and links treatments to Annex A controls.

#### Step-by-Step Execution
1. **Establish Risk Appetite & Scoring Matrix:**
   * Use a standard $5 \times 5$ Likelihood vs. Impact matrix ($Inherent\ Score = Likelihood \times Impact$, range 1–25).
   * Define risk thresholds:
     * **Scores 16–25 (Critical/High):** Mandatory immediate mitigation; cannot be accepted without C-suite sign-off.
     * **Scores 8–15 (Medium):** Treat within 60–90 days.
     * **Scores 1–7 (Low):** Accept or monitor.
2. **Assess Modern Cyber Threat Scenarios:**
   * *Credential stuffing & phishing leading to cloud account takeover.*
   * *Accidental public exposure of cloud object storage (S3 bucket leak).*
   * *Endpoint ransomware lateral movement.*
   * *Critical third-party SaaS vendor outage.*
   * *Supply chain compromise via malicious open-source package.*
3. **Select Formal Risk Treatment Options (RTP):**
   * **Mitigate:** Deploy compensating Annex A controls (e.g., hardware MFA, EDR, KMS encryption).
   * **Transfer:** Cyber insurance, cloud provider SLAs.
   * **Avoid:** Decommission legacy unsupported software.
   * **Accept:** Documented acceptance signed by the Risk Owner.

---

### Pillar 4: Statement of Applicability & Annex A Controls (Clause 6.1.3 & Annex A)
*Target Timeline: Weeks 5–6*

#### The Objective
Produce the single most critical audit artifact: a complete, justified ledger of all 93 controls from ISO/IEC 27001:2022.

#### Step-by-Step Execution
1. **Evaluate the 4 Control Themes:**
   * **Organizational (A.5.1 to A.5.37):** Cloud services management, supplier security, data classification.
   * **People (A.6.1 to A.6.8):** Background screening, remote work guidelines, disciplinary process.
   * **Physical (A.7.1 to A.7.14):** Physical office perimeter, clear desk/screen, secure disposal.
   * **Technological (A.8.1 to A.8.34):** Endpoint security, network segmentation, backup, vulnerability management.
2. **Document Defensible Justifications:**
   * Every **Applicable** control must cite a specific risk from Pillar 3 or legal requirement from Pillar 1.
   * Every **Excluded** control must state why it does not apply (e.g., *"A.7.11 Cabling Security is excluded because the company operates 100% in AWS and remote co-working spaces with no on-premises data cabling"*).
3. **Track Implementation Status:**
   * Tag controls as *Implemented*, *In Progress*, or *Planned*.

---

### Pillar 5: Documented Information & Employee Awareness (Clauses 7.2, 7.3, 7.5)
*Target Timeline: Weeks 6–8*

#### The Objective
Deploy mandatory, version-controlled policies and verify that all personnel are trained and legally bound to adhere to them.

#### Mandatory ISO 27001 Policies Checklist
- [x] Master Information Security Policy (Clause 5.2)
- [x] Access Control & Authentication Policy (A.5.15, A.8.5)
- [x] Data Classification & Handling Policy (A.5.12, A.5.13)
- [x] Incident Response & Breach Notification Procedure (A.5.24–A.5.28)
- [x] Backup & Disaster Recovery Policy (A.8.13, A.8.14)
- [x] Secure Software Development Lifecycle (SDLC) Policy (A.8.25–A.8.30)
- [x] Supplier Security & Third-Party Risk Policy (A.5.19–A.5.22)
- [x] Clear Desk and Clear Screen Policy (A.7.7)
- [x] Cryptography & Key Management Policy (A.8.24)
- [x] Remote Working & Endpoint Security Policy (A.6.7, A.8.1)

#### Execution Cadence
* Publish policies via an interactive acknowledgment portal.
* Enforce **100% employee sign-off** prior to Stage 1 audit.
* Run a simulated phishing test and retain evidence of remediation for failures.

---

### Pillar 6: Internal Audit & Corrective Action (Clauses 9.2 & 10.2)
*Target Timeline: Weeks 9–10*

#### The Objective
Conduct an independent, systematic internal audit covering all clauses and controls to uncover and remediate gaps before the external auditor arrives.

#### Execution Rules
1. **Auditor Independence:** The person conducting the internal audit cannot audit their own work (use an external consultant, peer team member, or dedicated compliance manager).
2. **Audit Checklists:**
   * Test Clause 4 to 10 compliance.
   * Sample live Annex A evidence (inspect actual GitHub branch protection settings, AWS CloudTrail logs, Okta MFA configurations).
3. **Classify Findings:**
   * **Major Nonconformity (MNC):** A complete absence of a mandatory clause requirement (e.g., no Risk Assessment conducted, no internal audit completed). *Blocks certification immediately.*
   * **Minor Nonconformity (mNC):** A single lapse in a process that is otherwise working (e.g., 2 out of 50 employees missed annual policy re-signing).
   * **Opportunity for Improvement (OFI):** Recommendations to strengthen posture.
4. **Execute Root Cause Analysis & CAPA:**
   * Document the 5-Whys for each finding and verify resolution before scheduling Stage 1.

---

### Pillar 7: Management Review & Auditor Clean Room (Clauses 9.3 & 10.1)
*Target Timeline: Weeks 11–12*

#### The Objective
Convene C-suite leadership to review ISMS performance, commit future resources, and package the complete audit dossier for accredited certification.

#### Mandatory Management Review Agenda (Clause 9.3)
1. Review of status of actions from prior reviews.
2. Changes in internal and external context and stakeholder needs.
3. Feedback on security performance:
   * Nonconformities and corrective action status.
   * Monitoring and measurement results.
   * Internal audit results.
   * Fulfillment of security objectives.
4. Feedback from interested parties (customer security questionnaires, vendor audits).
5. Results of risk assessments and status of the Risk Treatment Plan.
6. Opportunities for continual improvement.

#### Deliverable
Formal, signed **Management Review Meeting Minutes**. External auditors cannot issue a certificate without this document.

---

## 🗓️ 90-Day Implementation Roadmap

| Week | Phase | Key Milestone Deliverables |
| :--- | :--- | :--- |
| **Weeks 1–2** | **Phase 1: Foundation & Context** | ISMS Scope Document, Leadership Security Policy, Interested Parties Register |
| **Weeks 3–4** | **Phase 2: Assets & Risk Assessment** | Asset Inventory with CIA ratings, ISO 27005 Risk Register, Risk Treatment Plan (RTP) |
| **Weeks 5–6** | **Phase 3: Statement of Applicability** | 93 Annex A Control Justifications, SoA Export Deliverable |
| **Weeks 7–8** | **Phase 4: Policies & Awareness** | 10 Mandatory Policies approved, 100% Employee Policy Acknowledgments |
| **Weeks 9–10** | **Phase 5: Internal Audit & CAPA** | Full Scope Internal Audit Report, Root Cause Analysis & Remediations Log |
| **Week 11** | **Phase 6: Management Review** | Executive Review Meeting Minutes, Resource Sign-off, Stage 1 Audit Pack |
| **Week 12+** | **Phase 7: Certification** | Stage 1 (Documentation Review) followed by Stage 2 (On-site / Remote Audit) |

---

## 🚨 Top 10 Red Flags Auditors Look For

1. **No Evidence of Control Operation:** Having written policies with zero logs or screenshots proving the control actually runs.
2. **Missing Risk Assessment for Excluded Controls:** Excluding physical security or coding controls without explaining why they are not needed.
3. **No Internal Audit Prior to Stage 1:** External auditors will cancel Stage 1 if an internal audit was not completed first.
4. **Unsigned Management Review:** Holding a verbal meeting without signed minutes.
5. **Generic Policies Copied from the Internet:** Policies referencing tools or departments the company does not possess.
6. **No Asset Owners Assigned:** Asset registers listing laptops and servers with no individual owner.
7. **Failure to Track Employee Sign-offs:** Missing records of staff acknowledging security policies.
8. **Untested Disaster Recovery:** Claiming daily backups without a single documented recovery test in the past 12 months.
9. **Disjointed SoA vs. Risk Register:** Claiming a control is in-scope in the SoA, but having no corresponding risk in the Risk Register.
10. **Stale Information:** Documentation that hasn't been reviewed or refreshed in over 12 months.

---

## ⚡ How ComplianceOS Accelerates Your Certification

ComplianceOS automates this exact 7-pillar workflow:
* **Pre-Seeded Starter Kit:** Instant baseline assets, ISO 27005 risks, and 93 control mappings.
* **Live Statement of Applicability:** Real-time filtering, status tracking, and one-click SoA export.
* **Integrated Policy Studio:** Pre-written, audit-proven policy templates with employee sign-off portals.
* **Auditor Clean Room:** Instant compilation of Stage 1 & Stage 2 audit packages with one-click print-ready PDF generation.

*Ready to transform your compliance operations? Visit [ComplianceOS](https://complianceos.com) or book a partner sprint.*
