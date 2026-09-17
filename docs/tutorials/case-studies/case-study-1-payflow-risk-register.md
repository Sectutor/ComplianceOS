# Case Study Tutorial: PayFlow Technologies — Building a Risk Register from Scratch

> **Workflow:** Risk Assessment
> **Industry:** Financial Technology
> **Company Size:** 15 employees
> **Timeline:** 2 weeks

---

## Overview

PayFlow Technologies is a 15-person fintech startup processing $2M in monthly transactions. Their Series A investor requires a documented risk management process before releasing the next funding tranche. This tutorial shows you how to go from zero to a board-ready risk register in ComplianceOS — exactly what PayFlow did in 14 days.

---

## Situation

- No existing risk register or asset inventory
- Team conflates "security issues" with "risks"
- No formal risk scoring methodology
- Board meeting in 14 days

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| Admin access to ComplianceOS | To create a workspace and invite team members |
| List of company assets (or time to build one) | You'll catalog hardware, software, and data |
| Knowledge of your business processes | To identify what would happen if assets were compromised |
| Stakeholder contact info | To assign risk owners |
| 30 minutes per day for 2 weeks | Realistic time investment for a complete risk register |

---

## Step-by-Step Walkthrough

### Step 1: Create Your Workspace

**Time:** 10 minutes

1. Navigate to `/clients/new/msp`
2. Enter company details:
   - **Company Name:** PayFlow Technologies
   - **Industry:** Financial Services
   - **Employee Count:** 15
3. Select frameworks: Choose **ISO 27001** (investor-aligned)
4. Complete the 7-step wizard (company info → frameworks → risk profile → branding → contact → review → launch)
5. On the success screen, click **"Enter Workspace"**

> **Behind the Scenes:** ComplianceOS creates the client record, assigns your user as admin, links the ISO 27001 framework (loading 93 Annex A controls), and seeds 12 default compliance requirements for future employee onboarding.

---

### Step 2: Build Your Asset Inventory

**Time:** 45 minutes

1. Navigate to `/clients/{id}/risks/assets`
2. Click **"Add Asset"**
3. For each asset, fill in:
   - **Name:** e.g., "Payment Gateway API"
   - **Type:** Hardware / Software / Data / People / Process
   - **Owner:** Select from team members
   - **Classification:** Public / Internal / Confidential / Restricted
   - **Criticality:** Critical / High / Medium / Low
4. Add at least these 12 assets (PayFlow's actual list):

| Asset | Type | Classification | Criticality |
|---|---|---|---|
| Payment Gateway API | Software | Confidential | Critical |
| Customer Database | Data | Restricted | Critical |
| Transaction Processing System | Software | Confidential | Critical |
| API Servers (3x) | Hardware | Confidential | Critical |
| Employee Laptops (15x) | Hardware | Internal | Medium |
| Source Code Repository | Software | Confidential | High |
| Email System (Google Workspace) | Software | Internal | Medium |
| DNS & Domain Management | Software | Internal | High |
| Firewall & Network Gear | Hardware | Confidential | High |
| Backup Storage | Data | Confidential | High |
| HR Records | Data | Restricted | Medium |
| Financial Records | Data | Restricted | High |

5. Click **"Save"** after each asset

> **Behind the Scenes:** Each asset is stored in the `assets` table with a unique UUID, linked to your client ID. The classification and criticality fields drive risk scoring in later steps.

---

### Step 3: Create Your Risk Register

**Time:** 60 minutes

1. Navigate to `/clients/{id}/risks/register`
2. Click **"Add Risk"**
3. For each risk, fill in:
   - **Title:** e.g., "Payment data breach via API vulnerability"
   - **Description:** What could happen, how, and why
   - **Asset:** Link to the affected asset(s)
   - **Threat Source:** External attacker / Insider / Natural disaster / System failure
   - **Vulnerability:** The weakness that could be exploited
4. Add at least 20 risks. PayFlow identified 22:

**Sample Risks (first 10):**

| # | Risk Title | Asset | Threat |
|---|---|---|---|
| 1 | Payment data breach via API vulnerability | Payment Gateway API | External attacker |
| 2 | Customer PII exposure from DB misconfiguration | Customer Database | External attacker |
| 3 | Transaction fraud from compromised credentials | Transaction Processing | External attacker |
| 4 | Ransomware infection via phishing | Employee Laptops | External attacker |
| 5 | Source code theft from repo compromise | Source Code Repository | Insider threat |
| 6 | Email compromise leading to wire fraud | Email System | External attacker |
| 7 | DNS hijacking redirecting payment traffic | DNS & Domain | External attacker |
| 8 | Firewall misconfiguration exposing internal network | Firewall & Network | Human error |
| 9 | Backup failure during critical incident | Backup Storage | System failure |
| 10 | Unauthorized HR record access by terminated employee | HR Records | Insider threat |

5. Continue adding risks 21-22 for completeness

> **Behind the Scenes:** Risks are stored in the `risks` table, linked to assets via a many-to-many relationship. Each risk gets a unique ID for tracking through the assessment and treatment lifecycle.

---

### Step 4: Score Your Risks

**Time:** 30 minutes

1. Navigate to `/clients/{id}/risks/assessments`
2. For each risk, set:
   - **Likelihood:** 1 (Rare) to 5 (Almost Certain)
   - **Impact:** 1 (Negligible) to 5 (Catastrophic)
3. The system auto-calculates: **Risk Score = Likelihood × Impact**
4. Sort by risk score (highest first)

**PayFlow's Top 5 Risks:**

| Risk | Likelihood | Impact | Score |
|---|---|---|---|
| Payment data breach via API vulnerability | 4 | 5 | **20** (Critical) |
| Customer PII exposure from DB misconfiguration | 4 | 5 | **20** (Critical) |
| Transaction fraud from compromised credentials | 3 | 5 | **15** (High) |
| Ransomware infection via phishing | 4 | 4 | **16** (High) |
| DNS hijacking redirecting payment traffic | 3 | 5 | **15** (High) |

> **Behind the Scenes:** Risk scores use a standard 5x5 matrix. Scores 15-25 are "Critical/High" (require treatment), 5-14 are "Medium" (monitor), 1-4 are "Low" (accept). The scoring methodology aligns with ISO 27001 Clause 6.1.2.

---

### Step 5: Build Your Treatment Plan

**Time:** 45 minutes

1. Navigate to `/clients/{id}/risks/treatment-plan`
2. For each Critical/High risk, select a treatment option:
   - **Mitigate:** Implement controls to reduce likelihood or impact
   - **Transfer:** Shift risk to a third party (insurance, outsourcing)
   -:**Stop the activity that creates the risk
   - **Accept:** Acknowledge and monitor (for low-scoring risks only)
3. For PayFlow's top 5:

| Risk | Treatment | Control to Implement |
|---|---|---|
| Payment data breach | Mitigate | API gateway with WAF, input validation, rate limiting |
| Customer PII exposure | Mitigate | Database encryption at rest, access controls, audit logging |
| Transaction fraud | Transfer | Cyber insurance with fraud coverage |
| Ransomware | Mitigate | Endpoint detection & response, email filtering, backups |
| DNS hijacking | Mitigate | DNSSEC, multi-factor authentication for DNS provider |

4. Set target dates and owners for each treatment

> **Behind the Scenes:** Treatment plans are stored in the `risk_treatments` table, linked to risks and controls. Each treatment tracks status (Planned → In Progress → Complete) and links to projects/tasks for implementation tracking.

---

### Step 6: Generate Your Board Report

**Time:** 15 minutes

1. Navigate to `/clients/{id}/risks`
2. Click **"Export Report"**
3. Select **"Board Summary"** template
4. The report includes:
   - Executive summary (risk posture overview)
   - Top 10 risks by score
   - Risk heat map visualization
   - Treatment plan summary
   - Maturity assessment
5. Download as PDF

> **Behind the Scenes:** The report generator aggregates data from assets, risks, assessments, and treatments into a formatted PDF. Charts are rendered server-side using the risk matrix data.

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ 12 assets cataloged with owners and classifications
- ✅ 22 risks identified, scored, and mapped to assets
- ✅ Treatment plan covering all critical/high risks
- ✅ Board-ready PDF risk register
- ✅ Audit trail showing your risk management process

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "I don't know what assets we have" | Start with the obvious: laptops, servers, cloud services, customer data, email. Interview department heads for hidden assets. |
| "I can't think of 20 risks" | Use the asset list — for each asset, ask: "What if it was stolen? Broken? Exposed? Unavailable?" That's 3+ risks per asset. |
| "I don't know how to score likelihood/impact" | Use relative scoring. If risk A is "more likely" than risk B, give it a higher number. Exact numbers matter less than the ranking. |
| "My team doesn't understand risk management" | Share the board report — it translates technical risks into business language executives understand. |
| "We have too many critical risks" | That's normal for a first assessment. Focus treatment on the top 5. The rest go into your monitoring cycle. |
| "The investor wants more detail" | Add evidence links to each risk — attach penetration test results, vulnerability scans, or incident reports. |

---

## Next Steps

1. **Schedule quarterly risk reviews** — Risk registers decay. Set a calendar reminder to reassess every 90 days.
2. **Link risks to controls** — Map each treatment to specific Annex A controls for ISO 27001 alignment.
3. **Add risk indicators** — Set up KRIs (Key Risk Indicators) to monitor risk levels over time.
4. **Expand to vendor risks** — Once your internal risk register is mature, assess third-party risks (see Case Study 6).
5. **Connect to gap analysis** — Use your risk register to inform your gap analysis (see Case Study 2).

---

## Related Documentation

- [Risk Assessment Workflow](/start-here) — Start Here page
- [Client Onboarding Tutorial](../client-onboarding.md) — How to create a workspace
- [Gap Analysis Case Study](./case-study-2-cloudsync-soc2.md) — Next logical step after risk assessment
- [ISO 27001 Case Study](./case-study-3-medcare-iso27001.md) — Full certification journey
