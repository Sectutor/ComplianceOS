# Dashboard Enhancement Plan: NIS2 & Information Security Management

## Executive Summary

This document outlines a comprehensive plan to enhance the ComplianceOS Dashboard with NIS2 directive controls and real-time information security management monitoring. The goal is to provide a unified command center that displays all aspects of security management with live data from existing modules.

---

## 1. Current State Analysis

### Existing Dashboard Components
The current dashboard at `/dashboard` provides:
- **Live Posture Score** - Overall compliance percentage
- **Controls by Status** - Implemented/In Progress/Not Started
- **Policies by Status** - Approved/Review/Draft/Archived  
- **Evidence by Status** - Verified/Collected/Pending/Expired
- **Framework Breakdown** - ISO 27001, SOC 2, NIST CSF, etc.
- **AI Posture Insights** - Automated recommendations
- **Client Overview** - Multi-client management view

### Existing NIS2 Infrastructure
The system already has substantial NIS2 infrastructure:
- [`packages/core/src/pages/cyber/CyberDashboard.tsx`](packages/core/src/pages/cyber/CyberDashboard.tsx) - NIS2 command center
- [`packages/core/src/pages/cyber/CyberAssessment.tsx`](packages/core/src/pages/cyber/CyberAssessment.tsx) - Article 21 checklist (12 categories)
- [`packages/core/src/pages/cyber/NIS2Workbook.tsx`](packages/core/src/pages/cyber/NIS2Workbook.tsx) - Evidence blueprints
- [`packages/core/src/pages/cyber/NIS2MappingHub.tsx`](packages/core/src/pages/cyber/NIS2MappingHub.tsx) - Framework cross-mapping
- [`packages/core/src/pages/business-continuity/BusinessContinuityDashboard.tsx`](packages/core/src/pages/business-continuity/BusinessContinuityDashboard.tsx) - BCP/DR
- [`packages/core/src/pages/risk/RiskDashboard.tsx`](packages/core/src/pages/risk/RiskDashboard.tsx) - Risk management

---

## 2. Proposed NIS2 Dashboard Widget Architecture

### 2.1 NIS2 Article 21 Control Health Widget

A real-time widget displaying compliance status for each of the 10+ NIS2 Article 21 measures:

| Measure | Category | Data Source | Real-time Metrics |
|---------|----------|-------------|-------------------|
| 21(2)(a) | Policies | Policy status | Draft vs Approved count |
| 21(2)(b) | Risk Management | Risk register | Active risks, treatment status |
| 21(2)(c) | Incident Handling | Cyber incidents | Open incidents, 24h/72h alerts |
| 21(2)(d) | Business Continuity | BCP/DR | Test status, plan completion |
| 21(2)(e) | Supply Chain | Vendor program | Vendor assessments overdue |
| 21(2)(f) | Acquisition/Development | SDLC/Security testing | Vulnerability count, open items |
| 21(2)(g) | Effectiveness Assessment | Controls | Control effectiveness score |
| 21(2)(h) | Cyber Hygiene | Training | Completion rate, phishing sim |
| 21(2)(i) | Cryptography | Policies/Encryption | Key management, encryption status |
| 21(2)(j) | Human Resources | Personnel | Background checks, terminations |
| 21(2)(k) | Access Control | IAM | MFA adoption, privileged accounts |
| 21(2)(l) | Asset Management | Asset inventory | Coverage percentage |

### 2.2 Security Domain Cards

Create modular cards for each security domain that can be toggled on/off:

```
┌─────────────────────────────────────────────────────────────┐
│  SECURITY DOMAIN MONITORING                                 │
├───────────────┬───────────────┬───────────────┬─────────────┤
│   🔴 RISK     │  🔴 INCIDENT  │  🟡 BUSINESS  │  🔴 SUPPLY  │
│   MANAGEMENT  │    RESPONSE   │   CONTINUITY   │    CHAIN    │
│               │               │               │             │
│   3 Critical │   1 Active   │   2 Tests Due │   5 Vendor  │
│   Risks       │   Incident    │   This Month  │   Overdue   │
├───────────────┼───────────────┼───────────────┼─────────────┤
│   🔴 ASSET    │  🟢 SECURITY │  🟢 TRAINING  │  🟡 ACCESS   │
│   MANAGEMENT  │   POLICIES   │               │   CONTROL   │
│               │               │               │             │
│   98% Covered │   12/15      │   85% Staff   │   92% MFA   │
│               │   Approved    │   Trained     │   Adoption  │
└───────────────┴───────────────┴───────────────┴─────────────┘
```

### 2.3 Real-Time Data Integration Sources

Each widget pulls from existing data sources:

| Widget | Primary Source | Integration Method |
|--------|---------------|-------------------|
| Risk Management | `riskRegister` table | TRPC query: `risks.list` |
| Incident Response | `cyberIncidents` table | TRPC query: `incidents.list` |
| Business Continuity | `businessContinuity` table | TRPC query: `bcp.getStatus` |
| Supply Chain | `vendors` table | TRPC query: `vendors.list` |
| Asset Management | `assets` table | TRPC query: `assets.list` |
| Training | `trainingAssignments` table | TRPC query: `training.getCompletion` |
| Access Control | `clientControls` table | TRPC query: `controls.byFramework` |
| Policies | `policies` table | TRPC query: `policies.list` |

---

## 3. Implementation Architecture

### 3.1 New TRPC Router Structure

Create a new dashboard-specific router to aggregate NIS2 metrics:

```typescript
// packages/core/src/server/routers/dashboard/nis2.ts
export const nis2Router = router({
  getControlHealth: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Aggregate NIS2 control status from multiple sources
      const [risks, incidents, policies, ...] = await Promise.all([
        ctx.db.query.riskRegister.findMany({ ... }),
        ctx.db.query.cyberIncidents.findMany({ ... }),
        ctx.db.query.policies.findMany({ ... }),
      ]);
      
      return {
        riskManagement: calculateRiskMetrics(risks),
        incidentResponse: calculateIncidentMetrics(incidents),
        businessContinuity: await calculateBCPMetrics(input.clientId),
        // ... etc
      };
    }),
    
  getDomainSummary: publicProcedure
    .input(z.object({ clientId: z.number(), domains: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      // Returns summary metrics for requested domains
    }),
    
  getRealtimeAlerts: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Returns real-time alerts requiring attention
    })
});
```

### 3.2 Dashboard Component Structure

```typescript
// packages/core/src/components/dashboard/NIS2ControlHealth.tsx
export function NIS2ControlHealth({ clientId }: { clientId: number }) {
  const { data, isLoading } = trpc.dashboard.nis2.getControlHealth.useQuery({ clientId });
  
  if (isLoading) return <NIS2ControlHealthSkeleton />;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {data?.controls.map(control => (
        <NIS2ControlCard 
          key={control.id}
          measure={control}
          status={control.status}
          lastUpdated={control.lastUpdated}
        />
      ))}
    </div>
  );
}

// packages/core/src/components/dashboard/SecurityDomainGrid.tsx
export function SecurityDomainGrid({ clientId }: { clientId: number }) {
  const { data: domains } = trpc.dashboard.nis2.getDomainSummary.useQuery({ 
    clientId,
    domains: ['risk', 'incident', 'bcp', 'supplyChain', 'asset', 'training', 'access', 'policy']
  });
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {domains?.map(domain => (
        <SecurityDomainCard
          key={domain.name}
          title={domain.title}
          icon={domain.icon}
          status={domain.status}
          metrics={domain.metrics}
          trend={domain.trend}
          alertCount={domain.alertCount}
        />
      ))}
    </div>
  );
}
```

---

## 4. NIS2-Specific Features

### 4.1 Article 21 Compliance Heatmap

Visual representation of all NIS2 measures with color-coded status:

```
┌────────────────────────────────────────────────────────────────────┐
│  NIS2 ARTICLE 21 COMPLIANCE HEATMAP                                │
├────────────────────────────────────────────────────────────────────┤
│  21(2)(a) Policies      ████████████░░░░░░░  65%  ░░░░░░░░░░░░░░ │
│  21(2)(b) Risk Mgmt     ██████████████░░░░░░  78%  ░░░░░░░░░░░░░░ │
│  21(2)(c) Incidents     ████████████████████ 100%  ░░░░░░░░░░░░░░ │
│  21(2)(d) BCP/DR        ████████░░░░░░░░░░░░  45%  ░░░░░░░░░░░░░░ │
│  21(2)(e) Supply Chain  █████████░░░░░░░░░░░  52%  ░░░░░░░░░░░░░░ │
│  21(2)(f) Development   ████████████░░░░░░░░░  68%  ░░░░░░░░░░░░░░ │
│  21(2)(g) Assessment    ████████░░░░░░░░░░░░░  42%  ░░░░░░░░░░░░░░ │
│  21(2)(h) Training      ██████████████░░░░░░  75%  ░░░░░░░░░░░░░░ │
│  21(2)(i) Crypto        ██████████████████░░  95%  ░░░░░░░░░░░░░░ │
│  21(2)(j) HR Security   ████████████████░░░░  85%  ░░░░░░░░░░░░░░ │
│  21(2)(k) Access Ctrl   ████████████░░░░░░░░  62%  ░░░░░░░░░░░░░░ │
│  21(2)(l) Assets        ██████████████████░░  92%  ░░░░░░░░░░░░░░ │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 NIS2 Incident Clock

Real-time countdown for mandatory reporting windows:

- **24-hour Early Warning** - For significant incidents
- **72-hour Incident Notification** - Initial report to competent authority
- **1-month Final Report** - Detailed incident report

### 4.3 Entity Classification Status

Display current NIS2 entity status:
- Essential Entity / Important Entity / Not Applicable
- Sector classification
- Competent authority registration status

---

## 5. Real-Time Data Integration

### 5.1 WebSocket Subscriptions

For live updates without page refresh:

```typescript
// Real-time subscription example
const { data: liveIncidents } = trpc.incidents.onUpdate.useSubscription(
  { clientId },
  {
    onData(incident) {
      // Update incident widget in real-time
      toast.info(`New incident: ${incident.title}`);
    }
  }
);
```

### 5.2 Polling Strategy

For less critical updates, use intelligent polling:

- **Critical metrics (incidents, risks)**: 30-second polling
- **Standard metrics (controls, policies)**: 5-minute polling
- **Historical data**: On-demand loading

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create `dashboard/nis2` TRPC router
- [ ] Implement `getControlHealth` query
- [ ] Build NIS2ControlCard component
- [ ] Add widget to main dashboard

### Phase 2: Security Domains (Week 3-4)
- [ ] Implement SecurityDomainGrid component
- [ ] Add all 8 security domain cards
- [ ] Integrate with existing data sources
- [ ] Add filtering and sorting

### Phase 3: Advanced Features (Week 5-6)
- [ ] Article 21 compliance heatmap
- [ ] NIS2 incident clock
- [ ] Real-time WebSocket integration
- [ ] Alert notifications

### Phase 4: Polish (Week 7-8)
- [ ] Responsive design optimization
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Documentation

---

## 7. Data Sources Summary

| Domain | Table/Source | Key Metrics |
|--------|--------------|-------------|
| Risk Management | `riskRegister` | Total risks, high/critical count, treatment status |
| Incident Response | `cyberIncidents` | Open incidents, significant incidents, response times |
| Business Continuity | `businessContinuity` | Plans created, tests passed, recovery times |
| Supply Chain | `vendors` | Vendor count, assessments overdue, risk scores |
| Asset Management | `assets` | Asset count, coverage %, critical assets |
| Training | `trainingAssignments` | Completion rate, overdue trainings, quiz scores |
| Access Control | `clientControls` | MFA %, privileged accounts, access reviews |
| Policies | `policies` | Total policies, approval status, review dates |
| Cryptography | `encryptionKeys` | Key rotation status, algorithms used |
| HR Security | `employees` | Background checks, terminations processed |

---

## 8. Code Locations Reference

### Key Files to Modify
1. [`packages/core/src/pages/Dashboard.tsx`](packages/core/src/pages/Dashboard.tsx) - Main dashboard
2. Create: [`packages/core/src/server/routers/dashboard/nis2.ts`](packages/core/src/server/routers/dashboard/nis2.ts) - New router
3. Create: [`packages/core/src/components/dashboard/NIS2ControlHealth.tsx`](packages/core/src/components/dashboard/NIS2ControlHealth.tsx) - Widget
4. Create: [`packages/core/src/components/dashboard/SecurityDomainGrid.tsx`](packages/core/src/components/dashboard/SecurityDomainGrid.tsx) - Grid
5. Create: [`packages/core/src/components/dashboard/NIS2ComplianceHeatmap.tsx`](packages/core/src/components/dashboard/NIS2ComplianceHeatmap.tsx) - Heatmap

### Existing Files to Reference
- [`packages/core/src/pages/cyber/CyberAssessment.tsx`](packages/core/src/pages/cyber/CyberAssessment.tsx) - NIS2 checklist (line 24-158)
- [`seed_nis2_mappings.ts`](seed_nis2_mappings.ts) - NIS2 control mappings
- [`packages/core/src/pages/risk/RiskDashboard.tsx`](packages/core/src/pages/risk/RiskDashboard.tsx) - Risk data source
- [`packages/core/src/pages/business-continuity/BusinessContinuityDashboard.tsx`](packages/core/src/pages/business-continuity/BusinessContinuityDashboard.tsx) - BCP data

---

## 9. Next Steps

1. **Approve this plan** - Review and confirm the architecture
2. **Start Phase 1** - Create the TRPC router and basic widget
3. **Iterate** - Refine based on feedback and testing

---

*Document Version: 1.0*
*Created: 2026-03-11*
*Author: ComplianceOS Architecture Team*
