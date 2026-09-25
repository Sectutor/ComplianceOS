/**
 * AI Features Schema — Privacy Controls, Feature Toggles, and Audit Log
 *
 * Manages:
 * 1. Per-client AI feature toggles (which AI features are enabled)
 * 2. Privacy settings (data scope, master kill switch, dry-run mode)
 * 3. External AI call audit log (what data left the instance, when, why)
 * 4. JevAI provider configuration
 */

import {
  pgTable, integer, varchar, text, timestamp, boolean, json, jsonb, serial, index, uniqueIndex, doublePrecision, primaryKey, customType
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI FEATURE TOGGLES — per-client, per-feature on/off switches
// ─────────────────────────────────────────────────────────────────────────────

export const AI_FEATURES = [
  "evidence_classifier",
  "gap_prioritizer",
  "vendor_risk_scorer",
  "incident_triage",
  "dsar_classifier",
  "policy_extractor",
  "control_mapper",
  "audit_readiness",
  "remediation_orchestrator",
  "regulation_monitor",
  "confidence_escalation",
  "compliance_query",
] as const;

export type AIFeatureId = typeof AI_FEATURES[number];

export const aiFeatureToggles = pgTable("ai_feature_toggles", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  featureId: varchar("feature_id", { length: 50 }).notNull() as any, // AIFeatureId

  isEnabled: boolean("is_enabled").default(false),

  /** Data scope: 'full' | 'anonymized' | 'metadata_only' */
  dataScope: varchar("data_scope", { length: 20 }).default("anonymized"),

  /** Minimum confidence threshold (0-100) below which human review is required */
  confidenceThreshold: integer("confidence_threshold").default(70),

  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientFeatureIdx: uniqueIndex("idx_ai_feature_client_feature").on(table.clientId, table.featureId),
    clientIdx: index("idx_ai_feature_client").on(table.clientId),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRIVACY SETTINGS — master switches and global AI policy
// ─────────────────────────────────────────────────────────────────────────────

export const aiPrivacySettings = pgTable("ai_privacy_settings", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull().unique(),

  /** Master kill switch — when FALSE, NO external AI calls are made */
  externalAiEnabled: boolean("external_ai_enabled").default(false),

  /** Dry-run mode — log what WOULD be sent without actually sending */
  dryRunMode: boolean("dry_run_mode").default(true),

  /** Default data scope for all features unless overridden per-feature */
  defaultDataScope: varchar("default_data_scope", { length: 20 }).default("anonymized"),

  /** Allow JevAI specifically (separate from generic external AI) */
  jevaiEnabled: boolean("jevai_enabled").default(false),

  /** Allow generic cloud LLM providers (OpenAI, Anthropic, etc.) */
  cloudLlmEnabled: boolean("cloud_llm_enabled").default(false),

  /** Allow local-only providers (Ollama, LMStudio) — always safe */
  localLlmEnabled: boolean("local_llm_enabled").default(true),

  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_ai_privacy_client").on(table.clientId),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXTERNAL AI AUDIT LOG — immutable record of every external AI call
// ─────────────────────────────────────────────────────────────────────────────

export const aiAuditLog = pgTable("ai_audit_log", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  userId: integer("user_id"),

  /** Which feature triggered this call */
  featureId: varchar("feature_id", { length: 50 }).notNull(),

  /** Provider used: 'jevai', 'openai', 'anthropic', etc. */
  provider: varchar("provider", { length: 50 }).notNull(),

  /** What data scope was applied: 'full' | 'anonymized' | 'metadata_only' */
  dataScope: varchar("data_scope", { length: 20 }).notNull(),

  /** Whether this was a dry-run (no actual external call made) */
  wasDryRun: boolean("was_dry_run").default(false),

  /** Entity type that triggered the call */
  entityType: varchar("entity_type", { length: 50 }),

  entityId: integer("entity_id"),

  /** Summary of what was sent (not the full payload — a description) */
  payloadSummary: text("payload_summary"),

  /** Whether the call succeeded */
  success: boolean("success").default(true),

  errorMessage: text("error_message"),

  /** Confidence score returned by the AI (if applicable) */
  confidenceScore: integer("confidence_score"),

  /** Latency in ms */
  latencyMs: integer("latency_ms"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_ai_audit_client").on(table.clientId),
    featureIdx: index("idx_ai_audit_feature").on(table.featureId),
    createdIdx: index("idx_ai_audit_created").on(table.createdAt),
    providerIdx: index("idx_ai_audit_provider").on(table.provider),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. JEVAI PROVIDER CONFIG — separate from generic LLM providers
// ─────────────────────────────────────────────────────────────────────────────

export const jevaiConfig = pgTable("jevai_config", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull().unique(),

  /** JevAI API key (encrypted) */
  apiKey: text("api_key").notNull(),

  /** JevAI base URL (defaults to https://api.typesafe.ai) */
  baseUrl: varchar("base_url", { length: 512 }).default("https://api.typesafe.ai"),

  /** Default model to use */
  model: varchar("model", { length: 100 }).default("jev-default"),

  /** Enabled modes: classifier, router, scorer, extractor */
  enabledModes: json("enabled_modes").$type<string[]>().default(["classifier", "router", "scorer", "extractor"]),

  /** Rate limit: max calls per minute */
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),

  isEnabled: boolean("is_enabled").default(false),

  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_jevai_config_client").on(table.clientId),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. REGULATION TRACKING — for the regulation monitor feature
// ─────────────────────────────────────────────────────────────────────────────

export const regulationWatch = pgTable("regulation_watch", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  regulationName: varchar("regulation_name", { length: 255 }).notNull(),

  regulationUrl: varchar("regulation_url", { length: 512 }),

  lastContentHash: varchar("last_content_hash", { length: 64 }),

  lastCheckedAt: timestamp("last_checked_at"),

  lastChangedAt: timestamp("last_changed_at"),

  /** Controls/policies affected by this regulation */
  affectedControls: json("affected_controls").$type<string[]>(),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientRegIdx: index("idx_reg_watch_client_reg").on(table.clientId, table.regulationName),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const aiFeatureTogglesRelations = relations(aiFeatureToggles, ({ one }) => ({
  privacySettings: one(aiPrivacySettings, {
    fields: [aiFeatureToggles.clientId],
    references: [aiPrivacySettings.clientId],
  }),
}));

export const aiPrivacySettingsRelations = relations(aiPrivacySettings, ({ many }) => ({
  featureToggles: many(aiFeatureToggles),
  auditLogs: many(aiAuditLog),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AIFeatureToggle = typeof aiFeatureToggles.$inferSelect;
export type InsertAIFeatureToggle = typeof aiFeatureToggles.$inferInsert;

export type AIPrivacySettings = typeof aiPrivacySettings.$inferSelect;
export type InsertAIPrivacySettings = typeof aiPrivacySettings.$inferInsert;

export type AIAuditLog = typeof aiAuditLog.$inferSelect;
export type InsertAIAuditLog = typeof aiAuditLog.$inferInsert;

export type JevaiConfig = typeof jevaiConfig.$inferSelect;
export type InsertJevaiConfig = typeof jevaiConfig.$inferInsert;

export type RegulationWatch = typeof regulationWatch.$inferSelect;
export type InsertRegulationWatch = typeof regulationWatch.$inferInsert;
