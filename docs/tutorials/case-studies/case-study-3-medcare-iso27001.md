# Case Study Tutorial: MedCare Health Systems — Achieving ISO 27001 Certification

> **Workflow:** ISO 27001 Certification
> **Industry:** Healthcare (Clinic Network)
> **Company Size:** 250 employees across 8 locations
> **Timeline:** 12 months

---

## Overview

MedCare operates 8 clinics processing 50,000 patient records. Their regional health authority mandates ISO 27001 certification within 12 months for continued funding eligibility. This tutorial shows you the complete end-to-end journey from defining your ISMS scope to receiving your ISO 27001 certificate.

---

## Situation

- No ISMS scope or policy statement
- Risk assessment is informal and undocumented
- No Statement of Applicability (SoA)
- Staff security awareness is inconsistent
- No internal audit process

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| Executive sponsorship (CEO/CISO sign-off) | ISO 27001 requires top management commitment (Clause 5) |
| Cross-functional team (IT, HR, Legal, Operations) | Controls span all departments |
| Budget for tools, training, and external auditor | Typical cost: $15K-$50K depending on scope |
| 3-5 hours per week for 12 months | Realistic time investment for full certification |
| List of all patient data processing systems | Your ISMS scope must cover all systems handling PHI |

---

## Step-by-Step Walkthrough

### Step 1: Define Your ISMS Scope

**Time:** 2-4 hours (workshop format)

1. Navigate to `/clients/{id}/gap-analysis/new`
2. Select framework: **ISO 27001:2022**
3. Define scope boundaries:
   - **In Scope:** All 8 clinic locations, patient management system, billing system, telemedicine platform, employee workstations, cloud services (Microsoft 365, AWS)
   - **Out of Scope:** Physical building security (handled by facilities), employee personal devices
4. Document context (Clause 4.1): Internal issues (staff turnover, legacy systems), External issues (regulatory changes, cyber threats)
5. Document interested parties (Clause 4.2): Patients, employees, health authority, insurers, regulators
6. Save scope document — this becomes the foundation of your ISMS

> **Behind the Scenes:** The scope document is stored as a version-controlled record. Any future scope changes create a new version with approval audit trail, maintaining certification integrity.

---

### Step 2: Conduct Gap Analysis

**Time:** 2-3 weeks

1. Complete the ISO 27001 gap analysis:
   - 93 Annex A controls (organized into 4 themes: Organizational, People, Physical, Technological)
   - 11 new controls in ISO 27001:2022 (vs. 2013 version)
2. For each control, assess: Not Implemented / Partially Implemented / Fully Implemented
3. Attach evidence for each assessment

**MedCare's Gap Analysis Results:**

| Category | Controls | Not Implemented | Partial | Full |
|---|---|---|---|---|
| Organizational | 37 | 12 | 15 | 10 |
| People | 8 | 2 | 4 | 2 |
| Physical | 14 | 3 | 6 | 5 |
| Technological | 34 | 10 | 14 | 10 |
| **Total** | **93** | **27** | **39** | **27** |

> **Behind the Scenes:** Gap analysis results feed directly into your risk assessment. Controls marked "Not Implemented" become risk drivers. The system auto-generates risk statements for unimplemented controls.

---

### Step 3: Risk Assessment

**Time:** 2-3 weeks

1. Navigate to `/clients/{id}/risks`
2. The system auto-generates risks from your gap analysis (27 risks from unimplemented controls)
3. Add additional risks identified by stakeholders:
   - Patient data breach via compromised credentials (Critical)
   - Ransomware attack on clinic operations (Critical)
   - Unauthorized access to medical records (High)
   - System outage during patient care (High)
   - Insider threat from disgruntled employee (Medium)
4. Score all risks using the 5x5 matrix
5. Build treatment plan:
   - **Mitigate:** 35 risks (implement controls)
   - **Transfer:** 5 risks (cyber insurance)
   - **Accept:** 8 risks (low-scoring, monitored)
   - **Avoid:** 0 risks

**MedCare's Risk Summary:**

| Severity | Count | Treatment |
|---|---|---|
| Critical | 8 | All mitigated |
| High | 18 | 16 mitigated, 2 transferred |
| Medium | 15 | 11 mitigated, 4 accepted |
| Low | 8 | All accepted |
| **Total** | **49** | Compliance score target: 95%+ |

> **Behind the Scenes:** Risk assessment data feeds into the Statement of Applicability. Each risk treatment links to specific Annex A controls, creating the risk-based approach required by ISO 27001 Clause 6.1.3.

---

### Step 4: Create Statement of Applicability (SoA)

**Time:** 1-2 weeks

1. Navigate to `/clients/{id}/client-policies`
2. Click **"Generate SoA"** — the system creates a draft from your risk assessment
3. For each of the 93 Annex A controls, document:
   - **Applicability:** Applicable / Not Applicable
   - **Justification:** Why the control is or isn't applicable
   - **Implementation Status:** Implemented / In Planned / Not Implemented
   - **Reference:** Link to policy, procedure, or technical configuration
4. Review and adjust auto-generated justifications
5. Export SoA as a formatted document

**MedCare's SoA Summary:**

| Theme | Applicable | Not Applicable | Implementation |
|---|---|---|---|
| Organizational | 34 | 3 | 32 implemented |
| People | 8 | 0 | 7 implemented |
| Physical | 12 | 2 | 11 implemented |
| Technological | 31 | 3 | 28 implemented |
| **Total** | **85** | **8** | **78 implemented** |

> **Behind the Scenes:** The SoA is a mandatory ISO 27001 document (Clause 6.1.3 d). The system maintains version history and requires management approval for each revision. Auditors verify that all applicable controls are implemented and effective.

---

### Step 5: Implement Controls and Write Policies

**Time:** 3-4 months

1. Navigate to `/clients/{id}/client-policies`
2. Write the 18 mandatory ISO 27001 policies:

**Mandatory Policies (Clause 5.2):**

| # | Policy | Status |
|---|---|---|
| 1 | Information Security Policy | Required |
| 2 | Information Security Objectives | Required |
| 3 | Organization of Information Security | Required |
| 4 | Access Control Policy | Required |
| 5 | Cryptography Policy | Required |
| 6 | Physical Security Policy | Required |
| 7 | Operations Security | Required |
| 8 | Communications Security | Required |
| 9 | System Acquisition/Development | Required |
| 10 | Supplier Relationships | Required |
| 11 | Incident Management | Required |
| 12 | Business Continuity | Required |
| 13 | Compliance | Required |
| 14 | Human Resources Security | Required |
| 15 | Asset Management | Required |
| 16 | Risk Management | Required |
| 17 | Statement of Applicability | Required |
| 18 | Rules for Acceptable Use | Required |

3. For each policy, use the built-in template:
   - Purpose
   - Scope
   - Policy statements
   - Roles and responsibilities
   - Compliance requirements
   - Review cycle
4. Submit for approval (CISO → CEO)

> **Behind the Scenes:** Policy templates are pre-loaded based on ISO 27001 requirements. The approval workflow creates an electronic signature trail. Policies are linked to specific Annex A controls, creating the policy-to-control mapping auditors expect.

---

### Step 6: Employee Training and Awareness

**Time:** 2-4 weeks

1. Navigate to `/clients/{id}/settings?tab=onboarding`
2. The system has already seeded 12 default compliance requirements (from client creation)
3. Add healthcare-specific requirements:
   - HIPAA Privacy Rule training
   - HIPAA Security Rule training
   - Patient data handling procedures
   - Phishing awareness
   - Incident reporting procedures
4. Assign to all 250 employees
5. Track completion:

| Requirement | Assigned | Completed | Rate |
|---|---|---|---|
| Code of Conduct | 250 | 248 | 99% |
| InfoSec Policy | 250 | 245 | 98% |
| HIPAA Privacy | 250 | 241 | 96% |
| HIPAA Security | 250 | 238 | 95% |
| Phishing Awareness | 250 | 250 | 100% |
| **Overall** | **1,250** | **1,222** | **98%** |

> **Behind the Scenes:** The onboarding system tracks acknowledgment, quiz scores (if configured), and completion timestamps. The audit trail shows who completed what and when — evidence for Clause 7.2 (Competence) and Clause 7.3 (Awareness).

---

### Step 7: Internal Audit

**Time:** 2-3 weeks

1. Navigate to `/clients/{id}/audit-readiness`
2. Create internal audit plan:
   - Scope: All 85 applicable Annex A controls
   - Auditor: Designate an independent internal auditor (or hire external)
   - Timeline: 2 weeks
3. For each control, auditor verifies:
   - Document exists (policy/procedure)
   - Document is followed (evidence of implementation)
   - Control is effective (produces intended result)
4. Document findings:
   - **Conformity:** Control is effective
   - **Minor Non-Conformity:** Control exists but isn't fully effective
   - **Major Non-Conformity:** Control is missing or ineffective
   - **Observation:** Opportunity for improvement

**MedCare's Internal Audit Results:**

| Finding Type | Count | Resolution |
|---|---|---|
| Conformity | 78 | — |
| Minor Non-Conformity | 5 | Resolved within 2 weeks |
| Major Non-Conformity | 2 | Resolved within 1 month |
| Observation | 4 | Addressed in next review cycle |

> **Behind the Scenes:** Internal audit records are stored with full evidence attachments. Non-conformities generate corrective action tasks with deadlines. The system tracks closure and verifies effectiveness before clearing the finding.

---

### Step 8: Management Review

**Time:** 2-4 hours

1. Navigate to `/clients/{id}/dashboard`
2. Generate management review inputs:
   - Status of actions from previous reviews
   - Changes in external/internal issues
   - Feedback on information security performance
   - Results of risk assessment and status of treatment plan
   - Results of internal and external audits
   - Opportunities for continual improvement
3. Hold management review meeting (CEO, CISO, Department Heads)
4. Document decisions and actions
5. Submit for CEO approval

> **Behind the Scenes:** Management review records are mandatory for ISO 27001 (Clause 9.3). The system generates the meeting template, tracks attendance, and stores minutes with action items. Auditors verify that management is actively engaged in ISMS performance.

---

### Step 9: Certification Audits

**Time:** 4-6 weeks (external auditor timeline)

**Stage 1 — Documentation Review (1-2 weeks):**
1. Auditor reviews your ISMS documentation:
   - Scope and context
   - Risk assessment and treatment plan
   - Statement of Applicability
   - Policies and procedures
   - Internal audit results
   - Management review minutes
2. Auditor identifies any gaps before Stage 2
3. Address any Stage 1 findings

**Stage 2 — Implementation Audit (2-4 weeks):**
1. Auditor verifies controls are effective:
   - Interviews staff
   - Observes processes
   - Reviews evidence
   - Tests technical controls
2. Auditor documents findings:
   - **Major Non-Conformity:** Must be closed before certification
   - **Minor Non-Conformity:** Must be closed within 3 months
   - **Observation:** Recommendation for improvement
3. Address any findings
4. Receive your ISO 27001 certificate

> **Behind the Scenes:** ComplianceOS generates the complete audit package for your auditor: all policies, risk records, SoA, internal audit results, management review minutes, and evidence index. The auditor gets read-only access to verify everything.

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ ISMS scope documented and approved
- ✅ 49 risks assessed with treatment plan
- ✅ 93 Annex A controls mapped in SoA (85 applicable, 78 implemented)
- ✅ 18 mandatory policies written, approved, and acknowledged
- ✅ 250 employees trained (98% completion)
- ✅ Internal audit completed (7 major/minor findings resolved)
- ✅ Management review conducted
- ✅ ISO 27001 certificate issued by accredited body

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Our scope is too broad" | Narrow to specific locations, systems, or services. You can always expand scope later. |
| "We can't implement all 93 controls" | Document why controls aren't applicable. Only 85 were applicable for MedCare. |
| "Staff aren't completing training" | Set deadlines and send reminders. Escalate to department heads for non-compliance. |
| "The auditor found a major non-conformity" | Don't panic. Document the root cause, implement corrective action, and provide evidence of effectiveness. |
| "Our risk assessment is incomplete" | Use the auto-generated risks from gap analysis as a starting point. Add stakeholder-identified risks. |
| "We don't have time for all this" | Prioritize: risk assessment → SoA → critical controls → internal audit. Everything else can run in parallel. |

---

## Next Steps

1. **Maintain your ISMS** — ISO 27001 requires continual improvement, not just initial certification.
2. **Annual surveillance audits** — Your auditor returns yearly to verify ongoing effectiveness.
3. **Recertification (every 3 years)** — Full re-assessment for certificate renewal.
4. **Expand to SOC 2** — Use your ISO 27001 work as a foundation (see Case Study 2).
5. **Add Business Continuity** — ISO 22301 complements ISO 27001 (see Case Study 4).

---

## Related Documentation

- [ISO 27001 Certification Workflow](/start-here) — Start Here page
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Foundation for ISO 27001
- [Gap Analysis Case Study](./case-study-2-cloudsync-soc2.md) — Complementary assessment approach
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — ISO 22301 alignment
