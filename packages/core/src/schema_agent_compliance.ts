import { pgTable, integer, varchar, text, timestamp, pgEnum, boolean, jsonb, serial, index, uniqueIndex } from "drizzle-orm/pg-core";

// ==========================================
// ENUMS (Phase 1 + Phase 2)
// ==========================================

export const agentTypeEnum = pgEnum("agent_type", ["hermes", "custom", "langchain", "autogen", "crewai", "other"]);
export const agentHostingEnum = pgEnum("agent_hosting", ["docker_local", "docker_remote", "on_prem", "vps", "cloud_aws", "cloud_azure", "cloud_gcp"]);
export const agentSandboxEnum = pgEnum("agent_sandbox", ["docker", "vm", "ssh", "none"]);
export const agentMemoryEnum = pgEnum("agent_memory", ["local_encrypted", "local_plaintext", "remote", "none"]);
export const agentApprovalModeEnum = pgEnum("agent_approval_mode", ["manual", "smart", "auto"]);
export const agentToolStatusEnum = pgEnum("agent_tool_status", ["active", "allowlisted", "disabled", "blocked"]);
export const policyCardStatusEnum = pgEnum("policy_card_status", ["draft", "active", "archived", "superseded"]);
export const policyRuleEffectEnum = pgEnum("policy_rule_effect", ["deny", "allow", "escalate"]);
export const policyRuleStatusEnum = pgEnum("policy_rule_status", ["active", "paused", "triggered"]);
export const mappingStatusEnum = pgEnum("mapping_status", ["mapped", "implemented", "verified", "failed", "waived"]);
export const redteamSeverityEnum = pgEnum("redteam_severity", ["informational", "low", "medium", "high", "critical"]);
export const scoreSourceEnum = pgEnum("score_source", ["auto_map", "evidence", "redteam", "manual", "scan"]); // Phase 2

// ==========================================
// AGENT PROFILES
// ==========================================

export const agentProfiles = pgTable("agent_profiles", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  type: agentTypeEnum("type").notNull(),
  hosting: agentHostingEnum("hosting").notNull(),
  sandbox: agentSandboxEnum("sandbox").notNull(),
  sandboxDetails: text("sandbox_details"),
  memoryType: agentMemoryEnum("memory_type").default("local_plaintext"),
  memoryEncryption: boolean("memory_encryption").default(false),
  credentialHandling: text("credential_handling"),
  approvalMode: agentApprovalModeEnum("approval_mode").default("manual"),
  networkIsolation: boolean("network_isolation").default(false),
  overallScore: integer("overall_score").default(0),
  owaspCoverage: integer("owasp_coverage").default(0),
  status: varchar("status", { length: 50 }).default("active"),
  owner: varchar("owner", { length: 255 }),
  vendorId: integer("vendor_id"),
  configPath: varchar("config_path", { length: 500 }),
  dockerComposePath: varchar("docker_compose_path", { length: 500 }),
  configHash: varchar("config_hash", { length: 100 }), // Phase 2: for drift detection
  deploymentNotes: text("deployment_notes"),
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_ap_client").on(table.clientId),
    typeIdx: index("idx_ap_type").on(table.type),
    statusIdx: index("idx_ap_status").on(table.status),
  };
});

// ==========================================
// AGENT TOOLS
// ==========================================

export const agentTools = pgTable("agent_tools", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  status: agentToolStatusEnum("status").default("active"),
  requiresApproval: boolean("requires_approval").default(false),
  allowlistOnly: boolean("allowlist_only").default(false),
  riskLevel: varchar("risk_level", { length: 50 }).default("medium"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_at_agent").on(table.agentId),
    categoryIdx: index("idx_at_category").on(table.category),
  };
});

// ==========================================
// AGENT POLICY CARDS
// ==========================================

export const agentPolicyCards = pgTable("agent_policy_cards", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  status: policyCardStatusEnum("status").default("draft"),
  aiActRiskLevel: varchar("ai_act_risk_level", { length: 50 }).default("limited"),
  intendedUses: jsonb("intended_uses").$type<string[]>().default([]),
  prohibitedUses: jsonb("prohibited_uses").$type<string[]>().default([]),
  geography: jsonb("geography").$type<string[]>().default([]),
  effectiveDate: timestamp("effective_date"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_apc_agent").on(table.agentId),
    clientIdx: index("idx_apc_client").on(table.clientId),
    statusIdx: index("idx_apc_status").on(table.status),
  };
});

export const agentPolicyRules = pgTable("agent_policy_rules", {
  id: serial("id").primaryKey(),
  policyCardId: integer("policy_card_id").notNull(),
  ruleId: varchar("rule_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  effect: policyRuleEffectEnum("effect").notNull(),
  status: policyRuleStatusEnum("status").default("active"),
  conditionField: varchar("condition_field", { length: 255 }).notNull(),
  conditionOperator: varchar("condition_operator", { length: 50 }).notNull(),
  conditionValue: text("condition_value"),
  actionType: varchar("action_type", { length: 100 }),
  actionMessage: text("action_message"),
  severity: varchar("severity", { length: 50 }).default("medium"),
  owaspCategory: varchar("owasp_category", { length: 100 }),
  nistCategory: varchar("nist_category", { length: 100 }),
  triggerCount: integer("trigger_count").default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    policyCardIdx: index("idx_apr_policy").on(table.policyCardId),
    ruleIdIdx: uniqueIndex("idx_apr_rule_id").on(table.policyCardId, table.ruleId),
  };
});

export const agentPolicyEscalations = pgTable("agent_policy_escalations", {
  id: serial("id").primaryKey(),
  policyCardId: integer("policy_card_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerCondition: varchar("trigger_condition", { length: 255 }).notNull(),
  triggerOperator: varchar("trigger_operator", { length: 50 }).notNull(),
  triggerValue: text("trigger_value"),
  action: varchar("action", { length: 100 }).notNull(),
  notifyEmails: jsonb("notify_emails").$type<string[]>().default([]),
  priority: varchar("priority", { length: 50 }).default("high"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return { policyCardIdx: index("idx_ape_policy").on(table.policyCardId) };
});

export const agentPolicyKpis = pgTable("agent_policy_kpis", {
  id: serial("id").primaryKey(),
  policyCardId: integer("policy_card_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  metric: varchar("metric", { length: 100 }).notNull(),
  targetValue: integer("target_value").notNull(),
  criticalThreshold: integer("critical_threshold"),
  warningThreshold: integer("warning_threshold"),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit", { length: 50 }).default("percent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return { policyCardIdx: index("idx_apk_policy").on(table.policyCardId) };
});

export const agentPolicyAssuranceMappings = pgTable("agent_policy_assurance_mappings", {
  id: serial("id").primaryKey(),
  policyCardId: integer("policy_card_id").notNull(),
  framework: varchar("framework", { length: 100 }).notNull(),
  section: varchar("section", { length: 255 }).notNull(),
  sectionTitle: varchar("section_title", { length: 500 }),
  isCompliant: boolean("is_compliant").default(false),
  evidence: text("evidence"),
  notes: text("notes"),
  mappedAt: timestamp("mapped_at").defaultNow(),
}, (table) => {
  return {
    policyCardIdx: index("idx_apam_policy").on(table.policyCardId),
    frameworkIdx: index("idx_apam_framework").on(table.framework),
  };
});

// ==========================================
// PHASE 6: PORTAL TOKEN REGISTRY (DB-backed)
// ==========================================

export const agentPortalTokens = pgTable("agent_portal_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
  accessCount: integer("access_count").default(0),
  createdBy: integer("created_by"),
}, (table) => {
  return {
    tokenIdx: index("idx_apt_token").on(table.token),
    agentIdx: index("idx_apt_agent").on(table.agentId),
  };
});

export const agentFrameworkMappings = pgTable("agent_framework_mappings", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  framework: varchar("framework", { length: 100 }).notNull(),
  controlId: varchar("control_id", { length: 100 }).notNull(),
  controlTitle: varchar("control_title", { length: 500 }),
  status: mappingStatusEnum("status").default("mapped"),
  implementation: text("implementation"),
  evidenceDescription: text("evidence_description"),
  evidenceId: integer("evidence_id"),
  autoMapped: boolean("auto_mapped").default(false),
  confidence: integer("confidence").default(100),
  mappedBy: varchar("mapped_by", { length: 100 }).default("system"),
  verifiedBy: varchar("verified_by", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  // Phase 2: evidence-backed scoring
  evidenceCount: integer("evidence_count").default(0),
  lastEvidenceAt: timestamp("last_evidence_at"),
  lastRedteamAt: timestamp("last_redteam_at"),
  redteamPassed: boolean("redteam_passed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_afm_agent").on(table.agentId),
    clientIdx: index("idx_afm_client").on(table.clientId),
    frameworkIdx: index("idx_afm_framework").on(table.framework),
    uniqueMapping: uniqueIndex("idx_afm_unique").on(table.agentId, table.framework, table.controlId),
  };
});

// ==========================================
// PHASE 2: EVIDENCE-CONTROL LINKAGE
// ==========================================

export const agentEvidenceControls = pgTable("agent_evidence_controls", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").notNull(),
  agentId: integer("agent_id").notNull(),
  framework: varchar("framework", { length: 100 }).notNull(),
  controlId: varchar("control_id", { length: 100 }).notNull(),
  // How this evidence contributes to the control
  contributionType: varchar("contribution_type", { length: 50 }).notNull(), // "proof", "config", "test_result", "documentation"
  weight: integer("weight").default(100), // 0-100, how much this evidence contributes
  linkedAt: timestamp("linked_at").defaultNow(),
}, (table) => {
  return {
    evidenceIdx: index("idx_aec_evidence").on(table.evidenceId),
    agentIdx: index("idx_aec_agent").on(table.agentId),
    fwCtrlIdx: index("idx_aec_fwctrl").on(table.framework, table.controlId),
    uniqueLink: uniqueIndex("idx_aec_unique").on(table.evidenceId, table.framework, table.controlId),
  };
});

// ==========================================
// PHASE 2: SCORE HISTORY (trend tracking)
// ==========================================

export const agentScoreHistory = pgTable("agent_score_history", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  overallScore: integer("overall_score").notNull(),
  owaspCoverage: integer("owasp_coverage").notNull(),
  // Per-framework scores stored as JSON for flexibility
  frameworkScores: jsonb("framework_scores").$type<Record<string, number>>().default({}),
  // What triggered this score snapshot
  triggerSource: scoreSourceEnum("trigger_source").notNull(),
  triggerDetail: varchar("trigger_detail", { length: 500 }), // e.g., "Evidence uploaded: config.yaml", "Red team test: prompt_injection"
  // Snapshot metadata
  evidenceCount: integer("evidence_count").default(0),
  redteamPassCount: integer("redteam_pass_count").default(0),
  redteamFailCount: integer("redteam_fail_count").default(0),
  gapCount: integer("gap_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_ash_agent").on(table.agentId),
    clientIdx: index("idx_ash_client").on(table.clientId),
    createdIdx: index("idx_ash_created").on(table.createdAt),
  };
});

// ==========================================
// RED TEAM RESULTS
// ==========================================

export const agentRedteamResults = pgTable("agent_redteam_results", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  testName: varchar("test_name", { length: 255 }).notNull(),
  testCategory: varchar("test_category", { length: 100 }).notNull(),
  severity: redteamSeverityEnum("severity").default("medium"),
  passed: boolean("passed").notNull(),
  details: text("details"),
  remediation: text("remediation"),
  evidencePath: varchar("evidence_path", { length: 500 }),
  status: varchar("status", { length: 50 }).default("open"),
  // Phase 2: link to framework controls
  relatedFramework: varchar("related_framework", { length: 100 }),
  relatedControlId: varchar("related_control_id", { length: 100 }),
  testedAt: timestamp("tested_at").defaultNow(),
  remediatedAt: timestamp("remediated_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_arr_agent").on(table.agentId),
    categoryIdx: index("idx_arr_category").on(table.testCategory),
    statusIdx: index("idx_arr_status").on(table.status),
  };
});

// ==========================================
// AGENT EVIDENCE
// ==========================================

export const agentEvidence = pgTable("agent_evidence", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientId: integer("client_id").notNull(),
  evidenceType: varchar("evidence_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  filePath: varchar("file_path", { length: 500 }),
  content: text("content"),
  // Phase 2: integrity + linkage
  fileHash: varchar("file_hash", { length: 128 }), // SHA-256 for tamper evidence
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  framework: varchar("framework", { length: 100 }),
  controlId: varchar("control_id", { length: 100 }),
  // Source tracking
  sourceType: varchar("source_type", { length: 50 }).default("manual"), // manual, scan, autopilot, upload
  sourceDetail: varchar("source_detail", { length: 500 }),
  // Status
  status: varchar("status", { length: 50 }).default("collected"),
  verifiedBy: varchar("verified_by", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_ae_agent").on(table.agentId),
    typeIdx: index("idx_ae_type").on(table.evidenceType),
    frameworkIdx: index("idx_ae_framework").on(table.framework),
  };
});

// ==========================================
// PHASE 2: ENGAGEMENT TRACKER (lightweight)
// ==========================================

export const agentEngagements = pgTable("agent_engagements", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().unique(),
  clientId: integer("client_id").notNull(),
  stage: varchar("stage", { length: 50 }).default("discovery"), // discovery, mapped, policy_deployed, remediation, verified, handoff
  stageStartedAt: timestamp("stage_started_at").defaultNow(),
  stageCompletedAt: timestamp("stage_completed_at"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    agentIdx: index("idx_aeg_agent").on(table.agentId),
    clientIdx: index("idx_aeg_client").on(table.clientId),
    stageIdx: index("idx_aeg_stage").on(table.stage),
  };
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type AgentProfile = typeof agentProfiles.$inferSelect;
export type InsertAgentProfile = typeof agentProfiles.$inferInsert;
export type AgentTool = typeof agentTools.$inferSelect;
export type InsertAgentTool = typeof agentTools.$inferInsert;
export type AgentPolicyCard = typeof agentPolicyCards.$inferSelect;
export type InsertAgentPolicyCard = typeof agentPolicyCards.$inferInsert;
export type AgentPolicyRule = typeof agentPolicyRules.$inferSelect;
export type InsertAgentPolicyRule = typeof agentPolicyRules.$inferInsert;
export type AgentPolicyEscalation = typeof agentPolicyEscalations.$inferSelect;
export type InsertAgentPolicyEscalation = typeof agentPolicyEscalations.$inferInsert;
export type AgentPolicyKpi = typeof agentPolicyKpis.$inferSelect;
export type InsertAgentPolicyKpi = typeof agentPolicyKpis.$inferInsert;
export type AgentPolicyAssuranceMapping = typeof agentPolicyAssuranceMappings.$inferSelect;
export type InsertAgentPolicyAssuranceMapping = typeof agentPolicyAssuranceMappings.$inferInsert;
export type AgentFrameworkMapping = typeof agentFrameworkMappings.$inferSelect;
export type InsertAgentFrameworkMapping = typeof agentFrameworkMappings.$inferInsert;
export type AgentRedteamResult = typeof agentRedteamResults.$inferSelect;
export type InsertAgentRedteamResult = typeof agentRedteamResults.$inferInsert;
export type AgentEvidence = typeof agentEvidence.$inferSelect;
export type InsertAgentEvidence = typeof agentEvidence.$inferInsert;
// Phase 2 types
export type AgentEvidenceControl = typeof agentEvidenceControls.$inferSelect;
export type InsertAgentEvidenceControl = typeof agentEvidenceControls.$inferInsert;
export type AgentScoreHistory = typeof agentScoreHistory.$inferSelect;
export type InsertAgentScoreHistory = typeof agentScoreHistory.$inferInsert;
export type AgentEngagement = typeof agentEngagements.$inferSelect;
export type InsertAgentEngagement = typeof agentEngagements.$inferInsert;
