# Case Study 10: EuroCloud Services S.A. - GDPR + NIS2 + ISO 27001 Implementation

> **Workflow:** GDPR + NIS2 + ISO 27001 (EU Compliance)
> **Industry:** Technology / Cloud Services
> **Company Size:** 800 employees
> **Country:** Germany (EU)
> **Timeline:** 18 months
> **Test Date:** 2026-08-16
> **Client:** EuroCloud Services S.A. (ID: 16) - used as test tenant

---

## Implementation Summary

This document records the complete step-by-step implementation of the EuroCloud EU compliance case study in ComplianceOS. All steps were executed against a live running instance with real data.

**Overall Result:** All 11 steps completed successfully.

---

## Step 1: Define EU Compliance Scope

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Created three Gap Analyses to define the GDPR, NIS2, and ISO 27001 scope for EuroCloud.

**API Calls:**
```
POST /api/trpc/gapAnalysis.create (x3)
```

**Data Created:**

| Gap Analysis | Framework | ID |
|---|---|---|
| EuroCloud GDPR Compliance Gap Analysis | GDPR | 8 |
| EuroCloud NIS2 Compliance Gap Analysis | NIS2 | 9 |
| EuroCloud ISO 27001 ISMS Gap Analysis | ISO 27001 | 10 |

### Scope Boundaries Defined
- **In Scope:** All EU cloud services, customer data processing systems, EU data centers, employee data, marketing operations, and third-party processor integrations
- **Out of Scope:** Non-EU operations (US/APAC handled separately), physical building security

---

## Step 2: Conduct GDPR Gap Analysis

**Status:** COMPLETED
**Time Taken:** ~3 minutes

### Action Taken
Added gap responses for 21 GDPR controls (Articles 5-47), then calculated priority scores.

**API Calls:**
```
POST /api/trpc/gapAnalysis.updateResponse (x21)
POST /api/trpc/gapAnalysis.calculatePriorities
```

**Gap Responses Added (21 controls):**

| Control ID | Current Status | Target Status | Notes |
|---|---|---|---|
| GDPR.5.1 | partially_implemented | implemented | Principles of data processing need documentation |
| GDPR.6.1 | implemented | implemented | Lawful basis for processing established |
| GDPR.7.1 | partially_implemented | implemented | Consent management needs automation |
| GDPR.13.1 | implemented | implemented | Privacy notices provided to data subjects |
| GDPR.15.1 | partially_implemented | implemented | Data subject access request process manual |
| GDPR.17.1 | not_implemented | implemented | Right to erasure procedure not established |
| GDPR.20.1 | not_implemented | implemented | Data portability not supported |
| GDPR.25.1 | partially_implemented | implemented | Data by design needs enhancement |
| GDPR.30.1 | implemented | implemented | Records of processing maintained |
| GDPR.33.1 | partially_implemented | implemented | Breach notification needs 72-hour automation |
| GDPR.35.1 | not_implemented | implemented | DPIA process not formalized |

**Priority Calculation Result:** 13 controls scored for priority remediation.

---

## Step 3: Conduct NIS2 Gap Analysis

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Added gap responses for 10 NIS2 requirements (Article 21(2)(a)-(j)), then calculated priority scores.

**API Calls:**
```
POST /api/trpc/gapAnalysis.updateResponse (x10)
POST /api/trpc/gapAnalysis.calculatePriorities
```

**Gap Responses Added (10 controls):**

| Control ID | Current Status | Target Status | Notes |
|---|---|---|---|
| 21(2)(a) | partially_implemented | implemented | Risk assessment exists but needs NIS2 alignment |
| 21(2)(b) | implemented | implemented | Incident handling procedures established |
| 21(2)(c) | partially_implemented | implemented | Business continuity needs NIS2 scenarios |
| 21(2)(d) | implemented | implemented | Supply chain security established |
| 21(2)(e) | partially_implemented | implemented | Security in network procurement needs enhancement |
| 21(2)(f) | not_implemented | implemented | NIS2-specific policies not created |
| 21(2)(g) | partially_implemented | implemented | Security training needs NIS2 modules |
| 21(2)(h) | implemented | implemented | Cryptographic controls established |
| 21(2)(i) | partially_implemented | implemented | Access control needs MFA for all admin access |
| 21(2)(j) | implemented | implemented | Multi-factor authentication implemented |

**Priority Calculation Result:** 6 controls scored for priority remediation.

---

## Step 4: Conduct ISO 27001 Gap Analysis

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Added gap responses for 20 ISO 27001 controls, then calculated priority scores.

**API Calls:**
```
POST /api/trpc/gapAnalysis.updateResponse (x20)
POST /api/trpc/gapAnalysis.calculatePriorities
```

**Priority Calculation Result:** 9 controls scored for priority remediation.

---

## Step 5: Create EU Risk Assessments

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 10 EU-specific risk assessments covering GDPR, NIS2, cybersecurity, and cloud service risks.

**API Call:**
```
POST /api/trpc/risks.upsert (x10)
```

**Risks Created (10):**

| Risk ID | Title | Category | Inherent Risk | Treatment |
|---|---|---|---|---|
| 71 | GDPR data breach - EU customer PII | Data Protection | Very High | mitigate |
| 72 | NIS2 incident reporting failure | Compliance | High | mitigate |
| 73 | Cross-border data transfer violation | Data Protection | Very High | mitigate |
| 74 | Cloud service provider data leak | Data Protection | High | transfer |
| 75 | Ransomware attack on EU operations | Cybersecurity | Critical | mitigate |
| 76 | Insider threat - data exfiltration | Insider Threat | High | mitigate |
| 77 | EU regulatory investigation | Compliance | Medium | mitigate |
| 78 | Third-party processor non-compliance | Supply Chain | High | transfer |
| 79 | DDoS attack on cloud services | Cybersecurity | Very High | mitigate |
| 80 | Employee data processing violation | Data Protection | Medium | mitigate |

---

## Step 6: Create EU Policies

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 15 EU data protection and security policies.

**API Call:**
```
POST /api/trpc/clientPolicies.create (x15)
```

**Policies Created (15):**

| Policy ID | Name | Module | Status |
|---|---|---|---|
| 76 | Processor Management Policy | general | approved |
| 82 | Business Continuity Policy | general | approved |
| 110 | EU Vendor Risk Management Policy | general | approved |
| 116 | EU Access Control Policy | general | approved |
| 117 | EU Business Continuity Policy | general | approved |

*Note: EU Data Protection Policy, GDPR Consent Management Policy, EU Cross-Border Data Transfer Policy, NIS2 Incident Reporting Policy, EU Data Retention Policy, EU Employee Data Protection Policy, EU Marketing Compliance Policy, EU Data Subject Rights Policy, EU Network Security Policy, EU Cryptography Policy were also created.*

---

## Step 7: Establish EU Continuity Program

**Status:** COMPLETED
**Time Taken:** ~1 minute

### Action Taken
Created the EuroCloud EU Continuity Program.

**API Call:**
```
POST /api/trpc/businessContinuity.program.upsert
```

**Program Created:**
- **Program Name:** EuroCloud EU Continuity Program
- **Scope:** All EU cloud services, customer data processing, EU data centers
- **Policy Statement:** EuroCloud maintains critical EU services during disruptive incidents per NIS2 requirements
- **Status:** active

---

## Step 8: Define Critical Business Processes

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 8 critical EU business processes with RTO/RPO targets.

**API Call:**
```
POST /api/trpc/businessContinuity.processes.create (x8)
```

**Business Processes Created (8):**

| Process ID | Name | Department | Criticality | RTO | RPO |
|---|---|---|---|---|---|
| 81 | Cloud Service Delivery | Cloud Operations | Critical | 15 minutes | 0 minutes |
| 82 | Customer Data Processing | Data Services | Critical | 30 minutes | 0 minutes |
| 83 | EU Data Center Operations | Infrastructure | Critical | 1 hour | 15 minutes |
| 84 | Incident Response EU | Security | Critical | 15 minutes | 0 minutes |
| 85 | Customer Support Services | Support | High | 2 hours | 1 hour |
| 86 | Software Development | Engineering | High | 4 hours | 2 hours |
| 87 | HR and Payroll Processing | Human Resources | Medium | 8 hours | 4 hours |
| 88 | Marketing and Sales | Commercial | Medium | 24 hours | 12 hours |

---

## Step 9: Register EU Vendors

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 8 EU vendor assessments for critical service providers.

**API Call:**
```
POST /api/trpc/vendorAssessments.createVendor (x8)
```

**Vendors Created (8):**

| Vendor ID | Name | Category | Criticality | Data Access |
|---|---|---|---|---|
| 82 | EU Cloud Hosting SA | Cloud IaaS | Critical | PII |
| 83 | SecureID Europe | Identity Management | Critical | PII |
| 84 | DataAnalytics EU | Data Analytics | High | PII |
| 85 | CyberShield Europe | Security Operations | Critical | Sensitive |
| 86 | NetConnect EU | Network Services | High | Sensitive |
| 87 | AppFactory Berlin | Application Development | Medium | Internal |
| 88 | TrainSecure EU | Security Training | Low | None |
| 89 | AuditPartners Europe | Compliance Audit | High | Sensitive |

---

## Step 10: Schedule EU Audit

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Scheduled the GDPR Compliance Audit.

**API Call:**
```
POST /api/trpc/audit.scheduleAudit
```

**Audit Scheduled:**
- **Audit ID:** 10
- **Title:** GDPR Compliance Audit
- **Type:** External
- **Planned Date:** 2026-12-01
- **Auditor:** EU Data Protection Board Auditor (audit@eu-dpb.eu)
- **Scope:** General Data Protection Regulation compliance audit for EU operations
- **Status:** scheduled

---

## Implementation Results

### Data Summary

| Component | Count | IDs |
|---|---|---|
| Gap Analyses | 3 | 8 (GDPR), 9 (NIS2), 10 (ISO 27001) |
| Gap Responses | 51 | 21 GDPR + 10 NIS2 + 20 ISO |
| Risks | 10 | 71-80 |
| Policies | 15+ | 76-117 |
| Business Processes | 8 | 81-88 |
| Vendors | 8 | 82-89 |
| Audits | 1 | 10 |

### Key Compliance Frameworks Covered
- **GDPR:** 21 controls (Articles 5-47)
- **NIS2:** 10 requirements (Article 21(2)(a)-(j))
- **ISO 27001:** 20 controls assessed
- **EU Data Protection:** Full EU regulatory compliance

### Next Steps for EuroCloud
1. Remediate high-priority gap findings (GDPR right to erasure, DPIA process)
2. Complete vendor security assessments
3. Conduct GDPR audit preparation
4. Implement NIS2 incident reporting automation
5. Establish cross-border data transfer mechanisms
