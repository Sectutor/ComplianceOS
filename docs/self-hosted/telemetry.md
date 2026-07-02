# Telemetry & Outbound Communication Control

## Objective
Provide a clear, auditable mechanism for controlling which outbound network calls ComplianceOS makes. This is critical for data-sensitive buyers and for the self-hosted packaging.

## Philosophy
- **License enforcement is mandatory** — license validation, activation, and renewal calls to `license.complianceos.com` are ALWAYS allowed, regardless of `NO_TELEMETRY`.
- **Everything else is opt-in** — AI drafting, threat intelligence, analytics, and update checks are gated behind explicit environment flags.

---

## Environment Variables

| Variable | Values | Effect |
|----------|--------|--------|
| `NO_TELEMETRY` | `true` / `false` (default) | When `true`, blocks all non-essential outbound calls. License enforcement still works. |
| `ENABLE_AI` | `true` / `false` (default) | When `true`, enables AI drafting, risk triage, and evidence analysis endpoints (requires LLM API keys). Ignored if `NO_TELEMETRY=true`. |
| `ENABLE_THREAT_SCHEDULER` | `true` / `false` (default) | When `true`, fetches external threat intel feeds. Ignored if `NO_TELEMETRY=true`. |
| `ENABLE_ANALYTICS` | `true` / `false` (default) | When `true`, allows non-personal usage analytics. Ignored if `NO_TELEMETRY=true`. |

## Mandatory (Always On)

These outbound calls are required for license enforcement and revenue protection:

1. **License activation** — `POST license.complianceos.com/api/v1/licenses/activate`
2. **License validation** — `POST license.complianceos.com/api/v1/licenses/validate`
3. **License renewal** — `POST license.complianceos.com/api/v1/licenses/renew` (or scheduler check)
4. **Gumroad webhooks** — Inbound from Gumroad (not outbound, but listed for clarity)

## Optional (Gated)

| Feature | Gate | Protected Code Path |
|---------|------|---------------------|
| AI policy drafting | `ENABLE_AI=true` | `packages/core/src/server/routers/ai.ts` |
| AI risk triage | `ENABLE_AI=true` | `packages/core/src/server/routers/ai.ts` |
| AI evidence analysis | `ENABLE_AI=true` | `packages/core/src/server/routers/ai.ts` |
| Threat intelligence (CVE/EPSS/KRI) | `ENABLE_THREAT_SCHEDULER=true` | `packages/core/src/server/services/threatScheduler.ts` |
| Usage analytics (anonymous) | `ENABLE_ANALYTICS=true` | (future) |
| Version update checks | `ENABLE_ANALYTICS=true` | (future) |

---

## Example: Fully Air-Gapped Deployment

```bash
NO_TELEMETRY=true
VITE_ENABLE_PREMIUM=false
```

License enforcement still works: your instance can validate against `license.complianceos.com` via firewall rules. If the license server is unreachable, the local grace cache applies for 7 days.

## Example: Enterprise with AI Enabled

```bash
NO_TELEMETRY=false
VITE_ENABLE_PREMIUM=true
ENABLE_AI=true
ENABLE_THREAT_SCHEDULER=false
```

## Verification

On startup, the server logs the telemetry status:

```
[Telemetry] === Outbound Communication Status ===
[Telemetry]   ✓ ALLOWED  license_validation
[Telemetry]   ✓ ALLOWED  license_activation
[Telemetry]   ✓ ALLOWED  license_renewal
[Telemetry]   ✗ BLOCKED  ai_drafting
[Telemetry]   ✗ BLOCKED  ai_risk_triage
[Telemetry]   ✗ BLOCKED  ai_evidence_analysis
[Telemetry]   ✗ BLOCKED  threat_intel
[Telemetry]   ✗ BLOCKED  analytics
[Telemetry]   ✗ BLOCKED  update_check
[Telemetry]   ✗ BLOCKED  email_outbound
[Telemetry]   ✓ ALLOWED  integration_webhook
[Telemetry] ======================================
```

## Source Code

The telemetry control module lives at:

```
packages/core/src/lib/telemetry.ts
```

Key API:
- `isTelemetryAllowed(feature: TelemetryFeature): boolean` — check before any non-essential outbound call
- `getTelemetryStatus(): Record<TelemetryFeature, boolean>` — dump all feature states
- `logTelemetryStatus(): void` — log to console at startup
