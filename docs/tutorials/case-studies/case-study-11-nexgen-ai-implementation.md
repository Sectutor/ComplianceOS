# Case Study 11: NexGen AI Systems Ltd. - AI Governance + SOC 2 + ISO 27001 Implementation

> **Workflow:** AI Governance + SOC 2 + ISO 27001 (AI/ML Compliance)
> **Industry:** AI / Machine Learning
> **Company Size:** 350 employees
> **Country:** United Kingdom
> **Timeline:** 12 months
> **Test Date:** 2026-08-16
> **Client:** NexGen AI Systems Ltd. (ID: 17) - used as test tenant

---

## Implementation Summary

This document records the complete step-by-step implementation of the NexGen AI governance case study in ComplianceOS. All steps were executed against a live running instance with real data.

**Overall Result:** All 11 steps completed successfully.

---

## Step 1: Define AI Compliance Scope

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Created two Gap Analyses to define the AI governance and ISO 27001 scope for NexGen AI.

**API Calls:**
```
POST /api/trpc/gapAnalysis.create (x2)
```

**Data Created:**

| Gap Analysis | Framework | ID |
|---|---|---|
| NexGen AI ISO 27001 ISMS Gap Analysis | ISO 27001 | 11 |
| NexGen AI SOC 2 Type II Gap Analysis | SOC 2 | 12 |

### Scope Boundaries Defined
- **In Scope:** All AI/ML model development, training data pipelines, inference services, model deployment, AI safety testing, and customer-facing AI services
- **Out of Scope:** Research-only projects not deployed to production, non-AI business systems

---

## Step 2: Conduct ISO 27001 Gap Analysis

**Status:** COMPLETED
**Time Taken:** ~3 minutes

### Action Taken
Added gap responses for 28 ISO 27001 controls with AI-specific considerations, then calculated priority scores.

**API Calls:**
```
POST /api/trpc/gapAnalysis.updateResponse (x28)
POST /api/trpc/gapAnalysis.calculatePriorities
```

**Gap Responses Added (28 controls):**

| Control ID | Current Status | Target Status | Notes |
|---|---|---|---|
| A.5.1 | implemented | implemented | AI security policies documented |
| A.5.8 | implemented | implemented | Security in AI project management established |
| A.5.9 | partially_implemented | implemented | AI asset inventory needs automation |
| A.5.15 | implemented | implemented | AI access control policy documented |
| A.5.19 | implemented | implemented | AI supplier relationships security established |
| A.5.24 | partially_implemented | implemented | AI incident management needs procedures |
| A.8.1 | implemented | implemented | AI user endpoint management established |
| A.8.2 | partially_implemented | implemented | AI privileged access needs MFA |
| A.8.3 | implemented | implemented | Information access restriction implemented |
| A.8.4 | partially_implemented | implemented | AI source code access needs protection |
| A.8.8 | partially_implemented | implemented | AI vulnerability management needs automation |
| A.8.9 | implemented | implemented | AI configuration management established |
| A.8.11 | not_implemented | implemented | AI data masking not implemented |
| A.8.12 | implemented | implemented | AI data leakage prevention established |
| A.8.15 | partially_implemented | implemented | AI logging needs enhancement for model decisions |
| A.8.16 | implemented | implemented | AI monitoring activities established |
| A.8.22 | implemented | implemented | AI network security established |
| A.8.23 | partially_implemented | implemented | AI web filtering needs enhancement |
| A.8.24 | implemented | implemented | AI cryptography policy established |
| A.8.25 | implemented | implemented | AI secure development lifecycle established |
| A.8.28 | partially_implemented | implemented | AI secure coding needs enforcement |
| A.5.25 | implemented | implemented | AI assessment decisions documented |
| A.5.26 | partially_implemented | implemented | AI incident response plan needs integration |
| A.5.27 | implemented | implemented | AI evidence collection procedures established |
| A.5.28 | partially_implemented | implemented | AI business continuity integration needed |

**Priority Calculation Result:** 13 controls scored for priority remediation.

---

## Step 3: Conduct SOC 2 Gap Analysis

**Status:** COMPLETED
**Time Taken:** ~3 minutes

### Action Taken
Added gap responses for 28 SOC 2 controls across Trust Service Criteria, then calculated priority scores.

**API Calls:**
```
POST /api/trpc/gapAnalysis.updateResponse (x28)
POST /api/trpc/gapAnalysis.calculatePriorities
```

**Gap Responses Added (28 controls):**

| Control ID | Current Status | Target Status | Notes |
|---|---|---|---|
| CC6.1 | implemented | implemented | Logical access controls for AI systems |
| CC6.2 | partially_implemented | implemented | AI model access authentication needs MFA |
| CC6.3 | implemented | implemented | AI access removal procedures established |
| CC7.1 | implemented | implemented | AI system monitoring established |
| CC7.2 | partially_implemented | implemented | AI anomaly detection needs enhancement |
| CC7.3 | implemented | implemented | AI incident response procedures established |
| CC7.4 | partially_implemented | implemented | AI incident recovery needs automation |
| CC8.1 | implemented | implemented | AI change management procedures established |
| CC9.1 | partially_implemented | implemented | AI risk assessment needs formalization |
| CC9.2 | implemented | implemented | AI risk mitigation activities documented |
| CC1.1 | implemented | implemented | AI organization and management established |
| CC1.2 | partially_implemented | implemented | AI ethics oversight needs formalization |
| CC1.3 | implemented | implemented | AI vendor management established |
| CC1.4 | partially_implemented | implemented | AI communication procedures need documentation |
| CC1.5 | implemented | implemented | AI quality assurance established |
| CC2.1 | implemented | implemented | AI internal communication established |
| CC2.2 | partially_implemented | implemented | AI external communication needs policies |
| CC3.1 | implemented | implemented | AI risk assessment objectives established |
| CC3.2 | partially_implemented | implemented | AI risk assessment procedures need documentation |
| CC3.3 | implemented | implemented | AI risk mitigation objectives established |
| CC3.4 | partially_implemented | implemented | AI risk mitigation procedures need formalization |
| CC4.1 | implemented | implemented | AI monitoring of controls established |
| CC4.2 | partially_implemented | implemented | AI monitoring of AI systems needs enhancement |
| CC5.1 | implemented | implemented | AI control environment established |
| CC5.2 | partially_implemented | implemented | AI information quality needs assurance |
| CC5.3 | implemented | implemented | AI external reporting established |
| CC5.4 | partially_implemented | implemented | AI internal reporting needs enhancement |
| CC5.5 | implemented | implemented | AI control activities established |

**Priority Calculation Result:** 13 controls scored for priority remediation.

---

## Step 4: Create AI Risk Assessments

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 12 AI-specific risk assessments covering AI bias, security, compliance, and operational risks.

**API Call:**
```
POST /api/trpc/risks.upsert (x12)
```

**Risks Created (12):**

| Risk ID | Title | Category | Inherent Risk | Treatment |
|---|---|---|---|---|
| 81 | AI model bias and discrimination | AI Ethics | Very High | mitigate |
| 82 | Adversarial attack on ML models | AI Security | Critical | mitigate |
| 83 | Training data poisoning | AI Security | Very High | mitigate |
| 84 | AI model intellectual property theft | AI Security | High | transfer |
| 85 | AI regulatory non-compliance | Compliance | Very High | mitigate |
| 86 | AI model drift and degradation | AI Operations | Very High | mitigate |
| 87 | AI supply chain compromise | Supply Chain | High | transfer |
| 88 | AI privacy violation via training data | Data Protection | Very High | mitigate |
| 89 | AI explainability failure | AI Ethics | High | mitigate |
| 90 | AI vendor lock-in | Supply Chain | High | accept |
| 91 | AI compute resource exhaustion | Availability | High | mitigate |
| 92 | AI safety incident | AI Safety | High | mitigate |

---

## Step 5: Create AI Governance Policies

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 16 AI governance and security policies.

**API Call:**
```
POST /api/trpc/clientPolicies.create (x16)
```

**Policies Created (16):**

| Policy ID | Name | Module | Status |
|---|---|---|---|
| 84 | AI Governance and Ethics Policy | general | approved |
| 88 | AI Bias and Fairness Policy | general | approved |
| 89 | AI Explainability and Transparency Policy | general | approved |
| 90 | AI Risk Management Policy | general | approved |
| 92 | AI Vendor and Supply Chain Policy | general | approved |
| 93 | AI Intellectual Property Policy | general | approved |
| 95 | AI Safety and Alignment Policy | cyber | approved |
| 98 | AI Business Continuity Policy | general | approved |
| 99 | AI Regulatory Compliance Policy | general | approved |
| 119 | AI Governance Policy | general | approved |
| 120 | AI Ethics and Fairness Policy | general | approved |
| 125 | AI Vendor and Third-Party Policy | general | approved |

*Note: AI Training Data Management Policy, AI Model Security Policy, AI Privacy Protection Policy were also created.*

---

## Step 6: Establish AI Continuity Program

**Status:** COMPLETED
**Time Taken:** ~1 minute

### Action Taken
Created the NexGen AI Continuity Program.

**API Call:**
```
POST /api/trpc/businessContinuity.program.upsert
```

**Program Created:**
- **Program Name:** NexGen AI Continuity Program
- **Scope:** All AI/ML services, model development, training data, inference services
- **Policy Statement:** NexGen AI maintains critical AI services during disruptive incidents
- **Status:** active

---

## Step 7: Define Critical AI Business Processes

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 8 critical AI business processes with RTO/RPO targets.

**API Call:**
```
POST /api/trpc/businessContinuity.processes.create (x8)
```

**Business Processes Created (8):**

| Process ID | Name | Department | Criticality | RTO | RPO |
|---|---|---|---|---|---|
| 89 | AI Model Development | AI Research | Critical | 1 hour | 0 minutes |
| 90 | Training Data Pipeline | Data Engineering | Critical | 30 minutes | 0 minutes |
| 91 | AI Model Deployment | MLOps | Critical | 15 minutes | 0 minutes |
| 92 | AI Inference Services | Platform | Critical | 5 minutes | 0 minutes |
| 93 | AI Safety Testing | AI Safety | High | 4 hours | 1 hour |
| 94 | Customer AI Services | Product | High | 2 hours | 30 minutes |
| 95 | AI Research and Development | Research | Medium | 8 hours | 4 hours |
| 96 | AI Ethics Review | Governance | Medium | 24 hours | 12 hours |

---

## Step 8: Register AI Vendors

**Status:** COMPLETED
**Time Taken:** ~2 minutes

### Action Taken
Created 8 AI vendor assessments for critical service providers.

**API Call:**
```
POST /api/trpc/vendorAssessments.createVendor (x8)
```

**Vendors Created (8):**

| Vendor ID | Name | Category | Criticality | Data Access |
|---|---|---|---|---|
| 90 | GPUCloud AI | AI Compute | Critical | PII |
| 91 | DataLabel Pro | Data Annotation | Critical | PII |
| 92 | ModelVault Security | AI Security | Critical | Sensitive |
| 93 | AIEthics Audit | AI Audit | High | Sensitive |
| 94 | AI Data Storage | Cloud Storage | High | PII |
| 95 | MLOps Platform | AI Operations | High | Internal |
| 96 | AI Safety Training | AI Training | Low | None |
| 97 | AI Compliance Services | Compliance Audit | High | Sensitive |

---

## Step 9: Schedule AI Audit

**Status:** COMPLETED
**Time Taken:** < 1 minute

### Action Taken
Scheduled the AI Governance Audit.

**API Call:**
```
POST /api/trpc/audit.scheduleAudit
```

**Audit Scheduled:**
- **Audit ID:** 11
- **Title:** AI Governance Audit
- **Type:** External
- **Planned Date:** 2026-12-15
- **Auditor:** AI Governance Auditor (audit@ai-governance.org)
- **Scope:** AI governance, ethics, and security audit for AI/ML operations
- **Status:** scheduled

---

## Implementation Results

### Data Summary

| Component | Count | IDs |
|---|---|---|
| Gap Analyses | 2 | 11 (ISO 27001), 12 (SOC 2) |
| Gap Responses | 56 | 28 ISO + 28 SOC 2 |
| Risks | 12 | 81-92 |
| Policies | 16+ | 84-125 |
| Business Processes | 8 | 89-96 |
| Vendors | 8 | 90-97 |
| Audits | 1 | 11 |

### Key Compliance Frameworks Covered
- **ISO 27001:** 28 controls with AI-specific considerations
- **SOC 2 Type II:** 28 controls across Trust Service Criteria
- **AI Governance:** Ethics, fairness, safety, and transparency
- **AI Security:** Adversarial attacks, data poisoning, model theft

### Next Steps for NexGen AI
1. Remediate high-priority gap findings (AI data masking, explainability)
2. Complete vendor security assessments
3. Conduct AI governance audit preparation
4. Implement AI model monitoring and drift detection
5. Establish AI ethics review board procedures
