# AI Features Module — JevAI Integration

## Architecture Overview

```
                   ┌──────────────────────────────────────┐
                   │         ComplianceOS Frontend         │
                   │  (PrivacyPanel, FeatureToggles, etc.) │
                   └──────────────┬───────────────────────┘
                                  │ tRPC
                   ┌──────────────▼───────────────────────┐
                   │     ai-features.ts Router            │
                   │  (12 feature endpoints + settings)   │
                   └──────────────┬───────────────────────┘
                                  │
                   ┌──────────────▼───────────────────────┐
                   │      Privacy Gatekeeper              │
                   │  (master switch, per-feature, scope) │
                   └──────────────┬───────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
   ┌──────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
   │  JevAI Provider   │ │  OpenAI/Anthr  │ │  Local LLM     │
   │  (TypeSafe AI)    │ │  (Cloud LLM)   │ │  (Ollama)      │
   └───────────────────┘ └────────────────┘ └────────────────┘
```

## File Structure

```
lib/ai/
├── README.md                    ← You are here
├── privacy-gatekeeper.ts        ← THE chokepoint (all calls go through here)
├── jevai-provider.ts            ← JevAI API adapter
├── ai-autopilot.ts              ← Autopilot scheduler integration
├── features/
│   ├── index.ts                 ← Barrel export
│   ├── evidence-classifier.ts   ← Auto-classify evidence → controls
│   ├── gap-prioritizer.ts       ← Prioritize compliance gaps
│   ├── vendor-risk-scorer.ts    ← Auto-score vendor risk
│   ├── incident-triage.ts       ← Auto-classify incidents + deadlines
│   ├── dsar-classifier.ts       ← Classify DSAR requests
│   ├── policy-extractor.ts      ← Extract obligations from regulations
│   ├── control-mapper.ts        ← Map controls across frameworks
│   ├── audit-readiness.ts       ← Continuous audit readiness scoring
│   ├── remediation-orchestrator.ts ← Auto-generate remediation tasks
│   ├── regulation-monitor.ts    ← Detect regulation changes
│   ├── confidence-escalation.ts ← Smart human review routing
│   └── compliance-query.ts      ← Natural language queries
```

## Privacy Controls (Three Layers)

### Layer 1: Master Kill Switch
- **Setting**: `ai_privacy_settings.external_ai_enabled`
- **Default**: `false` (OFF)
- **Effect**: When off, NO external AI calls are made. All features use deterministic local processing.

### Layer 2: Per-Feature Toggles
- **Setting**: `ai_feature_toggles.is_enabled` per feature per client
- **Default**: `false` for all features
- **Effect**: Each of the 12 features can be independently enabled/disabled.

### Layer 3: Data Scope
- **Setting**: `ai_feature_toggles.data_scope` (or `ai_privacy_settings.default_data_scope`)
- **Options**:
  - `metadata_only` — Only data structure, no content. Safest.
  - `anonymized` — Content with PII removed (names, emails, domains, IPs).
  - `full` — Complete data including all content. Most powerful.

### Additional Controls
- **Dry-run mode**: Log what WOULD be sent without actually sending. Default: `true`.
- **Per-provider toggles**: JevAI, Cloud LLM, Local LLM can each be independently controlled.
- **Confidence threshold**: Per-feature minimum confidence for auto-execution.

## The 12 Features

| # | Feature | Mode | What It Does |
|---|---------|------|-------------|
| 1 | Evidence Classifier | classifier | Auto-maps uploaded evidence to controls + frameworks |
| 2 | Gap Prioritizer | router + scorer | Prioritizes gaps by audit proximity × risk × effort |
| 3 | Vendor Risk Scorer | classifier + scorer | Scores vendor security posture from documents |
| 4 | Incident Triage | classifier + router | Classifies incidents + calculates regulatory deadlines |
| 5 | DSAR Classifier | classifier + router | Classifies DSAR type + maps to processing activities |
| 6 | Policy Extractor | extractor | Extracts obligations from regulation text |
| 7 | Control Mapper | router | Maps equivalent controls across frameworks |
| 8 | Audit Readiness | scorer | Continuous readiness score + days-until-audit prediction |
| 9 | Remediation Orchestrator | router | Auto-generates prioritized remediation tasks |
| 10 | Regulation Monitor | extractor | Detects regulation changes + assesses impact |
| 11 | Confidence Escalation | wrapper | Smart human review routing (auto/suggest/review) |
| 12 | Compliance Query | router + extractor | Natural language queries over compliance data |

## Audit Logging

Every attempt to call an external AI provider is logged to `ai_audit_log`:
- Timestamp
- Feature that triggered the call
- Provider used
- Data scope applied
- Whether it was a dry-run
- Success/failure status
- Confidence score (if applicable)
- Latency

This log is immutable and visible to admins via the Audit Log Viewer UI.

## Database Tables

| Table | Purpose |
|-------|---------|
| `ai_feature_toggles` | Per-client, per-feature on/off switches |
| `ai_privacy_settings` | Master privacy switches per client |
| `ai_audit_log` | Immutable record of every external AI call |
| `jevai_config` | JevAI API key and settings per client |
| `regulation_watch` | Regulations to monitor for changes |

## Running the Migration

```bash
# Apply the migration
psql $DATABASE_URL -f packages/core/src/db/migrations/ai-features-migration.sql
```

## Enabling for a Client

1. Go to **Settings → AI & LLM → Privacy & Features**
2. Enable **External AI** master switch
3. Enable **Dry-run mode** (recommended for first run)
4. Set **Data Scope** (recommended: `anonymized`)
5. Enable desired **providers** (JevAI, Cloud LLM)
6. Enable individual **feature toggles**
7. Check the **Audit Log** to verify dry-run behavior
8. When ready, disable **Dry-run mode** to enable live calls

## Integration Points

### Autopilot Scheduler
```typescript
import { runAiAutopilot } from "./lib/ai/ai-autopilot";
// Called by the hourly cron
await runAiAutopilot(clientId);
```

### Event Triggers
```typescript
import { onIncidentCreated, onDSARReceived, onFrameworkAdded } from "./lib/ai/ai-autopilot";

// In your incident creation handler:
await onIncidentCreated(clientId, incidentId);

// In your DSAR receipt handler:
await onDSARReceived(clientId, requestId);

// In your framework addition handler:
await onFrameworkAdded(clientId, "PCI DSS", ["SOC 2", "ISO 27001"]);
```

### tRPC Client
```typescript
// Classify evidence
const result = await trpc.aiFeatures.classifyEvidence.mutate({
  clientId: 1,
  evidenceId: 42,
});

// Ask a compliance question
const answer = await trpc.aiFeatures.queryCompliance.mutate({
  clientId: 1,
  query: "Which SOC 2 controls are missing evidence?",
});
```
