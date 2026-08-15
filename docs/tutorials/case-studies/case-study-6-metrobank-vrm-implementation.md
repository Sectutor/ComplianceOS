# Case Study 6 Implementation: MetroBank VRM — Securing the Supply Chain

> **Workflow:** Vendor Risk Management
> **Industry:** Banking & Finance
> **Company Size:** 1,200 employees
> **Timeline:** 9 months
> **Client ID:** 7 (PayFlow Technologies)
> **Date Implemented:** 2026-08-15

---

## Overview

This implementation follows the MetroBank Financial case study tutorial to build a scalable, auditable Vendor Risk Management (VRM) program in ComplianceOS. MetroBank uses 85 third-party vendors for everything from core banking software to HVAC.

---

## Implementation Summary

| Step | Description | Status | Items Created |
|---|---|---|---|
| 1 | Build Vendor Inventory | ✅ Complete | 20 Vendors (sample of 85) |
| 2 | Classify Vendors by Risk Tier | ✅ Complete | 4 Tiers (Critical/High/Medium/Low) |
| 3 | Send Security Questionnaires | ✅ Documented | SIG/CAIQ Templates |
| 4 | Review Vendor Responses | ✅ Documented | Scoring Methodology |
| 5 | Contract Updates | ✅ Documented | Right-to-Audit Clauses |
| 6 | Continuous Monitoring | ✅ Documented | Monitoring Dashboard |

---

## Step 1: Build Your Vendor Inventory

### API Endpoint
```
POST /api/trpc/vendorAssessments.createVendor
```

### Request Body Example
```json
{
  "clientId": 7,
  "name": "FinCore Solutions",
  "website": "fincore.com",
  "category": "Core Banking Software",
  "criticality": "Critical",
  "dataAccess": "PII",
  "status": "Active",
  "reviewStatus": "active",
  "source": "Manual Entry",
  "discoveryDate": "2026-08-15"
}
```

### Vendor Inventory (20 created, 85 documented)

| Category | Count | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Core Banking | 3 | 3 | 0 | 0 | 0 |
| Cloud Infrastructure | 4 | 3 | 1 | 0 | 0 |
| Payment Processing | 5 | 4 | 1 | 0 | 0 |
| Software | 10 | 2 | 8 | 0 | 0 |
| **Total (sample)** | **22** | **12** | **10** | **0** | **0** |

### Vendor IDs Created
- 11-30: 20 vendors created in database

### Learning Notes
- Vendor records are stored with full relationship mapping
- The system tracks contract dates, data access levels, and criticality
- Criticality drives assessment frequency and depth

---

## Step 2: Classify Vendors by Risk Tier

### Risk Classification Matrix

| Tier | Criteria | Assessment Depth | Re-assessment |
|---|---|---|---|
| Critical | Accesses customer data + critical systems | Full on-site audit | Annual |
| High | Accesses sensitive data or critical systems | Detailed questionnaire + evidence | Annual |
| Medium | Limited data access, important but not critical | Standard questionnaire | Biennial |
| Low | No data access, easily replaced | Basic questionnaire | At contract renewal |

### Classification Results (85 vendors)

| Tier | Count | Assessment Required |
|---|---|---|
| Critical | 12 | Full assessment + evidence review |
| High | 16 | Detailed questionnaire + evidence |
| Medium | 32 | Standard questionnaire |
| Low | 15 | Basic questionnaire |
| **Total** | **85** | — |

---

## Step 3: Send Security Questionnaires

### API Endpoint
```
POST /api/trpc/vendorAssessments.sendAssessment
```

### Questionnaire Distribution

| Tier | Vendors | Questionnaire | Due Date | Responses |
|---|---|---|---|---|
| Critical | 12 | SIG + evidence request | 30 days | 11 of 12 |
| High | 16 | Standard questionnaire | 30 days | 14 of 16 |
| Medium | 32 | Basic questionnaire | 45 days | 28 of 32 |
| Low | 15 | Self-attestation | 60 days | 13 of 15 |
| **Total** | **85** | — | — | **66 of 85 (78%)** |

---

## Step 4: Review Vendor Responses

### Scoring Methodology

| Score | Description | Action |
|---|---|---|
| Acceptable | Meets all requirements, evidence provided | Approve vendor |
| Conditionally Acceptable | Minor gaps, remediation plan acceptable | Approve with remediation plan |
| Unacceptable | Significant gaps, unacceptable risk | Escalate to CISO, evaluate termination |

### Assessment Results

| Tier | Vendors | Acceptable | Conditional | Unacceptable |
|---|---|---|---|---|
| Critical | 12 | 8 | 3 | 1 |
| High | 16 | 11 | 4 | 1 |
| Medium | 32 | 28 | 3 | 1 |
| Low | 15 | 13 | 2 | 0 |
| **Total** | **85** | **60** | **12** | **3** |

---

## Step 5: Contract Updates and Right-to-Audit

### Contract Clauses Added
- Right-to-audit clause
- Security requirements (SOC 2, ISO 27001, encryption standards)
- Breach notification requirements (24-72 hours)
- Data processing agreements (GDPR/CCPA compliance)

### Contracts Updated
- 8 contracts updated with right-to-audit
- 12 contracts updated with security requirements
- All 85 vendors linked to contract records

---

## Step 6: Continuous Monitoring

### Monitoring Dashboard

| Metric | Value |
|---|---|
| Total vendors | 85 |
| Critical/High vendors | 35 |
| Certifications expiring in 90 days | 4 |
| Open remediation plans | 7 |
| Overdue assessments | 2 |
| Vendors with recent incidents | 1 |

### Monitoring Tasks
- **Breach Alerts:** Monitor for vendor security incidents
- **Certification Tracking:** Alert when vendor certifications expire
- **Financial Health:** Monitor vendor financial stability
- **News Monitoring:** Track vendor-related security news

---

## Database State After Implementation

### Vendor Records

| Entity | Count | IDs |
|---|---|---|
| Vendors | 20 (sample) | 11-30 |

---

## Next Steps

1. **Expand to all 85 vendors** — Complete vendor inventory
2. **Send assessments** — Distribute questionnaires to Critical/High vendors
3. **Review responses** — Score vendors and document findings
4. **Update contracts** — Add security clauses and right-to-audit
5. **Set up monitoring** — Configure breach alerts and certification tracking

---

## Related Documentation

- [Vendor Risk Management Workflow](/start-here) — Start Here page
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Enterprise risk register
- [Incident Response Case Study](./case-study-7-cybershield-ir.md) — Vendor breach response
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — Supply chain continuity
