# Addon Architecture & Integration

**Date:** 2026-06-23  
**Status:** Reference Document  
**Scope:** How the addon system and core app interact

---

## Overview

ComplianceOS uses a modular addon architecture where the **core** provides the foundation (database, UI framework, LLM abstraction, auth, billing) and **addons** extend it with specific compliance analysis capabilities. This document explains how addons wire into the core at every layer.

---

## 1. LLM Bridge

Addons live in `packages/addons/` — a separate package from core to enforce clear boundaries. Addons **never import core modules directly**. Instead, the core injects dependencies at startup.

### The LLM Bridge Pattern

The `Llmbridge` singleton at `packages/addons/src/shared/llm-bridge.ts` provides a unified interface for AI addons to call LLMs:

```typescript
// packages/addons/src/shared/llm-bridge.ts
export interface LlmBridgeInterface {
  initialize(service: { complete: (req: any) => Promise<any> }): void;
  isAvailable(): boolean;
  generateText(prompt: string, options?: {
    systemPrompt?: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): Promise<string | null>;
  generateJson<T>(prompt: string, options?: {
    systemPrompt?: string;
    provider?: string;
  }): Promise<T | null>;
}
```

### How Core Injects the LLM Service

At application startup, the core app injects its `LLMService` singleton into the bridge:

```typescript
// In core's main server entry point
import { llmBridge } from '@complianceos/addons/shared/llm-bridge';
import { LLMService } from './lib/llm/service';

const llmService = new LLMService(/* config */);
llmBridge.initialize(llmService);
```

### How Addons Use the Bridge

Addons import the bridge at runtime (lazy import to avoid circular dependency issues):

```typescript
const { llmBridge } = await import('../shared/llm-bridge');
const summary = await llmBridge.generateText(prompt, {
  systemPrompt: 'You are a compliance evidence gap analyst...',
  provider: 'deepseek', // or 'qwen', 'openai'
});
```

If the core hasn't initialized the bridge, `generateText()` returns `null` and the addon degrades gracefully — it performs its task without AI summaries.

---

## 2. Database Access

Addons need read/write access to core database tables without importing core's `getDb()` directly.

### The DbAdapter Pattern

The `AddonExecutor` holds a `db` property that core injects at registration time. Addons access it through the executor reference passed to their handler:

```typescript
// In addon handler:
executor.register('evidence-gap-detector', async (config: AddonRunConfig) => {
  const db = (executor as any).db; // Injected by core
  if (!db) throw new Error('No database adapter available');

  // Use db.query() / db.insert() / db.update() / db.delete()
  const controls = await db.query.controls.findMany({
    where: (controls, { eq }) => eq(controls.clientId, config.clientId),
  });
});
```

### What the DbAdapter Provides

| Method | Description |
|--------|-------------|
| `query` | Drizzle query builder (read operations) |
| `insert` | Drizzle insert builder |
| `update` | Drizzle update builder |
| `delete` | Drizzle delete builder |
| `transaction` | Wraps operations in a Drizzle transaction |

The adapter respects core's schema — addons cannot access tables they don't have explicit permissions for.

---

## 3. Evidence Pushing

Addons generate findings (risks, evidence artifacts) that need to be written to core's database tables.

### The FindingsPusher Pattern

Each addon receives a `FindingsPusher` instance at registration:

```typescript
// packages/addons/src/runtime/pusher.ts
export class FindingsPusher {
  pushEvidence(data: EvidenceInput): void;
  pushRisk(data: RiskInput): void;
  flush(): Promise<{ evidencePushed: number; risksCreated: number }>;
}
```

Addons call `pushEvidence()` / `pushRisk()` during execution, then call `flush()` to batch-write everything to the database:

```typescript
// In addon handler:
pusher.pushEvidence({
  clientId: config.clientId,
  title: 'Evidence Gap: CC1.1 - Missing',
  artifactType: 'evidence_request',
  artifactData: { /* ... */ },
  source: 'evidence-gap-detector',
});

pusher.pushRisk({
  clientId: config.clientId,
  title: 'Control CC1.1 lacks evidence',
  severity: 'high',
  /* ... */
});

const result = await pusher.flush();
console.log(`Pushed ${result.evidencePushed} evidence items`);
```

### What Gets Written

| Pusher Method | Core Table | Purpose |
|---------------|-----------|---------|
| `pushEvidence()` | `evidence` | Evidence artifacts (scan results, reports, requests) |
| `pushRisk()` | `risks` | Risk register entries derived from findings |

The pusher normalizes all data through the core's Drizzle schema, ensuring consistency.

---

## 4. Scheduling

Addons declare their execution schedule in their manifest. The core's `AddonExecutor` handles scheduling.

### Manifest Schedule Declaration

```typescript
// In registry.ts for each addon:
{
  id: 'cos-evidence-gap-detector',
  features: [
    'Scheduled gap analysis (daily/weekly/manual)',
    // ...
  ],
}
```

### How Scheduling Works

1. The core's **scheduler** (at `packages/addons/src/scheduler.ts`) runs on a 5-minute tick
2. Each tick, it checks `addon_subscriptions` for active subscriptions with pending scheduled runs
3. When a run is due, it calls `executor.run(slug, config)`
4. The executor validates the subscription, calls the registered handler, and logs the result to `addon_run_logs`

### Schedule Options

| Schedule | Interval | Use Case |
|----------|----------|----------|
| `daily` | Every 24h | Evidence gap detection |
| `weekly` | Every 7 days | Cloud scanner, dependency scanner |
| `monthly` | Every 30 days | Full compliance audit |
| `manual` | On-demand only | Questionnaire responder |

---

## 5. Billing & Access Control

Addons are commercial features gated behind subscriptions.

### How Billing Works

1. **`addon_subscriptions` table** tracks which clients have subscribed to which addons:
   - `id`, `client_id`, `addon_slug`, `status` (active/trial/cancelled/expired)
   - `settings` (JSON blob of per-client configuration)
   - `trial_ends_at`, `current_period_ends_at`
   - `stripe_subscription_id` (if billed via Stripe)

2. **`checkAddonAccess` middleware** verifies subscription status before executing addon operations:
   ```typescript
   const checkAddonAccess = async (clientId: number, addonSlug: string) => {
     const sub = await db.query.addon_subscriptions.findFirst({
       where: and(
         eq(addon_subscriptions.clientId, clientId),
         eq(addon_subscriptions.addonSlug, addonSlug),
         eq(addon_subscriptions.status, 'active'),
       ),
     });
     return sub !== undefined;
   };
   ```

3. **Trial flow**: New subscriptions start with a `trial` status and configurable trial period (default: 14 days). Auto-converts to `active` if Stripe payment is set up, or `cancelled` at trial end.

### Addon Marketplace UI

The marketplace (rendered from `AddonManifest` definitions) shows:
- Addon name, description, price
- Trial badge (if applicable)
- "Subscribe" / "Manage" / "Settings" buttons
- Status indicator (active/trial/cancelled)

---

## 6. Adding a New Addon

### Step-by-Step Guide

```
packages/addons/src/{slug}/
  index.ts     -- Manifest re-export
  connector.ts -- Implementation (handler function)
```

#### 1. Create the addon directory

```
packages/addons/src/my-addon/
  index.ts
  connector.ts
```

#### 2. Write the connector

```typescript
// packages/addons/src/my-addon/connector.ts
import { AddonExecutor } from '../runtime/executor';
import { FindingsPusher } from '../runtime/pusher';
import type { AddonRunConfig, AddonRunResult } from '../shared/types';

export interface MyAddonSettings {
  // Define your addon's settings schema
}

export function registerMyAddon(executor: AddonExecutor, pusher: FindingsPusher): void {
  executor.register('my-addon', async (config: AddonRunConfig): Promise<AddonRunResult> => {
    const startTime = Date.now();
    const db = (executor as any).db;

    // 1. Retrieve settings
    const settings = config.settings as unknown as MyAddonSettings;

    // 2. Do the work (query DB, call LLM, etc.)
    // ...

    // 3. Push findings
    pusher.pushEvidence({ /* ... */ });
    const flushResult = await pusher.flush();

    // 4. Return result
    return {
      findings: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 },
      evidenceArtifacts: [],
      durationSeconds: Math.round((Date.now() - startTime) / 1000),
    };
  });
}
```

#### 3. Register in the manifest

```typescript
// packages/addons/src/my-addon/index.ts
export { registerMyAddon } from './connector';
```

#### 4. Register in the registry

```typescript
// packages/addons/src/registry.ts
{
  'my-addon': {
    id: 'cos-my-addon',
    slug: 'my-addon',
    name: 'My Addon',
    description: '...',
    category: 'ai', // 'scanner' | 'siem' | 'dependency' | 'ai'
    price: 5000, // $50/mo in cents
    trialDays: 14,
    icon: '🚀',
    replaces: 'Some commercial tool',
    replacesCost: '$200/mo',
    tools: [{ name: 'Tool', url: '...', description: '...' }],
    requiredInfrastructure: 'None',
    permissions: ['read:controls', 'write:evidence'],
    uiSlots: [
      { slot: 'addon:dashboard', position: 'main', priority: 50 },
      { slot: 'addon:settings', position: 'main', priority: 50 },
    ],
    version: '1.0.0',
    isCommunity: false,
    features: ['Feature 1', 'Feature 2'],
  },
}
```

#### 5. Wire in the executor

```typescript
// In core's server entry point:
import { registerMyAddon } from '@complianceos/addons/my-addon';

registerMyAddon(executor, pusher);
```

### UI Auto-Discovery

The UI automatically discovers addons from the registry:
1. The `AddonManifest` entry defines `uiSlots` (which dashboard widgets to render)
2. The core's addon marketplace page iterates `ADDON_REGISTRY` to show available addons
3. Client subscription status determines which addons show as "active" vs "available"

---

## 7. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     ComplianceOS Core                      │
│                                                           │
│  ┌────────────┐  ┌───────────┐  ┌──────────────────────┐ │
│  │ LLMService  │  │  Drizzle  │  │  Addon Executor       │ │
│  │ (lib/llm/)  │  │  ORM + DB │  │  • Registration       │ │
│  └──────┬─────┘  └─────┬─────┘  │  • Scheduling           │ │
│         │              │        │  • FindingsPusher       │ │
│         │              │        │  • Billing Check        │ │
│         │              │        └───────────┬──────────────┘ │
│         │              │                    │                │
│  ┌──────┴──────┐  ┌────┴──────┐  ┌─────────┴──────────┐   │
│  │ LlmBridge   │  │ DbAdapter │  │  Addon Handlers     │   │
│  │ (inject at  │  │ (inject   │  │  ┌───────────────┐ │   │
│  │  startup)   │  │  at reg)  │  │  │ evidence-gap  │ │   │
│  └─────────────┘  └───────────┘  │  │ -detector     │ │   │
│                                  │  ├───────────────┤ │   │
│                                  │  │ ai-           │ │   │
│                                  │  │ questionnaire │ │   │
│                                  │  ├───────────────┤ │   │
│                                  │  │ cloud-scanner │ │   │
│                                  │  ├───────────────┤ │   │
│                                  │  │ dep-scanner   │ │   │
│                                  │  └───────────────┘ │   │
│                                  └────────────────────┘   │
│                                                           │
│  Core Schema Tables:                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐           │
│  │controls  │evidence  │risks     │clients   │           │
│  ├──────────┼──────────┼──────────┼──────────┤           │
│  │evidence_ │compliance│question- │addon_    │           │
│  │gaps      │_score_   │naire_    │subscript-│           │
│  │          │snapshots │drafts    │ions      │           │
│  └──────────┴──────────┴──────────┴──────────┘           │
└──────────────────────────────────────────────────────────┘
```

### Integration Points Summary

| Layer | Core Provides | Addon Provides |
|-------|--------------|----------------|
| **LLM** | `LLMService` injected via `LlmBridge` | Calls `llmBridge.generateText()` |
| **Database** | `DbAdapter` (Drizzle) injected on executor | `db.query()` / `db.insert()` |
| **Evidence** | `FindingsPusher` | Calls `pushEvidence()` / `pushRisk()` + `flush()` |
| **Scheduling** | Cron tick at 5-min intervals | Declares schedule in manifest (daily/weekly/manual) |
| **Billing** | `checkAddonAccess` middleware, Stripe webhooks | Subscription status checked before execution |
| **UI** | Marketplace page, dashboard, settings pages | `uiSlots` declarations for widget placement |
| **Registry** | `ADDON_REGISTRY` in registry.ts | Manifest entry with slug, name, category, price, etc. |
