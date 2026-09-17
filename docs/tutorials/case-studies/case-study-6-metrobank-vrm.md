# Case Study Tutorial: MetroBank Financial — Securing the Supply Chain

> **Workflow:** Vendor Risk Management
> **Industry:** Banking & Finance
> **Company Size:** 1,200 employees
**Timeline:** 9 months

---

## Overview

MetroBank uses 85 third-party vendors for everything from core banking software to HVAC. Their regulator (OCC) issued a finding requiring a formal vendor risk management program within 9 months. MetroBank currently assesses vendors via spreadsheets and email. This tutorial shows you how to build a scalable, auditable vendor risk management program in ComplianceOS.

---

## Situation

- Vendor inventory is incomplete (only 58 of 85 vendors documented)
- No consistent risk classification methodology
- Security questionnaires are emailed as Word docs (untrackable)
- No continuous monitoring of critical vendor security postures
- Contract renewal dates aren't linked to re-assessment schedules

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| Complete vendor list (from procurement/finance) | You can't assess vendors you don't know about |
| Access to vendor contracts | To understand security requirements and SLAs |
| Stakeholder support from Procurement, Legal, IT | Vendor risk is cross-functional |
| Budget for vendor assessment tools (if not using ComplianceOS) | Some organizations pay for questionnaire platforms |
| 2-3 hours per week for 9 months | Time for inventory, assessment, remediation, and monitoring |

---

## Step-by-Step Walkthrough

### Step 1: Build Your Vendor Inventory

**Time:** 1-2 weeks

1. Navigate to `/clients/{id}/risk/vendors`
2. Click **"Add Vendor"** or **"Import Vendors"**
3. For each vendor, capture:

| Field | Description | Example |
|---|---|---|
| Vendor Name | Legal entity name | FinCore Solutions |
| Category | Type of service | Core Banking Software |
| Status | Active / Inactive / Under Review | Active |
| Contract Start | Date contract began | 2024-01-15 |
| Contract End | Date contract expires | 2026-01-14 |
| Data Access | What data the vendor accesses | Customer PII, Financial Records |
| Access Level | Read / Write / Admin | Read + Write |
| Criticality | Critical / High / Medium / Low | Critical |
| Owner | Internal relationship owner | CTO |

4. Import existing 58 vendors from spreadsheet
5. Manually add remaining 27 vendors
6. Verify completeness with Procurement (compare against accounts payable records)

**MetroBank's Vendor Inventory:**

| Category | Count | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Core Banking | 3 | 3 | 0 | 0 | 0 |
| Cloud Infrastructure | 4 | 3 | 1 | 0 | 0 |
| Payment Processing | 5 | 4 | 1 | 0 | 0 |
| Software Vendors | 18 | 2 | 8 | 6 | 2 |
| Professional Services | 12 | 0 | 3 | 7 | 2 |
| Facilities & Physical | 15 | 0 | 2 | 8 | 5 |
| Marketing & Sales | 10 | 0 | 1 | 5 | 4 |
| Other | 18 | 0 | 0 | 6 | 12 |
| **Total** | **85** | **12** | **16** | **32** | **15** |

> **Behind the Scenes:** Vendor records are stored with full relationship mapping. The system tracks contract dates, data access levels, and criticality to drive assessment frequency and depth.

---

### Step 2: Classify Vendors by Risk Tier

**Time:** 3-5 days

1. For each vendor, determine risk classification based on:
   - **Data Access:** Does the vendor access sensitive data? (PII, financial, health)
   - **System Access:** Does the vendor have access to critical systems?
   - **Substitutability:** How difficult is it to replace this vendor?
   - **Regulatory Impact:** Would a vendor failure trigger regulatory action?

2. Apply the classification matrix:

| Tier | Criteria | Assessment Depth | Re-assessment |
|---|---|---|---|
| Critical | Accesses customer data + critical systems | Full on-site audit | Annual |
| High | Accesses sensitive data or critical systems | Detailed questionnaire + evidence | Annual |
| Medium | Limited data access, important but not critical | Standard questionnaire | Biennial |
| Low | No data access, easily replaced | Basic questionnaire | At contract renewal |

3. Classify all 85 vendors:

**Classification Results:**

| Tier | Count | Assessment Required |
|---|---|---|
| Critical | 12 | Full assessment + evidence review |
| High | 16 | Detailed questionnaire + evidence |
| Medium | 32 | Standard questionnaire |
| Low | 15 | Basic questionnaire |
| **Total** | **85** | — |

4. Review and adjust with stakeholders:
   - IT confirms critical system access
   - Legal confirms data access classifications
   - Procurement confirms substitutability assessments

> **Behind the Scenes:** Risk classification drives the assessment workflow. Critical vendors automatically get the deepest assessments and most frequent re-assessments. The system schedules re-assessments based on tier and tracks completion.

---

### Step 3: Send Security Questionnaires

**Time:** 2-4 weeks

1. Navigate to `/clients/{id}/risk/vendors`
2. Filter by tier: Critical + High (35 vendors)
3. Click **"Send Assessment"**
4. Select questionnaire template:
   - **SIG (Standardized Information Gathering):** Comprehensive 300+ question assessment
   - **CAIQ (Consensus Assessments Initiative Questionnaire):** Cloud-specific
   - **Custom:** Organization-specific questions
5. Configure assessment:
   - Due date: 30 days from send
   - Reminder schedule: 14 days, 7 days, 3 days, 1 day before due
   - Escalation: Notify relationship owner if not completed
6. Send to all 35 Critical/High vendors

**Questionnaire Distribution:**

| Tier | Vendors | Questionnaire | Due Date | Responses |
|---|---|---|---|---|
| Critical | 12 | SIG + evidence request | 30 days | 11 of 12 |
| High | 16 | Standard questionnaire | 30 days | 14 of 16 |
| Medium | 32 | Basic questionnaire | 45 days | 28 of 32 |
| Low | 15 | Self-attestation | 60 days | 13 of 15 |
| **Total** | **85** | — | — | **66 of 85 (78%)** |

7. Track responses in the dashboard
8. Follow up with non-responding vendors (escalate to relationship owner)

> **Behind the Scenes:** Questionnaires are sent via the system with unique tracking links. Vendors complete questionnaires in a portal (no Word docs emailed). All responses are version-controlled and time-stamped. The system tracks response rates and sends automated reminders.

---

### Step 4: Review Vendor Responses

**Time:** 2-3 weeks

1. For each responding vendor, review:
   - Completeness of responses
   - Evidence attachments (SOC 2 report, ISO 27001 certificate, penetration test results)
   - Consistency with your classification
   - Red flags (missing controls, expired certifications, incidents)

2. Score each vendor:
   - **Acceptable:** Meets all requirements, evidence provided
   - **Conditionally Acceptable:** Minor gaps, remediation plan acceptable
   - **Unacceptable:** Significant gaps, unacceptable risk

**Assessment Results:**

| Tier | Vendors | Acceptable | Conditional | Unacceptable |
|---|---|---|---|---|
| Critical | 12 | 8 | 3 | 1 |
| High | 16 | 11 | 4 | 1 |
| Medium | 32 | 28 | 3 | 1 |
| Low | 15 | 13 | 2 | 0 |
| **Total** | **85** | **60** | **12** | **3** |

3. For conditionally acceptable vendors:
   - Document the gaps
   - Require remediation plan with deadlines
   - Schedule follow-up assessment

4. For unacceptable vendors:
   - Escalate to CISO and relationship owner
   - Evaluate contract termination vs. remediation
   - Implement compensating controls in the interim

**Unacceptable Vendor Findings:**

| Vendor | Tier | Finding | Action |
|---|---|---|---|
| FinCore Solutions | Critical | No SOC 2 report, no penetration testing | Require SOC 2 Type II within 6 months or terminate |
| CloudHost Inc. | High | Expired ISO 27001 certificate | Suspend new data sharing until recertified |
| MarketingBuzz | Medium | No data protection policy | Require policy within 30 days |

> **Behind the Scenes:** Assessment results are stored with full response data, evidence attachments, and reviewer notes. The system tracks findings, remediation plans, and deadlines. Audit trails show who reviewed what and when.

---

### Step 5: Contract Updates and Right-to-Audit

**Time:** 2-4 weeks

1. For vendors with gaps, update contracts:
   - Add right-to-audit clause
   - Specify security requirements (SOC 2, ISO 27001, encryption standards)
   - Include breach notification requirements (24-72 hours)
   - Add data processing agreements (GDPR/CCPA compliance)

2. Link contract updates to vendor records:
   - Upload updated contracts
   - Set renewal reminders (90 days before expiration)
   - Link renewal to re-assessment schedule

3. For MetroBank:
   - 8 contracts updated with right-to-audit
   - 12 contracts updated with security requirements
   - All 85 vendors linked to contract records

> **Behind the Scenes:** Contract management tracks renewal dates, security clauses, and re-assessment triggers. The system sends alerts 90 days before renewal, ensuring you never miss a re-assessment window.

---

### Step 6: Continuous Monitoring

**Time:** Ongoing (1-2 hours per month)

1. Navigate to `/clients/{id}/risk/vendors`
2. Set up monitoring:
   - **Breach Alerts:** Monitor for vendor security incidents
   - **Certification Tracking:** Alert when vendor certifications expire
   - **Financial Health:** Monitor vendor financial stability
   - **News Monitoring:** Track vendor-related security news

3. Schedule re-assessments:
   - Critical vendors: Annual
   - High vendors: Annual
   - Medium vendors: Biennial
   - Low vendors: At contract renewal

4. Monthly monitoring tasks:
   - Review breach alerts
   - Track certification expirations
   - Update vendor inventory (add/remove vendors)
   - Follow up on open remediation plans

**MetroBank's Monitoring Dashboard:**

| Metric | Value |
|---|---|
| Total vendors | 85 |
| Critical/High vendors | 35 |
| Certifications expiring in 90 days | 4 |
| Open remediation plans | 7 |
| Overdue assessments | 2 |
| Vendors with recent incidents | 1 |

> **Behind the Scenes:** Continuous monitoring integrates with external data sources (security feeds, certification databases, financial data). The system correlates vendor incidents with your inventory and alerts you if a critical vendor experiences a breach.

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ Complete vendor inventory: 85 vendors documented
- ✅ Risk classification: 12 Critical, 16 High, 32 Medium, 15 Low
- ✅ 66 of 85 vendors assessed with standardized questionnaires
- ✅ 3 vendors remediated or replaced based on findings
- ✅ 8 contracts updated with right-to-audit clauses
- ✅ Continuous monitoring with breach alerts and certification tracking
- ✅ OCC finding closed at next examination

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "We don't know all our vendors" | Cross-reference accounts payable records, procurement databases, and department shadow IT. Interview department heads. |
| "Vendors aren't responding to questionnaires" | Escalate to relationship owners. Offer to discuss responses verbally. Consider it a red flag if they won't respond. |
| "We can't terminate an unacceptable vendor" | Implement compensating controls: restrict data access, increase monitoring, add contractual protections. Document the accepted risk. |
| "Questionnaires are overwhelming vendors" | Start with Critical/High vendors only. Medium/Low can use shorter questionnaires. Build the program incrementally. |
| "We don't have time for continuous monitoring" | Automate what you can (certification tracking, breach alerts). Focus manual review on Critical/High vendors. |
| "Our regulator wants more detail" | Provide the full assessment package: questionnaires, evidence, review notes, remediation plans, and monitoring records. |

---

## Next Steps

1. **Expand to all vendors** — Complete assessments for remaining Medium/Low vendors.
2. **Integrate with procurement** — Add vendor risk assessment to the procurement process (assess before onboarding).
3. **Add vendor performance metrics** — Track SLA compliance, incident response times, and remediation completion rates.
4. **Annual program review** — Assess the effectiveness of your VRM program and update methodology.
5. **Link to enterprise risk** — Include vendor risks in your enterprise risk register.

---

## Related Documentation

- [Vendor Risk Management Workflow](/start-here) — Start Here page
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Enterprise risk register
- [Incident Response Case Study](./case-study-7-cybershield-ir.md) — Vendor breach response
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — Supply chain continuity
