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
export * from "../schema_auditor";
export * from "../schema_autopilot";
export * from "../schema_agent_compliance";
export * from "../schema_client_journey";
export * from "../schema_client_settings";
export * from "../schema_monitor";

// Tables
export const aiUsageMetrics = pgTable("ai_usage_metrics", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id"),

  userId: integer("user_id"),

  entityType: varchar("entity_type", { length: 50 }),

  entityId: integer("entity_id"),

  endpoint: varchar("endpoint", { length: 255 }).notNull(), // e.g., 'suggestTechnologies', 'askQuestion'

  provider: varchar("provider", { length: 50 }).notNull(), // 'openai', 'anthropic', 'gemini'

  model: varchar("model", { length: 100 }).notNull(), // e.g., 'gpt-4', 'claude-3-opus'

  promptTokens: integer("prompt_tokens").notNull().default(0),

  completionTokens: integer("completion_tokens").notNull().default(0),

  totalTokens: integer("total_tokens").notNull().default(0),

  estimatedCostCents: integer("estimated_cost_cents").notNull().default(0), // Cost in cents

  latencyMs: integer("latency_ms"), // Request latency in milliseconds

  success: boolean("success").default(true),

  errorMessage: text("error_message"),

  requestMetadata: json("request_metadata").$type<Record<string, any>>(), // Additional context

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdIdx: index("idx_ai_usage_client").on(table.clientId),

    providerIdx: index("idx_ai_usage_provider").on(table.provider),

    endpointIdx: index("idx_ai_usage_endpoint").on(table.endpoint),

    createdAtIdx: index("idx_ai_usage_created").on(table.createdAt),

  };

});

export const aiSystems = pgTable("ai_systems", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  purpose: text("purpose"), // MAP 1.1
  intendedUsers: text("intended_users"), // MAP 1.2
  deploymentContext: text("deployment_context"), // MAP 1.2
  type: varchar("type", { length: 100 }), // internal, 3rd-party, LLM, etc.
  riskLevel: aiRiskLevelEnum("risk_level").default("medium"),
  status: aiSystemStatusEnum("status").default("evaluation"),
  owner: varchar("owner", { length: 255 }),
  vendorId: integer("vendor_id"), // Linked to vendors table
  dataSensitivity: varchar("data_sensitivity", { length: 100 }),
  technicalConstraints: text("technical_constraints"), // MAP 1.4
  // EU AI Act Compliance (Articles 6-52)
  euAiActClass: euAiActClassEnum("eu_ai_act_class").default("not_applicable"),
  euAiActProhibited: boolean("eu_ai_act_prohibited").default(false),
  euAiActHighRiskCategory: text("eu_ai_act_high_risk_category"), // Which Article 6 categories apply
  euAiActDeployer: boolean("eu_ai_act_deployer").default(true), // true=deployer, false=provider
  euAiActRegistrationNumber: varchar("eu_ai_act_registration_number", { length: 100 }), // EU database ID for high-risk
  euAiActConformityAssessment: varchar("eu_ai_act_conformity_assessment", { length: 50 }).default("not_required"), // not_required, self_assessment, notified_body
  euAiActLastAssessmentDate: timestamp("eu_ai_act_last_assessment_date"),
  euAiActNextAssessmentDate: timestamp("eu_ai_act_next_assessment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_ais_client").on(table.clientId),
  };
});

export const aiImpactAssessments = pgTable("ai_impact_assessments", {
  id: serial("id").primaryKey(),
  aiSystemId: integer("ai_system_id").notNull(),
  assessorId: integer("assessor_id"),
  status: varchar("status", { length: 50 }).default("draft"), // draft, final, review
  safetyImpact: text("safety_impact"),
  biasImpact: text("bias_impact"),
  privacyImpact: text("privacy_impact"),
  securityImpact: text("security_impact"),
  overallRiskScore: integer("overall_risk_score"),
  assessmentDate: timestamp("assessment_date").defaultNow(),
  nextReviewDate: timestamp("next_review_date"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    aiSystemIdx: index("idx_aiia_system").on(table.aiSystemId),
  };
});

// Join table to link AI Systems to Controls/Policies

export const aiSystemControls = pgTable("ai_system_controls", {
  id: serial("id").primaryKey(),
  aiSystemId: integer("ai_system_id").notNull(),
  controlId: integer("control_id").notNull(),
  status: varchar("status", { length: 50 }).default("mapped"), // mapped, implemented, verified
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    aiSystemIdx: index("idx_aisc_system").on(table.aiSystemId),
    controlIdx: index("idx_aisc_control").on(table.controlId),
  };
});

export const aiEuAiActCompliance = pgTable("ai_eu_ai_act_compliance", {
  id: serial("id").primaryKey(),
  aiSystemId: integer("ai_system_id").notNull().references(() => aiSystems.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull(),

  // Article 9 - Risk Management System
  riskMgmtSystemEstablished: boolean("risk_mgmt_system_established").default(false),
  riskMgmtDocLink: text("risk_mgmt_doc_link"),
  riskMgmtReviewDate: timestamp("risk_mgmt_review_date"),

  // Article 10 - Data Governance
  dataGovernanceImplemented: boolean("data_governance_implemented").default(false),
  trainingDataProvenance: text("training_data_provenance"),
  dataPrivacyCompliant: boolean("data_privacy_compliant").default(false),

  // Article 11-12 - Technical Documentation & Record-Keeping
  techDocumentationComplete: boolean("tech_documentation_complete").default(false),
  techDocUrl: text("tech_doc_url"),
  logsAutomaticallyRecorded: boolean("logs_automatically_recorded").default(false),
  logRetentionDays: integer("log_retention_days").default(180),

  // Article 13 - Transparency
  transparencyInfoProvided: boolean("transparency_info_provided").default(false),
  transparencyInfoUrl: text("transparency_info_url"),

  // Article 14 - Human Oversight
  humanOversightMeasuresImplemented: boolean("human_oversight_measures_implemented").default(false),
  humanOversightDescription: text("human_oversight_description"),

  // Article 15 - Accuracy, Robustness, Cybersecurity
  accuracyBenchmarksMet: boolean("accuracy_benchmarks_met").default(false),
  robustnessTested: boolean("robustness_tested").default(false),
  cybersecurityMeasuresImplemented: boolean("cybersecurity_measures_implemented").default(false),

  // Article 26 - Obligations of Deployers
  deployerHumanOversightAssigned: boolean("deployer_human_oversight_assigned").default(false),
  deployerMonitoringImplemented: boolean("deployer_monitoring_implemented").default(false),
  deployerIncidentReportingConfigured: boolean("deployer_incident_reporting_configured").default(false),

  // Article 52 - Transparency for Limited Risk AI
  transparencyLabelImplemented: boolean("transparency_label_implemented").default(false),
  transparencyLabelText: text("transparency_label_text"),

  // Overall Status
  complianceStatus: varchar("compliance_status", { length: 50 }).default("not_assessed"),
  complianceScore: integer("compliance_score").default(0),
  lastAssessedAt: timestamp("last_assessed_at"),
  assessedByUserId: integer("assessed_by_user_id"),
  assessmentNotes: text("assessment_notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  aiSystemIdx: index("idx_eu_ai_system").on(table.aiSystemId),
  clientIdx: index("idx_eu_ai_client").on(table.clientId),
}));

// Relations


// Types
export type AIUsageMetric = typeof aiUsageMetrics.$inferSelect;

export type AiSystem = typeof aiSystems.$inferSelect;

export type AiImpactAssessment = typeof aiImpactAssessments.$inferSelect;

export type AiEuAiActCompliance = typeof aiEuAiActCompliance.$inferSelect;

export type AiSystemControl = typeof aiSystemControls.$inferSelect;

// Other Definitions

