# Case Study Tutorial: ShopSphere Ltd. — Building a Business Continuity Plan

> **Workflow:** Business Continuity
> **Industry:** Retail / E-Commerce
> **Company Size:** 120 employees
**Timeline:** 3 months

---

## Overview

ShopSphere processes 10,000 orders/day through their e-commerce platform. Their cyber insurer requires a documented Business Continuity Plan (BCP) to renew their $2M policy. After 3 outages costing ~$50K each, they need to identify critical functions and build recovery plans. This tutorial shows you how to build a BCP in ComplianceOS.

---

## Situation

- No documented business continuity plans
- Recovery targets are unknown (no RTO/RPO defined)
- Staff don't know their roles during an incident
- Dependencies on third-party payment processors aren't mapped
- No testing of recovery procedures

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| List of all business processes | To identify which ones are critical |
| IT infrastructure inventory | To map systems to processes |
| Vendor contact information | For dependency mapping |
| 2-3 hours per week for 3 months | Time for BIA, planning, and testing |
| Budget for redundancy improvements | Some strategies require investment |

---

## Step-by-Step Walkthrough

### Step 1: Define BCMS Scope and Policy

**Time:** 2-3 hours

1. Navigate to `/clients/{id}/business-continuity`
2. Click **"Define Scope"**
3. Document:
   - **Scope:** E-commerce platform, warehouse operations, customer service, payment processing
   - **Policy Statement:** "ShopSphere is committed to maintaining critical business functions during disruptive incidents. We will identify critical activities, set recovery objectives, document response procedures, and validate our plans through regular testing."
   - **Roles:** BC Manager (COO), IT Lead, Warehouse Manager, Customer Service Lead
4. Submit for management approval

> **Behind the Scenes:** The BCMS scope is stored as a version-controlled document. The policy statement is linked to ISO 22301 Clause 5.3 (Policy) requirements.

---

### Step 2: Business Impact Analysis (BIA)

**Time:** 1-2 weeks

1. Navigate to `/clients/{id}/business-continuity/bia`
2. Click **"Start BIA"**
3. Identify business activities:

| Activity | Department | Critical? |
|---|---|---|
| Order processing | E-commerce | Yes |
| Payment processing | Finance | Yes |
| Warehouse fulfillment | Operations | Yes |
| Customer service | Support | Yes |
| Website hosting | IT | Yes |
| Marketing campaigns | Marketing | No |
| HR operations | HR | No |
| Financial reporting | Finance | No |

4. For each critical activity, assess impact over time:

**Impact Assessment (financial + operational):**

| Activity | 1 hour | 4 hours | 1 day | 1 week |
|---|---|---|---|---|
| Order processing | $5K loss | $20K loss | $50K loss | $200K loss |
| Payment processing | $10K loss | $40K loss | $100K loss | $400K loss |
| Warehouse fulfillment | $2K loss | $8K loss | $20K loss | $80K loss |
| Customer service | $1K loss | $3K loss | $8K loss | $30K loss |
| Website hosting | $8K loss | $30K loss | $80K loss | $300K loss |

5. Identify dependencies for each critical activity:

| Activity | IT Systems | Vendors | Personnel |
|---|---|---|---|
| Order processing | E-commerce platform, DB | Payment gateway, CDN | 3 operators |
| Payment processing | Payment gateway API | Stripe, PayPal | 2 finance staff |
| Warehouse fulfillment | WMS, barcode scanners | Shipping carriers | 15 warehouse staff |
| Customer service | CRM, phone system | Zendesk | 8 support agents |
| Website hosting | AWS, Cloudflare | AWS, Cloudflare | 2 DevOps |

> **Behind the Scenes:** BIA data is stored in structured tables linking activities to impacts, dependencies, and recovery objectives. The system calculates Maximum Acceptable Outage (MAO) based on your impact assessments.

---

### Step 3: Risk Assessment for Business Continuity

**Time:** 1 week

1. Navigate to `/clients/{id}/risks`
2. Filter for BC-related risks:
   - Ransomware attack (Critical)
   - DDoS attack (Critical)
   - Payment processor outage (High)
   - Cloud provider outage (High)
   - Key personnel loss (Medium)
   - Natural disaster (Medium)
   - Supply chain disruption (Medium)
3. Score and treat each risk
4. Link BC risks to your BIA activities

> **Behind the Scenes:** BC risks are linked to BIA activities. If a risk affects a critical activity, the system flags it for inclusion in your continuity plans.

---

### Step 4: Define Recovery Strategies

**Time:** 1-2 weeks

1. Navigate to `/clients/{id}/business-continuity/plans`
2. For each critical activity, select a recovery strategy:

| Activity | Strategy | Details |
|---|---|---|
| Order processing | Hot standby | Failover to secondary region (RTO: 1 hour) |
| Payment processing | Multi-provider | Switch to backup processor (RTO: 30 min) |
| Warehouse fulfillment | Alternate site | Secondary warehouse (RTO: 4 hours) |
| Customer service | Remote work | Cloud-based CRM accessible anywhere (RTO: 1 hour) |
| Website hosting | Auto-scaling | Multi-AZ deployment (RTO: 15 min) |

3. Set RTO/RPO for each activity:

| Activity | RTO | RPO |
|---|---|---|
| Order processing | 1 hour | 15 minutes |
| Payment processing | 30 minutes | 0 (zero data loss) |
| Warehouse fulfillment | 4 hours | 1 hour |
| Customer service | 1 hour | 15 minutes |
| Website hosting | 15 minutes | 5 minutes |

> **Behind the Scenes:** Recovery strategies are linked to BIA activities and risks. The system validates that RTO/RPO targets are achievable given your documented strategies.

---

### Step 5: Document Business Continuity Plans

**Time:** 2-3 weeks

1. Navigate to `/clients/{id}/business-continuity/plans`
2. Click **"Create Plan"** for each scenario:

**Plan 1: Ransomware Attack**
- Detection: EDR alert triggers
- Response: Isolate affected systems, activate incident team
- Communication: Notify CEO, legal, cyber insurance
- Recovery: Restore from clean backups, verify integrity
- Timeline: Contain in 1 hour, restore in 4 hours

**Plan 2: DDoS Attack**
- Detection: Traffic spike alert
- Response: Activate DDoS mitigation (Cloudflare)
- Communication: Notify hosting provider, customers (status page)
- Recovery: Filter malicious traffic, scale infrastructure
- Timeline: Mitigate in 15 minutes, full recovery in 1 hour

**Plan 3: Payment Processor Failure**
- Detection: Transaction failure alerts
- Response: Switch to backup processor
- Communication: Notify finance team, update status page
- Recovery: Reroute transactions, reconcile after restoration
- Timeline: Failover in 30 minutes, reconciliation in 24 hours

**Plan 4: Cloud Provider Outage**
- Detection: Health check failures
- Response: Activate multi-region failover
- Communication: Notify all-hands, update status page
- Recovery: DNS failover to secondary region
- Timeline: Failover in 15 minutes, full service in 1 hour

**Plan 5: Key Personnel Loss**
- Detection: Absence notification
- Response: Activate succession plan
- Communication: Notify team, redistribute responsibilities
- Recovery: Backup person assumes role, hire replacement
| Timeline: Coverage immediate, replacement in 30 days

3. For each plan, document:
   - Trigger conditions
   - Response procedures (step-by-step)
   - Communication plan (who, what, when)
   - Recovery procedures
   - Resource requirements
   - Roles and responsibilities

> **Behind the Scenes:** BCP documents are version-controlled with approval workflows. Each plan links to specific risks and BIA activities. The system tracks review dates and sends reminders for annual updates.

---

### Step 6: Exercises and Testing

**Time:** 2-4 weeks

1. Navigate to `/clients/{id}/business-continuity/exercises`
2. Schedule exercises:

| Exercise | Type | Scenario | Participants | Date |
|---|---|---|---|---|
| Tabletop 1 | Discussion | Ransomware | IT, Legal, Comms | Month 2 |
| Tabletop 2 | Discussion | Payment processor failure | Finance, IT, Support | Month 2 |
| Simulation 1 | Functional | DDoS attack | IT, DevOps | Month 3 |
| Full drill | Live | Cloud outage | All departments | Month 3 |

3. For each exercise:
   - Define objectives
   - Create scenario injects
   - Assign roles (participants, observers, evaluators)
   - Conduct the exercise
   - Document observations and lessons learned
   - Update plans based on findings

**Exercise Results (Tabletop 1 — Ransomware):**

| Observation | Finding | Action |
|---|---|---|
| Team didn't know who declares an incident | Unclear escalation | Update IRP with decision tree |
| Backup restoration took longer than expected | RTO not achievable | Add more frequent backups |
| Customer notification template didn't exist | Delayed communication | Create notification templates |

> **Behind the Scenes:** Exercise records are stored with full documentation: scenario, participant list, timeline, observations, and corrective actions. Auditors and insurers require evidence of regular testing.

---

### Step 7: Generate BCP Document

**Time:** 1-2 hours

1. Navigate to `/clients/{id}/business-continuity`
2. Click **"Export BCP"**
3. The system generates a complete document:
   - Executive summary
   - BCMS scope and policy
   - BIA results (activities, impacts, dependencies)
   - Risk assessment summary
   - Recovery strategies
   - Response plans (all scenarios)
   - Exercise schedule and results
   - Review and maintenance schedule
4. Download as PDF for your insurer

> **Behind the Scenes:** The BCP generator compiles all BIA data, risk records, plans, and exercise results into a formatted document. The document is version-controlled and includes a table of contents, revision history, and approval signatures.

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ BCMS scope and policy documented
- ✅ 5 critical activities identified with impact assessments
- ✅ Dependencies mapped (IT systems, vendors, personnel)
- ✅ Recovery strategies with RTO/RPO targets
- ✅ 5 documented continuity plans covering top scenarios
- ✅ 4 exercises conducted with lessons learned
- ✅ Complete BCP document for insurer
- ✅ Cyber insurance policy renewed

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "We don't know our RTO/RPO" | Start with business impact. Ask: "How long can we survive without this function?" That's your MAO. Set RTO below MAO. |
| "Our BIA is taking too long" | Focus on the 20% of activities that drive 80% of revenue. Those are your critical activities. |
| "We can't afford hot standby for everything" | Use cost-effective strategies: cold standby for less critical functions, warm standby for important ones, hot standby only for revenue-critical systems. |
| "Staff don't take exercises seriously" | Make scenarios realistic. Involve leadership. Tie exercises to real consequences (e.g., "This is what happens if we can't process orders for 4 hours"). |
| "Our insurer wants more detail" | Add evidence: screenshots of backup configurations, failover test results, vendor SLAs. |
| "Plans are out of date" | Set calendar reminders for annual review. Update plans after any major infrastructure change. |

---

## Next Steps

1. **Annual review cycle** — Schedule BIA update, plan review, and exercise every 12 months.
2. **Expand to ISO 22301** — Formalize your BCMS for certification.
3. **Add incident response** — Complement BCP with detailed incident procedures (see Case Study 7).
4. **Vendor risk management** — Assess continuity risks in your supply chain (see Case Study 6).
5. **Integrate with risk register** — Link BC risks to your enterprise risk register.

---

## Related Documentation

- [Business Continuity Workflow](/start-here) — Start Here page
- [Business Impact Analysis Case Study](./case-study-5-fastroute-bia.md) — Deep dive into BIA
- [Incident Response Case Study](./case-study-7-cybershield-ir.md) — Complementary response planning
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — Supply chain continuity
