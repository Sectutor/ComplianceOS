# Case Study Tutorial: CloudSync Inc. — Preparing for SOC 2 Audit

> **Workflow:** Gap Analysis
> **Industry:** B2B SaaS
> **Company Size:** 80 employees
> **Timeline:** 6 months

---

## Overview

CloudSync is a B2B SaaS company that just landed a $500K enterprise deal. The customer's security team requires a SOC 2 Type II report within 6 months. This tutorial shows you how to use ComplianceOS to assess your current posture, identify gaps, and build a remediation roadmap that gets you audit-ready.

---

## Situation

- No formal security policies
- Access controls are ad-hoc (no RBAC review process)
- Logging exists but isn't centralized or monitored
- No change management process
- Vendor security assessments don't exist

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| Admin access to ComplianceOS | To create a gap analysis project |
| List of existing security practices | To accurately assess your current state |
| Stakeholder buy-in from IT, HR, Legal | You'll need their input for the assessment |
| 1-2 hours per week for 6 months | Time to complete the assessment and remediation |
| Budget for remediation tools/services | Some gaps require purchasing solutions |

---

## Step-by-Step Walkthrough

### Step 1: Navigate to Gap Analysis

**Time:** 5 minutes

1. From the Start Here page, click **"Gap Analysis"** workflow
2. Click **"Start Workflow"** → this navigates to `/clients/{id}/gap-analysis`
3. Or navigate directly if you already know your client ID

> **Behind the Scenes:** ComplianceOS loads the gap analysis module, which includes the framework selector, assessment engine, gap identification algorithms, and reporting tools.

---

### Step 2: Create a New Assessment

**Time:** 15 minutes

1. Click **"New Assessment"**
2. Fill in assessment details:
   - **Assessment Name:** "SOC 2 Type II Readiness"
   - **Framework:** Select **SOC 2 (Trust Services Criteria)**
   - **Scope:** Production environment, customer-facing applications
   - **Target Date:** 6 months from today
3. Click **"Create Assessment"**

> **Behind the Scenes:** The system loads 64 SOC 2 criteria across 5 Trust Services Criteria categories: Security, Availability, Processing Integrity, Confidentiality, and Privacy. Each criterion becomes an assessment item.

---

### Step 3: Current State Assessment

**Time:** 4-8 hours (spread over 1-2 weeks)

1. For each of the 64 criteria, assess your current state:
   - **Not Started:** No controls in place
   - **Partial:** Some controls exist but gaps remain
   - **Compliant:** Control is fully implemented and effective
   - **Not Applicable:** Criterion doesn't apply to your organization
2. For each criterion, attach evidence:
   - Policy documents
   - Screenshots of configurations
   - Test results
   - Interview notes
3. Use these assessment tips:

**Common SOC 2 Criteria Status for SaaS Companies:**

| Category | Typical Gaps |
|---|---|
| Access Control | No RBAC review, excessive admin privileges |
| Change Management | No formal approval process for production changes |
| Logging & Monitoring | Logs exist but no centralized SIEM, no alerting |
| Vendor Management | No vendor security assessments on file |
| Incident Response | No documented IR plan, no tabletop exercises |
| Data Classification | No formal classification scheme |
| Encryption | Encryption at rest but not in transit (or vice versa) |

4. Click **"Save Progress"** frequently — the assessment is auto-saved but manual saves ensure nothing is lost

> **Behind the Scenes:** Each criterion assessment is stored with a status, notes field, evidence attachments, and timestamp. The system tracks who assessed each criterion and when, creating an audit trail for the external auditor.

---

### Step 4: Gap Identification

**Time:** 30 minutes

1. Once all criteria are assessed, click **"Analyze Gaps"**
2. The system generates a gap report:
   - **Compliance Score:** e.g., 42% (27 of 64 criteria met)
   - **Gaps by Severity:**
     - Critical (must fix before audit): 14 gaps
     - High (should fix before audit): 16 gaps
     - Medium (fix if time permits): 8 gaps
   - **Gaps by Category:** Shows which Trust Services Criteria have the most gaps
3. Review each gap — the system provides:
   - The criterion text
   - Your current state assessment
   - What's needed to close the gap
   - Suggested controls from the framework

**CloudSync's Gap Report:**

| Severity | Count | Examples |
|---|---|---|
| Critical | 14 | No RBAC review, no change management, no IR plan |
| High | 16 | No vendor assessments, no data classification, incomplete logging |
| Medium | 8 | No annual risk assessment, incomplete training records |
| **Total** | **38** | Compliance Score: 42% |

> **Behind the Scenes:** The gap analysis engine compares your assessments against the framework requirements. It uses a weighted scoring algorithm where critical criteria (like access control and encryption) carry more weight than administrative criteria.

---

### Step 5: Create Remediation Roadmap

**Time:** 2-3 hours

1. Navigate to `/clients/{id}/projects`
2. Click **"Create Project"**
3. Name it **"SOC 2 Remediation"**
4. For each gap, create a task:

**Example Task Structure:**

| Task | Assigned To | Priority | Deadline |
|---|---|---|---|
| Implement RBAC review process | IT Director | Critical | Month 1 |
| Write Incident Response Plan | CISO | Critical | Month 1 |
| Deploy centralized logging (SIEM) | DevOps Lead | Critical | Month 2 |
| Create change management process | Engineering Manager | Critical | Month 2 |
| Conduct vendor security assessments | Security Engineer | High | Month 3 |
| Write data protection policy | Legal + CISO | High | Month 3 |
| Implement data classification | IT Director | High | Month 4 |
| Security awareness training for all staff | HR | Medium | Month 5 |
| Internal audit of all controls | CISO | Medium | Month 5 |
| Management review | CEO + CISO | Medium | Month 6 |

5. Set dependencies between tasks (e.g., "SIEM deployment" must complete before "logging criteria assessment")
6. Click **"Save Roadmap"**

> **Behind the Scenes:** The project management system links each task to the specific gap it closes. When you mark a task complete, the gap status auto-updates to "Remediated." The dashboard shows real-time progress against your target date.

---

### Step 6: Track Progress Monthly

**Time:** 1 hour per month

1. Navigate to `/clients/{id}/projects`
2. Open the SOC 2 Remediation project
3. Review the dashboard:
   - **Overall Progress:** 0% → 35% → 62% → 81% → 94% → 97%
   - **Gaps Remaining:** Shows count by severity
   - **Upcoming Deadlines:** Next 30 days of tasks
   - **Blocked Tasks:** Items waiting on dependencies
4. Update task statuses as work completes
5. Re-assess criteria as controls are implemented

> **Behind the Scenes:** The progress dashboard aggregates task completion, gap closure rates, and re-assessment results. It projects your audit readiness date based on current velocity.

---

### Step 7: Audit Ready

**Time:** Final week before audit

1. Navigate to `/clients/{id}/gap-analysis`
2. Click **"Generate Audit Package"**
3. The system produces:
   - Final compliance score (target: 95%+)
   - All 64 criteria with evidence attached
   - Gap closure documentation
   - Remediation evidence
   - Management assertion letter template
4. Download the complete package for your auditor

> **Behind the Scenes:** The audit package generator compiles all assessment data, evidence attachments, and remediation records into a structured ZIP file organized by Trust Services Criteria. Auditors receive a read-only view with full version history.

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ 64 SOC 2 criteria assessed with evidence
- ✅ 38 gaps identified and 35 remediated
- ✅ Compliance score: 42% → 97%
- ✅ Complete audit package ready for external auditor
- ✅ SOC 2 Type II report issued with zero material findings

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "64 criteria is overwhelming" | Start with the Critical gaps (14). Get those to "Compliant" before moving to High and Medium. |
| "We don't have evidence for our assessments" | Screenshot everything. A screenshot of your AWS IAM console is evidence of access controls. |
| "Our compliance score seems low" | Most SaaS companies start at 30-50%. The gap analysis is designed to show you exactly where to focus. |
| "We can't close a gap in time" | Document the compensating control. Auditors accept alternative controls that achieve the same objective. |
| "The auditor wants something specific" | Add custom criteria to your assessment. The system supports organization-specific requirements beyond the standard framework. |
| "We finished our roadmap but the score didn't update" | Re-assess each criterion after implementing controls. The score updates based on your assessments, not just task completion. |

---

## Next Steps

1. **Enter the audit window** — Work with your SOC 2 auditor (typically a CPA firm) for the 6-month observation period.
2. **Maintain your controls** — SOC 2 Type II requires 6 months of operating effectiveness evidence.
3. **Annual re-assessment** — Schedule a lighter annual review to maintain your report.
4. **Expand to ISO 27001** — Use your SOC 2 work as a foundation for ISO 27001 (see Case Study 3).
5. **Add vendor assessments** — If you rely on third parties, assess their security (see Case Study 6).

---

## Related Documentation

- [Gap Analysis Workflow](/start-here) — Start Here page
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Prerequisite for most compliance programs
- [ISO 27001 Case Study](./case-study-3-medcare-iso27001.md) — Complementary certification
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — For third-party risk
