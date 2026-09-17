# Case Study 9: Federal Digital Services Agency (FDSA) - FedRAMP & NIST CSF Compliance

> **Workflow:** Federal Cybersecurity & FedRAMP Authorization
> **Industry:** Government / Federal
> **Company Size:** 2,500 employees
> **Timeline:** 18 months
> **Client ID:** 15 (Federal Digital Services Agency)
> **Date Implemented:** 2026-08-16

---

## Overview

The Federal Digital Services Agency (FDSA) is a US federal agency responsible for delivering digital services to citizens. FDSA must comply with the Federal Information Security Modernization Act (FISMA), achieve FedRAMP authorization for its cloud services, and implement NIST Cybersecurity Framework (CSF) across all systems.

**Compliance Drivers:**
- FISMA (Federal Information Security Modernization Act)
- FedRAMP (Federal Risk and Authorization Management Program)
- NIST CSF (Cybersecurity Framework)
- NIST SP 800-53 (Security and Privacy Controls)
- EO 14028 (Improving the Nation's Cybersecurity)

---

## Implementation Summary

| Step | Description | Status | Items Created |
|------|-------------|--------|---------------|
| 1 | NIST CSF Gap Analysis | ✅ Complete | 77 Control Responses |
| 2 | ISO 27001 Gap Analysis | ✅ Complete | 28 Control Responses |
| 3 | Risk Assessment | ✅ Complete | 10 Federal Risks |
| 4 | Policy Implementation | ✅ Complete | 15 Federal Policies |
| 5 | Business Continuity | ✅ Complete | 8 Critical Processes |
| 6 | Vendor Risk Management | ✅ Complete | 8 Federal Vendors |
| 7 | Audit Scheduling | ✅ Complete | FISMA Annual Audit |

---

## Step 1: NIST CSF Gap Analysis

### Framework Coverage

| Category | Controls | Status |
|----------|----------|--------|
| GOVERN | 15 | Partially Implemented |
| PROTECT | 25 | Partially Implemented |
| DETECT | 17 | Partially Implemented |
| RESPOND | 13 | Partially Implemented |
| RECOVER | 7 | Partially Implemented |
| **Total** | **77** | **In Progress** |

### Key Findings

**Strengths:**
- Identity management with PIV/CAC authentication
- FIPS 140-2 validated encryption
- Federal SOC integration
- Security awareness training mandatory

**Gaps:**
- Automated asset inventory needed
- FedRAMP-specific risk assessment methodology
- Federal incident response procedures
- Supply chain risk management for federal vendors

---

## Step 2: ISO 27001 Gap Analysis

### ISMS Scope

All federal digital services, citizen data processing, cloud infrastructure, internal IT systems, and third-party service integrations.

### Key Controls Assessed

| Domain | Controls | Implementation Status |
|--------|----------|----------------------|
| Organizational Controls | 10 | 70% Implemented |
| People Controls | 0 | N/A |
| Physical Controls | 0 | N/A |
| Technological Controls | 18 | 65% Implemented |

---

## Step 3: Federal Risk Assessment

### Risk Register

| ID | Risk Title | Category | Likelihood | Impact | Treatment |
|----|------------|----------|------------|--------|-----------|
| 70 | Nation-state cyber attack on federal systems | Cybersecurity | 3 | 5 | Mitigate |
| 71 | FedRAMP authorization failure | Compliance | 2 | 5 | Mitigate |
| 72 | Insider threat from privileged user | Insider Threat | 3 | 4 | Mitigate |
| 73 | Supply chain compromise via federal vendor | Supply Chain | 3 | 5 | Transfer |
| 74 | Ransomware attack on citizen services | Cybersecurity | 4 | 5 | Mitigate |
| 75 | Data breach of PII records | Data Protection | 3 | 5 | Mitigate |
| 76 | Legacy system vulnerability exploitation | Vulnerability | 4 | 4 | Mitigate |
| 77 | Inter-agency data sharing breach | Data Protection | 2 | 4 | Mitigate |
| 78 | Cloud service provider outage | Availability | 3 | 5 | Transfer |
| 79 | Non-compliance with FISMA requirements | Compliance | 2 | 4 | Mitigate |

### Risk Summary

- **Total Risks:** 10
- **Critical (Score 15+):** 5
- **High (Score 8-9):** 3
- **Medium (Score 5-7):** 2
- **Treatment Plan:** 7 Mitigate, 2 Transfer, 1 Accept

---

## Step 4: Federal Policies

### Policies Implemented

| # | Policy Name | Module | Status |
|---|-------------|--------|--------|
| 1 | Federal Information Security Policy | general | Approved |
| 2 | FedRAMP Security Assessment Policy | general | Approved |
| 3 | Federal Access Control Policy | general | Approved |
| 4 | Federal Incident Response Policy | cyber | Approved |
| 5 | Federal Business Continuity Policy | general | Approved |
| 6 | Federal Data Classification Policy | general | Approved |
| 7 | Federal Supplier Risk Management Policy | general | Approved |
| 8 | Federal Cryptography Policy | cyber | Approved |
| 9 | Federal Personnel Security Policy | general | Approved |
| 10 | Federal Physical Security Policy | general | Approved |
| 11 | Federal System Development Security Policy | cyber | Approved |
| 12 | Federal Network Security Policy | cyber | Approved |
| 13 | Federal Privacy Policy | privacy | Approved |
| 14 | Federal Records Management Policy | general | Approved |
| 15 | Federal Continuous Monitoring Policy | cyber | Approved |

---

## Step 5: Business Continuity Planning

### Critical Business Processes

| ID | Process | Department | Criticality | RTO | RPO |
|----|---------|------------|-------------|-----|-----|
| 49 | Citizen Identity Verification | Digital Services | Critical | 1 hour | 0 min |
| 50 | Federal Benefits Processing | Benefits Admin | Critical | 30 min | 0 min |
| 51 | Tax Filing Services | Revenue Services | Critical | 1 hour | 15 min |
| 52 | Healthcare Enrollment | Health Services | Critical | 2 hours | 0 min |
| 53 | Immigration Case Management | Immigration | High | 4 hours | 1 hour |
| 54 | Federal Payment Processing | Financial Services | Critical | 15 min | 0 min |
| 55 | Inter-agency Data Exchange | IT Operations | High | 2 hours | 30 min |
| 56 | Public Website Services | Communications | High | 1 hour | 1 hour |

---

## Step 6: Vendor Risk Management

### Federal Vendor Inventory

| ID | Vendor | Category | Criticality | Data Access |
|----|--------|----------|-------------|-------------|
| 59 | AuditFederal Services | Compliance Audit | High | Sensitive |
| 58 | TrainFederal Security | Security Training | Low | None |
| 57 | AppDev Federal | Application Development | Medium | Internal |
| 56 | NetFederal Communications | Network Services | High | Sensitive |
| 55 | CyberDefense Federal | Security Operations | Critical | Sensitive |
| 54 | FedData Analytics | Data Analytics | High | PII |
| 53 | SecureAuth Federal | Identity Management | Critical | PII |
| 52 | CloudGov Solutions | FedRAMP Cloud IaaS | Critical | PII |

---

## Step 7: Federal Audit

### Scheduled Audit

| Field | Value |
|-------|-------|
| Audit Title | FISMA Annual Security Audit |
| Audit Type | External |
| Planned Date | 2026-11-01 |
| Auditor | Inspector General |
| Scope | Annual FISMA compliance audit |

---

## Learning Notes

### Federal Compliance Concepts

1. **FISMA Compliance**
   - Annual security assessments required
   - Continuous monitoring mandatory
   - Incident reporting to US-CERT
   - System categorization per FIPS 199

2. **FedRAMP Authorization**
   - Security Assessment Plan (SAP)
   - Security Assessment Report (SAR)
   - Plan of Action and Milestones (POA&M)
   - Continuous monitoring monthly deliverables

3. **NIST CSF Implementation**
   - Five functions: Identify, Protect, Detect, Respond, Recover
   - Implementation tiers: Partial, Risk Informed, Repeatable, Adaptive
   - Profiles: Current vs Target

4. **Federal Risk Management**
   - NIST SP 800-37 Risk Management Framework
   - System Security Plan (SSP)
   - Security Control Assessment
   - Authority to Operate (ATO)

---

## Related Documentation

- [Case Study 1: PayFlow Risk Register](./case-study-1-payflow-risk-register.md)
- [Case Study 3: MedCare ISO 27001](./case-study-3-medcare-iso27001.md)
- [Case Study 6: MetroBank VRM](./case-study-6-metrobank-vrm.md)
