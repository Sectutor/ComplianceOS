# Case Studies — Start Here Workflows

> Real-world scenarios showing how different organizations use ComplianceOS to solve specific compliance challenges.
> Each case study maps to a workflow on the [Start Here](/start-here) page.

---

## Case Study Map

| # | Case Study | Workflow | Industry | Company Size |
|---|-----------|----------|----------|--------------|
| 1 | FinTech Startup Builds First Risk Register | Risk Assessment | Financial Technology | 15 employees |
| 2 | SaaS Company Prepares for SOC 2 Audit | Gap Analysis | B2B SaaS | 80 employees |
| 3 | Healthcare Provider Achieves ISO 27001 | ISO 27001 Certification | Healthcare | 250 employees |
| 4 | E-Commerce Platform Plans for Disasters | Business Continuity | Retail / E-Commerce | 120 employees |
| 5 | Logistics Firm Quantifies Downtime Costs | Business Impact Analysis | Transportation & Logistics | 400 employees |
| 6 | Bank Secures Its Supply Chain | Vendor Risk Management | Banking & Finance | 1,200 employees |
| 7 | Tech Startup Responds to a Breach | Incident Response | Technology / Cybersecurity | 50 employees |
| 8 | Manufacturer Modernizes Security Policies | Policy Lifecycle | Manufacturing | 600 employees |

---

## Case Study 1: FinTech Startup Builds First Risk Register

### Company: PayFlow Technologies

**Industry:** Financial Technology (Payments)
**Size:** 15 employees
**Compliance Driver:** Series A investors require a documented risk management process

### Situation

PayFlow is a 15-person fintech startup that processes $2M in monthly transactions. Their Series A lead investor requires evidence of formal risk management before releasing the next tranche. The CTO (who is also the de facto CISO) has never built a risk register and needs to go from zero to a documented, board-ready risk register in 2 weeks.

### Pain Points

- No existing risk register or asset inventory
- Team conflates "security issues" with "risks"
- No formal risk scoring methodology
- Board meeting in 14 days

### Goals

1. Catalog all critical information assets
2. Identify and score at least 20 risks
3. Build a treatment plan for the top 5 highest-scoring risks
4. Generate a board-ready risk report

### Workflow Path

```
Start Here → Risk Assessment → Identify Assets → Identify Risks → Assess Impact → Treat Risks
```

### App Journey

1. **Create workspace** at `/clients/new/msp` — PayFlow selects "Financial Services" industry
2. **Navigate to Risk Assessment** at `/clients/{id}/risks`
3. **Build Asset Inventory** at `/clients/{id}/risks/assets` — adds 12 assets (payment gateway, customer DB, API servers, etc.)
4. **Create Risk Register** at `/clients/{id}/risks/register` — identifies 22 risks across assets
5. **Score Risks** at `/clients/{id}/risks/assessments` — uses 5x5 likelihood/impact matrix
6. **Build Treatment Plan** at `/clients/{id}/risks/treatment-plan` — treats top 5 risks (3 mitigate, 1 transfer, 1 accept)
7. **Generate Report** — exports board-ready PDF risk register

### Expected Outcome

- 12 assets cataloged with owners and classifications
- 22 risks identified, scored, and mapped to assets
- Treatment plan covering all critical risks
- Board report showing risk posture and mitigation roadmap
- Investor requirement satisfied — Series A tranche released

---

## Case Study 2: SaaS Company Prepares for SOC 2 Audit

### Company: CloudSync Inc.

**Industry:** B2B SaaS (Project Management)
**Size:** 80 employees
**Compliance Driver:** Enterprise customers require SOC 2 Type II report

### Situation

CloudSync is a growing B2B SaaS company that just landed a $500K enterprise deal. The customer's security team requires a SOC 2 Type II report within 6 months. CloudSync has some security practices but no formal compliance program. They need to understand where they stand and close gaps before the audit window opens.

### Pain Points

- No formal security policies
- Access controls are ad-hoc (no RBAC review process)
- Logging exists but isn't centralized or monitored
- No change management process
- Vendor security assessments don't exist

### Goals

1. Understand current compliance posture against SOC 2 criteria
2. Identify and prioritize all gaps
3. Build a remediation roadmap with deadlines
4. Track progress toward audit readiness

### Workflow Path

```
Start Here → Gap Analysis → Select Framework → Current State Assessment → Gap Identification → Remediation Roadmap
```

### App Journey

1. **Navigate to Gap Analysis** at `/clients/{id}/gap-analysis`
2. **Create New Assessment** at `/clients/{id}/gap-analysis/new` — selects SOC 2 (Trust Services Criteria)
3. **Current State Assessment** at `/clients/{id}/gap-analysis` — evaluates existing controls against 64 SOC 2 criteria
4. **Review Gap Report** — system identifies 38 gaps (14 critical, 16 high, 8 medium)
5. **Create Remediation Roadmap** at `/clients/{id}/projects` — 38 tasks with owners and deadlines
6. **Track Progress** — dashboard shows 0% → 87% over 5 months
7. **Audit Ready** — opens audit window with 95% control maturity

### Expected Outcome

- 64 SOC 2 criteria assessed with evidence attached
- 38 gaps identified, 35 remediated before audit
- SOC 2 Type II report issued with zero material findings
- Enterprise deal renewed + 2 new enterprise customers won

---

## Case Study 3: Healthcare Provider Achieves ISO 27001

### Company: MedCare Health Systems

**Industry:** Healthcare (Clinic Network)
**Size:** 250 employees across 8 locations
**Compliance Driver:** Regional health authority requires ISO 27001 certification

### Situation

MedCare operates 8 clinics and processes 50,000 patient records. Their regional health authority mandates ISO 27001 certification within 12 months for continued funding eligibility. MedCare has basic HIPAA compliance but no formal Information Security Management System (ISMS). They need the full end-to-end journey from gap to certificate.

### Pain Points

- No ISMS scope or policy statement
- Risk assessment is informal and undocumented
- No Statement of Applicability (SoA)
- Staff security awareness is inconsistent
- No internal audit process

### Goals

1. Define ISMS scope covering all 8 clinic locations
2. Conduct comprehensive risk assessment
3. Create Statement of Applicability with all 93 Annex A controls
4. Train all 250 staff on security awareness
5. Pass Stage 1 and Stage 2 certification audits

### Workflow Path

```
Start Here → ISO 27001 Certification → Foundation & Scope → Risk Management & SoA → Implementation → Internal Audit & Review → Certification Audits
```

### App Journey

1. **Create workspace** — selects "Healthcare" industry, ISO 27001 framework
2. **Gap Analysis** — baseline assessment against all ISO 27001 clauses
3. **Risk Assessment** — identifies 45 risks across patient data, systems, and processes
4. **Risk Treatment Plan** — treats all high/critical risks with selected controls
5. **Statement of Applicability** — documents applicability of all 93 Annex A controls
6. **Policy Management** — writes 18 mandatory policies aligned to ISO 27001 Clause 5.2
7. **Employee Onboarding** — assigns security awareness training to all 250 staff
8. **Audit Readiness** — internal audit identifies 7 non-conformities, all resolved
9. **Certification** — passes Stage 1 (documentation) and Stage 2 (effectiveness) audits

### Expected Outcome

- ISMS scope documented and approved
- 45 risks assessed with treatment plan
- 93 Annex A controls mapped in SoA
- 18 policies written, approved, and acknowledged by all staff
- ISO 27001 certificate issued by accredited body
- Regional health authority funding continues

---

## Case Study 4: E-Commerce Platform Plans for Disasters

### Company: ShopSphere Ltd.

**Industry:** Retail / E-Commerce
**Size:** 120 employees
**Compliance Driver:** Cyber insurance requires documented BCP

### Situation

ShopSphere processes 10,000 orders/day through their e-commerce platform. Their cyber insurer requires a documented Business Continuity Plan (BCP) to renew their $2M policy. The platform has had 3 outages in the past year, each costing ~$50K in lost revenue. They need to identify critical functions and build recovery plans.

### Pain Points

- No documented business continuity plans
- Recovery targets are unknown (no RTO/RPO defined)
- Staff don't know their roles during an incident
- Dependencies on third-party payment processors aren't mapped
- No testing of recovery procedures

### Goals

1. Identify all critical business functions
2. Set RTO/RPO targets for each function
3. Document recovery plans for top 5 scenarios
4. Train staff on their continuity roles
5. Pass tabletop exercise with insurer observing

### Workflow Path

```
Start Here → Business Continuity → Foundation & Scope → BIA & Risk Assessment → Strategies & Plans → Exercises & Testing → Audit & Certification
```

### App Journey

1. **Navigate to Business Continuity** at `/clients/{id}/business-continuity`
2. **Business Impact Analysis** at `/clients/{id}/business-continuity/bia` — identifies 8 critical processes
3. **Set RTO/RPO** — defines recovery targets for each critical process
4. **Risk Assessment** — identifies risks that could disrupt operations
5. **Create Recovery Plans** at `/clients/{id}/business-continuity/plans` — documents plans for: ransomware, DDoS, payment processor failure, cloud outage, key personnel loss
6. **Schedule Exercise** at `/clients/{id}/business-continuity/exercises` — tabletop simulation of ransomware scenario
7. **Update Plans** — incorporates lessons learned from exercise
8. **Generate BCP Document** — insurer-ready business continuity plan

### Expected Outcome

- 8 critical processes identified with RTO/RPO targets
- 5 documented recovery plans covering top scenarios
- Staff trained on continuity roles (85% completion rate)
- Tabletop exercise passed with insurer observing
- Cyber insurance policy renewed at current coverage level

---

## Case Study 5: Logistics Firm Quantifies Downtime Costs

### Company: FastRoute Logistics

**Industry:** Transportation & Logistics
**Size:** 400 employees, 150 vehicles
**Compliance Driver:** New COO wants data-driven recovery priorities

### Situation

FastRoute manages a fleet of 150 vehicles with a dispatch system that tracks all shipments. A recent 4-hour dispatch outage cost them $180K in penalties and lost customer trust. The new COO wants to quantify the financial impact of potential disruptions and set data-driven recovery priorities. They need a formal Business Impact Analysis (BIA).

### Pain Points

- No quantification of downtime costs
- Recovery priorities are based on gut feel, not data
- Dependencies on GPS, fuel systems, and warehouse management aren't mapped
- No defined Recovery Time Objectives (RTO)
- Customer SLA penalties aren't linked to system availability

### Goals

1. Identify all critical business processes
2. Quantify financial impact of disruption over time (1hr, 4hr, 1 day, 1 week)
3. Map all IT and vendor dependencies
4. Define RTO/RPO for each critical process
5. Create a BIA report for executive team

### Workflow Path

```
Start Here → Business Impact Analysis → Scope & Methodology → Critical Processes → Impact Assessment → Dependencies & Resources → RTO & RPO Definition
```

### App Journey

1. **Navigate to BIA** at `/clients/{id}/business-continuity/bia`
2. **Define Scope** — selects dispatch operations, warehouse, and customer portal
3. **Identify Critical Processes** — catalogs 12 business activities, identifies 6 as critical
4. **Impact Assessment** — quantifies losses: dispatch ($45K/hr), warehouse ($12K/hr), portal ($8K/hr)
5. **Map Dependencies** — identifies 14 IT systems, 6 vendors, 23 key personnel
6. **Set RTO/RPO** — defines: dispatch (RTO: 2hr, RPO: 15min), warehouse (RTO: 4hr, RPO: 1hr), portal (RTO: 1hr, RPO: 30min)
7. **Generate BIA Report** — executive summary with cost-justified recovery targets

### Expected Outcome

- 6 critical processes identified with quantified impacts
- Dependency map covering 14 systems, 6 vendors, 23 personnel
- RTO/RPO targets set and approved by executive team
- BIA report used to justify $200K investment in redundant dispatch infrastructure
- Customer SLA penalties reduced by 90% after infrastructure improvements

---

## Case Study 6: Bank Secures Its Supply Chain

### Company: MetroBank Financial

**Industry:** Banking & Finance
**Size:** 1,200 employees
**Compliance Driver:** Regulator requires vendor risk management program

### Situation

MetroBank uses 85 third-party vendors for everything from core banking software to HVAC. Their regulator (OCC) issued a finding requiring a formal vendor risk management program within 9 months. MetroBank currently assesses vendors via spreadsheets and email. They need a scalable, auditable process.

### Pain Points

- Vendor inventory is incomplete (only 58 of 85 vendors documented)
- No consistent risk classification methodology
- Security questionnaires are emailed as Word docs (untrackable)
- No continuous monitoring of critical vendor security postures
- Contract renewal dates aren't linked to re-assessment schedules

### Goals

1. Build complete vendor inventory (all 85 vendors)
2. Classify vendors by risk tier (Critical/High/Medium/Low)
3. Send standardized security questionnaires to all critical/high vendors
4. Review vendor SOC 2 and ISO 27001 certifications
5. Implement continuous monitoring with annual re-assessment

### Workflow Path

```
Start Here → Vendor Risk Management → Vendor Inventory → Classification → Assessment → Review & Approval → Monitoring
```

### App Journey

1. **Navigate to Vendor Risk** at `/clients/{id}/risk/vendors`
2. **Build Inventory** — imports 58 vendors from spreadsheet, manually adds 27 more
3. **Classify Vendors** — system classifies: 12 Critical, 23 High, 32 Medium, 18 Low
4. **Send Assessments** — sends security questionnaires to 35 Critical/High vendors
5. **Review Responses** — evaluates responses, identifies 8 vendors with significant gaps
6. **Contract Updates** — adds right-to-audit clauses to 8 vendor contracts
7. **Continuous Monitoring** — sets up annual re-assessment schedule and breach alerts

### Expected Outcome

- Complete vendor inventory: 85 vendors documented
- 35 Critical/High vendors assessed with standardized questionnaires
- 8 vendors remediated or replaced based on findings
- Annual re-assessment schedule established
- OCC finding closed at next examination

---

## Case Study 7: Tech Startup Responds to a Breach

**Company:** CyberShield Security
**Industry:** Technology / Cybersecurity
**Size:** 50 employees
**Compliance Driver:** Active security incident — need structured response

### Situation

CyberShield, an irony not lost on anyone, detects unauthorized access to their development environment at 2 AM. An attacker exploited a misconfigured S3 bucket containing API keys. The on-call engineer panics and pages the CEO. They have no incident response plan. They need to detect, contain, eradicate, and recover — fast.

### Pain Points

- No Incident Response Plan (IRP)
- No defined roles or escalation paths
- Forensic evidence may be lost during containment
- Customer communication is ad-hoc
- No post-incident review process exists

### Goals

1. Contain the incident within 1 hour
2. Eradicate the attacker's access
3. Recover affected systems from clean backups
4. Notify affected customers within 72 hours (GDPR requirement)
5. Conduct post-incident review and update security controls

### Workflow Path

```
Start Here → Incident Response → Preparation → Detection & Analysis → Containment → Eradication & Recovery → Post-Incident
```

### App Journey

1. **Navigate to Incidents** at `/clients/{id}/incidents`
2. **Create Incident** — logs the S3 bucket breach with severity: Critical
3. **Detection & Analysis** — documents attack vector (misconfigured bucket), scope (API keys exposed), timeline
4. **Containment** — records actions: bucket made public keys rotated, IAM roles audited
5. **Eradication** — documents: attacker access revoked, vulnerability patched, additional misconfigurations fixed
6. **Recovery** — documents: systems restored from backups, monitoring enhanced
7. **Post-Incident** — creates retrospective: 3 lessons learned, 5 new controls added to prevent recurrence
8. **Customer Notification** — generates GDPR-compliant breach notification for 12 affected customers

### Expected Outcome

- Incident contained within 45 minutes
- All attacker access revoked and verified
- Zero data exfiltrated (confirmed via forensic analysis)
- GDPR notifications sent within 48 hours (under 72-hour requirement)
- Post-incident review produced 5 new controls
- Customer churn: 0% (transparent communication preserved trust)

---

## Case Study 8: Manufacturer Modernizes Security Policies

### Company: IndustrialTech Manufacturing

**Industry:** Manufacturing (Industrial Equipment)
**Size:** 600 employees across 3 facilities
**Compliance Driver:** ISO 27001 recertification requires updated policies

### Situation

IndustrialTech achieved ISO 27001 certification 3 years ago. Their annual surveillance audit found that 8 of 18 mandatory policies haven't been updated in over 2 years — a major non-conformity. The policies reference outdated technologies (Windows 7, on-premise Exchange) and don't cover new cloud services (Microsoft 365, AWS). They need to modernize all policies and implement an annual review cycle.

### Pain Points

- 8 of 18 policies are outdated (reference obsolete technology)
- Policy approval is via email (no audit trail)
- No annual review schedule or reminders
- Employee acknowledgment tracking is manual (paper forms)
- Policy distribution is inconsistent across 3 facilities

### Goals

1. Update all 8 outdated policies to reflect current technology
2. Implement formal review and approval workflow
3. Set up annual review reminders for all 18 policies
4. Digitize employee acknowledgment tracking
5. Clear the major non-conformity before the next audit

### Workflow Path

```
Start Here → Policy Lifecycle → Drafting → Stakeholder Review → Approval → Distribution → Annual Review
```

### App Journey

1. **Navigate to Policies** at `/clients/{id}/client-policies`
2. **Identify Outdated Policies** — system flags 8 policies not updated in 24+ months
3. **Draft Updated Policies** — rewrites 8 policies with current technology references
4. **Stakeholder Review** — sends drafts to IT Director, HR Director, and Legal for input
5. **Approval** — CISO and CEO electronically sign off on all 18 policies
6. **Distribution** — publishes all policies to central repository
7. **Employee Acknowledgment** — assigns acknowledgment task to all 600 employees
8. **Track Completion** — monitors: 94% acknowledgment rate in first week
9. **Schedule Annual Reviews** — sets calendar reminders for all 18 policies

### Expected Outcome

- All 18 policies updated and approved with digital signatures
- 94% employee acknowledgment within first week (remaining 6% followed up)
- Annual review calendar established with automated reminders
- Major non-conformity cleared at next surveillance audit
- ISO 27001 certification maintained

---


---

## Case Study 9: Federal Agency Achieves FedRAMP Authorization

### Company: Federal Digital Services Agency (FDSA)

**Industry:** Government / Federal
**Size:** 2,500 employees
**Compliance Driver:** FISMA compliance and FedRAMP authorization for cloud services

### Situation

FDSA is a US federal agency responsible for delivering digital services to citizens. They must comply with FISMA, achieve FedRAMP authorization for their cloud services, and implement NIST CSF across all systems. The agency processes sensitive citizen data and requires the highest level of security controls.

### Pain Points

- No formal NIST CSF implementation
- FedRAMP authorization not yet achieved
- Legacy systems with outdated security controls
- Complex supply chain with federal vendors
- No continuous monitoring program

### Goals

1. Implement NIST CSF across all federal systems
2. Achieve FedRAMP authorization for cloud services
3. Establish continuous monitoring program
4. Build comprehensive vendor risk management
5. Pass FISMA annual security audit

### Workflow Path

`
Start Here ? Federal Cybersecurity ? NIST CSF Assessment ? FedRAMP Preparation ? Continuous Monitoring ? Audit & Authorization
`

### Expected Outcome

- NIST CSF implemented across all 5 functions
- FedRAMP authorization achieved
- 10 federal risks assessed and treated
- 15 federal policies implemented
- FISMA audit passed with zero findings

---

## Case Study 10: EU Cloud Provider Complies with GDPR & NIS2

### Company: EuroCloud Services S.A.

**Industry:** Technology / Cloud Services
**Size:** 800 employees
**Compliance Driver:** GDPR compliance and NIS2 essential entity requirements

### Situation

EuroCloud is a German cloud services provider serving customers across the EU. As an essential entity under NIS2 and a data controller/processor under GDPR, they must implement comprehensive security measures, incident reporting procedures, and data protection controls.

### Pain Points

- GDPR compliance gaps in data subject rights
- NIS2 incident reporting not yet implemented
- Cross-border data transfer mechanisms outdated
- Supply chain security not assessed
- No DPIA process standardized

### Goals

1. Achieve full GDPR compliance
2. Implement NIS2 security measures and incident reporting
3. Establish cross-border data transfer safeguards
4. Build comprehensive vendor risk management
5. Pass GDPR compliance audit

### Workflow Path

`
Start Here ? EU Data Protection ? GDPR Assessment ? NIS2 Compliance ? Incident Reporting ? Audit & Certification
`

### Expected Outcome

- 21 GDPR controls assessed and implemented
- 10 NIS2 requirements met
- 10 EU risks assessed and treated
- 15 EU policies implemented
- GDPR compliance audit passed

---

## Case Study 11: AI Company Implements AI Governance

### Company: NexGen AI Systems Ltd.

**Industry:** Artificial Intelligence / Machine Learning
**Size:** 350 employees
**Compliance Driver:** AI regulation compliance and responsible AI development

### Situation

NexGen AI develops and deploys AI/ML solutions for enterprise customers. As AI regulation evolves globally, they must implement comprehensive AI governance, ensure model safety and fairness, protect intellectual property, and comply with emerging AI standards.

### Pain Points

- No formal AI governance framework
- AI model bias and fairness not assessed
- Adversarial attack protection not implemented
- AI intellectual property not protected
- No AI incident response procedures

### Goals

1. Implement AI governance framework (ISO 42001, NIST AI RMF)
2. Establish AI ethics review board
3. Implement model security and protection
4. Build AI-specific incident response
5. Pass AI governance audit

### Workflow Path

`
Start Here ? AI Governance ? AI Risk Assessment ? Model Security ? Ethics Review ? Audit & Compliance
`

### Expected Outcome

- 28 ISO 27001 controls with AI focus implemented
- 28 SOC 2 controls with AI focus implemented
- 12 AI-specific risks assessed and treated
- 16 AI governance policies implemented
- AI governance audit passed

---
## Using These Case Studies

### For Sales Conversations
Use these case studies to show prospects how similar organizations solved their compliance challenges. Each case study includes:
- The business driver (investor requirement, customer demand, regulator mandate)
- The specific workflow path through the app
- Quantified outcomes (time saved, revenue protected, findings closed)

### For Customer Onboarding
When onboarding a new customer, find the case study that matches their situation. Use it to:
- Show them what success looks like
- Define their first 30-day milestones
- Set realistic expectations for their workflow

### For Documentation Agent
Each case study can generate:
- A **step-by-step tutorial** showing exactly how to replicate the workflow
- A **troubleshooting guide** based on the pain points listed
- A **checklist** for the specific scenario

---

## Implementation Documentation

Each case study has a corresponding implementation document that records the actual data created during testing:

| # | Case Study | Implementation Doc | Client ID |
|---|-----------|-------------------|-----------|
| 3 | Healthcare ISO 27001 | `case-study-3-medcare-iso27001-implementation.md` | 9 |
| 4 | E-Commerce BCP | `case-study-4-shopsphere-bcp-implementation.md` | 10 |
| 5 | Logistics BIA | `case-study-5-fastroute-bia-implementation.md` | 11 |
| 6 | Bank VRM | `case-study-6-metrobank-vrm-implementation.md` | 12 |
| 7 | Tech Startup IR | `case-study-7-cybershield-ir-implementation.md` | 13 |
| 8 | Manufacturer Policies | `case-study-8-industrialtech-policies-implementation.md` | 14 |
| 9 | Federal FedRAMP | `case-study-9-fdsa-federal-implementation.md` | 15 |
| 10 | EU GDPR & NIS2 | `case-study-10-eurocloud-eu-implementation.md` | 16 |
| 11 | AI Governance | `case-study-11-nexgen-ai-implementation.md` | 17 |

---

## Next Steps

The documentation agent should create a tutorial for each case study:
1. `case-study-1-payflow-risk-register.md` — FinTech Risk Register
2. `case-study-2-cloudsync-soc2.md` — SaaS SOC 2 Prep
3. `case-study-3-medcare-iso27001.md` — Healthcare ISO 27001
4. `case-study-4-shopsphere-bcp.md` — E-Commerce Business Continuity
5. `case-study-5-fastroute-bia.md` — Logistics BIA
6. `case-study-6-metrobank-vrm.md` — Bank Vendor Risk
7. `case-study-7-cybershield-ir.md` — Tech Startup Incident Response
8. `case-study-8-industrialtech-policies.md` — Manufacturer Policy Lifecycle
9. `case-study-9-fdsa-federal.md` — Federal FedRAMP
10. `case-study-10-eurocloud-eu.md` — EU GDPR & NIS2
11. `case-study-11-nexgen-ai.md` — AI Governance
