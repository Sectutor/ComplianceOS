# Case Study Tutorial: FastRoute Logistics — Quantifying Downtime Costs with BIA

> **Workflow:** Business Impact Analysis
> **Industry:** Transportation & Logistics
> **Company Size:** 400 employees, 150 vehicles
> **Timeline:** 4-6 weeks

---

## Overview

FastRoute manages 150 vehicles with a dispatch system tracking all shipments. A recent 4-hour dispatch outage cost them $180K in penalties and lost customer trust. The new COO wants to quantify the financial impact of potential disruptions and set data-driven recovery priorities. This tutorial shows you how to build a Business Impact Analysis that justifies recovery investments.

---

## Situation

- No quantification of downtime costs
- Recovery priorities are based on gut feel, not data
- Dependencies on GPS, fuel systems, and warehouse management aren't mapped
- No defined Recovery Time Objectives (RTO)
- Customer SLA penalties aren't linked to system availability

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| Revenue/cost data by process | To quantify financial impact |
| IT systems inventory | To map dependencies |
| Vendor contracts and SLAs | To understand external dependencies |
| 2-3 hours per week for 4-6 weeks | Time for interviews, analysis, and reporting |
| Access to department heads | For process identification and impact validation |

---

## Step-by-Step Walkthrough

### Step 1: Define BIA Scope and Methodology

**Time:** 2-3 hours

1. Navigate to `/clients/{id}/business-continuity/bia`
2. Click **"New BIA"**
3. Define scope:
   - **Organizational Scope:** Dispatch operations, warehouse operations, customer portal
   - **Geographic Scope:** Headquarters + 3 regional hubs
   - **Time Horizon:** Assess impact over 1 hour, 4 hours, 1 day, 3 days, 1 week
4. Define impact criteria:
   - **Financial:** Revenue loss, penalty costs, overtime costs
   - **Operational:** Service disruption, backlog accumulation
   - **Legal/Regulatory:** Contractual breaches, regulatory fines
   - **Reputational:** Customer churn, brand damage
5. Set methodology:
   - Data collection: Department head interviews + financial analysis
   - Validation: Cross-reference with finance team
   - Approval: COO sign-off on final report

> **Behind the Scenes:** The BIA scope document sets the foundation for all subsequent analysis. It defines what's in scope, how impact is measured, and who validates the results.

---

### Step 2: Identify Critical Processes

**Time:** 1-2 weeks

1. Interview department heads to catalog all business activities:

**Dispatch Operations (8 processes):**

| # | Process | Frequency | Revenue Impact |
|---|---|---|---|
| 1 | Vehicle dispatch | Continuous | $45K/hour |
| 2 | Route optimization | Every 30 min | $12K/hour |
| 3 | Driver communication | Continuous | $8K/hour |
| 4 | Delivery confirmation | Per delivery | $5K/hour |
| 5 | Exception handling | As needed | $15K/hour |
| 6 | Customer notifications | Per shipment | $3K/hour |
| 7 | Proof of delivery capture | Per delivery | $2K/hour |
| 8 | Performance reporting | Hourly | $1K/hour |

**Warehouse Operations (4 processes):**

| # | Process | Frequency | Revenue Impact |
|---|---|---|---|
| 9 | Receiving and put-away | Continuous | $12K/hour |
| 10 | Order picking | Continuous | $18K/hour |
| 11 | Shipping | Continuous | $15K/hour |
| 12 | Inventory management | Continuous | $5K/hour |

2. Classify each process:
   - **Critical (RTO < 4 hours):** Dispatch, route optimization, order picking, shipping
   - **Essential (RTO < 24 hours):** Receiving, driver communication, delivery confirmation
   - **Important (RTO < 72 hours):** Customer notifications, exception handling, inventory management
   - **Non-essential (RTO > 72 hours):** Performance reporting, proof of delivery

> **Behind the Scenes:** Process data is stored with classification and revenue impact. The system uses this to auto-prioritize recovery efforts and calculate the financial justification for redundancy investments.

---

### Step 3: Impact Assessment

**Time:** 1-2 weeks

1. For each critical process, quantify impact over time:

**Financial Impact by Process:**

| Process | 1 hour | 4 hours | 1 day | 3 days | 1 week |
|---|---|---|---|---|---|
| Vehicle dispatch | $45K | $180K | $450K | $1.35M | $3.15M |
| Route optimization | $12K | $48K | $120K | $360K | $840K |
| Order picking | $18K | $72K | $180K | $540K | $1.26M |
| Shipping | $15K | $60K | $150K | $450K | $1.05M |
| Receiving | $12K | $48K | $120K | $360K | $840K |
| Driver communication | $8K | $32K | $80K | $240K | $560K |
| Delivery confirmation | $5K | $20K | $50K | $150K | $350K |
| Exception handling | $15K | $60K | $150K | $450K | $1.05M |
| Customer notifications | $3K | $12K | $30K | $90K | $210K |
| Inventory management | $5K | $20K | $50K | $150K | $350K |
| POD capture | $2K | $8K | $20K | $60K | $140K |
| Performance reporting | $1K | $4K | $10K | $30K | $70K |

2. Add qualitative impacts:
   - **Legal:** SLA penalties ($5K-$50K per breach)
   - **Reputational:** Customer churn (3-5% for major outages)
   - **Regulatory:** DOT reporting requirements for delivery delays

3. Identify peak periods (holiday season = 3x normal impact)

> **Behind the Scenes:** Impact data is stored in a structured matrix (process × time period). The system calculates cumulative impact and identifies the "breaking point" — where cumulative losses exceed the cost of recovery investments.

---

### Step 4: Map Dependencies

**Time:** 1 week

1. For each critical process, identify dependencies:

**IT Systems Dependencies:**

| Process | Primary System | Backup System | Cloud/On-Prem |
|---|---|---|---|
| Vehicle dispatch | Custom Dispatch App | Manual dispatch | On-prem |
| Route optimization | Route optimization API | Static routes | Cloud |
| Order picking | WMS | Paper pick lists | On-prem |
| Shipping | Shipping manifest API | Manual manifests | Cloud |
| Receiving | WMS | Paper receiving | Cloud |
| Driver communication | Two-way radio + app | Phone calls | Mixed |

**Vendor Dependencies:**

| Process | Vendor | Service | SLA |
|---|---|---|---|
| Vehicle dispatch | GPS Fleet Tracking | Real-time GPS | 99.5% |
| Route optimization | Map Provider | Mapping API | 99.9% |
| Shipping | FedEx/UPS/DHL | Shipping APIs | 99.9% |
| Payment processing | Payment Gateway | Transaction processing | 99.95% |

**Personnel Dependencies:**

| Process | Key Personnel | Backup | Training Status |
|---|---|---|---|
| Vehicle dispatch | 3 dispatchers | 2 cross-trained | Partial |
| Route optimization | 1 route planner | None | Gap |
| Order picking | 15 warehouse staff | Temporary staff | Ready |
| Shipping | 4 shipping clerks | 2 cross-trained | Ready |

> **Behind the Scenes:** Dependency mapping creates a graph of interconnections. If a vendor fails, the system shows all affected processes. If key personnel are unavailable, the system identifies single points of failure.

---

### Step 5: Define RTO and RPO

**Time:** 3-5 days

1. For each critical process, set:
   - **MAO (Maximum Acceptable Outage):** The longest the business can survive without the process
   - **RTO (Recovery Time Objective):** Target time to recover the process (must be < MAO)
   - **RPO (Recovery Point Objective):** Maximum acceptable data loss (time between last backup and outage)

**FastRoute's RTO/RPO Targets:**

| Process | MAO | RTO | RPO | Justification |
|---|---|---|---|---|
| Vehicle dispatch | 4 hours | 2 hours | 15 min | $45K/hour loss; manual dispatch is possible but slow |
| Route optimization | 8 hours | 4 hours | 1 hour | Static routes acceptable for short periods |
| Order picking | 4 hours | 2 hours | 30 min | Paper pick lists available; slower but functional |
| Shipping | 4 hours | 2 hours | 1 hour | Manual manifests possible; carrier pickup schedule |
| Receiving | 8 hours | 4 hours | 1 hour | Paper receiving available |
| Driver communication | 2 hours | 1 hour | N/A | Phone calls as backup |

2. Validate targets with department heads:
   - "Can you operate with manual dispatch for 2 hours?" → Yes
   - "Can you operate without route optimization for 4 hours?" → Yes (static routes)
   - "Can you operate without WMS for 2 hours?" → Yes (paper processes)

3. Document assumptions and constraints

> **Behind the Scenes:** RTO/RPO targets are linked to processes, dependencies, and recovery strategies. The system validates that documented strategies can achieve the stated targets. If a target can't be met, the system flags the gap.

---

### Step 6: Generate BIA Report

**Time:** 1-2 hours

1. Navigate to `/clients/{id}/business-continuity/bia`
2. Click **"Generate Report"**
3. The system produces:
   - **Executive Summary:** Top-line findings and investment recommendations
   - **Critical Processes Ranked:** By financial impact
   - **Impact Curves:** Financial loss over time for each process
   - **Dependency Map:** Visual graph of process-system-vendor-personnel relationships
   - **RTO/RPO Summary:** Targets with justification
   - **Investment Recommendations:** Cost-justified recovery investments

**Executive Summary for COO:**

> "A 4-hour dispatch outage costs $180K. Investing $200K in redundant dispatch infrastructure (hot standby + automated failover) pays for itself in the first outage. Without it, a single major outage costs $450K+ in direct losses and SLA penalties."

4. Download as PDF for executive presentation

> **Behind the Scenes:** The BIA report generator compiles all process data, impact assessments, dependency maps, and RTO/RPO targets into a formatted executive document. Charts are rendered server-side showing impact curves and investment ROI.

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ 12 business processes cataloged with classifications
- ✅ Financial impact quantified across 5 time periods
- ✅ Complete dependency map (IT systems, vendors, personnel)
- ✅ RTO/RPO targets set and validated with stakeholders
- ✅ Executive BIA report with investment recommendations
- ✅ $200K redundant dispatch infrastructure approved

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "We don't know our hourly revenue by process" | Use total revenue ÷ operating hours as a starting point. Refine with department head input. |
| "Different stakeholders disagree on impact" | Use financial data as the tiebreaker. If finance says $45K/hour and operations says $20K/hour, go with finance. |
| "Our RTO seems impossible to achieve" | Document the gap. The BIA shows what investment is needed. If you can't afford it, document the accepted risk. |
| "Dependencies keep changing" | Schedule quarterly dependency reviews. Systems and vendors change frequently. |
| "The COO wants more detail" | Add scenario analysis: "What if dispatch is down during peak season?" (3x impact). |

---

## Next Steps

1. **Approve recovery investments** — Use the BIA report to justify budget for redundancy.
2. **Document recovery plans** — Build BCPs based on your RTO/RPO targets (see Case Study 4).
3. **Test your recovery** — Conduct exercises to validate your targets are achievable.
4. **Update BIA annually** — Processes, revenues, and costs change. Refresh every 12 months.
5. **Link to risk register** — Ensure BC risks are in your enterprise risk register.

---

## Related Documentation

- [Business Impact Analysis Workflow](/start-here) — Start Here page
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — Building BCPs from BIA
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Enterprise risk register
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — Third-party dependencies
