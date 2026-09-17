# Case Study 5 Implementation: FastRoute BIA — Quantifying Downtime Costs

> **Workflow:** Business Impact Analysis
> **Industry:** Transportation & Logistics
> **Company Size:** 400 employees, 150 vehicles
> **Timeline:** 4-6 weeks
> **Client ID:** 11 (FastRoute Logistics)
> **Date Implemented:** 2026-08-15

---

## Overview

This implementation follows the FastRoute Logistics case study tutorial to build a comprehensive Business Impact Analysis (BIA) in ComplianceOS. FastRoute manages 150 vehicles with a dispatch system tracking all shipments. A recent 4-hour dispatch outage cost them $180K in penalties and lost customer trust.

---

## Implementation Summary

| Step | Description | Status | Items Created |
|---|---|---|---|
| 1 | Define BIA Scope and Methodology | ✅ Complete | 1 BIA Program |
| 2 | Identify Critical Processes | ✅ Complete | 12 Business Processes |
| 3 | Impact Assessment | ✅ Complete | 12 BIA Assessments |
| 4 | Map Dependencies | ✅ Complete | 7 Dependencies |
| 5 | Define RTO and RPO | ✅ Complete | 6 Recovery Objectives |
| 6 | Generate BIA Report | ✅ Complete | Dashboard Metrics |

---

## Step 1: Define BIA Scope and Methodology

### API Endpoint
```
POST /api/trpc/businessContinuity.program.upsert
```

### Request Body
```json
{
  "clientId": 11,
  "programName": "FastRoute BIA Program",
  "scopeDescription": "Dispatch operations, warehouse operations, customer portal. Headquarters + 3 regional hubs.",
  "policyStatement": "FastRoute will quantify financial impact of potential disruptions and set data-driven recovery priorities.",
  "budgetAllocated": "75000",
  "status": "draft"
}
```

### Response
- **Program ID:** 3
- **Status:** 200 OK

### Learning Notes
- The BIA scope document sets the foundation for all subsequent analysis
- Impact criteria defined: Financial, Operational, Legal/Regulatory, Reputational
- Methodology: Department head interviews + financial analysis

---

## Step 2: Identify Critical Processes

### API Endpoint
```
POST /api/trpc/businessContinuity.processes.create
```

### Business Processes Created (12 total)

#### Dispatch Operations (8 processes)

| ID | Process Name | Department | Criticality | RTO | RPO |
|---|---|---|---|---|---|
| 37 | Vehicle dispatch | Dispatch | Critical | 2 hours | 15 minutes |
| 38 | Route optimization | Dispatch | Critical | 4 hours | 1 hour |
| 39 | Driver communication | Dispatch | Essential | 1 hour | N/A |
| 40 | Delivery confirmation | Dispatch | Essential | 4 hours | 1 hour |
| 41 | Exception handling | Dispatch | Important | 8 hours | 2 hours |
| 42 | Customer notifications | Dispatch | Important | 8 hours | 2 hours |
| 43 | Proof of delivery capture | Dispatch | Non-essential | 24 hours | 4 hours |
| 44 | Performance reporting | Dispatch | Non-essential | 48 hours | 24 hours |

#### Warehouse Operations (4 processes)

| ID | Process Name | Department | Criticality | RTO | RPO |
|---|---|---|---|---|---|
| 45 | Receiving and put-away | Warehouse | Essential | 4 hours | 1 hour |
| 46 | Order picking | Warehouse | Critical | 2 hours | 30 minutes |
| 47 | Shipping | Warehouse | Critical | 2 hours | 1 hour |
| 48 | Inventory management | Warehouse | Important | 8 hours | 2 hours |

### Process Classification Summary

| Criticality | Count | RTO Range |
|---|---|---|
| Critical | 5 | 2-4 hours |
| Essential | 3 | 1-4 hours |
| Important | 3 | 8 hours |
| Non-essential | 2 | 24-48 hours |

---

## Step 3: Impact Assessment

### API Endpoint
```
POST /api/trpc/businessContinuity.bia.create
```

### BIA Assessments Created (12 total)

| BIA ID | Process | Status |
|---|---|---|
| 19 | Vehicle dispatch | draft |
| 20 | Route optimization | draft |
| 21 | Driver communication | draft |
| 22 | Delivery confirmation | draft |
| 23 | Exception handling | draft |
| 24 | Customer notifications | draft |
| 25 | Proof of delivery capture | draft |
| 26 | Performance reporting | draft |
| 27 | Receiving and put-away | draft |
| 28 | Order picking | draft |
| 29 | Shipping | draft |
| 30 | Inventory management | draft |

### Financial Impact by Process (from case study)

| Process | 1 hour | 4 hours | 1 day | 3 days | 1 week |
|---|---|---|---|---|---|
| Vehicle dispatch | $45K | $180K | $450K | $1.35M | $3.15M |
| Route optimization | $12K | $48K | $120K | $360K | $840K |
| Order picking | $18K | $72K | $180K | $540K | $1.26M |
| Shipping | $15K | $60K | $150K | $450K | $1.05M |

---

## Step 4: Map Dependencies

### API Endpoint
```
POST /api/trpc/businessContinuity.processes.addDependency
```

### Dependencies Mapped (7 total)

| ID | Process | Type | Dependency | Criticality |
|---|---|---|---|---|
| 18 | Vehicle dispatch | IT System | Custom Dispatch App | Critical |
| 19 | Vehicle dispatch | Vendor | GPS Fleet Tracking | Critical |
| 20 | Route optimization | IT System | Route optimization API | High |
| 21 | Route optimization | Vendor | Map Provider | High |
| 22 | Receiving and put-away | IT System | WMS | Critical |
| 23 | Order picking | IT System | WMS | Critical |
| 24 | Shipping | Vendor | FedEx/UPS/DHL | Critical |

### Dependency Categories

| Category | Count | Examples |
|---|---|---|
| IT Systems | 4 | Custom Dispatch App, WMS, Route optimization API |
| Vendors | 3 | GPS Fleet Tracking, Map Provider, FedEx/UPS/DHL |

---

## Step 5: Define RTO and RPO

### API Endpoint
```
POST /api/trpc/businessContinuity.bia.saveRecoveryObjective
```

### Recovery Objectives Created (6 total)

| ID | BIA ID | Process | Criticality | RTO | RPO | MAO |
|---|---|---|---|---|---|---|
| 27 | 19 | Vehicle dispatch | Critical | 2 hours | 15 minutes | 4 hours |
| 28 | 20 | Route optimization | Critical | 4 hours | 1 hour | 8 hours |
| 29 | 27 | Receiving and put-away | Essential | 4 hours | 1 hour | 8 hours |
| 30 | 28 | Order picking | Critical | 2 hours | 30 minutes | 4 hours |
| 31 | 29 | Shipping | Critical | 2 hours | 1 hour | 4 hours |
| 32 | 22 | Delivery confirmation | Essential | 1 hour | N/A | 2 hours |

### RTO/RPO Justification

| Process | RTO | Justification |
|---|---|---|
| Vehicle dispatch | 2 hours | $45K/hour loss; manual dispatch possible but slow |
| Route optimization | 4 hours | Static routes acceptable for short periods |
| Order picking | 2 hours | Paper pick lists available; slower but functional |
| Shipping | 2 hours | Manual manifests possible; carrier pickup schedule |
| Receiving | 4 hours | Paper receiving available |
| Driver communication | 1 hour | Phone calls as backup |

---

## Step 6: Generate BIA Report

### API Endpoint
```
GET /api/trpc/businessContinuity.getDashboardMetrics
```

### Dashboard Metrics Response
```json
{
  "totalBIAs": 12,
  "completedBIAs": 0,
  "totalPlans": 5,
  "approvedPlans": 0,
  "testedPlans": 0,
  "totalStrategies": 5,
  "totalExercises": 5,
  "completedExercises": 5,
  "readinessScore": 30
}
```

### Executive Summary

> "A 4-hour dispatch outage costs $180K. Investing $200K in redundant dispatch infrastructure (hot standby + automated failover) pays for itself in the first outage. Without it, a single major outage costs $450K+ in direct losses and SLA penalties."

---

## Database State After Implementation

### Business Continuity Records

| Entity | Count | IDs |
|---|---|---|
| Programs | 1 | 6 |
| Business Processes | 12 | 37-48 |
| BIA Assessments | 12 | 19-30 |
| Dependencies | 7 | 18-24 |
| Recovery Objectives | 6 | 27-32 |

### Dashboard Metrics

| Metric | Value |
|---|---|
| Total BIAs | 12 |
| Completed BIAs | 0 |
| Total Plans | 5 |
| Approved Plans | 0 |
| Tested Plans | 0 |
| Total Strategies | 5 |
| Total Exercises | 5 |
| Completed Exercises | 5 |
| Readiness Score | 30% |

---

## Next Steps

1. **Complete BIAs** — Update BIA status to 'completed' after impact assessment
2. **Approve Recovery Objectives** — Validate RTO/RPO targets with stakeholders
3. **Build BCPs** — Create continuity plans based on BIA findings (see Case Study 4)
4. **Test Recovery** — Conduct exercises to validate targets are achievable
5. **Update BIA Annually** — Refresh every 12 months

---

## Related Documentation

- [Business Impact Analysis Workflow](/start-here) — Start Here page
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — Building BCPs from BIA
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Enterprise risk register
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — Third-party dependencies
