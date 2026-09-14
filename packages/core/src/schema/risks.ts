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
export const riskPolicyMappings = pgTable("risk_policy_mappings", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  riskAssessmentId: integer("risk_assessment_id").notNull(),

  clientPolicyId: integer("client_policy_id").notNull(),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientPolicyIdx: index("idx_rpm_policy").on(table.clientPolicyId),

    riskAssessmentIdx: index("idx_rpm_risk").on(table.riskAssessmentId),

    uniqueMapping: index("idx_rpm_unique").on(table.riskAssessmentId, table.clientPolicyId),

  };

});

export const riskAppetite = pgTable("risk_appetite", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  financialThreshold: integer("financial_threshold"), // e.g., $100,000 in cents
  reputationalThreshold: varchar("reputational_threshold", { length: 50 }), // 'None', 'Minor', 'Strategic'
  operationalThreshold: integer("operational_threshold"), // Max hours downtime
  overallRiskLevel: varchar("overall_risk_level", { length: 50 }).default("Medium"), // Low, Medium, High
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_appetite_client").on(table.clientId),
  };
});

export const threatAlertSettings = pgTable("threat_alert_settings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  // Alert channels
  emailEnabled: boolean("email_enabled").default(false),
  webhookEnabled: boolean("webhook_enabled").default(false),
  slackEnabled: boolean("slack_enabled").default(false),
  // Configuration
  webhookUrl: text("webhook_url"),
  slackWebhookUrl: text("slack_webhook_url"),
  slackChannel: text("slack_channel"),
  emailRecipients: text("email_recipients"), // JSON array of emails
  // Alert triggers
  alertOnCritical: boolean("alert_on_critical").default(true),
  alertOnHigh: boolean("alert_on_high").default(true),
  alertOnMedium: boolean("alert_on_medium").default(false),
  alertOnNewCve: boolean("alert_on_new_cve").default(true),
  alertOnZeroDay: boolean("alert_on_zero_day").default(true),
  alertOnRansomware: boolean("alert_on_ransomware").default(true),
  alertOnApt: boolean("alert_on_apt").default(true),
  // Severity threshold (CVSS score)
  cvssThreshold: integer("cvss_threshold").default(7),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index("idx_threat_alert_client").on(table.clientId),
  };
});

export const riskSettings = pgTable("risk_settings", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  scope: text("scope"),

  context: text("context"),

  riskAppetite: text("risk_appetite"),

  riskTolerance: json("risk_tolerance").$type<{ category: string, threshold: string, unit: string }[]>(),

  methodology: varchar("methodology", { length: 255 }).default("ISO 27005"),

  impactCriteria: json("impact_criteria").$type<{ level: number, name: string, description: string }[]>(),

  likelihoodCriteria: json("likelihood_criteria").$type<{ level: number, name: string, description: string }[]>(),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientSettingsIdx: index("idx_rsettings_client").on(table.clientId),

  };

});

export const riskTreatments = pgTable("risk_treatments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id"), // For direct client access

  riskScenarioId: integer("risk_scenario_id"), // Link to risk scenarios (optional)

  riskAssessmentId: integer("risk_assessment_id"), // Link to risk assessments (optional)

  // Strategy

  treatmentType: varchar("treatment_type", { length: 50 }).notNull().default("mitigate"), // mitigate, avoid, transfer, accept

  strategy: text("strategy"), // Detailed description of treatment strategy

  justification: text("justification"), // Required for 'accept' type

  // Link to Controls (The "How do we fix it")

  controlId: integer("control_id"), // Single control link (legacy support)

  // Implementation Tracking

  status: varchar("status", { length: 50 }).default("planned"), // planned, in_progress, implemented, verified

  dueDate: timestamp("due_date"),

  implementationDate: timestamp("implementation_date"),

  owner: varchar("owner", { length: 255 }),

  // Priority & Cost

  priority: varchar("priority", { length: 50 }), // critical, high, medium, low

  estimatedCost: varchar("estimated_cost", { length: 100 }), // Simple string for flexibility

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    scenarioIdx: index("idx_treatment_scenario").on(table.riskScenarioId),

    assessmentIdx: index("idx_treatment_assessment").on(table.riskAssessmentId),

  };

});

export const threatAssetMappings = pgTable("threat_asset_mappings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  threatId: integer("threat_id").notNull().references(() => threats.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  confidence: integer("confidence").default(100),
  impactLevel: varchar("impact_level", { length: 20 }).default("medium"),
  status: varchar("status", { length: 50 }).default("active"),
  mappedBy: integer("mapped_by"),
  mappingMethod: varchar("mapping_method", { length: 50 }).default("manual"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assetCveMatches = pgTable("asset_cve_matches", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  assetId: integer("asset_id").notNull(),

  cveId: varchar("cve_id", { length: 50 }).notNull(), // e.g. CVE-2024-12345

  matchScore: integer("match_score").default(100), // AI confidence 0-100

  matchReason: text("match_reason"), // Why this CVE was matched

  isKev: boolean("is_kev").default(false), // Is in CISA KEV catalog

  status: varchar("status", { length: 50 }).default("suggested"), // suggested, accepted, dismissed, imported

  importedVulnerabilityId: integer("imported_vulnerability_id"), // FK to vulnerabilities if imported

  discoveredAt: timestamp("discovered_at").defaultNow(),

  reviewedAt: timestamp("reviewed_at"),

  reviewedBy: integer("reviewed_by"), // User ID

}, (table) => {

  return {

    clientAssetIdx: index("idx_acm_client_asset").on(table.clientId, table.assetId),

    cveIdx: index("idx_acm_cve").on(table.cveId),

    statusIdx: index("idx_acm_status").on(table.status),

  };

});

export const threatIntelSyncLog = pgTable("threat_intel_sync_log", {

  id: serial("id").primaryKey(),

  source: varchar("source", { length: 50 }).notNull(), // 'nvd', 'cisa_kev'

  syncType: varchar("sync_type", { length: 50 }).notNull(), // 'full', 'incremental', 'asset_scan'

  status: varchar("status", { length: 50 }).default("completed"), // started, completed, failed

  recordsProcessed: integer("records_processed").default(0),

  errorMessage: text("error_message"),

  startedAt: timestamp("started_at").defaultNow(),

  completedAt: timestamp("completed_at"),

});

export const riskScenarioLinks = pgTable("risk_scenario_links", {

  id: serial("id").primaryKey(),

  riskId: integer("risk_id").notNull(), // FK to risk_scenarios

  scenarioId: integer("scenario_id").notNull(), // FK to disruptive_scenarios

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    riskIdx: index("idx_rsl_risk").on(table.riskId),

    scenarioIdx: index("idx_rsl_scenario").on(table.scenarioId),

    uniqueLink: index("idx_rsl_unique").on(table.riskId, table.scenarioId),

  };

});

export const riskReports = pgTable("risk_reports", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).default('Risk Management Report'),

  executiveSummary: text("executive_summary"),

  introduction: text("introduction"),

  scope: text("scope"),

  methodology: text("methodology"),

  keyFindings: text("key_findings"),

  recommendations: text("recommendations"),

  conclusion: text("conclusion"),

  assumptions: text("assumptions"),

  references: text("references"),

  status: varchar("status", { length: 50 }).default('draft'),

  version: integer("version").default(1),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const dataBreaches = pgTable("data_breaches", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  description: text("description").notNull(),

  effects: text("effects").notNull(),

  remedialActions: text("remedial_actions").notNull(),

  dateOccurred: timestamp("date_occurred"),

  dateDetected: timestamp("date_detected"),

  dateReportedToDpa: timestamp("date_reported_to_dpa"),

  dateReportedToDataSubjects: timestamp("date_reported_to_data_subjects"),

  status: dataBreachStatusEnum("status").default("open"),

  isNotifiableToDpa: boolean("is_notifiable_to_dpa").default(false),

  isNotifiableToSubjects: boolean("is_notifiable_to_subjects").default(false),

  createdBy: integer("created_by"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_db_client_status").on(table.clientId, table.status),

  };

});

export const incidents = pgTable("incidents", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull().default("Untitled Incident"),

  detectedAt: timestamp("detected_at"),

  severity: incidentSeverityEnum("severity").default("low"),
  
  // NIS2 Art. 23 Classification & Reporting
  isSignificant: boolean("is_significant").default(false),
  significanceCriteria: json("significance_criteria").$type<string[]>(), // ["operational_disruption", "financial_loss", "public_safety", "third_party_impact"]
  affectedUsersCount: integer("affected_users_count").default(0),
  serviceDisruptionDuration: integer("service_disruption_duration").default(0), // in minutes
  estimatedFinancialLoss: integer("estimated_financial_loss").default(0), // in cents
  isContinuityTriggered: boolean("is_continuity_triggered").default(false),
  
  // Reporting Milestones
  earlyWarningSentAt: timestamp("early_warning_sent_at"), // 24h deadline
  intermediateReportSentAt: timestamp("intermediate_report_sent_at"), // 72h deadline
  finalReportSentAt: timestamp("final_report_sent_at"), // 1 month deadline

  cause: varchar("cause", { length: 100 }), // malware, phishing, etc.

  description: text("description"),

  affectedAssets: text("affected_assets"),

  crossBorderImpact: boolean("cross_border_impact").default(false),

  status: incidentStatusEnum("status").default("open"),

  reportedToAuthorities: boolean("reported_to_authorities").default(false),

  reporterName: varchar("reporter_name", { length: 255 }),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_incidents_client").on(table.clientId),

    statusIdx: index("idx_incidents_status").on(table.status),

  };

});

export const threatModels = pgTable("threat_models", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  devProjectId: integer("dev_project_id"), // Nullable for general projects
  projectId: integer("project_id"), // New: Linked to general projects
  name: varchar("name", { length: 255 }).notNull(),
  methodology: varchar("methodology", { length: 50 }).default('STRIDE'),
  status: varchar("status", { length: 50 }).default('draft'), // draft, active, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    projectIdx: index("idx_tm_project").on(table.devProjectId),
    clientIdx: index("idx_tm_client").on(table.clientId),
  };
});

export const threatModelComponents = pgTable("threat_model_components", {
  id: serial("id").primaryKey(),
  threatModelId: integer("threat_model_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'Web Client', 'API', 'Database', 'External Service', etc.
  description: text("description"),
  x: integer("x").default(0),
  y: integer("y").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    tmIdx: index("idx_tm_comp_tm").on(table.threatModelId),
  };
});

export const threatModelDataFlows = pgTable("threat_model_data_flows", {
  id: serial("id").primaryKey(),
  threatModelId: integer("threat_model_id").notNull(),
  sourceComponentId: integer("source_component_id").notNull(),
  targetComponentId: integer("target_component_id").notNull(),
  protocol: varchar("protocol", { length: 50 }).default('HTTPS'), // HTTPS, HTTP, TCP, JDBC, IPC
  isEncrypted: boolean("is_encrypted").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    dfTmIdx: index("idx_tm_df_tm").on(table.threatModelId),
  };
});

export const riskScenarios = pgTable("risk_scenarios", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  // Flexible Risk Scope (Polymorphic)

  assessmentType: varchar("assessment_type", { length: 50 }).notNull().default('asset'), // 'asset', 'process', 'vendor', 'scenario'

  assetId: integer("asset_id"), // Linked Asset (if asset-based)

  processId: varchar("process_id", { length: 100 }), // Linked Business Process (if process-based)

  vendorId: integer("vendor_id"), // Linked Vendor (if vendor-based)
  devProjectId: integer("dev_project_id"), // Linked Dev Project
  projectId: integer("project_id"), // Linked General Project
  threatModelId: integer("threat_model_id"), // Linked Threat Model

  // Linked Context (New)
  threatId: integer("threat_id"), // FK to threats
  vulnerabilityId: integer("vulnerability_id"), // FK to vulnerabilities

  // The "What can go wrong"
  title: varchar("title", { length: 500 }).notNull(), // Short risk name
  description: text("description"),

  // Security Framework Triage
  category: varchar("category", { length: 100 }).default('General'), // Project, Enterprise, Data, AI
  owaspCategory: varchar("owasp_category", { length: 100 }), // e.g. "Broken Access Control"
  privacyImpact: boolean("privacy_impact").default(false), // If DPIA required
  csfFunction: varchar("csf_function", { length: 50 }), // Identify, Protect, etc.

  // Threat & Vulnerability (ISO 27005 Model)

  threatCategory: varchar("threat_category", { length: 100 }), // e.g., "Theft", "Natural Disaster"

  vulnerability: varchar("vulnerability", { length: 255 }), // e.g., "Lack of Encryption"

  // Link to Gap Analysis

  gapResponseId: integer("gap_response_id"),

  // Scoring (5x5 Matrix)

  likelihood: integer("likelihood").default(1), // 1-5
  impact: integer("impact").default(1), // 1-5
  inherentScore: integer("inherent_score"), // Likelihood * Impact
  inherentRisk: varchar("inherent_risk", { length: 50 }),
  residualLikelihood: integer("residual_likelihood"),
  residualImpact: integer("residual_impact"),
  residualScore: integer("residual_score"),
  residualRisk: varchar("residual_risk", { length: 50 }),

  inherentRiskScore: integer("inherent_risk_score"), // Likelihood * Impact (Calculated in app)

  // Status

  status: varchar("status", { length: 50 }).default("identified"), // identified, analyzed, treated, monitored
  owner: varchar("owner", { length: 255 }),
  customMitigationPlan: text("custom_mitigation_plan"), // AI generated for custom rich text plan
  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientRiskIdx: index("idx_rs_client").on(table.clientId),

    clientStatusIdx: index("idx_rs_client_status").on(table.clientId, table.status),

  };

});

export const assets = pgTable("assets", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  type: varchar("type", { length: 100 }).notNull(), // Hardware, Software, Information, People, Service, Reputation

  owner: varchar("owner", { length: 255 }),

  // Technical Identifiers (for NVD/CVE matching)

  vendor: varchar("vendor", { length: 255 }), // e.g., "Microsoft", "Apache", "Oracle"

  productName: varchar("product_name", { length: 255 }), // e.g., "SQL Server", "Tomcat", "MySQL"

  version: varchar("version", { length: 100 }), // e.g., "2019", "9.0.50", "8.0.32"

  technologies: json("technologies").$type<string[]>(), // e.g., ["nodejs", "postgresql", "docker"]

  // CIA Valuation (1-5 Scale)

  valuationC: integer("valuation_c").default(3), // Confidentiality

  valuationI: integer("valuation_i").default(3), // Integrity

  valuationA: integer("valuation_a").default(3), // Availability

  description: text("description"),

  location: varchar("location", { length: 255 }),

  department: varchar("department", { length: 255 }),

  // New columns

  status: assetStatusEnum("status").default("active"),

  acquisitionDate: timestamp("acquisition_date"),

  lastReviewDate: timestamp("last_review_date"),
  lastScannedAt: timestamp("last_scanned_at"),

  // Additional columns required by router

  category: varchar("category", { length: 100 }),

  criticality: varchar("criticality", { length: 50 }),

  ipAddress: varchar("ip_address", { length: 50 }),

  macAddress: varchar("mac_address", { length: 50 }),

  os: varchar("os", { length: 100 }),

  customFields: json("custom_fields"),

  tags: json("tags").$type<string[]>().default([]),

  // Privacy / Data Inventory Extension

  isPersonalData: boolean("is_personal_data").default(false),

  dataSensitivity: varchar("data_sensitivity", { length: 50 }), // Public, Internal, Confidential, Restricted

  dataFormat: varchar("data_format", { length: 50 }), // Digital, Physical

  dataOwner: varchar("data_owner", { length: 255 }), // Specific Data Owner if different from Asset Owner

  // Federal / DFARS CUI Boundary Extension
  cuiScope: boolean("cui_scope").default(false), // Is this asset in the CUI enclave?
  cuiCategory: varchar("cui_category", { length: 100 }), // CUI category: CDI, CTI, ITAR, etc.
  cuiJustification: text("cui_justification"), // Why this asset is in/out of CUI scope

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const threats = pgTable("threats", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  threatId: varchar("threat_id", { length: 50 }).notNull(), // e.g. T-2024-001

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  // Classification

  category: varchar("category", { length: 100 }), // Natural, Human, Environmental, Technical

  source: varchar("source", { length: 100 }), // Internal, External, Hacker, Insider, Nature

  intent: varchar("intent", { length: 50 }), // Accidental, Deliberate

  // Risk Analysis

  likelihood: varchar("likelihood", { length: 50 }), // Rare, Unlikely, Possible, Likely, Almost Certain

  potentialImpact: text("potential_impact"), // Description of impact if realized

  // Scope & Relations

  affectedAssets: json("affected_assets").$type<string[]>(), // Array of Asset IDs/Names

  relatedVulnerabilities: json("related_vulnerabilities").$type<string[]>(), // Array of Vuln IDs

  associatedRisks: json("associated_risks").$type<string[]>(), // Array of Risk IDs

  // Details

  scenario: text("scenario"), // Threat Scenario/Example

  detectionMethod: text("detection_method"),

  // Management

  status: threatStatusEnum("status").default("active"),

  owner: varchar("owner", { length: 255 }),

  lastReviewDate: timestamp("last_review_date"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientThreatIdx: index("idx_threat_client").on(table.clientId),
    clientStatusIdx: index("idx_threat_client_status").on(table.clientId, table.status),
  };
});

export const riskAssessments = pgTable("risk_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  projectId: integer("project_id"),
  fismaSystemId: integer("fisma_system_id"),

  assessmentId: varchar("assessment_id", { length: 50 }).notNull(), // e.g. RA-2024-001

  title: varchar("title", { length: 255 }), // User-friendly name

  // Security Framework Triage (Consistency with riskScenarios)
  category: varchar("category", { length: 100 }).default('General'), // Project, Enterprise, Data, AI
  owaspCategory: varchar("owasp_category", { length: 100 }), // e.g. "Broken Access Control"
  privacyImpact: boolean("privacy_impact").default(false), // If DPIA required
  csfFunction: varchar("csf_function", { length: 50 }), // Identify, Protect, etc.
  aiRmfCategory: varchar("ai_rmf_category", { length: 50 }), // Govern, Map, Measure, Manage

  riskId: integer("risk_id"), // Linked Risk Scenario ID

  // Assessment Details

  assessmentDate: timestamp("assessment_date"),

  assessor: varchar("assessor", { length: 255 }),

  method: varchar("method", { length: 100 }), // Qualitative, Quantitative

  // Context

  threatId: integer("threat_id"), // FK to threats table

  threatDescription: text("threat_description"),

  vulnerabilityId: integer("vulnerability_id"), // FK to vulnerabilities table

  vulnerabilityDescription: text("vulnerability_description"),

  affectedAssets: json("affected_assets").$type<string[]>(),

  affectedProcessIds: json("affected_process_ids").$type<number[]>(),

  contextSnapshot: json("context_snapshot"), // Snapshots of description, controls, etc.

  gapResponseId: integer("gap_response_id"),

  // Analysis (Pre-Control)

  likelihood: varchar("likelihood", { length: 50 }),

  impact: varchar("impact", { length: 50 }),

  inherentRisk: varchar("inherent_risk", { length: 50 }), // High, Medium, Low

  inherentScore: integer("inherent_score"), // 1-25

  // Controls

  existingControls: text("existing_controls"),

  controlIds: json("control_ids").$type<number[]>(), // Linked Controls from Dictionary

  controlEffectiveness: varchar("control_effectiveness", { length: 50 }), // Effective, Partially, Ineffective

  // Evaluation (Post-Control)

  residualRisk: varchar("residual_risk", { length: 50 }),

  residualScore: integer("residual_score"), // 1-25

  // Treatment

  riskOwner: varchar("risk_owner", { length: 255 }),

  treatmentOption: varchar("treatment_option", { length: 50 }), // Avoid, Mitigate, Transfer, Accept

  recommendedActions: text("recommended_actions"),

  priority: varchar("priority", { length: 50 }),

  targetResidualRisk: varchar("target_residual_risk", { length: 50 }),

  // Review

  reviewDueDate: timestamp("review_due_date"),

  status: riskAssessmentStatusEnum("status").default("draft"),

  notes: text("notes"),

  nextReviewDate: timestamp("next_review_date"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientRaIdx: index("idx_ra_client").on(table.clientId),

    riskIdIdx: index("idx_ra_risk").on(table.riskId),

    statusIdx: index("idx_ra_status").on(table.status),

    nextReviewDateIdx: index("idx_ra_next_review").on(table.nextReviewDate),

    clientStatusIdx: index("idx_ra_client_status").on(table.clientId, table.status),

  };

});

// Relations
export const riskAssessmentsRelations = relations(riskAssessments, ({ many }) => ({
  treatments: many(riskTreatments),
}));

export const riskTreatmentsRelations = relations(riskTreatments, ({ one }) => ({
  assessment: one(riskAssessments, {
    fields: [riskTreatments.riskAssessmentId],
    references: [riskAssessments.id],
  }),
}));

// Types
export type RiskPolicyMapping = typeof riskPolicyMappings.$inferSelect;

export type ThreatAlertSettings = typeof threatAlertSettings.$inferSelect;

export type Asset = typeof assets.$inferSelect;

export type RiskScenario = typeof riskScenarios.$inferSelect;

export type RiskSettings = typeof riskSettings.$inferSelect;

export type RiskTreatment = typeof riskTreatments.$inferSelect;

export type Vulnerability = typeof vulnerabilities.$inferSelect;

export type Threat = typeof threats.$inferSelect;

export type ThreatAssetMapping = typeof threatAssetMappings.$inferSelect;

export type RiskAssessment = typeof riskAssessments.$inferSelect;

export type AssetCveMatch = typeof assetCveMatches.$inferSelect;

export type ThreatIntelSyncLog = typeof threatIntelSyncLog.$inferSelect;

export type RiskScenarioLink = typeof riskScenarioLinks.$inferSelect;

export type RiskReport = typeof riskReports.$inferSelect;

export type ThreatModel = typeof threatModels.$inferSelect;

export type ThreatModelComponent = typeof threatModelComponents.$inferSelect;

export type ThreatModelDataFlow = typeof threatModelDataFlows.$inferSelect;

// Other Definitions

