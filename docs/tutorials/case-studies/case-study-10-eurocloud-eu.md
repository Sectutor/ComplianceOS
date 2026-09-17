# Case Study 10: EuroCloud Services S.A. - EU GDPR & NIS2 Compliance

> **Workflow:** EU Data Protection & Network Security
> **Industry:** Technology / Cloud Services
> **Company Size:** 800 employees
> **Timeline:** 12 months
> **Client ID:** 16 (EuroCloud Services S.A.)
> **Date Implemented:** 2026-08-16

---

## Overview

EuroCloud Services S.A. is a German cloud services provider serving customers across the European Union. As an essential entity under NIS2 and a data controller/processor under GDPR, EuroCloud must implement comprehensive security measures, incident reporting procedures, and data protection controls.

**Compliance Drivers:**
- GDPR (General Data Protection Regulation)
- NIS2 (Network and Information Security Directive 2)
- ISO 27001 (Information Security Management)
- EU Cloud Code of Conduct
- BSI C5 (German Cloud Security Certification)

---

## Implementation Summary

| Step | Description | Status | Items Created |
|------|-------------|--------|---------------|
| 1 | GDPR Gap Analysis | ✅ Complete | 21 Control Responses |
| 2 | NIS2 Gap Analysis | ✅ Complete | 10 Control Responses |
| 3 | ISO 27001 Gap Analysis | ✅ Complete | 20 Control Responses |
| 4 | Risk Assessment | ✅ Complete | 10 EU Risks |
| 5 | Policy Implementation | ✅ Complete | 15 EU Policies |
| 6 | Business Continuity | ✅ Complete | 8 Critical Processes |
| 7 | Vendor Risk Management | ✅ Complete | 8 EU Vendors |
| 8 | Audit Scheduling | ✅ Complete | GDPR Compliance Audit |

---

## Step 1: GDPR Gap Analysis

### Framework Coverage

| Article | Controls | Status |
|---------|----------|--------|
| Art. 5-11 (Principles & Lawfulness) | 4 | Partially Implemented |
| Art. 12-23 (Data Subject Rights) | 5 | Partially Implemented |
| Art. 24-43 (Controller & Processor) | 8 | Partially Implemented |
| Art. 44-49 (International Transfers) | 2 | Not Implemented |
| Art. 58 (Supervisory Authority) | 2 | Implemented |
| **Total** | **21** | **In Progress** |

### Key Findings

**Strengths:**
- DPO appointed and registered
- 72-hour breach notification procedure
- Processor agreements in place
- Privacy notices published

**Gaps:**
- Data portability not yet supported
- Right to erasure needs automated workflows
- DPIA process needs standardization
- International transfer safeguards need SCC updates

---

## Step 2: NIS2 Gap Analysis

### Framework Coverage

| Requirement | Status |
|-------------|--------|
| Art. 21(2)(a) Risk Management & Security Policies | Partially Implemented |
| Art. 21(2)(b) Incident Handling | Partially Implemented |
| Art. 21(2)(c) Business Continuity & Crisis Management | Partially Implemented |
| Art. 21(2)(d) Supply Chain Security | Partially Implemented |
| Art. 21(2)(e) Secure Development & Vulnerability Handling | Implemented |
| Art. 21(2)(f) Effectiveness Monitoring | Partially Implemented |
| Art. 21(2)(g) Cyber Hygiene & Awareness | Implemented |
| Art. 21(2)(h) Cryptography & Encryption | Implemented |
| Art. 21(2)(i) HR Security, Access Control & Asset Mgmt | Partially Implemented |
| Art. 21(2)(j) MFA & Secure Communications | Implemented |
| **Total** | **10 Requirements** | **70% Implemented** |

---

## Step 3: ISO 27001 Gap Analysis

### ISMS Scope

All cloud services, customer data processing, internal IT systems, and third-party integrations within the EU.

---

## Step 4: EU Risk Assessment

### Risk Register

| ID | Risk Title | Category | Likelihood | Impact | Treatment |
|----|------------|----------|------------|--------|-----------|
| 80 | GDPR data breach - EU customer PII | Data Protection | 3 | 5 | Mitigate |
| 81 | NIS2 incident reporting failure | Compliance | 2 | 5 | Mitigate |
| 82 | Cross-border data transfer violation | Compliance | 3 | 5 | Mitigate |
| 83 | Cloud service provider data leak | Supply Chain | 2 | 5 | Transfer |
| 84 | Ransomware attack on EU operations | Cybersecurity | 4 | 5 | Mitigate |
| 85 | Insider threat - data exfiltration | Insider Threat | 3 | 4 | Mitigate |
| 86 | EU regulatory investigation | Compliance | 2 | 4 | Mitigate |
| 87 | Third-party processor non-compliance | Supply Chain | 3 | 4 | Transfer |
| 88 | DDoS attack on cloud services | Cybersecurity | 4 | 4 | Mitigate |
| 89 | Employee data processing violation | Privacy | 2 | 4 | Mitigate |

---

## Step 5: EU Policies

### Policies Implemented

| # | Policy Name | Module | Status |
|---|-------------|--------|--------|
| 1 | EU Data Protection Policy | privacy | Approved |
| 2 | GDPR Compliance Policy | privacy | Approved |
| 3 | NIS2 Security Measures Policy | cyber | Approved |
| 4 | Cross-Border Data Transfer Policy | privacy | Approved |
| 5 | Data Subject Rights Policy | privacy | Approved |
| 6 | EU Incident Reporting Policy | cyber | Approved |
| 7 | Privacy by Design Policy | privacy | Approved |
| 8 | Processor Management Policy | general | Approved |
| 9 | Data Breach Notification Policy | cyber | Approved |
| 10 | EU Employee Data Protection Policy | privacy | Approved |
| 11 | Cookie and Tracking Policy | privacy | Approved |
| 12 | Data Retention and Deletion Policy | privacy | Approved |
| 13 | Cloud Security Policy | cyber | Approved |
| 14 | Business Continuity Policy | general | Approved |
| 15 | Network Security Policy | cyber | Approved |

---

## Step 6: Business Continuity Planning

### Critical Business Processes

| ID | Process | Department | Criticality | RTO | RPO |
|----|---------|------------|-------------|-----|-----|
| 57 | Cloud Infrastructure Operations | IT Operations | Critical | 15 min | 0 min |
| 58 | Customer Data Processing | Data Services | Critical | 1 hour | 0 min |
| 59 | Identity and Access Management | Security | Critical | 30 min | 0 min |
| 60 | Data Center Operations | Infrastructure | Critical | 1 hour | 15 min |
| 61 | Customer Support Services | Support | High | 2 hours | 1 hour |
| 62 | Billing and Payment Processing | Finance | High | 4 hours | 1 hour |
| 63 | Marketing and Sales Operations | Marketing | Medium | 8 hours | 4 hours |
| 64 | HR and Recruitment | HR | Low | 24 hours | 8 hours |

---

## Step 7: Vendor Risk Management

### EU Vendor Inventory

| ID | Vendor | Category | Criticality | Data Access |
|----|--------|----------|-------------|-------------|
| 65 | EU Cloud Hosting GmbH | Cloud Infrastructure | Critical | PII |
| 66 | SecureID Europe | Identity Management | Critical | PII |
| 67 | DataProtect Analytics | Data Analytics | High | PII |
| 68 | EuroNet Communications | Network Services | High | Sensitive |
| 69 | GDPR Consulting Partners | Compliance Consulting | Medium | Sensitive |
| 70 | EU Payment Services | Payment Processing | Critical | PII |
| 71 | CloudBackup EU | Data Backup | High | PII |
| 72 | SecureDev Europe | Application Development | Medium | Internal |

---

## Step 8: EU Audit

### Scheduled Audit

| Field | Value |
|-------|-------|
| Audit Title | EU GDPR Compliance Audit |
| Audit Type | External |
| Planned Date | 2026-12-01 |
| Auditor | EU Data Protection Auditor |
| Scope | GDPR compliance audit for EU operations |

---

## Learning Notes

### EU Compliance Concepts

1. **GDPR Compliance**
   - Data Protection Impact Assessments (DPIAs)
   - 72-hour breach notification requirement
   - Data Subject Access Requests (DSARs)
   - Cross-border data transfer mechanisms (SCCs, BCRs)

2. **NIS2 Compliance**
   - 24-hour early warning for significant incidents
   - 72-hour full incident notification
   - 1-month final incident report
   - Supply chain security requirements

3. **EU Risk Management**
   - Data Protection by Design and Default
   - Privacy Impact Assessments
   - International transfer impact assessments
   - Supervisory authority cooperation

4. **Cloud Security**
   - EU Cloud Code of Conduct
   - BSI C5 certification
   - Data residency requirements
   - Processor obligations under Art. 28 GDPR

---

## Related Documentation

- [Case Study 3: MedCare ISO 27001](./case-study-3-medcare-iso27001.md)
- [Case Study 7: CyberShield IR](./case-study-7-cybershield-ir.md)
- [Case Study 6: MetroBank VRM](./case-study-6-metrobank-vrm.md)
