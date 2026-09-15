# 🏢 "ISO 27001 as a Service" Operational Delivery Playbook
### The Standardized Delivery Model, Milestone Gates, and SLAs for Partner MSPs & vCISOs

> **A publication by ComplianceOS**  
> *Target Audience:* Managed Service Providers (MSPs), MSSPs, vCISO Consultants, and Audit Advisory Firms.  
> *Framework Version:* ISO/IEC 27001:2022 & ISO/IEC 27005:2022  
> *Standard Delivery Cycle:* 12-Week Predictable Certification Sprint

---

## 💼 Executive Overview & Service Economics

For Managed Service Providers and vCISO practices, offering compliance advisory has historically suffered from three major bottlenecks:
1. **Unpredictable Project Scope:** Projects dragging from 3 months into 9–12 months without clear client accountability.
2. **The "Per-Tenant Seat Tax":** Legacy compliance software (Vanta, Drata) charges per client tenant, destroying MSP gross margins.
3. **Manual Consultant Overhead:** Consultants spending dozens of hours manually writing boilerplate policies and formatting spreadsheets.

**ComplianceOS solves all three problems:**
* **Fixed 12-Week Phased Milestones:** Clear client hand-off gates backed by formal SLAs.
* **Margin Recapture:** One flat ComplianceOS partner subscription enables you to service 50+ clients under a unified multi-tenant dashboard.
* **Smart Acceleration:** The **Smart ISMS Starter Kit** automates the initial 30 hours of asset cataloging, risk modeling, and control mapping into a 30-minute automated setup.

---

## 📦 Packaging & Pricing Architecture for MSPs

MSPs typically package "ISO 27001 as a Service" into three standard commercial tiers:

| Tier | Target Client | MSP Service Scope | Recommended Pricing |
| :--- | :--- | :--- | :--- |
| **Tier 1: Kickstart Sprint** | Seed to Series A SaaS (10–50 staff) | 12-week sprint to Stage 1 & Stage 2 audit readiness using ComplianceOS. | **\$12,000 – \$18,000** one-time sprint |
| **Tier 2: Managed vCISO Retainer** | Growth Tech / FinTech (50–250 staff) | Sprint to certification + ongoing quarterly evidence collection, internal audit, and policy reviews. | **\$2,500 – \$4,500 / month** (12-month contract) |
| **Tier 3: Dual Compliance Retainer** | Mid-Market Enterprise (100–500 staff) | Simultaneous ISO 27001:2022 + SOC 2 Type II program management with continuous posture monitoring. | **\$4,500 – \$7,500 / month** (12-month contract) |

---

## 🚦 The 6 Mandatory Readiness Hand-Off Gates & SLAs

To ensure projects finish strictly within 12 weeks, the MSP enforces **6 formal Hand-Off Gates**.  
A phase is **not complete**, and work cannot advance to the next phase, until the client signs off on the gate deliverable.

```
  Week 2           Week 4           Week 6           Week 8           Week 10          Week 12
 ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
 │ GATE 1  │ ───► │ GATE 2  │ ───► │ GATE 3  │ ───► │ GATE 4  │ ───► │ GATE 5  │ ───► │ GATE 6  │
 └─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘
  Context &        ISO 27005        Statement of     Mandatory        Internal         Executive
  Assets Lock      Risks & RTP      Applicability    Policies &       Audit & CAPA     Mgmt Review &
  [SLA: Day 14]    [SLA: Day 28]    [SLA: Day 42]    Staff Sign-off   [SLA: Day 70]    Auditor Room
                                                     [SLA: Day 56]                     [SLA: Day 84]
```

---

### 🛑 Gate 1: Context, Scope & Asset Inventory Lock
* **Deadline / SLA:** End of **Week 2** (Day 14)
* **Clause Alignment:** ISO 27001 Clauses 4.1, 4.2, 4.3, 5.1 & Annex A.5.9
* **In-App Location:** `/clients/{id}/iso27001/governance` & `/clients/{id}/iso27001/assets`

#### Mandatory Gate Deliverables
1. **Formal ISMS Scope Statement (Clause 4.3):** Clear documentation of in-scope products, corporate legal entities, remote workforce locations, and cloud regions (e.g., AWS/GCP).
2. **Interested Parties & Obligations Register (Clause 4.2):** Customer contractual security requirements and applicable regulations (GDPR, NIS2, HIPAA).
3. **Top Management Information Security Policy (Clause 5.2):** Executive sign-off committed to the ISMS.
4. **Information Asset Inventory:** All production cloud VPCs, code repositories (GitHub), databases, SaaS tools, and staff endpoints cataloged with **CIA valuation (1–5 scale)** and named **Asset Owners**.

#### Verification & Pass/Fail Criteria
* 🔴 **FAIL:** Scope excludes development laptops or code repositories without written risk justification.
* 🟢 **PASS:** Executive Sponsor signs the Scope Document and Asset Inventory in the platform.

---

### 🛑 Gate 2: ISO 27005 Threat Scenarios & Risk Treatment Plan (RTP) Lock
* **Deadline / SLA:** End of **Week 4** (Day 28)
* **Clause Alignment:** ISO 27001 Clauses 6.1.1, 6.1.2, 6.1.3 & ISO/IEC 27005
* **In-App Location:** `/clients/{id}/iso27001/risks`

#### Mandatory Gate Deliverables
1. **Risk Assessment Methodology:** Documented likelihood and impact scoring scales (1–5) and corporate risk acceptance threshold.
2. **Threat & Vulnerability Assessment:** Minimum 15 threat scenarios evaluated (ransomware, credential theft, S3 bucket misconfiguration, vendor outages, phishing).
3. **Inherent vs. Residual Risk Scoring:** Quantified pre-control and post-control severity.
4. **Risk Treatment Plan (RTP):** Every risk scored Critical/High assigned a treatment option (**Mitigate, Transfer, Avoid, Accept**), a named owner, and target implementation date.

#### Verification & Pass/Fail Criteria
* 🔴 **FAIL:** High/Critical risks accepted without CEO / Board written justification.
* 🟢 **PASS:** CISO and Risk Owners formally lock the Risk Treatment Plan (RTP).

---

### 🛑 Gate 3: Statement of Applicability (SoA) & Control Justifications Lock
* **Deadline / SLA:** End of **Week 6** (Day 42)
* **Clause Alignment:** ISO 27001 Clause 6.1.3 d & Annex A (93 Controls)
* **In-App Location:** `/clients/{id}/iso27001/soa`

#### Mandatory Gate Deliverables
1. **All 93 Controls Evaluated:** Each control tagged across the 4 modernized themes:
   * Organizational (37 controls)
   * People (8 controls)
   * Physical (14 controls)
   * Technological (34 controls)
2. **Formal Inclusion / Exclusion Justifications:**
   * Every *Applicable* control cites a specific risk from Gate 2 or contractual requirement from Gate 1.
   * Every *Excluded* control cites a defensible business rationale (e.g., cloud-only infrastructure justifying exclusion of physical data cabling).
3. **Implementation Status Assigned:** Controls marked as *Implemented*, *In Progress*, or *Planned*.

#### Verification & Pass/Fail Criteria
* 🔴 **FAIL:** Controls marked "Not Applicable" without written justification.
* 🟢 **PASS:** Formal SoA exported and approved by the Lead Implementer.

---

### 🛑 Gate 4: Mandatory Policies Published & 100% Staff Sign-Off Gate
* **Deadline / SLA:** End of **Week 8** (Day 56)
* **Clause Alignment:** ISO 27001 Clauses 7.2, 7.3, 7.5 & Annex A.5.1
* **In-App Location:** `/clients/{id}/iso27001/documents` & `/training`

#### Mandatory Gate Deliverables
1. **10 Mandatory ISMS Policies Approved & Version-Controlled:**
   * Information Security Policy, Access Control Policy, Data Classification, Incident Response, Backup & DR, Secure SDLC, Vendor Security, Clear Desk/Screen, Cryptography, Remote Working.
2. **100% Employee Policy Acknowledgments:**
   * All active employees completed policy read-and-sign in the ComplianceOS portal.
3. **Security Awareness Training Records:**
   * Completion logs and phishing simulation records archived.

#### Verification & Pass/Fail Criteria
* 🔴 **FAIL:** Less than 95% of staff have acknowledged active security policies.
* 🟢 **PASS:** All 10 policies published with version stamps; 100% staff acknowledgment logged.

---

### 🛑 Gate 5: Independent Internal Audit & CAPA Verification Gate
* **Deadline / SLA:** End of **Week 10** (Day 70)
* **Clause Alignment:** ISO 27001 Clauses 9.2, 10.1, 10.2
* **In-App Location:** `/clients/{id}/iso27001/audit`

#### Mandatory Gate Deliverables
1. **Independent Internal Audit Report:** Complete audit execution covering Clauses 4–10 and active Annex A controls conducted by an independent MSP consultant.
2. **Nonconformity Findings Classified:** Major Nonconformities (MNC), Minor Nonconformities (mNC), and Opportunities for Improvement (OFI).
3. **Root Cause Analysis (RCA):** Completed 5-Whys analysis for every identified nonconformity.
4. **Corrective and Preventive Actions (CAPA) Log:** Remediation actions implemented and verified before external audit scheduling.

#### Verification & Pass/Fail Criteria
* 🔴 **FAIL:** Unresolved Major Nonconformities remaining open.
* 🟢 **PASS:** Zero open Major Nonconformities; all Minor findings have verified remediation plans.

---

### 🛑 Gate 6: Executive Management Review & Auditor Clean Room Hand-Off
* **Deadline / SLA:** End of **Week 12** (Day 84)
* **Clause Alignment:** ISO 27001 Clause 9.3 & Stage 1 / Stage 2 Preparation
* **In-App Location:** `/clients/{id}/iso27001/management-review` & `/guide` (Dossier Viewer)

#### Mandatory Gate Deliverables
1. **Executive Management Review Minutes:**
   * Signed minutes from the formal C-level review meeting covering metrics, incidents, audit results, and resource allocations.
2. **Unified Audit Clean Room Dossier:**
   * One-click generation of the Stage 1 & Stage 2 Audit Package (Scope, SoA, Risk Register, Document Index, and Internal Audit Report).
3. **External Auditor Invitation:**
   * Accredited Certification Body auditor given access to the Clean Room.

#### Verification & Pass/Fail Criteria
* 🔴 **FAIL:** Management Review held without signed minutes or C-suite attendance.
* 🟢 **PASS:** Signed minutes archived; external auditor scheduled for Stage 1 review.

---

## 📅 The 12-Week Operational Delivery Schedule

```
WEEK 1: Kickoff, Scope Definition, Interested Parties Mapping (Gate 1 Prep)
WEEK 2: Asset Inventory, CIA Valuations, GATE 1 LOCK & SIGN-OFF
WEEK 3: Threat Scenario Modeling, Likelihood/Impact Scoring (Gate 2 Prep)
WEEK 4: Risk Treatment Plan (RTP) Formulation, GATE 2 LOCK & SIGN-OFF
WEEK 5: SoA Control Reviews (Themes 5 & 6: Org & People) (Gate 3 Prep)
WEEK 6: SoA Control Reviews (Themes 7 & 8: Physical & Tech), GATE 3 LOCK & SIGN-OFF
WEEK 7: Mandatory Policy Customization & Executive Approvals (Gate 4 Prep)
WEEK 8: Employee Portal Rollout, 100% Policy Sign-offs, GATE 4 LOCK & SIGN-OFF
WEEK 9: Internal Audit Fieldwork (Clauses 4-10 & Annex A Testing) (Gate 5 Prep)
WEEK 10: Root Cause Analysis, CAPA Remediation, GATE 5 LOCK & SIGN-OFF
WEEK 11: Management Review Prep & Executive Meeting Execution (Gate 6 Prep)
WEEK 12: Signed Review Minutes, Dossier Compilation, GATE 6 LOCK -> STAGE 1 AUDIT
```

---

## 👥 RACI Operational Matrix (MSP vs. Client)

| Deliverable / Task | MSP Consultant | Client CISO / Lead | Client Engineering / IT | Client CEO / Board |
| :--- | :---: | :---: | :---: | :---: |
| **ISMS Scope Document** | **R** (Drafts) | **A** (Approves) | **C** (Consulted) | **I** (Informed) |
| **Asset Register Cataloging** | **C** (Guides) | **A** (Validates) | **R** (Populates) | **I** (Informed) |
| **ISO 27005 Risk Assessment** | **R** (Facilitates) | **A** (Approves) | **C** (Tech input) | **I** (Informed) |
| **Risk Treatment Plan (RTP)** | **R** (Formulates) | **A** (Signs off) | **R** (Executes) | **A** (High risks) |
| **Statement of Applicability** | **R** (Drafts justifications) | **A** (Approves) | **C** (Tech validation) | **I** (Informed) |
| **Policy Documentation** | **R** (Provides templates) | **A** (Customizes) | **C** (Reviews) | **A** (Top Policy) |
| **Employee Acknowledgment** | **C** (Monitors) | **A** (Enforces) | **R** (Signs) | **R** (Signs) |
| **Internal Audit Execution** | **R** (Conducts audit) | **A** (Receives report) | **C** (Provides evidence) | **I** (Informed) |
| **CAPA Remediation** | **C** (Verifies) | **A** (Oversees) | **R** (Remediates) | **I** (Informed) |
| **Management Review Meeting** | **C** (Prepares dossier) | **R** (Presents) | **I** (Informed) | **A** (Attends & Signs) |
| **Auditor Dossier Handoff** | **R** (Compiles) | **A** (Hands off) | **I** (Informed) | **I** (Informed) |

*Legend: **R** = Responsible for doing; **A** = Accountable / Approver; **C** = Consulted; **I** = Informed.*

---

## 🛠️ MSP Consultant Toolkit in ComplianceOS

### 1. The 10-Second Setup: Smart ISMS Starter Kit
When spinning up a new client tenant in ComplianceOS:
1. Navigate to `/clients/{clientId}/iso27001/guide`.
2. Click **"Smart ISMS Starter Kit"**.
3. The platform automatically:
   * Injects 5 baseline cloud-native assets (AWS, GitHub, Google Workspace, Laptops, DB).
   * Injects 5 core ISO 27005 cyber risks with quantitative scoring.
   * Auto-assigns all 93 ISO 27001:2022 Annex A controls with default applicability.
4. **Time saved:** 25–30 consultant hours per client onboarding.

### 2. Multi-Tenant Tracking
* Monitor all active client sprint statuses from the **Advisor Workbench** or MSP dashboard.
* Track milestone progress and open nonconformities across your entire client portfolio from a single login.

### 3. One-Click Auditor Dossier Export
* When scheduling the external certification audit, open the **Auditor Clean Room Dossier** modal.
* Export a standardized, audit-ready PDF package containing Scope, SoA, Risk Register, Policy Index, and CAPA logs.
* Eliminate messy shared drives and reduce Stage 1 auditor requests by 75%.
