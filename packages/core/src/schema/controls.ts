import { 
  pgTable, integer, varchar, text, timestamp, boolean, json, jsonb, serial, index, uniqueIndex, doublePrecision, date, primaryKey, customType 
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import {
  vector,
  roleEnum,
  controlStatusEnum,
  clientControlStatusEnum,
  crmEngagementStageEnum,
  policyStatusEnum,
  policyReviewStatusEnum,
  evidenceStatusEnum,
  taskTypeEnum,
  raciRoleEnum,
  kanbanStatusEnum,
  roadmapStatusEnum,
  implementationStatusEnum,
  dataBreachStatusEnum,
  reportVersionEnum,
  findingSeverityEnum,
  findingStatusEnum,
  policyModuleEnum,
  consentStatusEnum,
  consentTypeEnum,
  cloudProviderEnum,
  assetStatusEnum,
  vulnerabilityStatusEnum,
  threatStatusEnum,
  riskAssessmentStatusEnum,
  workItemTypeEnum,
  workItemStatusEnum,
  workItemPriorityEnum,
  escalationTriggerEnum,
  governanceEntityTypeEnum,
  reportTypeEnum,
  dpiaStatusEnum,
  internationalTransferStatusEnum,
  transferToolEnum,
  sccModuleEnum,
  incidentSeverityEnum,
  incidentStatusEnum,
  approvalStatusEnum,
  aiSystemStatusEnum,
  aiRiskLevelEnum,
  euAiActClassEnum,
  policyAckStatusEnum,
  accessReviewCycleStatusEnum,
  accessReviewTaskStatusEnum
} from "./common";
export * from "./common";


// Tables
export const complianceFrameworks = pgTable("compliance_frameworks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 50 }).notNull(), // ISO27001, SOC2
  version: varchar("version", { length: 50 }), // 2022
  description: text("description"),
  type: varchar("type", { length: 50 }).default("framework"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const frameworkRequirements = pgTable("framework_requirements", {
  id: serial("id").primaryKey(),
  frameworkId: integer("framework_id").notNull(),
  phaseId: integer("phase_id"),
  identifier: varchar("identifier", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  guidance: text("guidance"),
  mappingTags: json("mapping_tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    frameworkIdx: index("idx_req_framework").on(table.frameworkId),
    phaseIdx: index("idx_req_phase").on(table.phaseId),
  };
});

export const auditFindings = pgTable("audit_findings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: findingSeverityEnum("severity").default("medium"),
  status: findingStatusEnum("status").default("open"),
  evidenceId: integer("evidence_id"), // Optional link to specific evidence
  authorId: integer("author_id").notNull(), // Auditor who created it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  fismaSystemId: integer("fisma_system_id"),
}, (table) => {
  return {
    clientIdx: index("idx_findings_client").on(table.clientId),
    statusIdx: index("idx_findings_status").on(table.status),
  };
});

export const controlHistory = pgTable("control_history", {

  id: serial("id").primaryKey(),

  controlId: integer("control_id").notNull(),

  version: integer("version").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  framework: varchar("framework", { length: 255 }),

  owner: varchar("owner", { length: 255 }),

  frequency: varchar("frequency", { length: 50 }),

  evidenceType: varchar("evidence_type", { length: 100 }),

  changedBy: integer("changed_by"),

  changeNote: text("change_note"),

  changedAt: timestamp("changed_at").defaultNow(),

});

export const clientControls = pgTable("client_controls", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  controlId: integer("control_id").notNull(),

  clientControlId: varchar("client_control_id", { length: 50 }),

  customDescription: text("custom_description"),

  owner: varchar("owner", { length: 255 }),

  dueDate: timestamp("due_date"),

  // SoA Fields

  applicability: varchar("applicability", { length: 50 }).default("applicable"), // "applicable", "not_applicable"

  justification: text("justification"),

  implementationDate: timestamp("implementation_date"),

  implementationNotes: text("implementation_notes"),

  evidenceLocation: text("evidence_location"),

  status: clientControlStatusEnum("status").default("not_implemented"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdIdx: index("idx_cc_client").on(table.clientId),

    clientStatusIdx: index("idx_cc_client_status").on(table.clientId, table.status),

  };

});

export const evidence = pgTable("evidence", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  clientControlId: integer("client_control_id").notNull(),

  evidenceId: varchar("evidence_id", { length: 50 }).notNull(),

  systemId: varchar("system_id", { length: 50 }),

  description: text("description"),

  framework: varchar("framework", { length: 50 }).default('ISO 27001'),
  type: varchar("type", { length: 100 }),

  status: evidenceStatusEnum("status").default("pending"),

  dueDate: timestamp("due_date"),
  fileCount: integer("file_count").default(0),

  owner: varchar("owner", { length: 255 }),

  location: varchar("location", { length: 1024 }),

  lastVerified: timestamp("last_verified"),

  expirationDate: timestamp("expiration_date"),

  intervalDays: integer("interval_days").default(365), // Default to annual

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdIdx: index("idx_ev_client").on(table.clientId),

    clientStatusIdx: index("idx_ev_client_status").on(table.clientId, table.status),

  };

});

export const auditNotes = pgTable("audit_notes", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  controlId: integer("control_id").notNull(),

  userId: integer("user_id"),

  note: text("note").notNull(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const evidenceFiles = pgTable("evidence_files", {

  id: serial("id").primaryKey(),

  evidenceId: integer("evidence_id").notNull(),

  filename: varchar("filename", { length: 255 }).notNull(),

  fileUrl: varchar("file_url", { length: 1024 }).notNull(),

  fileKey: varchar("file_key", { length: 1024 }).notNull(),

  contentType: varchar("content_type", { length: 100 }),

  fileSize: integer("file_size"),

  uploadedBy: integer("uploaded_by"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const gapResponses = pgTable("gap_responses", {

  id: serial("id").primaryKey(),

  assessmentId: integer("assessment_id").notNull(),

  controlId: varchar("control_id", { length: 100 }).notNull(), // Code or ID from master controls

  currentStatus: varchar("current_status", { length: 50 }), // implemented, partial, not_implemented

  targetStatus: varchar("target_status", { length: 50 }), // required, not_required

  notes: text("notes"),

  evidenceLinks: json("evidence_links"), // Array of URLs or IDs

  remediationPlan: text("remediation_plan"),

  gapSeverity: varchar("gap_severity", { length: 20 }), // critical, high, medium, low

  priorityScore: integer("priority_score"), // 0-100, AI-calculated priority score

  priorityReason: text("priority_reason"), // AI explanation of priority

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    assessCtrlIdx: index("idx_gr_assess_ctrl").on(table.assessmentId, table.controlId),

  };

});

export const frameworkMappings_deprecated = pgTable("framework_mappings_deprecated", {

  id: serial("id").primaryKey(),

  sourceControlId: integer("source_control_id").notNull(),

  targetControlId: integer("target_control_id").notNull(),

  mappingType: varchar("mapping_type", { length: 50 }).default("equivalent"), // equivalent, partial, related

  notes: text("notes"),

  confidence: integer("confidence"), // AI confidence score 0-100

  status: varchar("status", { length: 50 }).default("approved"), // approved, suggested

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    sourceIdx: index("idx_fm_source").on(table.sourceControlId),

    targetIdx: index("idx_fm_target").on(table.targetControlId),

    uniqueMapping: index("idx_fm_unique").on(table.sourceControlId, table.targetControlId),

  };

});
// ==================== INTEGRATIONS ====================

// Client Integrations (SMTP, etc.)

export const controlBaselines = pgTable("control_baselines", {

  id: serial("id").primaryKey(),

  controlId: varchar("control_id", { length: 50 }).notNull(), // Links to controls.controlId

  framework: varchar("framework", { length: 100 }).notNull(), // e.g., "NIST SP 800-53 Rev 5"

  baseline: varchar("baseline", { length: 20 }).notNull(), // "low", "moderate", "high"

}, (table) => {

  return {

    baselineIdx: index("idx_cb_baseline").on(table.framework, table.baseline),

    controlIdx: index("idx_cb_control").on(table.controlId),

  };

});

export const frameworkMappings = pgTable("framework_mappings", {
  id: serial("id").primaryKey(),

  // Source (e.g. ISO 27001)
  sourceFrameworkId: integer("source_framework_id"),
  sourceRequirementId: integer("source_requirement_id"),

  // Target (e.g. SOC 2)
  targetFrameworkId: integer("target_framework_id"),
  targetRequirementId: integer("target_requirement_id"),

  // Mapping Details
  strength: varchar("strength", { length: 50 }).default("related"), // exact, subset, superset, partial, related
  justification: text("justification"),

  // Common Control Link (Optional central hub)
  commonControlId: integer("common_control_id").references(() => commonControls.id),

  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evidenceComments = pgTable("evidence_comments", {
  id: serial("id").primaryKey(),
  evidenceId: integer("evidence_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    evidenceIdx: index("idx_evidence_comments_evidence").on(table.evidenceId),
    userIdx: index("idx_evidence_comments_user").on(table.userId),
  };
});

export const evidenceTemplates = pgTable("evidence_templates", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  controlPattern: varchar("control_pattern", { length: 255 }).notNull(), // Regex or keyword: e.g., "access control|AC-|A.9"

  framework: varchar("framework", { length: 100 }), // Optional: ISO 27001, SOC 2, etc.

  category: varchar("category", { length: 100 }), // Optional: e.g., "Access Control", "Encryption"

  suggestedSources: json("suggested_sources").$type<string[]>().default([]), // ["AWS Config", "Jira", "Screenshot"]

  sampleDescription: text("sample_description"), // Example evidence description

  integrationType: varchar("integration_type", { length: 50 }).default('manual'), // 'manual', 'api', 'file'

  priority: integer("priority").default(50), // Higher = more likely to show first

  createdAt: timestamp("created_at").defaultNow(),

});

export const auditLogs = pgTable("audit_logs", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id"), // Can be null for system events

  userId: integer("user_id").notNull(),

  action: varchar("action", { length: 50 }).notNull(), // 'create', 'update', 'delete', 'publish'

  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'policy', 'control', 'client'

  entityId: integer("entity_id"),

  details: json("details"), // Changed fields, snapshots

  severity: varchar("severity", { length: 20 }).default("info"), // 'info', 'warning', 'critical'

  ipAddress: varchar("ip_address", { length: 45 }),

  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientTimeIdx: index("idx_al_client_time").on(table.clientId, table.createdAt),

  };

});

export const gapAssessments = pgTable("gap_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(), // e.g. "Q1 2024 ISO 27001 Gap Analysis"

  framework: varchar("framework", { length: 100 }).notNull(), // e.g. "ISO 27001"

  status: varchar("status", { length: 50 }).default("draft"), // draft, in_progress, completed

  scope: text("scope"),

  userId: integer("user_id"), // Creator

  assignees: json("assignees").$type<number[]>(), // Array of User IDs

  // Report Content

  executiveSummary: text("executive_summary"),

  introduction: text("introduction"),

  keyRecommendations: json("key_recommendations").$type<string[]>(), // Array of AI recommendations

  methodology: text("methodology"),

  assumptions: text("assumptions"),

  references: text("references"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const frameworkKnowledgeMappings = pgTable("framework_knowledge_mappings", {
  id: serial("id").primaryKey(),
  sourceRequirementId: integer("source_requirement_id").notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'threat_category', 'tech_stack', 'component_type', etc.
  targetValue: varchar("target_value", { length: 255 }).notNull(), // e.g. 'Tampering', 'React', 'API'
  mappingWeight: integer("mapping_weight").default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    sourceIdx: index("idx_fkm_source").on(table.sourceRequirementId),
    targetIdx: index("idx_fkm_target").on(table.targetType, table.targetValue),
  };
});

export const gapQuestionnaireRequests = pgTable("gap_questionnaire_requests", {

  id: serial("id").primaryKey(),

  assessmentId: integer("assessment_id").notNull(), // FK to gap_assessments

  token: varchar("token", { length: 64 }).notNull().unique(), // Secure access token

  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),

  recipientName: varchar("recipient_name", { length: 255 }),

  controlIds: json("control_ids").$type<number[]>().default([]), // Control IDs included

  message: text("message"), // Custom message to recipient

  status: varchar("status", { length: 20 }).default('pending'), // pending, viewed, completed, expired

  sentAt: timestamp("sent_at"),

  expiresAt: timestamp("expires_at"),

  viewedAt: timestamp("viewed_at"),

  completedAt: timestamp("completed_at"),

  appliedAt: timestamp("applied_at"), // When response was approved/applied to assessment

  archivedAt: timestamp("archived_at"), // For compliance records (hidden/read-only)

  respondentName: varchar("respondent_name", { length: 255 }), // Who actually filled it out

  responses: json("responses").$type<{

    controlId: number;

    currentStatus: string;

    notes: string;

    answeredAt: string;

  }[]>().default([]),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const controlTechMappings = pgTable("control_tech_mappings", {

  id: serial("id").primaryKey(),

  controlCode: varchar("control_code", { length: 50 }).notNull(),

  framework: varchar("framework", { length: 100 }).notNull(),

  techId: varchar("tech_id", { length: 100 }).notNull(),

  vendor: varchar("vendor", { length: 100 }),

  serviceName: varchar("service_name", { length: 200 }),

  description: text("description"),

  pros: json("pros").$type<string[]>(),

  cons: json("cons").$type<string[]>(),

  implementationEffort: varchar("implementation_effort", { length: 50 }), // 'low', 'medium', 'high'

  maturityLevel: varchar("maturity_level", { length: 50 }), // 'emerging', 'mainstream', 'mature'

  references: json("references").$type<{ url: string; title: string }[]>(),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    controlFrameworkIdx: index("idx_ctm_control_framework").on(table.controlCode, table.framework),

    techIdIdx: index("idx_ctm_tech").on(table.techId),

  };

});

export const evidenceRequests = pgTable("evidence_requests", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  clientControlId: integer("client_control_id").notNull(),

  requesterId: integer("requester_id").notNull(), // User ID

  assigneeId: integer("assignee_id").notNull(), // Employee ID

  status: varchar("status", { length: 50 }).default("open"), // open, submitted, verified, rejected

  dueDate: timestamp("due_date"),

  description: text("description"),

  evidenceId: integer("evidence_id"), // Linked evidence once submitted

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_er_client_status").on(table.clientId, table.status),

    assigneeIdx: index("idx_er_assignee").on(table.assigneeId),

    controlIdx: index("idx_er_control").on(table.clientControlId),

  };

});

export const controls = pgTable("controls", {

  id: serial("id").primaryKey(),

  controlId: varchar("control_id", { length: 50 }).notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  framework: varchar("framework", { length: 255 }).notNull(),

  owner: varchar("owner", { length: 255 }),

  frequency: varchar("frequency", { length: 50 }),

  evidenceType: varchar("evidence_type", { length: 100 }),

  status: controlStatusEnum("status").default("draft"),

  version: integer("version").default(1).notNull(),

  category: varchar("category", { length: 255 }),

  grouping: varchar("grouping", { length: 255 }), // Used for sub-grouping like NIST Categories (e.g. "Asset Management")

  implementationGuidance: text("implementation_guidance"), // For detailed examples or instructions
  aiGuidance: text("ai_guidance"), // AI-generated guidance cached globally
  requirementText: text("requirement_text"), // Verbatim legislative text (e.g. NIS2 Art 21)
  officialGuidance: text("official_guidance"), // Official regulatory guidance
  evidenceBlueprint: json("evidence_blueprint").$type<Array<{ name: string; description: string; source?: string }>>(), // Detailed evidence examples

  suggestedPolicies: text("suggested_policies"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

  clientId: integer("client_id"), // Nullable for system frameworks, set for private imports

}, (table) => {

  return {

    // Unique constraint per client (or global if client_id is null)

    // We can't easily do a partial unique index in simple Drizzle syntax without sql, but we can verify in app logic or use raw SQL.

    // For now, we index the columns for lookup.

    frameworkIdx: index("idx_controls_framework").on(table.framework),

    clientIdx: index("idx_controls_client").on(table.clientId),

  };

});

export const controlMappings = pgTable("control_mappings", {

  id: serial("id").primaryKey(),

  sourceControlId: integer("source_control_id").notNull(), // FK to controls.id

  targetControlId: integer("target_control_id").notNull(), // FK to controls.id

  mappingType: varchar("mapping_type", { length: 50 }).notNull().default('equivalent'), // 'equivalent', 'partial', 'related'

  confidence: varchar("confidence", { length: 50 }).default('manual'), // 'manual', 'ai_high', 'ai_medium'

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

  entityId: integer("entity_id"),

  entityType: varchar("entity_type", { length: 50 }),

  createdBy: integer("created_by"), // FK to users

  isAiGenerated: boolean("is_ai_generated").default(false),

}, (table) => {

  return {

    sourceIdx: index("idx_cm_source").on(table.sourceControlId),

    targetIdx: index("idx_cm_target").on(table.targetControlId),

    uniqueMapping: uniqueIndex("idx_cm_unique").on(table.sourceControlId, table.targetControlId),

  };

});

export const controlPolicyMappings = pgTable("control_policy_mappings", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  clientControlId: integer("client_control_id").notNull(),

  clientPolicyId: integer("client_policy_id").notNull(),

  evidenceReference: text("evidence_reference"),

  notes: text("notes"),

  isAiGenerated: boolean("is_ai_generated").default(false),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    policyIdx: index("idx_cpm_policy").on(table.clientPolicyId),

    controlIdx: index("idx_cpm_control").on(table.clientControlId),

    uniqueMapping: uniqueIndex("idx_cpm_unique").on(table.clientPolicyId, table.clientControlId),

  };

});

// Relations


// Types
export type AuditFinding = typeof auditFindings.$inferSelect;

export type Control = typeof controls.$inferSelect;

export type ControlHistory = typeof controlHistory.$inferSelect;

export type ControlMapping = typeof controlMappings.$inferSelect;

export type ClientControl = typeof clientControls.$inferSelect;

export type Evidence = typeof evidence.$inferSelect;

export type EvidenceRequest = typeof evidenceRequests.$inferSelect;

export type AuditNote = typeof auditNotes.$inferSelect;

export type EvidenceFile = typeof evidenceFiles.$inferSelect;

export type AuditLog = typeof auditLogs.$inferSelect;

export type ControlTechMapping = typeof controlTechMappings.$inferSelect;

export type GapAssessment = typeof gapAssessments.$inferSelect;

export type GapResponse = typeof gapResponses.$inferSelect;

export type ControlBaseline = typeof controlBaselines.$inferSelect;

export type FrameworkMapping = typeof frameworkMappings.$inferSelect;

export type FrameworkKnowledgeMapping = typeof frameworkKnowledgeMappings.$inferSelect;

export type EvidenceComment = typeof evidenceComments.$inferSelect;

export type EvidenceTemplate = typeof evidenceTemplates.$inferSelect;

export type ControlPolicyMapping = typeof controlPolicyMappings.$inferSelect;

export type GapQuestionnaireRequest = typeof gapQuestionnaireRequests.$inferSelect;

// Other Definitions

