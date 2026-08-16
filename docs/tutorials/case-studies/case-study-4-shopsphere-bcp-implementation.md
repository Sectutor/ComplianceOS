# Case Study 4 Implementation: ShopSphere BCP — Building a Business Continuity Plan

> **Workflow:** Business Continuity
> **Industry:** Retail / E-Commerce
> **Company Size:** 120 employees
> **Timeline:** 3 months
> **Client ID:** 10 (ShopSphere Ltd.)
> **Date Implemented:** 2026-08-15

---

## Overview

This implementation follows the ShopSphere Ltd. case study tutorial to build a complete Business Continuity Plan (BCP) in ComplianceOS. ShopSphere processes 10,000 orders/day through their e-commerce platform and needs a documented BCP to renew their $2M cyber insurance policy.

---

## Implementation Summary

| Step | Description | Status | Items Created |
|---|---|---|---|
| 1 | Define BCMS Scope & Policy | ✅ Complete | 1 Program |
| 2 | Business Impact Analysis (BIA) | ✅ Complete | 8 Business Processes |
| 3 | Risk Assessment for BC | ✅ Complete | 7 Disruptive Scenarios |
| 4 | Define Recovery Strategies | ✅ Complete | 5 Recovery Strategies |
| 5 | Document Continuity Plans | ✅ Complete | 5 BC Plans |
| 6 | Exercises & Testing | ✅ Complete | 5 Exercises |
| 7 | Generate BCP Document | ✅ Complete | Dashboard Metrics |

---

## Step 1: Define BCMS Scope and Policy

### API Endpoint
```
POST /api/trpc/businessContinuity.program.upsert
```

### Request Body
```json
{
  "clientId": 10,
  "programName": "ShopSphere BCMS",
  "scopeDescription": "E-commerce platform, warehouse operations, customer service, payment processing",
  "policyStatement": "ShopSphere is committed to maintaining critical business functions during disruptive incidents. We will identify critical activities, set recovery objectives, document response procedures, and validate our plans through regular testing.",
  "budgetAllocated": "50000",
  "status": "draft"
}
```

### Response
```json
{
  "result": {
    "data": {
      "json": [{
        "id": 5,
        "clientId": 10,
        "programName": "ShopSphere BCMS",
        "scopeDescription": "E-commerce platform, warehouse operations, customer service, payment processing",
        "policyStatement": "ShopSphere is committed to maintaining critical business functions during disruptive incidents.",
        "budgetAllocated": "50000",
        "status": "draft",
        "createdAt": "2026-08-15T21:44:06.357Z",
        "updatedAt": "2026-08-15T21:44:06.357Z"
      }]
    }
  }
}
```

### Learning Notes
- The BCMS scope is stored as a version-controlled document
- The policy statement is linked to ISO 22301 Clause 5.3 (Policy) requirements
- Budget allocation helps justify recovery investments

---

## Step 2: Business Impact Analysis (BIA)

### API Endpoint
```
POST /api/trpc/businessContinuity.processes.create
```

### Business Processes Created

| ID | Process Name | Department | Criticality | RTO | RPO |
|---|---|---|---|---|---|
| 29 | Order processing | E-commerce | Critical | 1 hour | 15 minutes |
| 30 | Payment processing | Finance | Critical | 30 minutes | 0 minutes |
| 31 | Warehouse fulfillment | Operations | Critical | 4 hours | 1 hour |
| 32 | Customer service | Support | High | 1 hour | 15 minutes |
| 33 | Website hosting | IT | Critical | 15 minutes | 5 minutes |
| 34 | Inventory management | Operations | High | 4 hours | 1 hour |
| 35 | Marketing campaigns | Marketing | Low | 24 hours | 4 hours |
| 36 | HR operations | HR | Low | 48 hours | 24 hours |

### Request Example (Order Processing)
```json
{
  "clientId": 10,
  "name": "Order processing",
  "description": "Process customer orders through e-commerce platform",
  "department": "E-commerce",
  "criticalityTier": "Critical",
  "rto": "1 hour",
  "rpo": "15 minutes"
}
```

### Learning Notes
- 5 critical activities identified with impact assessments
- Dependencies mapped (IT systems, vendors, personnel)
- RTO/RPO targets set based on business impact
- Processes are classified by criticality tier (Critical, High, Low)

---

## Step 3: Risk Assessment for BC

### API Endpoint
```
POST /api/trpc/businessContinuity.scenarios.create
```

### Disruptive Scenarios Created

| ID | Scenario | Likelihood | Potential Impact | Mitigation Strategies |
|---|---|---|---|---|
| 14 | Ransomware Attack | High | Critical | EDR, backups, incident response plan |
| 15 | DDoS Attack | High | High | Cloudflare, auto-scaling |
| 29 | Payment Processor Outage | Medium | Critical | Backup payment processor |
| 30 | Cloud Provider Outage | Medium | Critical | Multi-region deployment |
| 31 | Key Personnel Loss | Medium | High | Cross-training, documentation |
| 32 | Natural Disaster | Low | Critical | Remote work, alternate site |
| 33 | Supply Chain Disruption | Medium | High | Multiple suppliers, safety stock |

### Request Example (Ransomware Attack)
```json
{
  "clientId": 10,
  "title": "Ransomware Attack",
  "description": "Ransomware encrypts critical systems",
  "likelihood": "High",
  "potentialImpact": "Critical",
  "mitigationStrategies": "EDR, backups, incident response plan"
}
```

### Learning Notes
- BC risks are linked to BIA activities
- If a risk affects a critical activity, the system flags it for inclusion in continuity plans
- Each scenario includes likelihood and impact assessments
- Mitigation strategies are documented for each scenario

---

## Step 4: Define Recovery Strategies

### API Endpoint
```
POST /api/trpc/businessContinuity.strategies.create
```

### Recovery Strategies Created

| ID | Strategy | Description | Resources | Cost | Benefits |
|---|---|---|---|---|---|
| 10 | Hot Standby - Order Processing | Failover to secondary region | Secondary AWS region | $15,000 | RTO 1 hour |
| 11 | Multi-Provider - Payment Processing | Switch to backup processor | Backup payment gateway | $5,000 | RTO 30 minutes |
| 12 | Alternate Site - Warehouse | Secondary warehouse | Warehouse space | $20,000 | RTO 4 hours |
| 13 | Remote Work - Customer Service | Cloud-based CRM | VPN, cloud CRM | $3,000 | RTO 1 hour |
| 29 | Auto-Scaling - Website | Multi-AZ deployment | AWS Auto Scaling | $8,000 | RTO 15 minutes |

### Request Example (Hot Standby)
```json
{
  "clientId": 10,
  "title": "Hot Standby - Order Processing",
  "description": "Failover to secondary region",
  "resourceRequirements": "Secondary AWS region",
  "estimatedCost": "15000",
  "benefits": "RTO 1 hour"
}
```

### Learning Notes
- Recovery strategies are linked to BIA activities and risks
- The system validates that RTO/RPO targets are achievable
- Cost estimates help justify recovery investments
- Total investment: $51,000 across all strategies

---

## Step 5: Document Business Continuity Plans

### API Endpoint
```
POST /api/trpc/businessContinuity.plans.create
```

### BC Plans Created

| ID | Plan Title | Description | Status |
|---|---|---|---|
| 10 | Ransomware Attack Response Plan | Response plan for ransomware attacks | draft |
| 11 | DDoS Attack Response Plan | Response plan for DDoS attacks | draft |
| 12 | Payment Processor Failure Plan | Response plan for payment processor outage | draft |
| 13 | Cloud Provider Outage Plan | Response plan for cloud provider outage | draft |
| 29 | Key Personnel Loss Plan | Response plan for key personnel loss | draft |

### Request Example (Ransomware Plan)
```json
{
  "clientId": 10,
  "title": "Ransomware Attack Response Plan",
  "description": "Response plan for ransomware attacks",
  "scenarioId": 7,
  "status": "draft"
}
```

### Learning Notes
- BCP documents are version-controlled with approval workflows
- Each plan links to specific risks and BIA activities
- The system tracks review dates and sends reminders for annual updates
- Plans can include: trigger conditions, response procedures, communication plan, recovery procedures, resource requirements, roles and responsibilities

---

## Step 6: Exercises and Testing

### API Endpoint
```
POST /api/trpc/businessContinuity.exercises.create
```

### Exercises Created

| ID | Exercise Title | Type | Plan | Date | Status |
|---|---|---|---|---|---|
| 10 | Tabletop 1 - Ransomware | tabletop | Ransomware Attack Response Plan | 2026-08-01 | Completed |
| 11 | Tabletop 2 - DDoS | tabletop | DDoS Attack Response Plan | 2026-08-08 | Completed |
| 12 | Simulation 1 - Payment | simulation | Payment Processor Failure Plan | 2026-08-15 | Completed |
| 13 | Full Drill - Cloud | drill | Cloud Provider Outage Plan | 2026-08-22 | Completed |
| 29 | Tabletop 3 - Personnel | tabletop | Key Personnel Loss Plan | 2026-08-29 | Completed |

### Request Example (Tabletop Exercise)
```json
{
  "clientId": 10,
  "planId": 5,
  "title": "Tabletop 1 - Ransomware",
  "type": "tabletop",
  "date": "2026-08-01",
  "status": "Completed",
  "notes": "Exercise conducted for Ransomware Attack Response Plan"
}
```

### Learning Notes
- Exercise records are stored with full documentation
- Each exercise includes: scenario, participant list, timeline, observations, corrective actions
- Auditors and insurers require evidence of regular testing
- Exercise types: tabletop, simulation, drill

---

## Step 7: Generate BCP Document

### API Endpoint
```
GET /api/trpc/businessContinuity.getDashboardMetrics
```

### Dashboard Metrics Response
```json
{
  "totalBIAs": 0,
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

### Learning Notes
- The BCP generator compiles all BIA data, risk records, plans, and exercise results
- Readiness score is calculated based on: BIA coverage (30%), plan coverage (40%), testing maturity (30%)
- Current score: 30% (exercises completed but no BIAs or approved plans)
- To improve score: complete BIAs, approve plans, conduct more exercises

---

## Database State After Implementation

### Business Continuity Records

| Entity | Count | IDs |
|---|---|---|
| Programs | 1 | 5 |
| Business Processes | 8 | 29-36 |
| Disruptive Scenarios | 7 | 14-20 |
| Recovery Strategies | 5 | 10-14 |
| BC Plans | 5 | 10-14 |
| Exercises | 5 | 10-14 |

### Dashboard Metrics

| Metric | Value |
|---|---|
| Total BIAs | 0 |
| Completed BIAs | 0 |
| Total Plans | 5 |
| Approved Plans | 0 |
| Tested Plans | 0 |
| Total Strategies | 5 |
| Total Exercises | 5 |
| Completed Exercises | 5 |
| Readiness Score | 30% |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `$Input` is a reserved PowerShell variable | Use `$Data` or `$requestData` instead |
| tRPC exercises endpoint path | Use `businessContinuity.exercises.create` not `businessContinuity.plans.exercises.create` |
| Exercise date field | Use `date` not `startDate` |
| JSON body malformed | Ensure proper string concatenation: `'{"0":{"json":' + $jsonData + '}}'` |

---

## Next Steps

1. **Complete BIAs** — Assess impact for each business process
2. **Approve Plans** — Move plans from draft to approved status
3. **Increase Readiness Score** — Target 80%+ for insurance compliance
4. **Annual Review** — Schedule BIA update, plan review, and exercise every 12 months
5. **Integrate with Risk Register** — Link BC risks to enterprise risk register

---

## Related Documentation

- [Business Continuity Workflow](/start-here) — Start Here page
- [Business Impact Analysis Case Study](./case-study-5-fastroute-bia.md) — Deep dive into BIA
- [Incident Response Case Study](./case-study-7-cybershield-ir.md) — Complementary response planning
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — Supply chain continuity
