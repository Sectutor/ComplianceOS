/**
 * Privacy Gatekeeper — The single chokepoint for ALL external AI calls.
 *
 * Nothing reaches an external provider (JevAI, OpenAI, Anthropic) without
 * passing through here. Enforces:
 *   1. Master kill switch (externalAiEnabled)
 *   2. Per-feature toggles
 *   3. Data scope (full / anonymized / metadata_only)
 *   4. Dry-run mode (log but don't send)
 *   5. Audit logging (immutable record of every attempt)
 */

import { getDb } from "../../db";
import { aiFeatureToggles, aiPrivacySettings, aiAuditLog, jevaiConfig } from "../../schema/ai-features";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../crypto";
import type { AIFeatureId } from "../../schema/ai-features";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DataScope = "full" | "anonymized" | "metadata_only";

export interface GatekeeperCheck {
  allowed: boolean;
  reason: string;
  dataScope: DataScope;
  isDryRun: boolean;
  jevaiConfig?: {
    apiKey: string;
    baseUrl: string;
    model: string;
    enabledModes: string[];
  };
}

export interface AuditEntry {
  clientId: number;
  userId?: number;
  featureId: AIFeatureId | string;
  provider: string;
  dataScope: DataScope;
  wasDryRun: boolean;
  entityType?: string;
  entityId?: number;
  payloadSummary?: string;
  success: boolean;
  errorMessage?: string;
  confidenceScore?: number;
  latencyMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache for privacy settings (TTL: 60s)
// ─────────────────────────────────────────────────────────────────────────────

const settingsCache = new Map<number, { settings: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Main check function — call this before ANY external AI operation
// ─────────────────────────────────────────────────────────────────────────────

export async function checkExternalAiPermission(
  clientId: number,
  featureId: AIFeatureId | string,
  userId?: number
): Promise<GatekeeperCheck> {
  const db = await getDb();
  if (!db) {
    return { allowed: false, reason: "Database unavailable", dataScope: "metadata_only", isDryRun: true };
  }

  try {
    // 1. Load privacy settings (cached)
    const privacy = await loadPrivacySettings(clientId, db);
    if (!privacy) {
      return { allowed: false, reason: "No privacy settings configured", dataScope: "metadata_only", isDryRun: true };
    }

    // 2. Master kill switch
    if (!privacy.externalAiEnabled) {
      return { allowed: false, reason: "External AI is disabled (master switch off)", dataScope: "metadata_only", isDryRun: true };
    }

    // 3. Dry-run mode
    if (privacy.dryRunMode) {
      return { allowed: true, reason: "Dry-run mode — will log but not send", dataScope: privacy.defaultDataScope as DataScope, isDryRun: true };
    }

    // 4. Per-feature toggle
    const toggle = await db.select().from(aiFeatureToggles)
      .where(and(
        eq(aiFeatureToggles.clientId, clientId),
        eq(aiFeatureToggles.featureId, featureId as any)
      ))
      .limit(1);

    if (toggle.length === 0 || !toggle[0].isEnabled) {
      return { allowed: false, reason: `Feature "${featureId}" is not enabled for this client`, dataScope: privacy.defaultDataScope as DataScope, isDryRun: true };
    }

    // 5. Load JevAI config if JevAI is the provider
    const jvConfig = await db.select().from(jevaiConfig)
      .where(eq(jevaiConfig.clientId, clientId))
      .limit(1);

    let parsedJevaiConfig: GatekeeperCheck["jevaiConfig"] | undefined;
    if (jvConfig.length > 0 && jvConfig[0].isEnabled) {
      parsedJevaiConfig = {
        apiKey: decrypt(jvConfig[0].apiKey),
        baseUrl: jvConfig[0].baseUrl || "https://api.typesafe.ai",
        model: jvConfig[0].model || "jev-default",
        enabledModes: jvConfig[0].enabledModes || [],
      };
    }

    return {
      allowed: true,
      reason: "Permission granted",
      dataScope: (toggle[0].dataScope as DataScope) || (privacy.defaultDataScope as DataScope),
      isDryRun: false,
      jevaiConfig: parsedJevaiConfig,
    };

  } catch (err: any) {
    console.error("[PrivacyGatekeeper] Error:", err.message);
    return { allowed: false, reason: `Gatekeeper error: ${err.message}`, dataScope: "metadata_only", isDryRun: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Data sanitization — apply the data scope before sending
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeForExternal(data: any, scope: DataScope): any {
  switch (scope) {
    case "metadata_only":
      return extractMetadata(data);
    case "anonymized":
      return anonymizeData(data);
    case "full":
      return data;
    default:
      return extractMetadata(data);
  }
}

function extractMetadata(data: any): any {
  if (typeof data !== "object" || data === null) return {};

  // Only return structural metadata — no content, no names, no values
  const metadata: any = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (typeof val === "object" && val !== null) {
      metadata[key] = { type: "object", keys: Object.keys(val) };
    } else if (typeof val === "string") {
      metadata[key] = { type: "string", length: val.length };
    } else if (typeof val === "number") {
      metadata[key] = { type: "number" };
    } else if (typeof val === "boolean") {
      metadata[key] = { type: "boolean" };
    } else if (Array.isArray(val)) {
      metadata[key] = { type: "array", length: val.length };
    }
  }
  return metadata;
}

function anonymizeData(data: any): any {
  if (typeof data !== "string") {
    if (Array.isArray(data)) return data.map(anonymizeData);
    if (typeof data === "object" && data !== null) {
      const result: any = {};
      for (const [key, val] of Object.entries(data)) {
        // Anonymize known PII fields
        if (/name|email|domain|ip|address|phone|contact|company|client|user/i.test(key)) {
          result[key] = `[ANON:${typeof val}]`;
        } else {
          result[key] = anonymizeData(val);
        }
      }
      return result;
    }
    return data;
  }

  // String anonymization: replace emails, domains, IPs
  return data
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP]")
    .replace(/https?:\/\/[^\s]+/g, "[URL]");
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit logging — record every external AI attempt
// ─────────────────────────────────────────────────────────────────────────────

export async function logExternalAiCall(entry: AuditEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(aiAuditLog).values({
      clientId: entry.clientId,
      userId: entry.userId,
      featureId: entry.featureId,
      provider: entry.provider,
      dataScope: entry.dataScope,
      wasDryRun: entry.wasDryRun,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payloadSummary: entry.payloadSummary,
      success: entry.success,
      errorMessage: entry.errorMessage,
      confidenceScore: entry.confidenceScore,
      latencyMs: entry.latencyMs,
    });
  } catch (err: any) {
    console.error("[PrivacyAudit] Failed to log:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined helper: check + sanitize + log in one call
// ─────────────────────────────────────────────────────────────────────────────

export interface ExternalAiCallOptions {
  clientId: number;
  featureId: AIFeatureId | string;
  userId?: number;
  entityType?: string;
  entityId?: number;
  data: any;
  provider?: string;
}

export interface ExternalAiCallResult<T> {
  sent: boolean;
  dryRun: boolean;
  dataScope: DataScope;
  sanitizedData: any;
  response?: T;
  error?: string;
  confidenceScore?: number;
  latencyMs?: number;
}

export async function withExternalAi<T>(
  options: ExternalAiCallOptions,
  sendFn: (sanitizedData: any, config: GatekeeperCheck["jevaiConfig"]) => Promise<T>
): Promise<ExternalAiCallResult<T>> {
  const startTime = Date.now();

  // 1. Check permission
  const check = await checkExternalAiPermission(options.clientId, options.featureId, options.userId);

  // 2. Sanitize data
  const sanitized = check.allowed || check.isDryRun
    ? sanitizeForExternal(options.data, check.dataScope)
    : null;

  // 3. If not allowed, log and return
  if (!check.allowed) {
    await logExternalAiCall({
      clientId: options.clientId,
      userId: options.userId,
      featureId: options.featureId,
      provider: options.provider || "jevai",
      dataScope: check.dataScope,
      wasDryRun: true,
      entityType: options.entityType,
      entityId: options.entityId,
      payloadSummary: sanitized ? JSON.stringify(sanitized).slice(0, 500) : undefined,
      success: false,
      errorMessage: check.reason,
      latencyMs: Date.now() - startTime,
    });
    return { sent: false, dryRun: true, dataScope: check.dataScope, sanitizedData: sanitized!, error: check.reason };
  }

  // 4. Dry run — log but don't send
  if (check.isDryRun) {
    await logExternalAiCall({
      clientId: options.clientId,
      userId: options.userId,
      featureId: options.featureId,
      provider: options.provider || "jevai",
      dataScope: check.dataScope,
      wasDryRun: true,
      entityType: options.entityType,
      entityId: options.entityId,
      payloadSummary: JSON.stringify(sanitized).slice(0, 500),
      success: true,
      latencyMs: Date.now() - startTime,
    });
    return { sent: false, dryRun: true, dataScope: check.dataScope, sanitizedData: sanitized! };
  }

  // 5. Actually send
  try {
    const response = await sendFn(sanitized, check.jevaiConfig);
    const latency = Date.now() - startTime;

    // Extract confidence if response has it
    const confidence = (response as any)?.confidence ?? (response as any)?.confidenceScore;

    await logExternalAiCall({
      clientId: options.clientId,
      userId: options.userId,
      featureId: options.featureId,
      provider: options.provider || "jevai",
      dataScope: check.dataScope,
      wasDryRun: false,
      entityType: options.entityType,
      entityId: options.entityId,
      payloadSummary: JSON.stringify(sanitized).slice(0, 500),
      success: true,
      confidenceScore: confidence,
      latencyMs: latency,
    });

    return { sent: true, dryRun: false, dataScope: check.dataScope, sanitizedData: sanitized!, response, confidenceScore: confidence, latencyMs: latency };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    await logExternalAiCall({
      clientId: options.clientId,
      userId: options.userId,
      featureId: options.featureId,
      provider: options.provider || "jevai",
      dataScope: check.dataScope,
      wasDryRun: false,
      entityType: options.entityType,
      entityId: options.entityId,
      payloadSummary: JSON.stringify(sanitized).slice(0, 500),
      success: false,
      errorMessage: err.message,
      latencyMs: latency,
    });
    return { sent: true, dryRun: false, dataScope: check.dataScope, sanitizedData: sanitized!, error: err.message, latencyMs: latency };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loadPrivacySettings(clientId: number, db: any): Promise<any> {
  const cached = settingsCache.get(clientId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.settings;
  }

  const rows = await db.select().from(aiPrivacySettings).where(eq(aiPrivacySettings.clientId, clientId)).limit(1);
  const settings = rows.length > 0 ? rows[0] : null;
  settingsCache.set(clientId, { settings, timestamp: Date.now() });
  return settings;
}

export function invalidatePrivacyCache(clientId: number): void {
  settingsCache.delete(clientId);
}

export function clearAllPrivacyCaches(): void {
  settingsCache.clear();
}
