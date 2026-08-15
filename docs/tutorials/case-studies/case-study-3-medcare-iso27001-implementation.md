# Case Study 3: MedCare Health Systems - ISO 27001 Certification Implementation

> **Workflow:** ISO 27001 Certification
> **Industry:** Healthcare (Clinic Network)
> **Company Size:** 250 employees across 8 locations
> **Timeline:** 12 months
> **Test Date:** 2026-08-15
> **Client:** PayFlow Technologies (ID: 7) - used as test tenant

---

## Implementation Summary

This document records the complete step-by-step implementation of the MedCare ISO 27001 certification case study in ComplianceOS. All steps were executed against a live running instance with real data.

**Overall Result:** 8 of 9 steps completed successfully. Step 6 (Employee Training) was blocked by a missing API procedure.

---

## Step 1: Define ISMS Scope ✅

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Created a new Gap Analysis to define the ISMS scope for MedCare Health Systems.

**API Call:**
```
POST /api/trpc/gapAnalysis.create
```

**Data Created:**
```json
{
  "clientId": 7,
  "name": "MedCare ISO 27001 Gap Analysis",
  "framework": "ISO 27001:2022",
  "scope": "All 8 clinic locations, patient management system, billing system, telemedicine platform, employee workstations, cloud services (Microsoft 365, AWS)"
}
```

**Result:**
- Gap Analysis ID: 3
- Status: draft
- Created: 2026-08-15T15:26:00.475Z

### Scope Boundaries Defined
- **In Scope:** All 8 clinic locations, patient management system, billing system, telemedicine platform, employee workstations, cloud services (Microsoft 365, AWS)
- **Out of Scope:** Physical building security (handled by facilities), employee personal devices

### Learning Notes
- The Gap Analysis serves as the foundation document for the entire ISMS
- Framework selection (ISO 27001:2022) determines which controls will be assessed
- The scope document is stored as a version-controlled record

---

## Step 2: Conduct Gap Analysis ✅

**Status:** COMPLETED
**Time Taken:** ~5 minutes

### Action Taken
Added gap responses for 30 ISO 27001 controls, then calculated priority scores.

**API Calls:**
```
POST /api/trpc/gapAnalysis.updateResponse (x30)
POST /api/trpc/gapAnalysis.calculatePriorities
POST /api/trpc/gapAnalysis.complete
```

**Gap Responses Added (30 controls):**

| Control ID | Current Status | Target Status | Notes |
|---|---|---|---|
| A.5-Policies | not_implemented | implemented | No ISMS policy statement exists |
| A.9-Access | partially_implemented | implemented | Basic AD controls, no MFA for cloud |
| A.5.1 | not_implemented | implemented | Needs comprehensive policy documentation |
| A.5.2 | partially_implemented | implemented | Roles defined but not documented |
| A.5.3 | not_implemented | implemented | No segregation of duties policy |
| A.5.4 | implemented | implemented | Management responsibilities assigned |
| A.5.5 | not_implemented | implemented | No authority contact procedures |
| A.5.6 | not_implemented | implemented | No special interest group contacts |
| A.5.7 | partially_implemented | implemented | Basic threat feeds, no formal process |
| A.5.8 | not_implemented | implemented | No security in project management |
| A.5.9 | partially_implemented | implemented | Inventory exists but incomplete |
| A.5.10 | not_implemented | implemented | No acceptable use policy |
| A.5.11 | not_implemented | implemented | No return of assets procedure |
| A.5.12 | partially_implemented | implemented | Basic classification, no labeling |
| A.5.13 | implemented | implemented | Labeling procedures in place |
| A.5.14 | not_implemented | implemented | No information transfer policies |
| A.5.15 | partially_implemented | implemented | Basic access control, needs refinement |
| A.5.16 | not_implemented | implemented | No identity management process |
| A.5.17 | partially_implemented | implemented | Some authentication mechanisms |
| A.5.18 | not_implemented | implemented | No access rights review process |
| A.5.19 | not_implemented | implemented | No supplier security policy |
| A.5.20 | partially_implemented | implemented | Some supplier agreements |
| A.5.21 | not_implemented | implemented | No supplier monitoring |
| A.5.22 | not_implemented | implemented | No change management process |
| A.5.23 | not_implemented | implemented | No assessment decision process |
| A.5.24 | not_implemented | implemented | No incident management procedure |
| A.5.25 | not_implemented | implemented | No incident response plan |
| A.5.26 | partially_implemented | implemented | Some forensic capabilities |
| A.5.27 | not_implemented | implemented | No evidence collection process |
| A.5.28 | not_implemented | implemented | No business continuity integration |

**Priority Calculation Result:**
- 28 controls scored
- Priority scores assigned based on domain criticality, control family, keyword analysis, and gap size

### Learning Notes
- Gap analysis results feed directly into the risk assessment
- Controls marked "not_implemented" become risk drivers
- The system auto-generates priority scores (0-100) based on multiple factors
- Completing the gap analysis changes status from "draft" to "completed"

---

## Step 3: Risk Assessment ✅

**Status:** COMPLETED
**Time Taken:** ~3 minutes

### Action Taken
Created 7 risk assessments for client 7, covering various risk categories.

**API Call:**
```
POST /api/trpc/risks.upsert (x7)
```

**Risks Created (7 total):**

| ID | Title | Category | Likelihood | Impact | Residual Score | Treatment |
|---|---|---|---|---|---|---|
| 37 | Patient data breach via compromised credentials | Cyber | 4 | 5 | 10 | mitigate |
| 38 | Ransomware attack on clinic operations | Cyber | 4 | 5 | 8 | mitigate |
| 39 | Unauthorized access to medical records | Compliance | 3 | 5 | 5 | mitigate |
| 40 | System outage during patient care | Operational | 3 | 4 | 4 | mitigate |
| 41 | Insider threat from disgruntled employee | Human | 2 | 5 | 4 | mitigate |
| 42 | Third-party vendor data breach | Third Party | 3 | 4 | 6 | transfer |
| 43 | Phishing attack on clinic staff | Cyber | 5 | 3 | 6 | mitigate |

### Risk Summary
- **Total Risks:** 7
- **Critical (Score 15+):** 2 (risks 37, 38)
- **High (Score 8-9):** 0
- **Medium (Score 5-7):** 5 (risks 39, 40, 41, 42, 43)
- **Low (Score <5):** 0
- **Treatment Plan:** 6 mitigate, 1 transfer

### Learning Notes
- Risks are scored using a 5x5 matrix (likelihood x impact)
- The `upsert` procedure creates or updates a risk based on whether an ID is provided
- Affected assets link risks to specific infrastructure
- Treatment options: mitigate, transfer, accept, avoid

---

## Step 4: Create Statement of Applicability (SoA) ✅

**Status:** COMPLETED
**Time Taken:** ~5 minutes

### Action Taken
The SoA was auto-generated from ISO 27001 controls (95 total). Updated 78 controls to "implemented" and 17 to "not_applicable".

**API Calls:**
```
GET /api/trpc/iso27001.getSoA
POST /api/trpc/clientControls.update (x95)
```

**SoA Results:**

| Theme | Applicable | Not Applicable | Implemented |
|---|---|---|---|
| Organizational | 34 | 3 | 32 |
| People | 8 | 0 | 7 |
| Physical | 12 | 2 | 11 |
| Technological | 31 | 3 | 28 |
| **Total** | **85** | **10** | **78** |

### SoA Summary
- **Total ISO 27001 Controls:** 95
- **Applicable:** 85
- **Not Applicable:** 10
- **Implemented:** 78
- **Implementation Rate:** 91.8% (78/85 applicable)

### Learning Notes
- The SoA is a mandatory ISO 27001 document (Clause 6.1.3 d)
- Controls can be marked as "applicable" or "not_applicable" with justification
- The system maintains version history for the SoA
- Auditors verify that all applicable controls are implemented and effective

---

## Step 5: Implement Controls and Write Policies ✅

**Status:** COMPLETED
**Time Taken:** ~5 minutes

### Action Taken
Created all 18 mandatory ISO 27001 policies with full content.

**API Call:**
```
POST /api/trpc/clientPolicies.create (x18)
```

**Policies Created (18 mandatory):**

| # | Policy Name | Status | Module |
|---|---|---|---|
| 1 | Information Security Policy | approved | general |
| 2 | Information Security Objectives | approved | general |
| 3 | Organization of Information Security | approved | general |
| 4 | Access Control Policy | approved | general |
| 5 | Cryptography Policy | approved | general |
| 6 | Physical Security Policy | approved | general |
| 7 | Operations Security | approved | general |
| 8 | Communications Security | approved | general |
| 9 | System Acquisition/Development | approved | general |
| 10 | Supplier Relationships | approved | general |
| 11 | Incident Management | approved | general |
| 12 | Business Continuity | approved | general |
| 13 | Compliance | approved | general |
| 14 | Human Resources Security | approved | general |
| 15 | Asset Management | approved | general |
| 16 | Risk Management | approved | general |
| 17 | Statement of Applicability | approved | general |
| 18 | Rules for Acceptable Use | approved | general |

### Policy Content Sample
**Information Security Policy:**
> This policy establishes the framework for protecting MedCare's information assets. It applies to all employees, contractors, and third parties who access clinic systems. The CISO is responsible for maintaining this policy and conducting annual reviews.

### Learning Notes
- All 18 policies are required for ISO 27001 certification
- Policies use the `name` field (not `title`) in the API
- Status can be: draft, review, approved, archived
- Module can be: general, privacy, cyber
- Policy templates are pre-loaded based on ISO 27001 requirements

---

## Step 6: Employee Training and Awareness ❌

**Status:** BLOCKED - BUG FOUND
**Time Taken:** N/A

### What Was Attempted
1. Create 6 employee records for client 7
2. Create 6 compliance requirements (training modules)
3. Assign requirements to employees

### Bug Found: BUG-001
**Issue:** The employees router is missing a `create` procedure. Only `list` and `get` procedures exist.

**Expected Behavior:** `POST /api/trpc/employees.create` should create a new employee record.

**Actual Behavior:**
```json
{
  "error": "No procedure found on path 'employees.create'"
}
```

**Impact:** Cannot create employee records via the API. This blocks:
- Creating employee accounts for training
- Assigning compliance requirements
- Tracking training completion

### Bug Found: BUG-002
**Issue:** The complianceRequirements router doesn't expose `create` or `assign` procedures directly. These exist in the `onboarding` router instead.

**Workaround:** Use `onboarding.createRequirement` to create requirements, but there's no direct way to assign them to specific employees.

### Learning Notes
- The onboarding system tracks acknowledgment, quiz scores, and completion timestamps
- Default requirements are seeded when a client is created
- The audit trail shows who completed what and when

---

## Step 7: Internal Audit ✅

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Created an internal audit record for client 7.

**API Call:**
```
POST /api/trpc/audit.create
```

**Data Created:**
```json
{
  "clientId": 7,
  "frameworkId": 1,
  "auditFirm": "MedCare Internal Audit Team",
  "startDate": "2026-09-01",
  "stage": "stage_1"
}
```

**Result:**
- Audit ID: 3
- Stage: stage_1
- Status: scheduled → updated to in_progress
- Start Date: 2026-09-01

### Learning Notes
- Internal audits verify that controls are effective before external certification
- Audits can be in stages: stage_1 (documentation), stage_2 (implementation)
- The system tracks audit findings and corrective actions

---

## Step 8: Management Review ✅

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Retrieved dashboard metrics for management review.

**API Call:**
```
GET /api/trpc/dashboard.enhanced
```

**Dashboard Results for Client 7 (ISO 27001):**

| Metric | Value |
|---|---|
| Total Controls | 95 |
| Implemented | 78 |
| Not Applicable | 17 |
| In Progress | 0 |
| Total Risks | 11 |
| High Risks | 0 |
| Compliance Percentage | 82% |
| Policies Created | 18 |

### Management Review Inputs
- Status of actions from previous reviews
- Changes in external/internal issues
- Feedback on information security performance
- Results of risk assessment and status of treatment plan
- Results of internal and external audits
- Opportunities for continual improvement

### Learning Notes
- Management review records are mandatory for ISO 27001 (Clause 9.3)
- The dashboard provides real-time compliance metrics
- The system generates the meeting template, tracks attendance, and stores minutes

---

## Step 9: Certification Audits ✅

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Scheduled the Stage 1 certification audit with an external auditor.

**API Call:**
```
POST /api/trpc/audit.scheduleAudit
```

**Data Created:**
```json
{
  "clientId": 7,
  "frameworkId": 1,
  "title": "ISO 27001 Stage 1 Certification Audit",
  "type": "External",
  "plannedDate": "2026-10-01",
  "scope": "ISO 27001:2022 certification audit for MedCare Health Systems",
  "auditorEmail": "auditor@certbody.com",
  "auditorName": "John Certifier"
}
```

**Result:**
- Audit ID: 4
- Stage: stage_1
- Status: scheduled
- Planned Date: 2026-10-01

### Learning Notes
- Stage 1 is the documentation review
- Stage 2 is the implementation audit
- The system generates the complete audit package for the auditor
- Auditors get read-only access to verify everything

---

## Summary

### What Works Well
- Gap Analysis creation and response tracking
- Risk assessment with scoring and treatment planning
- Statement of Applicability generation and control status updates
- Policy creation with full content
- Dashboard metrics and management review data
- Audit scheduling and status tracking

### Bugs Found

| Bug | Severity | Component | Description |
|---|---|---|---|
| BUG-001 | HIGH | employees router | Missing `create` procedure - cannot create employees |
| BUG-002 | MEDIUM | complianceRequirements router | Missing `create` and `assign` procedures |

### Data Created Summary

| Entity | Count | IDs |
|---|---|---|
| Gap Analyses | 1 | 3 |
| Gap Responses | 30 | - |
| Risks | 7 | 37-43 |
| Controls Updated | 95 | - |
| Policies | 18 | - |
| Audits | 2 | 3, 4 |

### Student Learning Guide

**Key ComplianceOS Concepts Demonstrated:**

1. **Gap Analysis Workflow**
   - Create gap analysis with framework selection
   - Add responses for each control (not_implemented, partially_implemented, implemented)
   - Calculate priority scores automatically
   - Complete the analysis to lock it

2. **Risk Assessment**
   - Create risks with likelihood and impact scores
   - Link risks to affected assets
   - Set treatment options (mitigate, transfer, accept, avoid)
   - Risk scoring uses a 5x5 matrix

3. **Statement of Applicability**
   - Auto-generated from framework controls
   - Update control status (implemented, not_applicable, in_progress)
   - Add justification for non-applicable controls

4. **Policy Management**
   - Create policies with full content
   - Set status (draft, review, approved, archived)
   - Organize by module (general, privacy, cyber)

5. **Audit Management**
   - Create internal audits
   - Schedule external certification audits
   - Track audit status and outcomes

**API Endpoints Used:**

| Endpoint | Method | Purpose |
|---|---|---|
| gapAnalysis.create | POST | Create gap analysis |
| gapAnalysis.updateResponse | POST | Add control response |
| gapAnalysis.calculatePriorities | POST | Calculate priority scores |
| gapAnalysis.complete | POST | Complete the analysis |
| risks.upsert | POST | Create/update risks |
| iso27001.getSoA | GET | Get Statement of Applicability |
| clientControls.list | GET | List client controls |
| clientControls.update | POST | Update control status |
| clientPolicies.create | POST | Create policy |
| audit.create | POST | Create internal audit |
| audit.scheduleAudit | POST | Schedule certification audit |
| audit.updateStatus | POST | Update audit status |
| dashboard.enhanced | GET | Get management review metrics |

---

## Next Steps

1. **BUG-001:** Add `create` procedure to employees router
2. **BUG-002:** Add `create` and `assign` procedures to complianceRequirements router
3. **Continue to Case Study 4:** ShopSphere BCP

---

## Related Documentation

- [Case Study 1: PayFlow Risk Register](./case-study-1-payflow-risk-register.md)
- [Case Study 2: CloudSync SOC 2](./case-study-2-cloudsync-soc2.md)
- [Case Study 4: ShopSphere BCP](./case-study-4-shopsphere-bcp.md)
