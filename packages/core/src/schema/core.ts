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
export const personalAccessTokens = pgTable("personal_access_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(), // Hashed/Secret token
  prefix: varchar("prefix", { length: 50 }).notNull(), // cos_...
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("idx_pat_user").on(table.userId),
    tokenIdx: uniqueIndex("idx_pat_token").on(table.token),
  };
});

export const userClients = pgTable("user_clients", {

  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull(),

  clientId: integer("client_id").notNull(),

  role: roleEnum("role").default("viewer").notNull(),

  joinedAt: timestamp("joined_at").defaultNow(),

  accessExpiresAt: timestamp("access_expires_at"), // For time-limited access (Magic Links)

}, (table) => {

  return {

    userIdIdx: index("idx_uc_user").on(table.userId),

    clientIdIdx: index("idx_uc_client").on(table.clientId),

  };

});

export const integrations = pgTable("integrations", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  provider: varchar("provider", { length: 50 }).notNull(), // 'jira', 'slack', etc.

  accessToken: text("access_token"),

  refreshToken: text("refresh_token"),

  expiresAt: timestamp("expires_at"),

  externalAccountId: varchar("external_account_id", { length: 255 }), // cloudId, workspaceId

  scopes: json("scopes").$type<string[]>(),

  metadata: json("metadata"), // { siteName: "My Jira", email: "..." }

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientProviderIdx: uniqueIndex("idx_integrations_client_provider").on(table.clientId, table.provider),

  };

});

export const llmProviders = pgTable("llm_providers", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(), // e.g., "Company OpenAI"

  provider: varchar("provider", { length: 50 }).notNull(), // "openai", "anthropic", "gemini", "deepseek", "qwen", "custom"

  model: varchar("model", { length: 100 }).notNull(), // "gpt-4", "deepseek-coder", "qwen-72b"

  apiKey: text("api_key").notNull(), // Stores ENCRYPTED string

  baseUrl: varchar("base_url", { length: 512 }), // Optional: For OpenRouter, vLLM, or specific provider endpoints

  priority: integer("priority").default(0), // Higher number = Higher priority

  isEnabled: boolean("is_enabled").default(false),

  supportsEmbeddings: boolean("supports_embeddings").default(false),

  createdAt: timestamp("created_at").defaultNow(),

});

export const userInvitations = pgTable("user_invitations", {

  id: serial("id").primaryKey(),

  email: varchar("email", { length: 255 }).notNull(),

  role: varchar("role", { length: 50 }).notNull().default("viewer"),

  clientId: integer("client_id"),

  invitedBy: integer("invited_by").notNull(),

  status: varchar("status", { length: 50 }).default("pending"), // pending, accepted, expired

  token: varchar("token", { length: 255 }).notNull().unique(),

  usedAt: timestamp("used_at"),
  usedByUserId: integer("used_by_user_id"),
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const clientReadinessResponses = pgTable("client_readiness_responses", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  regulationId: varchar("regulation_id", { length: 50 }).notNull(),

  questionId: varchar("question_id", { length: 50 }).notNull(),

  response: varchar("response", { length: 50 }), // 'yes', 'no', '1'-'5'

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const knowledgeArticles = pgTable("knowledge_articles", {

  id: serial("id").primaryKey(),

  title: varchar("title", { length: 500 }).notNull(),

  body: text("body").notNull(),

  tags: json("tags").$type<string[]>(),

  source: varchar("source", { length: 255 }), // 'internal', 'catalog', 'external'

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const advisorConversations = pgTable("advisor_conversations", {

  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull(),

  clientId: integer("client_id"),

  conversationId: varchar("conversation_id", { length: 100 }).notNull().unique(),

  title: varchar("title", { length: 500 }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const advisorMessages = pgTable("advisor_messages", {

  id: serial("id").primaryKey(),

  conversationId: varchar("conversation_id", { length: 100 }).notNull(),

  role: varchar("role", { length: 20 }).notNull(), // 'user', 'assistant'

  content: text("content").notNull(),

  sources: json("sources").$type<{ type: string; id?: string; url?: string; title?: string }[]>(),

  metadata: json("metadata").$type<{ model?: string; provider?: string; tokens?: number }>(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    conversationIdx: index("idx_am_conversation").on(table.conversationId),

  };

});

export const crmContacts = pgTable("crm_contacts", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  firstName: varchar("first_name", { length: 255 }).notNull(),

  lastName: varchar("last_name", { length: 255 }).notNull(),

  email: varchar("email", { length: 255 }),

  phone: varchar("phone", { length: 50 }),

  jobTitle: varchar("job_title", { length: 255 }),

  // CRM Specifics

  isPrimary: boolean("is_primary").default(false),

  category: varchar("category", { length: 50 }), // billing, technical, executive, champion

  linkedInUrl: varchar("linkedin_url", { length: 1024 }),

  notes: text("notes"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_crm_contact_client").on(table.clientId),

    emailIdx: index("idx_crm_contact_email").on(table.email),

  };

});

export const securityTests = pgTable("security_tests", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 50 }),
  status: varchar("status", { length: 50 }).default("scheduled"),
  scheduledDate: timestamp("scheduled_date"),
  completionDate: timestamp("completion_date"),
  findingsCount: integer("findings_count").default(0),
  reportUrl: varchar("report_url", { length: 1024 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nvdCveCache = pgTable("nvd_cve_cache", {

  id: serial("id").primaryKey(),

  cveId: varchar("cve_id", { length: 50 }).notNull().unique(), // e.g. CVE-2024-12345

  cvssScore: varchar("cvss_score", { length: 10 }), // e.g. "9.8"

  cvssVector: varchar("cvss_vector", { length: 255 }),

  cweIds: json("cwe_ids").$type<string[]>(), // e.g. ["CWE-79", "CWE-89"]

  description: text("description"),

  publishedDate: timestamp("published_date"),

  lastModifiedDate: timestamp("last_modified_date"),

  affectedProducts: json("affected_products").$type<string[]>(), // CPE strings

  references: json("references").$type<{ url: string; tags?: string[] }[]>(),

  rawData: json("raw_data"), // Full NVD response for reference

  fetchedAt: timestamp("fetched_at").defaultNow(),

  expiresAt: timestamp("expires_at"), // For cache invalidation

}, (table) => {

  return {

    cveIdIdx: index("idx_nvd_cve_id").on(table.cveId),

  };

});

export const iocEnrichmentHistory = pgTable("ioc_enrichment_history", {

  id: serial("id").primaryKey(),

  iocId: integer("ioc_id").references(() => iocRecords.id),

  provider: varchar("provider", { length: 50 }), // virustotal, abuseipdb, shodan

  result: jsonb("result"),

  enrichedAt: timestamp("enriched_at").defaultNow(),

});

export const iocExportHistory = pgTable("ioc_export_history", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").references(() => clients.id),

  format: varchar("format", { length: 20 }), // csv, json, stix, firewall

  filters: jsonb("filters"),

  iocCount: integer("ioc_count"),

  exportedBy: integer("exported_by").references(() => users.id),

  exportedAt: timestamp("exported_at").defaultNow(),

});

export const clientIntegrations = pgTable("client_integrations", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  provider: varchar("provider", { length: 50 }).notNull().default("smtp"), // smtp, sendgrid, aws_ses

  settings: json("settings").$type<{

    host?: string;

    port?: number;

    user?: string;

    pass?: string; // In a real app, this should be encrypted at rest

    fromName?: string;

    fromEmail?: string;

    apiKey?: string; // For API providers

  }>(),

  isEnabled: boolean("is_enabled").default(true),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIntegrationIdx: index("idx_integration_client").on(table.clientId),

  };

});

export const planVersions = pgTable("plan_versions", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  version: varchar("version", { length: 50 }).notNull(),

  contentSnapshot: json("content_snapshot"), // Full snapshot of plan + relationships

  changeSummary: text("change_summary"),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const disruptiveScenarios = pgTable("disruptive_scenarios", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description").notNull(),

  likelihood: varchar("likelihood", { length: 50 }), // low, medium, high

  potentialImpact: text("potential_impact"),

  mitigationStrategies: text("mitigation_strategies"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const tasks = pgTable("tasks", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  assigneeId: integer("assignee_id"), // User ID

  dueDate: timestamp("due_date"),

  status: varchar("status", { length: 50 }).default('pending'), // pending, in_progress, completed, blocked

  priority: varchar("priority", { length: 20 }).default('medium'), // low, medium, high, critical

  relatedEntityType: varchar("related_entity_type", { length: 50 }),

  relatedEntityId: integer("related_entity_id"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdBy: integer("created_by"),

});

export const impactAssessments = pgTable("impact_assessments", {

  id: serial("id").primaryKey(),

  biaId: integer("bia_id").notNull(), // Links to the parent BIA

  timeInterval: varchar("time_interval", { length: 50 }).notNull(), // '0-4h', '4-24h', '1-3d', '3-7d', '7-30d'

  // Impact Ratings (1-10 or Low/Med/High/Critical)

  financialRating: integer("financial_rating"),

  operationalRating: integer("operational_rating"),

  reputationRating: integer("reputation_rating"),

  legalRating: integer("legal_rating"),

  financialValue: varchar("financial_value", { length: 100 }), // Estimated $ loss

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const biaSeasonalEvents = pgTable("bia_seasonal_events", {

  id: serial("id").primaryKey(),

  biaId: integer("bia_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(), // e.g. "Black Friday"

  startDate: varchar("start_date", { length: 50 }),

  endDate: varchar("end_date", { length: 50 }),

  impactDescription: text("impact_description"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const biaVitalRecords = pgTable("bia_vital_records", {

  id: serial("id").primaryKey(),

  biaId: integer("bia_id").notNull(),

  recordName: varchar("record_name", { length: 255 }).notNull(),

  mediaType: varchar("media_type", { length: 50 }), // Digital, Physical/Paper

  location: varchar("location", { length: 255 }),

  backupMethod: varchar("backup_method", { length: 255 }),

  rto: varchar("rto", { length: 50 }), // Recovery Time for this specific record

  createdAt: timestamp("created_at").defaultNow(),

});

export const bcCommitteeMembers = pgTable("bc_committee_members", {

  id: serial("id").primaryKey(),

  programId: integer("program_id").notNull(),

  userId: integer("user_id").notNull(),

  role: varchar("role", { length: 100 }).notNull(), // e.g., 'Committee Chair', 'IT Representative'

  name: varchar("name", { length: 255 }), // Snapshot of name if user removed? Or just rely on join. Let's keep it clean.

  responsibilities: text("responsibilities"),

  assignedAt: timestamp("assigned_at").defaultNow(),

});

export const checklistStates = pgTable("checklist_states", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  checklistId: varchar("checklist_id", { length: 255 }).notNull(), // e.g., 'iso-27001-readiness'

  items: json("items").$type<Record<string, boolean>>().default({}),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const fips199InformationTypesRef = pgTable("fips_199_information_types_ref", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g. C.3.2.1
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // Mission-Based, Service-Based, etc.
  provisionalConfidentiality: varchar("provisional_confidentiality", { length: 20 }).notNull(), // low, moderate, high, na
  provisionalIntegrity: varchar("provisional_integrity", { length: 20 }).notNull(),
  provisionalAvailability: varchar("provisional_availability", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fipsCategorizations = pgTable("fips_categorizations", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),

  systemName: varchar("system_name", { length: 255 }),

  informationTypes: json("information_types").$type<{
    id: string; // Reference code e.g. C.3.2.1
    name: string;
    confidentiality: { provisional: string; adjusted: string; rationale: string };
    integrity: { provisional: string; adjusted: string; rationale: string };
    availability: { provisional: string; adjusted: string; rationale: string };
  }[]>(),

  confidentialityImpact: varchar("confidentiality_impact", { length: 20 }),
  confidentialityRationale: text("confidentiality_rationale"),

  integrityImpact: varchar("integrity_impact", { length: 20 }),
  integrityRationale: text("integrity_rationale"),

  availabilityImpact: varchar("availability_impact", { length: 20 }),
  availabilityRationale: text("availability_rationale"),

  highWaterMark: varchar("high_water_mark", { length: 20 }),

  metadata: json("metadata").default({}),

  status: varchar("status", { length: 50 }).default('draft'),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const federalFedrampPackages = pgTable("federal_fedramp_packages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  impactLevel: varchar("impact_level", { length: 20 }), // Low, Moderate, High, LI-SaaS
  authorizationType: varchar("authorization_type", { length: 50 }), // JAB, Agency
  agencyName: varchar("agency_name", { length: 255 }),
  provisioningStatus: varchar("provisioning_status", { length: 50 }), // In-Process, Authorized, Ready
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const federalRmfWorkflows = pgTable("federal_rmf_workflows", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  systemName: varchar("system_name", { length: 255 }).notNull(),
  currentStep: integer("current_step").default(1), // 1: Prepare, 2: Categorize, 3: Select, 4: Implement, 5: Assess, 6: Authorize, 7: Monitor
  stepStatus: json("step_status"), // { 1: 'completed', 2: 'in_progress', ... }
  updatedAt: timestamp("updated_at").defaultNow(),
  fismaSystemId: integer("fisma_system_id"),
});

export const federalFismaReports = pgTable("federal_fisma_reports", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  reportingPeriod: varchar("reporting_period", { length: 100 }), // e.g. "FY2024 Q1"
  systemImpact: varchar("system_impact", { length: 20 }), // Low, Moderate, High
  overallStatus: varchar("overall_status", { length: 50 }),
  metrics: json("metrics"),
  fismaSystemId: integer("fisma_system_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const federalDisaStigItems = pgTable("federal_disa_stig_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull(),
  ruleId: varchar("rule_id", { length: 50 }).notNull(), // SV-XXXX
  vulnId: varchar("vuln_id", { length: 50 }), // V-XXXX
  title: text("title").notNull(),
  description: text("description"),
  checkText: text("check_text"),
  fixText: text("fix_text"),
  severity: varchar("severity", { length: 20 }), // high, medium, low (CAT I, II, III)
  status: varchar("status", { length: 50 }), // open, not_a_finding, not_applicable
  comments: text("comments"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmLeads = pgTable("crm_leads", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id"), // Optional: if linked to existing client

  firstName: varchar("first_name", { length: 255 }).notNull(),

  lastName: varchar("last_name", { length: 255 }).notNull(),

  email: varchar("email", { length: 255 }),

  companyName: varchar("company_name", { length: 255 }),

  jobTitle: varchar("job_title", { length: 255 }),

  status: varchar("status", { length: 50 }).default("new"), // new, contacted, qualified, converted, disqualified

  source: varchar("source", { length: 100 }), // website, referral, linkedin

  notes: text("notes"),

  ownerId: integer("owner_id"), // User ID

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const crmDealStages = pgTable("crm_deal_stages", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 100 }).notNull(), // Qualification, Proposal, etc.

  order: integer("order").default(0),

  winProbability: integer("win_probability"), // 0-100

  color: varchar("color", { length: 50 }),

  createdAt: timestamp("created_at").defaultNow(),

});

export const crmDeals = pgTable("crm_deals", {

  id: serial("id").primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),

  value: integer("value"), // Value in cents or main currency unit

  currency: varchar("currency", { length: 10 }).default("USD"),

  stageId: integer("stage_id").notNull(), // Link to crmDealStages

  leadId: integer("lead_id"), // Link to crmLeads

  clientId: integer("client_id"), // Link to existing clients (if converted)

  ownerId: integer("owner_id"),

  expectedCloseDate: timestamp("expected_close_date"),

  probability: integer("probability"), // Override stage probability

  notes: text("notes"),

  status: varchar("status", { length: 50 }).default("open"), // open, won, lost

  lostReason: text("lost_reason"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const reportLogs = pgTable("report_logs", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  userId: integer("user_id"),

  reportType: reportTypeEnum("report_type").notNull(),

  format: varchar("format", { length: 20 }).notNull(), // pdf, docx, csv, zip

  timestamp: timestamp("timestamp").defaultNow().notNull(),

  metadata: json("metadata").$type<{

    filename?: string;

    aiGenerated?: boolean;

    bundleContents?: string[];

  }>(),

}, (table) => {

  return {

    clientIdx: index("idx_rl_client").on(table.clientId),

    typeIdx: index("idx_rl_type").on(table.reportType),

  };

});

export const waitingList = pgTable("waiting_list", {

  id: serial("id").primaryKey(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  firstName: varchar("first_name", { length: 255 }),

  lastName: varchar("last_name", { length: 255 }),

  company: varchar("company", { length: 255 }),

  role: varchar("role", { length: 255 }),

  certification: varchar("certification", { length: 255 }),

  orgSize: varchar("org_size", { length: 100 }),

  industry: varchar("industry", { length: 255 }),

  status: varchar("status", { length: 50 }).default("pending"),

  source: varchar("source", { length: 50 }).default("landing_page"),
  interestedPlay: varchar("interested_play", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),

});

export const globalContacts = pgTable("global_contacts", {

  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 255 }),

  lastName: varchar("last_name", { length: 255 }),

  email: varchar("email", { length: 255 }).notNull().unique(),

  company: varchar("company", { length: 255 }),

  role: varchar("role", { length: 255 }),

  phone: varchar("phone", { length: 50 }),

  source: varchar("source", { length: 50 }).default("manual"), // 'waitlist', 'manual', 'import'

  status: varchar("status", { length: 50 }).default("lead"), // 'lead', 'prospect', 'customer', 'churned'

  notes: text("notes"),

  createdBy: integer("created_by"), // FK to users

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    emailIdx: index("idx_gc_email").on(table.email),

    statusIdx: index("idx_gc_status").on(table.status),

  };

});

export const globalCrmTags = pgTable("global_crm_tags", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 50 }).notNull().unique(),

  color: varchar("color", { length: 20 }), // Hex code or tailwind color name

  createdAt: timestamp("created_at").defaultNow(),

});

export const privacyAssessments = pgTable("privacy_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  type: varchar("type", { length: 50 }).notNull(), // 'gdpr', 'ccpa'

  responses: json("responses").$type<Record<string, { answer: string; notes?: string; owner?: string; dueDate?: string; lastReviewed?: string }>>(),

  status: varchar("status", { length: 20 }).default("not_started"), // 'not_started', 'in_progress', 'completed'

  score: integer("score").default(0),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientTypeIdx: index("idx_pa_client_type").on(table.clientId, table.type),

  };

});

export const knowledgeBaseEntries = pgTable("knowledge_base_entries", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  question: text("question").notNull(),

  answer: text("answer").notNull(),

  tags: json("tags").$type<string[]>().default([]),

  access: varchar("access", { length: 50 }).default("internal"), // internal, public, restricted

  assigneeId: integer("assignee_id"), // FK to users

  health: varchar("health", { length: 50 }), // e.g., 'good', 'needs_review'

  comments: text("comments"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_kb_client").on(table.clientId),

    questionIdx: index("idx_kb_question").on(table.question),

  };

});

export const adequacyDecisions = pgTable("adequacy_decisions", {

  id: serial("id").primaryKey(),

  countryCode: varchar("country_code", { length: 2 }).notNull().unique(), // ISO 2-letter

  countryName: varchar("country_name", { length: 255 }).notNull(),

  status: varchar("status", { length: 50 }).default("adequate"), // adequate, partial, withdrawn

  scope: text("scope"), // e.g. "Commercial organizations only"

  decisionUrl: text("decision_url"),

  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),

});

export const approvalSignatures = pgTable("approval_signatures", {

  id: serial("id").primaryKey(),

  requestId: integer("request_id").notNull(), // FK to approval_requests

  signerId: integer("signer_id").notNull(), // FK to users

  signerRole: varchar("signer_role", { length: 100 }).notNull(), // e.g. "CISO"

  status: varchar("status", { length: 50 }).default("signed"), // signed, rejected

  comment: text("comment"),

  signatureData: text("signature_data"), // Cryptographic hash or graphical data

  signedAt: timestamp("signed_at").defaultNow(),

}, (table) => {

  return {

    requestIdx: index("idx_as_request").on(table.requestId),

    signerIdx: index("idx_as_signer").on(table.signerId),

  };

});

export const devProjects = pgTable("dev_projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  repositoryUrl: varchar("repository_url", { length: 500 }),
  techStack: json("tech_stack").$type<string[]>(), // e.g. ["React", "Node", "Postgres"]
  owner: varchar("owner", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_dev_proj_client").on(table.clientId),
  };
});

export const trustCenterVisitors = pgTable("trust_center_visitors", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ndaSignatures = pgTable("nda_signatures", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  visitorId: integer("visitor_id").notNull(),
  ndaVersion: varchar("nda_version", { length: 50 }).default("v1.0"),
  signedAt: timestamp("signed_at").defaultNow(),
  signatureText: varchar("signature_text", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 50 }),
});

export const trustDocuments = pgTable("trust_documents", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  isLocked: boolean("is_locked").default(false), // true = NDA required
  category: varchar("category", { length: 100 }), // Compliance, Security, Privacy
  createdAt: timestamp("created_at").defaultNow(),
});

export const magicLinkRedemptions = pgTable("magic_link_redemptions", {
  id: serial("id").primaryKey(),
  magicLinkId: integer("magic_link_id").notNull(),
  userId: integer("user_id").notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

export const systemFeedback = pgTable("system_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  clientId: integer("client_id"),
  type: varchar("type", { length: 50 }).notNull(), // 'bug', 'feature', 'improvement'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  url: varchar("url", { length: 1024 }),
  status: varchar("status", { length: 50 }).default("new"), // 'new', 'evaluated', 'planned', 'in_progress', 'completed', 'rejected'
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    statusIdx: index("idx_feedback_status").on(table.status),
    typeIdx: index("idx_feedback_type").on(table.type),
  };
});

export const users = pgTable("users", {

  id: serial("id").primaryKey(),

  openId: varchar("open_id", { length: 255 }).notNull().unique(),

  name: varchar("name", { length: 255 }),

  email: varchar("email", { length: 255 }),

  loginMethod: varchar("login_method", { length: 255 }),

  lastSignedIn: timestamp("last_signed_in").defaultNow(),

  role: varchar("role", { length: 50 }).default("user"),

  deletedAt: timestamp("deleted_at"),

  maxClients: integer("max_clients").default(2), // Support Model 1 (Subscription)

  hasSeenTour: boolean("has_seen_tour").default(false),

  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),

  subscriptionStatus: varchar("subscription_status", { length: 50 }),

  planTier: varchar("plan_tier", { length: 50 }).default("consultant"),

  accessExpiresAt: timestamp("access_expires_at"),

  createdAt: timestamp("created_at").defaultNow(),

});

// ==========================================
// Auditor Portal Module
// ==========================================

export const clientFrameworkControls = pgTable("client_framework_controls", {

  id: serial("id").primaryKey(),

  frameworkId: integer("framework_id").notNull(),

  controlCode: varchar("control_code", { length: 100 }).notNull(),

  title: text("title").notNull(),

  description: text("description"),

  grouping: varchar("grouping", { length: 255 }),

  originalData: json("original_data"), // Stores extra fields flexible to the imported file

  // State Tracking (Parity with client_controls)

  status: varchar("status", { length: 50 }).default("not_implemented"), // not_implemented, in_progress, implemented, not_applicable

  applicability: varchar("applicability", { length: 50 }).default("applicable"),

  owner: varchar("owner", { length: 255 }),

  customDescription: text("custom_description"),

  implementationNotes: text("implementation_notes"),

  evidenceLocation: text("evidence_location"),

  justification: text("justification"),

  implementationDate: timestamp("implementation_date"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    frameworkIdx: index("idx_cfc_framework").on(table.frameworkId),

  };

});

export const clientFrameworkMappings = pgTable("client_framework_mappings", {

  id: serial("id").primaryKey(),

  frameworkControlId: integer("framework_control_id").notNull(),

  clientControlId: integer("client_control_id").notNull(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    fwCtrlIdx: index("idx_cfm_fw_ctrl").on(table.frameworkControlId),

    clCtrlIdx: index("idx_cfm_cl_ctrl").on(table.clientControlId),

    // Ensure one framework control is mapped to one client control (optional, but good for "Test Once")

    // allowing multiple mappings is cleaner for edge cases.

    uniqueMapping: index("idx_cfm_unique").on(table.frameworkControlId, table.clientControlId),

  };

});

export const bcStrategies = pgTable("bc_strategies", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  resourceRequirements: text("resource_requirements"),

  estimatedCost: varchar("estimated_cost", { length: 100 }),

  benefits: text("benefits"),

  approvalStatus: varchar("approval_status", { length: 50 }).default('draft'),

  createdAt: timestamp("created_at").defaultNow(),

});

export const planExercises = pgTable("plan_exercises", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  planId: integer("plan_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  type: varchar("type", { length: 50 }).notNull(), // 'tabletop', 'walkthrough', 'simulation', 'full_interrupt'

  startDate: timestamp("start_date").defaultNow(),

  conductorId: integer("conductor_id"),

  status: varchar("status", { length: 50 }).default('planned'), // planned, in_progress, completed, cancelled

  outcome: text("outcome"), // success, partial, fail, or free-text result notes (GAP-17 widened from varchar(50))

  notes: text("notes"),

  followUpTasks: json("follow_up_tasks"), // Array of tasks

  reportUrl: varchar("report_url", { length: 1024 }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const federalSspControls = pgTable("federal_ssp_controls", {

  id: serial("id").primaryKey(),

  sspId: integer("ssp_id").notNull(),

  controlId: varchar("control_id", { length: 50 }).notNull(), // e.g., 'AC-2'

  implementationStatus: varchar("implementation_status", { length: 50 }).default('not_implemented'), // implemented, partial, planned, not_applicable

  implementationDescription: text("implementation_description"),

  responsibleRole: varchar("responsible_role", { length: 255 }),

  evidenceLinks: json("evidence_links").$type<{
    id?: string;
    url?: string;
    name: string;
    type?: 'link' | 'file';
  }[]>().default([]),

  updatedAt: timestamp("updated_at").defaultNow(),

  fismaSystemId: integer("fisma_system_id"),
});

export const federalNist80053Assessments = pgTable("federal_nist_800_53_assessments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  sspId: integer("ssp_id"),
  fismaSystemId: integer("fisma_system_id"),
  sprsAssessmentId: integer("sprs_assessment_id"),
  rmfWorkflowId: integer("rmf_workflow_id"),
  controlId: varchar("control_id", { length: 50 }).notNull(),
  implementationStatus: varchar("implementation_status", { length: 50 }),
  implementationDescription: text("implementation_description"),
  testResults: text("test_results"),
  complianceStatus: varchar("compliance_status", { length: 50 }), // compliant, non_compliant, partial
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const intakeItems = pgTable("intake_items", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  filename: varchar("filename", { length: 255 }).notNull(),

  fileUrl: varchar("file_url", { length: 1024 }).notNull(),

  fileKey: varchar("file_key", { length: 500 }), // S3 Key or local path

  status: varchar("status", { length: 50 }).default("pending"), // pending, classified, mapped, rejected

  classification: varchar("classification", { length: 255 }), // AI-detected type

  confidence: integer("confidence"), // AI confidence 0-100

  details: json("details"), // AI-detected details (dates, amounts, etc.)

  uploadedBy: integer("uploaded_by"),

  processedBy: integer("processed_by"), // Advisor who mapped it

  mappedEvidenceId: integer("mapped_evidence_id"), // Linked evidence record

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),
  fismaSystemId: integer("fisma_system_id"),
}, (table) => {

  return {

    clientIntakeIdx: index("idx_intake_client").on(table.clientId),

    statusIdx: index("idx_intake_status").on(table.status),

  };

});

export const essentialEightAssessments = pgTable("essential_eight_assessments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  controlId: varchar("control_id", { length: 80 }).notNull(),
  maturityLevel: integer("maturity_level").notNull().default(0),
  targetLevel: integer("target_level").notNull().default(1),
  assessmentAnswers: jsonb("assessment_answers").$type<Record<string, boolean>>().default({}),
  qualityCriteria: jsonb("quality_criteria").$type<Record<string, Record<string, boolean>>>().default({}),
  levelNotes: jsonb("level_notes").$type<Record<string, string>>().default({}),
  outcome: varchar("outcome", { length: 30 }).notNull().default("not_assessed"),
  evidenceQuality: varchar("evidence_quality", { length: 20 }).notNull().default("poor"),
  evidenceQualityByLevel: jsonb("evidence_quality_by_level").$type<Record<string, string>>().default({}),
  sampleCoverage: jsonb("sample_coverage").$type<{ workstations?: number; servers?: number; networkDevices?: number }>().default({}),
  compensatingControls: jsonb("compensating_controls").$type<Array<{ description: string; acceptedBy?: string; date?: string }>>().default([]),
  evidenceLinks: jsonb("evidence_links").$type<number[]>().default([]),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientControlIdx: uniqueIndex("idx_e8_client_control").on(table.clientId, table.controlId),
  };
});

export const commonControls = pgTable("common_controls", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  domain: varchar("domain", { length: 100 }), // e.g. "Access Control", "Encryption"

  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const asvsRequirements = pgTable("asvs_requirements", {
  id: serial("id").primaryKey(),

  categoryCode: varchar("category_code", { length: 10 }).notNull(), // FK to asvsCategories.code e.g. "V1" (manual link or join)

  chapterId: varchar("chapter_id", { length: 20 }).notNull(), // e.g., "1.1"
  chapterName: varchar("chapter_name", { length: 255 }), // e.g., "Secure Software Development Lifecycle"

  requirementId: varchar("requirement_id", { length: 20 }).notNull().unique(), // e.g., "1.1.1"
  description: text("description").notNull(),

  level1: boolean("level_1").default(false), // Required for L1?
  level2: boolean("level_2").default(false), // Required for L2?
  level3: boolean("level_3").default(false), // Required for L3?

  cwe: varchar("cwe", { length: 50 }), // e.g., "CWE-123"
  nist: varchar("nist", { length: 50 }), // NIST mapping if available

  version: varchar("version", { length: 20 }).default("4.0.3"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    categoryIdx: index("idx_asvs_req_category").on(table.categoryCode),
    reqIdIdx: index("idx_asvs_req_id").on(table.requirementId),
  };
});

// ASVS Assessments (Client Data)

export const asvsAssessments = pgTable("asvs_assessments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),

  requirementId: varchar("requirement_id", { length: 20 }).notNull(), // Link to asvsRequirements

  status: varchar("status", { length: 50 }).default("unanswered"), // unanswered, pass, fail, na

  notes: text("notes"),
  evidence: jsonb("evidence").$type<string[]>().default([]),

  assessedBy: integer("assessed_by"),
  assessmentDate: timestamp("assessment_date").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientReqIdx: uniqueIndex("idx_asvs_client_req").on(table.clientId, table.requirementId),
    clientStatusIdx: index("idx_asvs_client_status").on(table.clientId, table.status),
  };
});

export const nis2Mappings = pgTable("nis2_mappings", {
  id: serial("id").primaryKey(),
  nis2Article: varchar("nis2_article", { length: 50 }).notNull(), // e.g., '21(2)(a)'
  enisaMeasureId: varchar("enisa_measure_id", { length: 20 }).notNull(), // e.g., '1.1'
  enisaMeasureTitle: varchar("enisa_measure_title", { length: 255 }).notNull(),
  iso27001ControlIds: json("iso27001_control_ids").$type<string[]>(), // e.g., ['5.2', 'A.5.1']
  nistCsfControlIds: json("nist_csf_control_ids").$type<string[]>(), // e.g., ['AC-1', 'AC-2']
  soc2ControlIds: json("soc2_control_ids").$type<string[]>(), // e.g., ['CC1.1', 'CC2.1']
  pciDssControlIds: json("pci_dss_control_ids").$type<string[]>(), // e.g., ['Req-1.1', 'Req-2.1']
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    articleIdx: index("idx_nis2_article").on(table.nis2Article),
    measureIdx: index("idx_nis2_enisa_id").on(table.enisaMeasureId),
  };
});

export * from "./common";

export * from "./common";

export const clients = pgTable("clients", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  industry: varchar("industry", { length: 255 }),

  size: varchar("size", { length: 50 }),

  status: varchar("status", { length: 50 }).default("active"),

  notes: text("notes"),

  logoUrl: varchar("logo_url", { length: 1024 }),

  primaryContactName: varchar("primary_contact_name", { length: 255 }),

  primaryContactEmail: varchar("primary_contact_email", { length: 255 }),

  primaryContactPhone: varchar("primary_contact_phone", { length: 50 }),

  deploymentType: varchar("deployment_type", { length: 50 }),

  region: varchar("region", { length: 100 }),

  clientTier: varchar("client_tier", { length: 50 }),

  serviceModel: varchar("service_model", { length: 50 }).default("subscription"), // subscription, guided, managed

  // Branding
  brandPrimaryColor: varchar("brand_primary_color", { length: 20 }),
  brandSecondaryColor: varchar("brand_secondary_color", { length: 20 }),
  portalTitle: varchar("portal_title", { length: 255 }),
  sidebarBg: varchar("sidebar_bg", { length: 20 }),
  sidebarFg: varchar("sidebar_fg", { length: 20 }),
  headingFont: varchar("heading_font", { length: 100 }),
  bodyFont: varchar("body_font", { length: 100 }),
  baseFontSize: integer("base_font_size").default(16),

  weeklyFocus: text("weekly_focus"), // Advisor-set goal for Model 2

  targetComplianceScore: integer("target_compliance_score").default(80),

  cisoName: varchar("ciso_name", { length: 255 }),

  dpoName: varchar("dpo_name", { length: 255 }),

  // Integration Settings
  scanKey: varchar("scan_key", { length: 255 }), // API Key for external scanners (e.g., SurfSense, NVD)

  headquarters: varchar("headquarters", { length: 255 }),

  mainServiceRegion: varchar("main_service_region", { length: 255 }),

  // Policy Settings

  policyLanguage: varchar("policy_language", { length: 50 }).default("en"), // Language code: en, de, fr, es, etc.
  currency: varchar("currency", { length: 10 }).default("USD"), // ISO 4217 code: USD, EUR, GBP, CAD, AUD, CHF, JPY, etc.
  locale: varchar("locale", { length: 20 }).default("en-US"), // Locale tag: en-US, en-GB, de-DE, fr-FR, nl-NL, es-ES, etc.
  dateFormat: varchar("date_format", { length: 20 }).default("YYYY-MM-DD"), // e.g. YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY

  legalEntityName: varchar("legal_entity_name", { length: 500 }), // For policy headers

  regulatoryJurisdictions: json("regulatory_jurisdictions"), // Array: ["EU", "US", "UK"]

  defaultDocumentClassification: varchar("default_document_classification", { length: 50 }).default("internal"),

  // SaaS / Stripe Integration (Nullable for Single-Tenant Mode)

  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),

  subscriptionStatus: varchar("subscription_status", { length: 50 }), // 'active', 'trialing', 'past_due', 'canceled', 'incomplete'

  planTier: varchar("plan_tier", { length: 50 }).default("consultant"), // 'free', 'startup', 'pro', 'enterprise'

  subscriptionEndDate: timestamp("subscription_end_date"),

  // Modules - Feature Flagging

  activeModules: json("active_modules").$type<string[]>(), // e.g. ["crm", "billing"]

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

  requireMfa: boolean("require_mfa").default(false),
});

export const remediationPlaybooks = pgTable("remediation_playbooks", {

  id: serial("id").primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),

  gapPattern: varchar("gap_pattern", { length: 255 }).notNull(), // Regex or keyword: e.g., "access control|MFA|authentication"

  category: varchar("category", { length: 100 }), // e.g., "Access Control", "Encryption"

  framework: varchar("framework", { length: 100 }), // Optional: ISO 27001, SOC 2, etc.

  severity: varchar("severity", { length: 20 }).default('medium'), // 'critical', 'high', 'medium', 'low'

  estimatedEffort: varchar("estimated_effort", { length: 50 }), // e.g., "2-4 hours", "1-2 days"

  steps: json("steps").$type<{

    order: number;

    title: string;

    description: string;

    owner?: string;

    dueOffset?: number; // days from start

    checklist?: string[];

  }[]>().default([]),

  ownerTemplate: text("owner_template"), // e.g., "IT Security Team, with approval from CISO"

  policyLanguage: text("policy_language"), // Sample policy text to include

  itsmTemplate: json("itsm_template").$type<{

    type: string; // 'jira', 'servicenow', 'generic'

    summary: string;

    description: string;

    priority: string;

    labels?: string[];

  }>(),

  priority: integer("priority").default(50),

  createdAt: timestamp("created_at").defaultNow(),

});

export const consentTemplates = pgTable("consent_templates", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  consentType: consentTypeEnum("consent_type").notNull(),

  templateContent: text("template_content").notNull(), // HTML or markdown template

  granularOptions: json("granular_options").$type<Array<{ id: string, label: string, required: boolean }>>(),

  retentionPeriod: integer("retention_period").default(2555), // 7 years default

  isActive: boolean("is_active").default(true),

  version: varchar("version", { length: 20 }).default("1.0"),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

// Template Management Tables

export const dsarTemplates = pgTable("dsar_templates", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  requestType: varchar("request_type", { length: 100 }).notNull(), // access, erasure, correction, etc.

  templateContent: json("template_content").$type<{

    subject: string,

    description: string,

    verificationSteps: Array<{

      type: string,

      label: string,

      required: boolean

    }>,

    dataCategories: Array<{

      category: string,

      included: boolean,

      description: string

    }>

  }>(),

  isActive: boolean("is_active").default(true),

  usageCount: integer("usage_count").default(0),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const dpiaTemplates = pgTable("dpia_templates", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  category: varchar("category", { length: 100 }).notNull(), // high_risk, systematic, etc.

  templateContent: json("template_content").$type<{

    screeningQuestions: Array<{

      id: string,

      question: string,

      type: 'boolean' | 'text' | 'select',

      options?: string[],

      required: boolean

    }>,

    riskFactors: Array<{

      factor: string,

      weight: number,

      description: string

    }>,

    mitigationMeasures: Array<{

      measure: string,

      category: string,

      description: string

    }>

  }>(),

  isActive: boolean("is_active").default(true),

  usageCount: integer("usage_count").default(0),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

// Data Flow Visualization Tables

export const notificationSettings = pgTable("notification_settings", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  emailEnabled: boolean("email_enabled").default(true),

  overdueEnabled: boolean("overdue_enabled").default(true),

  upcomingReviewDays: integer("upcoming_review_days").default(7),

  dailyDigestEnabled: boolean("daily_digest_enabled").default(false),

  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true),

  notifyControlReviews: boolean("notify_control_reviews").default(true),

  notifyPolicyRenewals: boolean("notify_policy_renewals").default(true),

  notifyEvidenceExpiration: boolean("notify_evidence_expiration").default(true),

  notifyRiskReviews: boolean("notify_risk_reviews").default(true),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientIdIdx: index("idx_ns_client").on(table.clientId),

  };

});

export const communicationTemplates = pgTable("communication_templates", {

  id: serial("id").primaryKey(),

  key: varchar("key", { length: 100 }).notNull().unique(), // e.g. RISK_RAISED

  name: varchar("name", { length: 255 }).notNull(),

  subjectTemplate: varchar("subject_template", { length: 500 }).notNull(),

  bodyTemplate: text("body_template").notNull(), // HTML/Markdown with {{variables}}

  category: varchar("category", { length: 50 }).default("general"), // alert, digest, report, onboarding

  tags: json("tags").$type<string[]>(),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const emailMessages = pgTable("email_messages", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(), // FK to clients (not enforced via FK constraint in simple setup, but logical)

  userId: integer("user_id"), // Author/Sender (System = null or 0)

  // Organization

  folder: varchar("folder", { length: 20 }).default("inbox"), // inbox, drafts, sent, archive, trash

  status: varchar("status", { length: 20 }).default("draft"), // draft, scheduled, sending, sent, failed

  // Content

  subject: varchar("subject", { length: 500 }),

  body: text("body"), // HTML content

  snippet: varchar("snippet", { length: 255 }), // Preview text

  // Recipients

  from: varchar("from", { length: 255 }), // e.g. "Compliance Team <compliance@example.com>"

  to: json("to").$type<string[]>(),

  cc: json("cc").$type<string[]>(),

  bcc: json("bcc").$type<string[]>(),

  // Flags

  isRead: boolean("is_read").default(false),

  isStarred: boolean("is_starred").default(false),

  // Meta

  metadata: json("metadata"), // { entityType: 'risk', entityId: 123, templateKey: 'RISK_RAISED' }

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

  sentAt: timestamp("sent_at"),

});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailTriggers = pgTable("email_triggers", {
  id: serial("id").primaryKey(),
  eventSlug: varchar("event_slug", { length: 255 }).unique().notNull(), // e.g. 'USER_WELCOME'
  templateId: integer("template_id").references(() => emailTemplates.id),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const llmRouterRules = pgTable("llm_router_rules", {

  id: serial("id").primaryKey(),

  feature: varchar("feature", { length: 100 }).notNull().unique(), // e.g., 'risk_analysis', 'policy_generation'

  providerId: integer("provider_id").references(() => llmProviders.id, { onDelete: 'set null' }),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const comments = pgTable("comments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  userId: integer("user_id").notNull(),

  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'process', 'bia', 'plan', 'strategy', 'control', 'policy', 'evidence'

  entityId: integer("entity_id").notNull(),

  content: text("content").notNull(),
  parentId: integer("parent_id"), // For threading (replies)
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  context: json("context").$type<{
    quote?: string; // The text highlighted
    selector?: string; // CSS selector or unique identifier within the document
    sectionId?: string; // If using a structured editor with section IDs
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {
  return {
    entityIdx: index("idx_comments_entity").on(table.entityType, table.entityId),
    clientIdx: index("idx_comments_client").on(table.clientId),
  };
});

export const regulationMappings = pgTable("regulation_mappings", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  regulationId: varchar("regulation_id", { length: 50 }).notNull(), // e.g. "nis2"

  articleId: varchar("article_id", { length: 50 }).notNull(), // e.g. "nis2-art-21-2-a"

  mappedType: varchar("mapped_type", { length: 50 }).notNull(), // 'policy', 'evidence'

  mappedId: integer("mapped_id").notNull(), // ID of the policy or evidence

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientRegArtIdx: index("idx_rm_client_reg_art").on(table.clientId, table.regulationId, table.articleId),

  };

});

export const dpaTemplates = pgTable("dpa_templates", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  content: text("content").notNull(), // Markdown or HTML content

  version: integer("version").default(1),

  isDefault: boolean("is_default").default(false),

  jurisdiction: varchar("jurisdiction", { length: 100 }), // e.g. "EU", "US", "Global"

  createdAt: timestamp("created_at").defaultNow(),

});

export const approvalRequests = pgTable("approval_requests", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'risk_treatment', 'policy', 'soa', etc.

  entityId: integer("entity_id").notNull(),

  status: approvalStatusEnum("status").default("pending"),

  submitterId: integer("submitter_id"), // FK to users

  submittedAt: timestamp("submitted_at").defaultNow(),

  requiredRoles: json("required_roles").$type<string[]>(), // e.g. ["CISO", "CEO"]

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_ar_client_status").on(table.clientId, table.status),

    entityIdx: index("idx_ar_entity").on(table.entityType, table.entityId),

  };

});

export const complianceSnapshots = pgTable("compliance_snapshots", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),

  // Control metrics

  totalControls: integer("total_controls").default(0),

  implementedControls: integer("implemented_controls").default(0),

  inProgressControls: integer("in_progress_controls").default(0),

  notImplementedControls: integer("not_implemented_controls").default(0),

  notApplicableControls: integer("not_applicable_controls").default(0),

  // Gap metrics  

  totalGaps: integer("total_gaps").default(0),

  closedGaps: integer("closed_gaps").default(0),

  criticalGaps: integer("critical_gaps").default(0),

  highGaps: integer("high_gaps").default(0),

  // Risk metrics

  totalRisks: integer("total_risks").default(0),

  mitigatedRisks: integer("mitigated_risks").default(0),

  // Calculated scores

  complianceScore: integer("compliance_score").default(0), // 0-100

  riskScore: integer("risk_score").default(0), // 0-100 (lower is better)

  // Velocity metrics (calculated from previous snapshot)

  controlsClosedThisPeriod: integer("controls_closed_this_period").default(0),

  gapsClosedThisPeriod: integer("gaps_closed_this_period").default(0),

  createdAt: timestamp("created_at").defaultNow(),

});

export const consents = pgTable("consents", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  dataSubjectId: varchar("data_subject_id", { length: 255 }).notNull(), // User ID, email, or identifier

  consentType: consentTypeEnum("consent_type").notNull(),

  purpose: text("purpose").notNull(), // Description of data processing purpose

  legalBasis: text("legal_basis").notNull(), // GDPR Article 6 legal basis

  granularConsents: json("granular_consents").$type<Record<string, boolean>>(), // Granular consent options

  consentTimestamp: timestamp("consent_timestamp").defaultNow(),

  ipAddress: varchar("ip_address", { length: 45 }),

  userAgent: text("user_agent"),

  consentForm: text("consent_form"), // Consent form version or type

  withdrawalTimestamp: timestamp("withdrawal_timestamp"),

  withdrawalReason: text("withdrawal_reason"),

  expirationDate: timestamp("expiration_date"),

  status: consentStatusEnum("status").default("active"),

  retentionPeriod: integer("retention_period"), // Days to retain consent records

  metadata: json("metadata"), // Additional consent metadata

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientIdIdx: index("idx_consent_client").on(table.clientId),

    dataSubjectIdx: index("idx_consent_subject").on(table.dataSubjectId),

    statusIdx: index("idx_consent_status").on(table.status),

  };

});

export const dataFlowVisualizations = pgTable("data_flow_visualizations", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  sourceSystem: varchar("source_system", { length: 255 }).notNull(),

  targetSystem: varchar("target_system", { length: 255 }).notNull(),

  dataType: varchar("data_type", { length: 100 }).notNull(), // personal_data, sensitive_data, etc.

  flowType: varchar("flow_type", { length: 100 }).notNull(), // internal, external, third_party

  processId: integer("process_id"), // Link to business process

  legalBasis: text("legal_basis"),

  frequency: varchar("frequency", { length: 50 }), // real_time, daily, weekly, etc.

  volume: varchar("volume", { length: 100 }), // records_per_day, mb_per_hour, etc.

  securityMeasures: text("security_measures"),

  countries: json("countries").$type<Array<{ country: string, purpose: string }>>(), // Cross-border flows

  flowMetadata: json("flow_metadata").$type<{

    technologies: string[],

    protocols: string[],

    storageDuration: string,

    retentionPeriod: string

  }>(),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientIdIdx: index("idx_dataflow_client").on(table.clientId),

    processIdx: index("idx_dataflow_process").on(table.processId),

    sourceIdx: index("idx_dataflow_source").on(table.sourceSystem),

    targetIdx: index("idx_dataflow_target").on(table.targetSystem),

  };

});

export const dataFlowConnections = pgTable("data_flow_connections", {

  id: serial("id").primaryKey(),

  flowId: integer("flow_id").notNull().references(() => dataFlowVisualizations.id),

  sourceNodeId: integer("source_node_id").notNull().references(() => dataFlowNodes.id),

  targetNodeId: integer("target_node_id").notNull().references(() => dataFlowNodes.id),

  connectionType: varchar("connection_type", { length: 50 }).notNull(), // api, file_transfer, manual

  dataType: varchar("data_type", { length: 100 }).notNull(),

  frequency: varchar("frequency", { length: 50 }),

  securityControls: text("security_controls"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),

});

// Types

export const integrationDefinitions = pgTable("integration_definitions", {

  id: serial("id").primaryKey(),

  provider: varchar("provider", { length: 50 }).notNull(), // 'jira', 'slack'

  name: varchar("name", { length: 100 }).notNull(), // 'Jira Cloud', 'Slack'

  clientId: text("client_id").notNull(),

  clientSecret: text("client_secret").notNull(),

  scopes: text("scopes"), // Space separated scopes

  redirectUri: text("redirect_uri"), // Optional override

  isActive: boolean("is_active").default(true),

  tenantId: integer("tenant_id"),
  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {
  return {
    providerTenantIdUnique: {
      columns: [table.provider, table.tenantId],
      name: "integration_definitions_provider_tenant_unique"
    }
  };
});

export const complianceRequirements = pgTable("compliance_requirements", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  key: varchar("key", { length: 100 }).notNull(), // e.g., 'code_of_conduct', 'aup'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isMandatory: boolean("is_mandatory").default(true),
  displayOrder: integer("display_order").default(0),
  category: varchar("category", { length: 100 }).default("General"),
  estimatedTimeMinutes: integer("estimated_time_minutes").default(5),
  documentType: varchar("document_type", { length: 50 }).default("acknowledgment"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_comp_req_client").on(table.clientId),
  };
});

export const crmEngagements = pgTable("crm_engagements", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(), // e.g., "SOC 2 Type II 2024"

  stage: crmEngagementStageEnum("stage").default("planned"),

  framework: varchar("framework", { length: 100 }), // e.g., "SOC 2"

  priority: varchar("priority", { length: 50 }).default("medium"),

  targetDate: timestamp("target_date"),

  progress: integer("progress").default(0), // 0-100

  owner: varchar("owner", { length: 255 }),

  // Compliance Metrics

  controlsCount: integer("controls_count").default(0),

  mitigatedRisksCount: integer("mitigated_risks_count").default(0),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const cloudConnections = pgTable("cloud_connections", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  provider: varchar("provider", { length: 50 }).notNull(), // aws, azure, gcp

  name: varchar("name", { length: 255 }).notNull(),

  credentials: text("credentials").notNull(), // Encrypted JSON with access keys

  region: varchar("region", { length: 100 }),

  status: varchar("status", { length: 50 }).default("pending"), // pending, connected, error

  lastSyncAt: timestamp("last_sync_at"),

  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const cloudAssets = pgTable("cloud_assets", {

  id: serial("id").primaryKey(),

  connectionId: integer("connection_id").notNull(),

  clientId: integer("client_id").notNull(),

  assetType: varchar("asset_type", { length: 100 }).notNull(), // ec2, s3, iam_user, vm, storage_account, etc.

  assetId: varchar("asset_id", { length: 255 }).notNull(), // Provider's asset ID

  name: varchar("name", { length: 255 }),

  region: varchar("region", { length: 100 }),

  metadata: json("metadata"), // Additional provider-specific details

  complianceStatus: varchar("compliance_status", { length: 50 }).default("unknown"), // compliant, non_compliant, unknown

  lastScannedAt: timestamp("last_scanned_at"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const issueTrackerConnections = pgTable("issue_tracker_connections", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  provider: varchar("provider", { length: 50 }).notNull(), // jira, linear

  name: varchar("name", { length: 255 }).notNull(),

  baseUrl: varchar("base_url", { length: 1024 }), // For Jira self-hosted

  credentials: text("credentials").notNull(), // Encrypted: API token, OAuth tokens

  projectKey: varchar("project_key", { length: 100 }), // Default project for syncing

  status: varchar("status", { length: 50 }).default("pending"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const remediationPlans = pgTable("remediation_plans", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(), // e.g., "ISO 27001 Remediation Q1-Q2"

  status: varchar("status", { length: 50 }).default("draft"), // draft, active, completed, archived

  startDate: timestamp("start_date").defaultNow(),

  targetDate: timestamp("target_date"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const clientFrameworks = pgTable("client_frameworks", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  version: varchar("version", { length: 50 }),

  sourceFileName: varchar("source_file_name", { length: 255 }),

  importedAt: timestamp("imported_at").defaultNow(),

  status: varchar("status", { length: 50 }).default("active"),

});

export const treatmentControls = pgTable("treatment_controls", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull().default(0), // Default 0 for migration, should be required

  treatmentId: integer("treatment_id").notNull(),

  controlId: integer("control_id").notNull(),

  effectiveness: varchar("effectiveness", { length: 50 }), // effective, partially_effective, ineffective

  implementationNotes: text("implementation_notes"),

  notes: text("notes"), // Added for consistency with plan if needed, or alias implementationNotes

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    treatmentIdx: index("idx_tc_treatment").on(table.treatmentId),

    controlIdx: index("idx_tc_control").on(table.controlId),

  };

});

export const kris = pgTable("kris", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  status: varchar("status", { length: 50 }).default("active"), // active, archived

  // Threshold definitions

  thresholdGreen: text("threshold_green"), // e.g., "< 7 days"

  thresholdAmber: text("threshold_amber"), // e.g., "7-30 days"

  thresholdRed: text("threshold_red"),     // e.g., "> 30 days"

  // Current State

  currentValue: text("current_value"),

  currentStatus: varchar("current_status", { length: 50 }).default("green"), // green, amber, red

  owner: varchar("owner", { length: 255 }),

  lastUpdated: timestamp("last_updated").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientKriIdx: index("idx_kri_client").on(table.clientId),

  };

});

export const crmActivities = pgTable("crm_activities", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  userId: integer("user_id").notNull(), // Performed by

  type: varchar("type", { length: 50 }).notNull(), // email, call, meeting, note, task

  subject: varchar("subject", { length: 500 }),

  content: text("content"),

  outcome: varchar("outcome", { length: 255 }), // e.g. "Scheduled demo", "Left voicemail"

  occurredAt: timestamp("occurred_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_crm_activity_client").on(table.clientId),

    occurredIdx: index("idx_crm_activity_date").on(table.occurredAt),

  };

});

export const securityTestFindings = pgTable("security_test_findings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  testId: integer("test_id").references(() => securityTests.id),
  title: varchar("title", { length: 500 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull(),
  description: text("description"),
  remediationStatus: varchar("status", { length: 50 }).default("open"),
  targetAssetId: integer("asset_id").references(() => assets.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recoveryObjectives = pgTable("recovery_objectives", {

  id: serial("id").primaryKey(),

  biaId: integer("bia_id").notNull(),

  activity: varchar("activity", { length: 255 }).notNull(),

  criticality: varchar("criticality", { length: 50 }), // low, medium, high, critical

  rto: varchar("rto", { length: 50 }), // e.g., "4 hours", "24 hours"

  rpo: varchar("rpo", { length: 50 }), // e.g., "1 hour"

  mtpd: varchar("mtpd", { length: 50 }), // Max Tolerable Period of Disruption

  dependencies: text("dependencies"), // Upstream/downstream dependencies

  resources: text("resources"), // Required resources (people, tech, data)

  createdAt: timestamp("created_at").defaultNow(),

});

export const planChangeLog = pgTable("plan_change_log", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  userId: integer("user_id").notNull(),

  action: varchar("action", { length: 50 }).notNull(), // 'create', 'update', 'approve', 'publish'

  details: text("details"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const bcApprovals = pgTable("bc_approvals", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'plan', 'bia', 'strategy'

  entityId: integer("entity_id").notNull(),

  approverId: integer("approver_id").notNull(),

  status: varchar("status", { length: 50 }).default('pending'), // pending, approved, rejected

  requestedAt: timestamp("requested_at").defaultNow(),

  respondedAt: timestamp("responded_at"),

  comments: text("comments"), // Optional rejection reason or approval note

});

export const financialImpacts = pgTable("financial_impacts", {

  id: serial("id").primaryKey(),

  biaId: integer("bia_id").notNull(),

  lossCategory: varchar("loss_category", { length: 100 }).notNull(), // 'Revenue', 'Productivity', 'Penalties'

  amountPerUnit: integer("amount_per_unit"), // e.g., $ loss per hour

  unit: varchar("unit", { length: 50 }), // 'hour', 'day', 'event'

  description: text("description"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const escalationRules = pgTable("escalation_rules", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  isActive: boolean("is_active").default(true),

  // Trigger conditions

  trigger: escalationTriggerEnum("trigger").notNull(),

  entityType: governanceEntityTypeEnum("entity_type"), // null = applies to all

  // Trigger parameters (JSON for flexibility)

  triggerConditions: json("trigger_conditions").$type<{

    overdueDays?: number;

    riskThreshold?: number;

    statusFrom?: string;

    statusTo?: string;

    [key: string]: any;

  }>(),

  // Actions to take

  actions: json("actions").$type<{

    createWorkItem?: boolean;

    notifyAccountable?: boolean;

    notifyResponsible?: boolean;

    sendEmail?: boolean;

    createTask?: boolean;

    escalateToRole?: string; // 'admin', 'owner', etc.

    [key: string]: any;

  }>().default({}),

  // Priority for the created work item

  workItemPriority: workItemPriorityEnum("work_item_priority").default("high"),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientActiveIdx: index("idx_er_client_active").on(table.clientId, table.isActive),

    triggerIdx: index("idx_er_trigger").on(table.trigger),

  };

});

export const governanceEvents = pgTable("governance_events", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  // Entity information

  entityType: governanceEntityTypeEnum("entity_type").notNull(),

  entityId: integer("entity_id").notNull(),

  entityName: varchar("entity_name", { length: 500 }), // Denormalized for quick display

  // Event details

  eventType: varchar("event_type", { length: 100 }).notNull(), // 'status_change', 'approval', 'rejection', 'assignment', etc.

  fromState: varchar("from_state", { length: 100 }),

  toState: varchar("to_state", { length: 100 }),

  action: varchar("action", { length: 100 }), // 'approve', 'reject', 'assign', 'transition', etc.

  // Actor

  actorUserId: integer("actor_user_id"),

  actorName: varchar("actor_name", { length: 255 }), // Denormalized

  // Additional context

  metadata: json("metadata").$type<{

    reason?: string;

    comment?: string;

    assignedTo?: string;

    previousAssignee?: string;

    workItemId?: number;

    [key: string]: any;

  }>(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientEntityIdx: index("idx_ge_client_entity").on(table.clientId, table.entityType, table.entityId),

    clientCreatedIdx: index("idx_ge_client_created").on(table.clientId, table.createdAt),

    entityTypeIdx: index("idx_ge_entity_type").on(table.entityType),

  };

});

export const federalSSPs = pgTable("federal_ssps", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),

  title: varchar("title", { length: 255 }).notNull(),

  framework: varchar("framework", { length: 50 }).notNull(), // NIST 800-171 or NIST 800-172

  systemName: varchar("system_name", { length: 255 }),

  systemType: varchar("system_type", { length: 255 }),

  boundaryDescription: text("boundary_description"),

  responsibleRole: varchar("responsible_role", { length: 255 }),

  content: text("content").default('{}'), // Monolithic JSON storage for SSP sections

  status: varchar("status", { length: 50 }).default('draft'),

  version: integer("version").default(1),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const federalPoams = pgTable("federal_poams", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),

  title: varchar("title", { length: 255 }).notNull(),

  sourceSspId: integer("source_ssp_id"),// .references(() => federalSSPs.id),

  status: varchar("status", { length: 50 }).default('active'),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const federalSspSections = pgTable("federal_ssp_sections", {

  id: serial("id").primaryKey(),

  sspId: integer("ssp_id").notNull(),

  sectionKey: varchar("section_key", { length: 100 }).notNull(), // 'system_identification', 'system_boundary', 'operational_environment', 'roles_responsibilities', 'attachments'

  content: json("content"), // Flexible JSON for various fields

  updatedAt: timestamp("updated_at").defaultNow(),

  fismaSystemId: integer("fisma_system_id"),
});

export const federalFipsCategorizations = pgTable("federal_fips_categorizations", {
  id: serial("id").primaryKey(),
  sspId: integer("ssp_id").unique().notNull(),

  // Security Objectives
  securityObjectiveConfidentiality: varchar("security_objective_confidentiality", { length: 20 }).default('low'), // low, moderate, high
  securityObjectiveIntegrity: varchar("security_objective_integrity", { length: 20 }).default('low'),
  securityObjectiveAvailability: varchar("security_objective_availability", { length: 20 }).default('low'),

  // Rationale
  rationaleConfidentiality: text("rationale_confidentiality"),
  rationaleIntegrity: text("rationale_integrity"),
  rationaleAvailability: text("rationale_availability"),

  // Information Types (array of types affecting the system)
  informationTypes: json("information_types").$type<{
    type: string;
    impact: 'low' | 'moderate' | 'high';
    description?: string;
  }[]>().default([]),

  updatedAt: timestamp("updated_at").defaultNow(),
  fismaSystemId: integer("fisma_system_id"),
});

export const federalSarFindings = pgTable("federal_sar_findings", {

  id: serial("id").primaryKey(),

  sarId: integer("sar_id").notNull(),

  controlId: varchar("control_id", { length: 50 }).notNull(),

  result: varchar("result", { length: 50 }).default('other_than_satisfied'), // satisfied, other_than_satisfied

  observation: text("observation"),

  riskLevel: varchar("risk_level", { length: 20 }), // low, moderate, high

  remediationPlan: text("remediation_plan"),

  // DoD SAR Table Columns

  overlay: varchar("overlay", { length: 100 }),

  naJustification: text("na_justification"),

  vulnerabilitySummary: text("vulnerability_summary"),

  vulnerabilitySeverity: varchar("vulnerability_severity", { length: 20 }),

  residualRiskLevel: varchar("residual_risk_level", { length: 20 }),

  recommendations: text("recommendations"),

  updatedAt: timestamp("updated_at").defaultNow(),

  fismaSystemId: integer("fisma_system_id"),
});

export const federalFismaSystems = pgTable("federal_fisma_systems", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  acronym: varchar("acronym", { length: 20 }), // System acronym e.g. ECO, HRIS
  owner: varchar("owner", { length: 255 }), // System owner name
  fips199Overall: varchar("fips_199_overall", { length: 20 }), // Low, Moderate, High
  description: text("description"),
  status: varchar("status", { length: 50 }), // Active, Retired, Planned
  controlsCount: integer("controls_count").default(0), // Computed: linked controls
  assetsCount: integer("assets_count").default(0), // Computed: linked assets
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const federalSprsAssessments = pgTable("federal_sprs_assessments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  score: integer("score").default(110), // NIST 800-171 max score
  assessmentDate: timestamp("assessment_date").defaultNow(),
  scopeDescription: text("scope_description"),
  status: varchar("status", { length: 50 }).default("Active"), // Active, Archived, Submitted
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const federalDisaStigChecklists = pgTable("federal_disa_stig_checklists", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // Server, Database, Network, Application
  assetIdentifier: varchar("asset_identifier", { length: 255 }),
  overallStatus: varchar("overall_status", { length: 50 }), // Compliant, Non-Compliant, Mixed
  findingsCount: integer("findings_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const federalFips140ModuleAssets = pgTable("federal_fips_140_module_assets", {
  id: serial("id").primaryKey(),
  fipsModuleId: integer("fips_module_id").notNull().references(() => federalFips140Modules.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const globalCrmActivities = pgTable("global_crm_activities", {

  id: serial("id").primaryKey(),

  contactId: integer("contact_id").notNull(), // FK to global_contacts

  type: varchar("type", { length: 50 }).notNull(), // 'call', 'email', 'meeting', 'note', 'task'

  subject: varchar("subject", { length: 255 }),

  description: text("description"),

  outcome: varchar("outcome", { length: 100 }), // 'completed', 'no_answer', 'scheduled', 'cancelled'

  scheduledAt: timestamp("scheduled_at"),

  completedAt: timestamp("completed_at"),

  duration: integer("duration"), // in minutes

  createdBy: integer("created_by"), // FK to users

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    contactIdx: index("idx_gcrm_act_contact").on(table.contactId),

    typeIdx: index("idx_gcrm_act_type").on(table.type),

  };

});

export const globalCrmNotes = pgTable("global_crm_notes", {

  id: serial("id").primaryKey(),

  contactId: integer("contact_id").notNull(), // FK to global_contacts

  content: text("content").notNull(),

  isPinned: boolean("is_pinned").default(false),

  createdBy: integer("created_by"), // FK to users

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    contactIdx: index("idx_gcrm_notes_contact").on(table.contactId),

  };

});

export const globalCrmDeals = pgTable("global_crm_deals", {

  id: serial("id").primaryKey(),

  contactId: integer("contact_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  value: integer("value").notNull(), // in cents

  probability: integer("probability").default(0), // 0-100

  stage: varchar("stage", { length: 50 }).notNull(), // 'discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'

  expectedCloseDate: timestamp("expected_close_date"),

  description: text("description"),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    contactIdx: index("idx_gcrm_deals_contact").on(table.contactId),

    stageIdx: index("idx_gcrm_deals_stage").on(table.stage),

  };

});

export const globalCrmContactTags = pgTable("global_crm_contact_tags", {

  id: serial("id").primaryKey(),

  contactId: integer("contact_id").notNull(),

  tagId: integer("tag_id").notNull(),

}, (table) => {

  return {

    contactTagIdx: uniqueIndex("idx_gcrm_contact_tag").on(table.contactId, table.tagId),

  };

});

export const dsarRequests = pgTable("dsar_requests", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  // Request Details

  requestId: varchar("request_id", { length: 50 }).notNull(), // Unique ID e.g., DSAR-2024-001

  requestType: varchar("request_type", { length: 50 }).notNull(), // Access, Deletion, Rectification, Portability, Restriction

  status: varchar("status", { length: 50 }).default("New"), // New, Verifying Identity, In Progress, Review, Completed, Rejected

  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, critical

  // Requester Info

  subjectEmail: varchar("subject_email", { length: 255 }),

  subjectName: varchar("subject_name", { length: 255 }),

  verificationStatus: varchar("verification_status", { length: 50 }).default("Pending"), // Pending, Verified, Failed

  verificationMethod: varchar("verification_method", { length: 100 }), // e.g., "Email Validation", "Passport"

  submissionMethod: varchar("submission_method", { length: 50 }).default("manual"), // email, form, portal, manual

  // Workflow

  requestDate: timestamp("request_date").defaultNow(),

  dueDate: timestamp("due_date"), // Auto-calculated target

  completedDate: timestamp("completed_date"),

  assigneeId: integer("assignee_id"), // Internal user handling the request

  // Resolution

  resolutionNotes: text("resolution_notes"),

  // Structured Response Data (GDPR Art. 15)

  responseData: jsonb("response_data").$type<{

    personalDataFound: boolean;

    dataCategories: string[];

    purposes: string[];

    recipients: string[];

    lawfulBasis: string[];

    retentionPeriod: string;

    sources: string;

    rightsInfo: string;

  }>(),

  // Audit Log

  auditLog: jsonb("audit_log").$type<{

    action: string;

    user: string;

    timestamp: string;

    details?: string;

  }[]>().default([]),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientDsarIdx: index("idx_dsar_client").on(table.clientId),

    statusIdx: index("idx_dsar_status").on(table.status),

    emailIdx: index("idx_dsar_email").on(table.subjectEmail),

  };

});

export const sammMaturityAssessments = pgTable("samm_maturity_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  practiceId: varchar("practice_id", { length: 50 }).notNull(), // e.g., 'SM-1'

  maturityLevel: integer("maturity_level").notNull().default(0),

  targetLevel: integer("target_level").notNull().default(1),

  evidenceLinks: jsonb("evidence_links").$type<number[]>().default([]), // Array of evidence IDs

  notes: text("notes"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientPracticeIdx: uniqueIndex("idx_samm_client_practice").on(table.clientId, table.practiceId),

  };

});

export const sammStreamAssessments = pgTable("samm_stream_assessments", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  // Practice identification (e.g., "SM", "PC", "EG")
  practiceId: varchar("practice_id", { length: 10 }).notNull(),

  // Stream identification ("A" or "B")
  streamId: varchar("stream_id", { length: 1 }).notNull(),

  // Maturity levels (0-3)
  maturityLevel: integer("maturity_level").notNull().default(0),
  targetLevel: integer("target_level").notNull().default(1),

  // Assessment details - stores Yes/No answers to assessment questions
  // Format: { "level1": true, "level2": false, "level3": false }
  assessmentAnswers: jsonb("assessment_answers").$type<Record<string, boolean>>().default({}),

  // Quality criteria checklist
  // Format: { "level1": { "criteria1": true, "criteria2": false, ... }, ... }
  qualityCriteria: jsonb("quality_criteria").$type<Record<string, Record<string, boolean>>>().default({}),

  // Assessment metadata
  assessmentDate: timestamp("assessment_date"),
  assessedBy: integer("assessed_by"), // User ID who performed the assessment

  // Documentation and evidence
  evidence: jsonb("evidence").$type<string[]>().default([]), // URLs or file paths
  notes: text("notes"),
  improvementNotes: text("improvement_notes"),

  // Specific notes per level
  // Format: { "1": "Notes for level 1", "2": "Notes for level 2", ... }
  levelNotes: jsonb("level_notes").$type<Record<string, string>>().default({}),
  criteriaNotes: jsonb("criteria_notes").$type<Record<string, Record<string, string>>>().default({}),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {
  return {
    // Unique constraint: one assessment per client per stream
    clientPracticeStreamIdx: uniqueIndex("idx_samm_client_practice_stream")
      .on(table.clientId, table.practiceId, table.streamId),
  };
});

export const sammStreamQuestions = pgTable("samm_stream_questions", {
  id: serial("id").primaryKey(),

  // Stream identification
  practiceId: varchar("practice_id", { length: 10 }).notNull(), // e.g., "SM"
  practiceName: varchar("practice_name", { length: 100 }).notNull(), // e.g., "Strategy and Metrics"
  streamId: varchar("stream_id", { length: 1 }).notNull(), // "A" or "B"
  streamName: varchar("stream_name", { length: 100 }).notNull(), // e.g., "Create and Promote"
  streamDescription: text("stream_description"),

  // Level identification (0, 1, 2, or 3)
  level: integer("level").notNull(),
  levelName: varchar("level_name", { length: 50 }), // e.g., "Initial", "Defined", "Optimized"

  // Assessment question
  question: text("question").notNull(), // The main assessment question

  // Quality criteria - array of strings
  qualityCriteria: jsonb("quality_criteria").$type<string[]>().default([]),

  // Activities required at this level
  activities: jsonb("activities").$type<string[]>().default([]),

  // Benefits of achieving this level
  benefits: text("benefits"),

  // Maturity indicators - what to look for
  maturityIndicators: jsonb("maturity_indicators").$type<string[]>().default([]),

  // Suggested evidence types
  suggestedEvidence: jsonb("suggested_evidence").$type<string[]>().default([]),

  // Business function (Governance, Design, Implementation, Verification, Operations)
  businessFunction: varchar("business_function", { length: 50 }).notNull(),

  // Official SAMM documentation links
  officialLink: varchar("official_link", { length: 500 }),

  // Metadata
  isActive: boolean("is_active").default(true),
  version: varchar("version", { length: 20 }).default("2.0"), // SAMM version

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {
  return {
    // Unique constraint: one question set per stream per level
    practiceStreamLevelIdx: uniqueIndex("idx_samm_practice_stream_level")
      .on(table.practiceId, table.streamId, table.level),
  };
});

export const sammPractices = pgTable("samm_practices", {
  id: serial("id").primaryKey(),

  practiceId: varchar("practice_id", { length: 10 }).notNull().unique(), // e.g., "SM"
  practiceName: varchar("practice_name", { length: 100 }).notNull(),
  description: text("description"),

  businessFunction: varchar("business_function", { length: 50 }).notNull(),

  // Stream definitions
  streamAName: varchar("stream_a_name", { length: 100 }),
  streamADescription: text("stream_a_description"),
  streamBName: varchar("stream_b_name", { length: 100 }),
  streamBDescription: text("stream_b_description"),

  // Additional metadata
  officialLink: varchar("official_link", { length: 500 }),
  order: integer("order"), // Display order

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const processingActivityAssets = pgTable("processing_activity_assets", {

  id: serial("id").primaryKey(),

  processingActivityId: integer("processing_activity_id").notNull().references(() => processingActivities.id, { onDelete: 'cascade' }),

  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),

  createdAt: timestamp("created_at").defaultNow()

}, (table) => {

  return {

    paIdx: index("idx_paa_pa").on(table.processingActivityId),

    assetIdx: index("idx_paa_asset").on(table.assetId),

  };

});

export const complianceCertificates = pgTable("compliance_certificates", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  frameworkId: integer("framework_id").references(() => complianceFrameworks.id),
  auditId: integer("audit_id").references(() => certificationAudits.id),

  certificateNumber: varchar("certificate_number", { length: 255 }),
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),

  status: varchar("status", { length: 50 }).default("active"), // active, expired, suspended, revoked

  documentUrl: text("document_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const magicLinks = pgTable("magic_links", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  label: varchar("label", { length: 255 }), // e.g., "Early Adopter Pro Link"
  email: varchar("email", { length: 255 }), // Optional: restrict to specific email
  role: varchar("role", { length: 50 }).default("viewer"),
  planTier: varchar("plan_tier", { length: 50 }).default("consultant"), // free, pro, enterprise
  maxClients: integer("max_clients").default(2), // e.g., 2 for Pro, 10 for Enterprise
  accessDurationType: varchar("access_duration_type", { length: 50 }), // 'lifetime', 'limited'
  accessDurationDays: integer("access_duration_days"), // e.g., 14 for 2 weeks
  waitlistId: integer("waitlist_id"), // Reference to waiting_list table
  status: varchar("status", { length: 50 }).default("active"), // active, accepted, revoked
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
  usedByUserId: integer("used_by_user_id"),
  expiresAt: timestamp("expires_at"), // Link expiration (different from access duration)
  usageLimit: integer("usage_limit").default(1), // null = unlimited
  useCount: integer("use_count").default(0),
  restrictedDomains: json("restricted_domains").$type<string[]>(), // e.g. ["intellfence.com"]
});

export const asvsCategories = pgTable("asvs_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g., "V1"
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Architecture, Design and Threat Modeling"
  description: text("description"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ASVS Chapters (Sub-categories if needed, but usually flattened to Requirements. 
// However, ASVS structure is V1 -> 1.1 -> 1.1.1. 
// We will store individual requirements and link them to the Category V1, V2 etc.
// We will simply store the "Chapter" (1.1, 1.2) as a string property on the requirement for grouping.)

// ASVS Requirements (Reference Data)

export const federalInheritances = pgTable("federal_inheritances", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  packageId: integer("package_id").notNull(),
  partnerName: varchar("partner_name", { length: 255 }).notNull(),
  controlId: varchar("control_id", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  fismaSystemId: integer("fisma_system_id"),
}, (table) => {
  return {
    clientPkgIdx: index("idx_fed_inh_client_pkg").on(table.clientId, table.packageId),
  };
});

export const nist80030ThreatSources = pgTable("nist_80030_threat_sources", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),
  type: varchar("type", { length: 100 }).notNull(), // Adversarial, Accidental, Structural, Environmental
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  capability: varchar("capability", { length: 50 }), // Very High, High, Moderate, Low, Very Low
  intent: varchar("intent", { length: 50 }), // Very High, High, Moderate, Low, Very Low
  targeting: varchar("targeting", { length: 50 }), // Very High, High, Moderate, Low, Very Low
  motive: varchar("motive", { length: 255 }),
  rangeOfEffects: varchar("range_of_effects", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active"), // active, inactive, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientTypeIdx: index("idx_n80030_ts_client_type").on(table.clientId, table.type),
  };
});

export const nist80030ThreatEvents = pgTable("nist_80030_threat_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),
  threatSourceId: integer("threat_source_id"), // FK to nist80030ThreatSources
  eventId: varchar("event_id", { length: 50 }), // TE-01, TE-02, etc.
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  sourceType: varchar("source_type", { length: 100 }), // Adversarial, Accidental, Structural, Environmental
  relevance: varchar("relevance", { length: 50 }), // Confirmed, Expected, Predicted, Possible, N/A
  likelihood: varchar("likelihood", { length: 50 }), // Very High, High, Moderate, Low, Very Low
  vulnerabilitiesPredispositions: text("vulnerabilities_predispositions"),
  targetedAssets: text("targeted_assets"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_n80030_te_client").on(table.clientId),
    sourceIdx: index("idx_n80030_te_source").on(table.threatSourceId),
  };
});

export const learningFrameworks = pgTable("learning_frameworks", {
  id: serial("id").primaryKey(),
  frameworkId: varchar("framework_id", { length: 50 }).notNull().unique(), // e.g., "iso-27001", "soc-2"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 50 }).default("bg-blue-600"), // Tailwind color class
  icon: varchar("icon", { length: 100 }), // Lucide icon name
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const learningSections = pgTable("learning_sections", {
  id: serial("id").primaryKey(),
  frameworkId: integer("framework_id").notNull(),
  sectionId: varchar("section_id", { length: 100 }).notNull(), // e.g., "intro", "cia-triad"
  title: varchar("title", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 100 }), // Lucide icon name
  content: text("content").notNull(), // HTML content
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    frameworkIdx: index("idx_learning_sections_framework").on(table.frameworkId),
    uniqueSection: uniqueIndex("idx_learning_sections_unique").on(table.frameworkId, table.sectionId),
  };
});

// ============================================================================
// Federal Contracts (DFARS/CMMC)
// ============================================================================

export const federalContracts = pgTable("federal_contracts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  agencyName: varchar("agency_name", { length: 255 }),
  contractNumber: varchar("contract_number", { length: 255 }),
  type: varchar("type", { length: 50 }).default("prime"), // prime, subcontractor
  status: varchar("status", { length: 50 }).default("active"), // active, prospective, completed
  fismaSystemId: integer("fisma_system_id"), // Optional scoping
  dfars7012: boolean("dfars_7012").default(false),
  dfars7019: boolean("dfars_7019").default(false),
  dfars7020: boolean("dfars_7020").default(false),
  dfars7021: boolean("dfars_7021").default(false),
  far5220421: boolean("far_52_204_21").default(false),
  cmmcLevel: varchar("cmmc_level", { length: 20 }),
  section889Status: varchar("section_889_status", { length: 50 }).default("not_required"), // not_required, pending, compliant
  section889Representative: varchar("section_889_representative", { length: 255 }),
  section889Date: timestamp("section_889_date"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_fed_ctrcts_client").on(table.clientId),
  };
});

export const companyMemoryNodes = pgTable("company_memory_nodes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  path: varchar("path", { length: 500 }).notNull(), // e.g. "/infrastructure/aws_prod", "/policies/access_control"
  parentPath: varchar("parent_path", { length: 500 }).notNull().default("/"),
  nodeType: varchar("node_type", { length: 50 }).notNull().default("document"), // folder, document, fact, web_intel, asset_profile
  title: varchar("title", { length: 255 }).notNull(),
  summaryL0: text("summary_l0"), // Compact directory/L0 summary for token-efficient prompt context
  contentL2: text("content_l2"), // Full document content / raw markdown / specs
  metadata: jsonb("metadata").$type<{
    tags?: string[];
    source?: string;
    url?: string;
    author?: string;
    confidence?: number;
    frameworks?: string[];
    extractedFactsCount?: number;
    lastVerified?: string;
  }>().default({}),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientPathIdx: uniqueIndex("idx_cmn_client_path").on(table.clientId, table.path),
    clientParentIdx: index("idx_cmn_client_parent").on(table.clientId, table.parentPath),
    nodeTypeIdx: index("idx_cmn_type").on(table.nodeType),
  };
});

export * from "./common";

export * from "./common";

export const dataFlowNodes = pgTable("data_flow_nodes", {

  id: serial("id").primaryKey(),

  flowId: integer("flow_id").notNull().references(() => dataFlowVisualizations.id),

  nodeType: varchar("node_type", { length: 50 }).notNull(), // system, process, storage, person

  nodeName: varchar("node_name", { length: 255 }).notNull(),

  nodeDescription: text("node_description"),

  nodeCategory: varchar("node_category", { length: 100 }), // internal_system, external_vendor, cloud_service

  positionX: integer("position_x").default(0),

  positionY: integer("position_y").default(0),

  nodeMetadata: json("node_metadata"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 50 }),
  channel: varchar("channel", { length: 20 }).default("email"), // email, system, push
  title: varchar("title", { length: 255 }),
  message: text("message"),
  link: text("link"),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
  status: varchar("status", { length: 20 }).default("sent"), // sent, failed, queued
  metadata: json("metadata"), // Context data
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // risk, policy, gap, questionnaire
  relatedEntityId: integer("related_entity_id"),
});

export const techSuggestions = pgTable("tech_suggestions", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  controlId: integer("control_id").notNull(),

  suggestionText: text("suggestion_text").notNull(),

  techId: varchar("tech_id", { length: 100 }),

  vendor: varchar("vendor", { length: 100 }),

  sources: json("sources").$type<{ type: string; id?: string; url?: string; title?: string }[]>(),

  createdBy: varchar("created_by", { length: 50 }).default("ai"),

  createdAt: timestamp("created_at").defaultNow(),

  status: varchar("status", { length: 50 }).default("proposed"), // proposed, accepted, rejected

  feedback: text("feedback"),

  appliedAt: timestamp("applied_at"),

}, (table) => {

  return {

    clientIdIdx: index("idx_ts_client").on(table.clientId),

    controlIdIdx: index("idx_ts_control").on(table.controlId),

  };

});

export const embeddings = pgTable("embeddings", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id"), // Optional: for client-specific embeddings

  entityType: varchar("entity_type", { length: 50 }), // Added to match DB

  entityId: varchar("entity_id", { length: 100 }), // Added to match DB

  docId: varchar("doc_id", { length: 100 }).notNull(),

  docType: varchar("doc_type", { length: 50 }).notNull(), // 'control', 'policy', 'catalog', 'article', 'evidence', 'vendor', 'knowledge'

  embeddingData: text("embedding_data"), // JSON stringified vector (legacy/fallback)

  embeddingVector: vector("embedding_vector"), // pgvector column (preferred)

  embedding: vector("embedding"), // Added to resolve migration conflict

  content: text("content"), // Original text content for reference

  metadata: json("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    docTypeIdx: index("idx_emb_doctype").on(table.docType),

    docIdIdx: index("idx_emb_docid").on(table.docId),

    clientIdIdx: index("idx_emb_client").on(table.clientId),

  };

});

export const vulnerabilities = pgTable("vulnerabilities", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vulnerabilityId: varchar("vulnerability_id", { length: 50 }).notNull(), // e.g. VULN-2024-001

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  cveId: varchar("cve_id", { length: 50 }),

  cvssScore: integer("cvss_score"), // Store as x10 (e.g. 7.5 -> 75) to avoid float issues

  severity: varchar("severity", { length: 50 }), // Critical, High, Medium, Low

  // Scope

  affectedAssets: json("affected_assets").$type<string[]>(), // Array of Asset IDs or Names

  // Discovery

  discoveryDate: timestamp("discovery_date"),

  source: varchar("source", { length: 100 }), // Scanner, Manual, Vendor

  // Technical Details

  exploitability: varchar("exploitability", { length: 255 }), // DoS, RCE, etc.

  impact: varchar("impact", { length: 255 }), // CIA Impact

  // Management

  status: vulnerabilityStatusEnum("status").default("open"),

  owner: varchar("owner", { length: 255 }),

  remediationPlan: text("remediation_plan"),

  dueDate: timestamp("due_date"),

  lastReviewDate: timestamp("last_review_date"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientVulnIdx: index("idx_vuln_client").on(table.clientId),

    clientStatusIdx: index("idx_vuln_client_status").on(table.clientId, table.status),

  };

});

export const cisaKevCache = pgTable("cisa_kev_cache", {

  id: serial("id").primaryKey(),

  cveId: varchar("cve_id", { length: 50 }).notNull().unique(),

  vendorProject: varchar("vendor_project", { length: 255 }),

  product: varchar("product", { length: 255 }),

  vulnerabilityName: varchar("vulnerability_name", { length: 500 }),

  shortDescription: text("short_description"),

  requiredAction: text("required_action"),

  dueDate: timestamp("due_date"), // CISA deadline for remediation

  knownRansomwareCampaignUse: boolean("known_ransomware_campaign_use").default(false),

  dateAdded: timestamp("date_added"),

  fetchedAt: timestamp("fetched_at").defaultNow(),

}, (table) => {

  return {

    kevCveIdx: index("idx_kev_cve_id").on(table.cveId),

  };

});

export const dataFlows = pgTable("process_data_flows", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id"), // Optional link to vendor

  name: varchar("name", { length: 255 }).notNull(),

  source: varchar("source", { length: 255 }),

  destination: varchar("destination", { length: 255 }),

  dataCategory: varchar("data_category", { length: 255 }), // e.g. "PII", "Financial"

  transferMechanism: varchar("transfer_mechanism", { length: 255 }),

  isCrossBorder: boolean("is_cross_border").default(false),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_pdf_client").on(table.clientId),

  };

});

export const globalVendors = pgTable("global_vendors", {

  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  website: varchar("website", { length: 512 }),

  trustCenterUrl: varchar("trust_center_url", { length: 512 }),

  platform: varchar("platform", { length: 100 }),

  faviconUrl: varchar("favicon_url", { length: 512 }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const processDependencies = pgTable("process_dependencies", {

  id: serial("id").primaryKey(),

  processId: integer("process_id").notNull(),

  dependencyType: varchar("dependency_type", { length: 50 }).notNull(), // 'upstream_process', 'downstream_process', 'it_system', 'vendor', 'people', 'facility'

  dependencyName: varchar("dependency_name", { length: 255 }).notNull(), // Name or reference to another entity

  dependencyId: integer("dependency_id"), // Optional FK if linking to internal entity

  criticality: varchar("criticality", { length: 50 }).default('medium'),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const biaQuestionnaires = pgTable("bia_questionnaires", {

  id: serial("id").primaryKey(),

  biaId: integer("bia_id").notNull(), // FK to business_impact_analyses

  question: text("question").notNull(),

  category: varchar("category", { length: 100 }), // e.g., Financial, Operational, Legal, Reputation

  response: text("response"),

  impactLevel: varchar("impact_level", { length: 50 }), // low, medium, high, critical

  notes: text("notes"),

  order: integer("order").default(0),

});

export const readinessAssessments = pgTable("readiness_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  status: varchar("status", { length: 50 }).default("in_progress"), // in_progress, completed
  standardId: varchar("standard_id", { length: 50 }).notNull().default("ISO27001"),

  currentStep: integer("current_step").default(1),

  // JSONB storage for the wizard steps

  scopeDetails: json("scope_details"),

  stakeholders: json("stakeholders"),

  existingPolicies: json("existing_policies"), // Checklist from step 3

  businessContext: json("business_context"),

  maturityExpectations: json("maturity_expectations"),

  // AI Generated Executive Report
  scopingReport: text("scoping_report"),

  // Framework Specific Questionnaire Answers
  questionnaireData: jsonb("questionnaire_data"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const poamItems = pgTable("poam_items", {

  id: serial("id").primaryKey(),

  poamId: integer("poam_id").notNull(),

  controlId: varchar("control_id", { length: 100 }),

  weaknessName: varchar("weakness_name", { length: 500 }),

  weaknessDescription: text("weakness_description"),

  weaknessDetectorSource: varchar("weakness_detector_source", { length: 255 }),

  sourceIdentifier: varchar("source_identifier", { length: 255 }),

  assetIdentifier: varchar("asset_identifier", { length: 255 }),

  pointOfContact: varchar("point_of_contact", { length: 255 }),

  resourcesRequired: text("resources_required"),

  overallRemediationPlan: text("overall_remediation_plan"),

  assigneeId: integer("assignee_id"),

  originalDetectionDate: timestamp("original_detection_date"),

  scheduledCompletionDate: timestamp("scheduled_completion_date"),

  milestones: json("milestones").$type<{

    description: string;

    scheduledDate: string;

    status: 'pending' | 'completed';

  }[]>(),

  milestoneChanges: json("milestone_changes"),

  status: varchar("status", { length: 50 }).default('open'), // open, closed, risk_accepted

  statusDate: timestamp("status_date"),

  vendorDependency: varchar("vendor_dependency", { length: 255 }),

  lastVendorCheckinDate: timestamp("last_vendor_checkin_date"),

  productName: varchar("product_name", { length: 255 }),

  originalRiskRating: varchar("original_risk_rating", { length: 50 }),

  adjustedRiskRating: varchar("adjusted_risk_rating", { length: 50 }),

  riskAdjustment: text("risk_adjustment"),

  falsePositive: boolean("false_positive").default(false),

  operationalRequirement: text("operational_requirement"),

  deviationRationale: text("deviation_rationale"),

  supportingDocuments: json("supporting_documents"),

  comments: text("comments"),

  autoApprove: boolean("auto_approve").default(false),

  relatedRiskId: integer("related_risk_id"), // Linked Risk Assessment

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const federalFips140Modules = pgTable("federal_fips_140_modules", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  moduleName: varchar("module_name", { length: 255 }).notNull(),
  vendor: varchar("vendor", { length: 255 }),
  certificateNumber: varchar("certificate_number", { length: 50 }),
  validationLevel: varchar("validation_level", { length: 20 }), // Level 1, 2, 3, 4
  validationVersion: varchar("validation_version", { length: 20 }), // 140-2, 140-3
  status: varchar("status", { length: 50 }), // Active, Historical, Revoked
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dataProtImpactAssessments = pgTable("data_protection_impact_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  activityId: integer("activity_id"), // Optional link to ROPA

  title: text("title").notNull(),

  description: text("description").notNull(),

  scope: text("scope").notNull(),

  identifiedRisks: text("identified_risks").notNull(),

  mitigationMeasures: text("mitigation_measures").notNull(),

  status: dpiaStatusEnum("status").default("draft"),

  assignedTo: integer("assigned_to"),

  lastReviewDate: timestamp("last_review_date"),

  questionnaireData: json("questionnaire_data"), // Full structured assessment data

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_dpia_client_status").on(table.clientId, table.status),

  };

});

export const internationalTransfers = pgTable("international_transfers", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  activityId: integer("activity_id"), // Link to ROPA

  vendorId: integer("vendor_id"), // Link to Vendor

  title: varchar("title", { length: 255 }).notNull(),

  destinationCountry: varchar("destination_country_code", { length: 2 }).notNull(),

  transferTool: transferToolEnum("transfer_tool").notNull(),

  sccModule: sccModuleEnum("scc_module"),

  status: internationalTransferStatusEnum("status").default("pending"),

  nextReviewDate: timestamp("next_review_date"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_transfer_client").on(table.clientId),

    statusIdx: index("idx_transfer_status").on(table.status),

  };

});

export const transferImpactAssessments = pgTable("transfer_impact_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  transferId: integer("transfer_id").notNull(),

  riskLevel: varchar("risk_level", { length: 50 }), // low, medium, high

  status: varchar("status", { length: 50 }).default("draft"), // draft, completed, reassessment_required

  questionnaireData: json("questionnaire_data"), // EDPB 6-step assessment data

  version: integer("version").default(1),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    transferIdx: index("idx_tia_transfer").on(table.transferId),

  };

});

export const programGuideAssignments = pgTable("program_guide_assignments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  guideType: varchar("guide_type", { length: 50 }).notNull(), // 'privacy', 'risk', 'vendor', 'governance', 'business-continuity'
  stepId: varchar("step_id", { length: 50 }).notNull(), // 'bia', 'scenarios', etc.
  userId: integer("user_id").notNull(), // Link to users table
  targetDate: timestamp("target_date"),
  assignedBy: integer("assigned_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_pga_client").on(table.clientId),
    uniqueStepIdx: uniqueIndex("idx_pga_unique_step").on(table.clientId, table.guideType, table.stepId),
  }
});

export * from "./common";

export * from "./common";

export const businessImpactAnalyses = pgTable("business_impact_analyses", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  projectId: integer("project_id"), // Optional link to a BCP Project cycle

  processId: integer("process_id"), // Optional link to specific process being analyzed

  title: varchar("title", { length: 255 }).notNull(),

  status: varchar("status", { length: 50 }).default('draft'),

  conductorId: integer("conductor_id"),

  approvedBy: integer("approved_by"),

  approvedAt: timestamp("approved_at"),

  methodology: text("methodology"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const taskAssignments = pgTable("task_assignments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  // Task Identification

  taskType: varchar("task_type", { length: 50 }).notNull(), // 'control', 'policy', 'evidence', 'remediation_task'

  taskId: integer("task_id").notNull(),

  // Assignment

  userId: integer("user_id").notNull(), // Link to users table

  raciRole: raciRoleEnum("raci_role").notNull(), // responsible, accountable, consulted, informed

  // Metadata

  assignedAt: timestamp("assigned_at").defaultNow(),

  assignedBy: integer("assigned_by"),

}, (table) => {

  return {

    clientIdx: index("idx_ta_client").on(table.clientId),

    taskIdx: index("idx_ta_task").on(table.taskType, table.taskId),

    userIdx: index("idx_ta_user").on(table.userId),

    uniqueAssignment: uniqueIndex("idx_ta_unique").on(table.taskType, table.taskId, table.userId, table.raciRole),

  };

});

export const strategicReports = pgTable("strategic_reports", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"), // Rich text HTML content

  roadmapId: integer("roadmap_id"), // Optional: Link to a strategic roadmap
  implementationPlanId: integer("implementation_plan_id"), // Optional: Link to an implementation plan

  status: varchar("status", { length: 50 }).default("draft"), // draft, review, final, archived
  version: varchar("version", { length: 50 }).default("1.0"),

  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_strat_rep_client").on(table.clientId),
    roadmapIdx: index("idx_strat_rep_roadmap").on(table.roadmapId),
  };
});

// ==========================================
// HARMONIZATION & COMMON CONTROLS (Phase 3)
// ==========================================

export * from "./common";

export * from "./common";

export const orgRoles = pgTable("org_roles", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"), // Summary

  responsibilities: text("responsibilities"), // Detailed Markdown

  department: varchar("department", { length: 255 }),

  reportingRoleId: integer("reporting_role_id"), // FK to self for hierarchy

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const onboardingTemplates = pgTable("onboarding_templates", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  roleType: varchar("role_type", { length: 100 }).default("general"),
  requirementKeys: jsonb("requirement_keys").notNull().default("[]"),
  trainingModuleIds: jsonb("training_module_ids").notNull().default("[]"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return { clientIdx: index("idx_otmpl_client").on(table.clientId) };
});

export const onboardingAssignments = pgTable("onboarding_assignments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  templateId: integer("template_id"),
  status: varchar("status", { length: 50 }).default("assigned"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return { clientIdx: index("idx_oassign_client").on(table.clientId), employeeIdx: index("idx_oassign_employee").on(table.clientId) };
});

export const remediationTasks = pgTable("remediation_tasks", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  clientControlId: integer("client_control_id"), // Link to control if applicable

  title: varchar("title", { length: 500 }).notNull(),

  description: text("description"),

  priority: varchar("priority", { length: 50 }).default("medium"), // low, medium, high, critical

  status: varchar("status", { length: 50 }).default("open"), // open, in_progress, resolved, closed

  dueDate: timestamp("due_date"),

  assigneeId: integer("assignee_id"), // Link to employee

  // External sync

  issueTrackerConnectionId: integer("issue_tracker_connection_id"),

  externalIssueId: varchar("external_issue_id", { length: 255 }), // Jira issue key or Linear ID

  externalIssueUrl: varchar("external_issue_url", { length: 1024 }),

  lastSyncedAt: timestamp("last_synced_at"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_rt_client_status").on(table.clientId, table.status),

    assigneeIdx: index("idx_rt_assignee").on(table.assigneeId),

  };

});

export const businessProcesses = pgTable("business_processes", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  ownerId: integer("owner_id"),

  parentId: integer("parent_id"), // For hierarchical process trees

  department: varchar("department", { length: 255 }),

  criticalityTier: varchar("criticality_tier", { length: 50 }), // Tier 1 (Critical), Tier 2, etc.

  rto: varchar("rto", { length: 50 }),

  rpo: varchar("rpo", { length: 50 }),

  mtpd: varchar("mtpd", { length: 50 }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const bcTrainingRecords = pgTable("bc_training_records", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  userId: integer("user_id").notNull(), // Trainee

  trainingType: varchar("training_type", { length: 100 }).notNull(), // 'awareness', 'role_based', 'simulation'

  completionDate: timestamp("completion_date"),

  expiryDate: timestamp("expiry_date"), // For certification renewal

  status: varchar("status", { length: 50 }).default('completed'), // completed, scheduled, overdue

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const workItems = pgTable("work_items", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  type: workItemTypeEnum("type").notNull(),

  status: workItemStatusEnum("status").default("pending"),

  priority: workItemPriorityEnum("priority").default("medium"),

  title: varchar("title", { length: 500 }).notNull(),

  description: text("description"),

  // Link to the entity this work item is about

  entityType: governanceEntityTypeEnum("entity_type"),

  entityId: integer("entity_id"),

  // Assignment (RACI-based)

  assignedToUserId: integer("assigned_to_user_id"),

  assignedToEmployeeId: integer("assigned_to_employee_id"),

  assignedRole: varchar("assigned_role", { length: 50 }), // 'accountable', 'responsible', etc.

  // Timing

  dueDate: timestamp("due_date"),

  completedAt: timestamp("completed_at"),

  // Escalation tracking

  isEscalated: boolean("is_escalated").default(false),

  escalatedAt: timestamp("escalated_at"),

  escalationRuleId: integer("escalation_rule_id"), // FK to escalation_rules

  // Metadata

  metadata: json("metadata").$type<{

    previousStatus?: string;

    approvalCount?: number;

    requiredApprovals?: number;

    rejectionReason?: string;

    [key: string]: any;

  }>(),

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_wi_client_status").on(table.clientId, table.status),

    assignedUserIdx: index("idx_wi_assigned_user").on(table.assignedToUserId),

    dueDateIdx: index("idx_wi_due_date").on(table.dueDate),

    entityIdx: index("idx_wi_entity").on(table.entityType, table.entityId),

  };

});

export const clientContacts = pgTable("client_contacts", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(), // FK to clients

  firstName: varchar("first_name", { length: 255 }),

  lastName: varchar("last_name", { length: 255 }),

  email: varchar("email", { length: 255 }),

  department: varchar("department", { length: 255 }),

  role: varchar("role", { length: 100 }), // 'stakeholder', 'auditor', 'vendor', 'employee'

  phone: varchar("phone", { length: 50 }),

  notes: text("notes"),

  createdBy: integer("created_by"), // FK to users

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_clc_client").on(table.clientId),

  };

});

export const processDataFlows = pgTable("process_data_flows", {

  id: serial("id").primaryKey(),

  processId: integer("process_id").notNull(), // Link to Business Process

  assetId: integer("asset_id"), // Link to Data Asset (if mapped to specific asset) 

  // Data Elements (if not strictly tied to an asset record, or to refine asset content)

  dataElements: text("data_elements"), // Description of specific data points (e.g. "Name, Email")

  // Processing Details

  interactionType: varchar("interaction_type", { length: 50 }), // Collection, Storage, Transmission, Use, Deletion

  legalBasis: varchar("legal_basis", { length: 100 }), // Consent, Contract, Legal Obligation, Vital Interests, Public Task, Legitimate Interests

  purpose: text("purpose"), // Specific purpose for this flow

  // Subjects & Recipients

  dataSubjectType: varchar("data_subject_type", { length: 100 }), // Employees, Customers, Patients, Minors

  recipients: text("recipients"), // Internal or External parties

  isCrossBorder: boolean("is_cross_border").default(false),

  transferMechanism: varchar("transfer_mechanism", { length: 100 }), // SCCs, Adequacy Decision

  // Retention

  retentionPeriod: varchar("retention_period", { length: 100 }),

  disposalMethod: varchar("disposal_method", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    procFlowIdx: index("idx_pdf_process").on(table.processId),

    assetFlowIdx: index("idx_pdf_asset").on(table.assetId),

  };

});

export const nist80030ImpactAssessments = pgTable("nist_80030_impact_assessments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),
  domain: varchar("domain", { length: 255 }).notNull(), // Business Operations, Corporate Assets, Personnel Safety, National Interests, etc.
  ciaType: varchar("cia_type", { length: 50 }), // Confidentiality, Integrity, Availability or null for domain-level
  magnitude: varchar("magnitude", { length: 50 }).notNull(), // Critical, High, Moderate, Low, Very Low
  magnitudeScore: integer("magnitude_score").default(0), // 0-100 numeric score
  description: text("description"),
  rationale: text("rationale"),
  // Contributing factors
  factorName: varchar("factor_name", { length: 255 }),
  factorLevel: varchar("factor_level", { length: 50 }),
  factorType: varchar("factor_type", { length: 50 }), // Amplifier, Dampener
  factorDescription: text("factor_description"),
  // Economic impact
  estimatedDailyImpact: integer("estimated_daily_impact"), // In cents
  revenueLossPct: integer("revenue_loss_pct"),
  legalFinesPct: integer("legal_fines_pct"),
  brandEquityPct: integer("brand_equity_pct"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientDomainIdx: index("idx_n80030_ia_client_domain").on(table.clientId, table.domain),
  };
});

export const clientPolicies = pgTable("client_policies", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  templateId: integer("template_id"),

  clientPolicyId: varchar("client_policy_id", { length: 50 }),

  name: varchar("name", { length: 255 }).notNull(),

  content: text("content"),

  status: policyStatusEnum("status").default("draft"),

  version: integer("version").default(1),

  owner: varchar("owner", { length: 255 }),

  module: varchar("module", { length: 50 }).default("general"), // Reverted enum to varchar to avoid casting error during push

  isAiGenerated: boolean("is_ai_generated").default(false),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

  // Collaboration Process
  reviewers: jsonb("reviewers").$type<string[]>(), // Array of emails or user IDs assigned for review
  reviewDueDate: timestamp("review_due_date"),
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // pending, requested, changes_requested, approved
  tailoringAnswers: jsonb("tailoring_answers").$type<Record<string, any>>(),
  lastReviewAlertSentAt: timestamp("last_review_alert_sent_at"),
  nextReviewDate: timestamp("next_review_date"),
}, (table) => {

  return {

    clientIdIdx: index("idx_cp_client").on(table.clientId),

    clientStatusIdx: index("idx_cp_client_status").on(table.clientId, table.status),

  };

});

export const iocRecords = pgTable("ioc_records", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").references(() => clients.id),

  indicator: varchar("indicator", { length: 1000 }).notNull(),

  type: varchar("type", { length: 50 }).notNull(), // ip, domain, hash, url, email, mutex, filename

  // Reputation and confidence
  reputation: varchar("reputation", { length: 20 }), // malicious, suspicious, clean, unknown

  confidence: integer("confidence"), // 0-100

  // Source information
  source: varchar("source", { length: 100 }), // feed name, manual, api

  sourceRef: varchar("source_ref", { length: 500 }), // link to original source

  // Enrichment data (from VirusTotal, AbuseIPDB, etc.)
  enrichment: jsonb("enrichment"),

  // Related CVEs
  cveIds: jsonb("cve_ids").$type<string[]>(),

  // MITRE ATT&CK associations
  mitreTechniques: jsonb("mitre_techniques").$type<string[]>(),

  mitreGroups: jsonb("mitre_groups").$type<string[]>(),

  // Tags and categorization
  tags: jsonb("tags").$type<string[]>(),

  category: varchar("category", { length: 100 }), // ransomware, apt, c2, phishing, etc.

  // Tracking
  firstSeen: timestamp("first_seen"),

  lastSeen: timestamp("last_seen"),

  lastEnriched: timestamp("last_enriched"),

  // Status
  status: varchar("status", { length: 20 }).default("active"), // active, expired, false-positive, contained

  // Manual override
  isManual: boolean("is_manual").default(false),

  notes: text("notes"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdBy: integer("created_by").references(() => users.id),

}, (table) => {

  return {

    iocIndicatorIdx: index("idx_ioc_indicator").on(table.indicator),

    iocTypeIdx: index("idx_ioc_type").on(table.type),

    iocReputationIdx: index("idx_ioc_reputation").on(table.reputation),

    iocClientIdx: index("idx_ioc_client_id").on(table.clientId),

    iocStatusIdx: index("idx_ioc_status").on(table.status),

  };

});

export const federalSARs = pgTable("federal_sars", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),
  fismaSystemId: integer("fisma_system_id"),

  sspId: integer("ssp_id"),// .references(() => federalSSPs.id), (Avoiding circular or missing reference errors if added in one go)

  title: varchar("title", { length: 255 }).notNull(),

  assessorName: varchar("assessor_name", { length: 255 }),

  assessmentDate: timestamp("assessment_date"),

  summaryOfFindings: text("summary_of_findings"),

  riskExecutiveSummary: text("risk_executive_summary"),

  // DoD SAR Header Fields

  systemAcronym: varchar("system_acronym", { length: 50 }),

  systemIdentification: varchar("system_identification", { length: 255 }),

  systemType: varchar("system_type", { length: 50 }),

  version: varchar("version", { length: 50 }),

  agency: varchar("agency", { length: 100 }), // CC/S/A/FA

  assessmentCompletionDate: timestamp("assessment_completion_date"),

  systemOwnerId: integer("system_owner_id"),

  confidentiality: varchar("confidentiality", { length: 20 }),

  integrity: varchar("integrity", { length: 20 }),

  availability: varchar("availability", { length: 20 }),

  impact: varchar("impact", { length: 20 }),

  packageType: varchar("package_type", { length: 100 }),

  executiveSummary: text("executive_summary"),

  status: varchar("status", { length: 50 }).default('draft'),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

});

export const processingActivities = pgTable("processing_activities", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Basic Info

  activityName: text("activity_name").notNull(),

  activityId: text("activity_id").notNull(),

  description: text("description"),

  // Controller/Processor Info

  role: varchar("role", { length: 50 }).notNull(), // 'controller' | 'processor' | 'joint_controller'

  controllerName: text("controller_name"),

  controllerContact: text("controller_contact"),

  dpoName: text("dpo_name"),

  dpoContact: text("dpo_contact"),

  representativeName: text("representative_name"),

  representativeContact: text("representative_contact"),

  // Processing Details

  purposes: json("purposes").$type<string[]>().notNull().default([]),

  legalBasis: varchar("legal_basis", { length: 100 }).notNull(), // 'consent', 'contract', 'legal_obligation', etc.

  // Data Categories

  dataCategories: json("data_categories").$type<string[]>().notNull().default([]),

  dataSubjectCategories: json("data_subject_categories").$type<string[]>().notNull().default([]),

  specialCategories: json("special_categories").$type<string[]>().default([]),

  // Recipients

  recipients: json("recipients").$type<any[]>().notNull().default([]),

  recipientCategories: json("recipient_categories").$type<string[]>().default([]),

  // International Transfers

  hasInternationalTransfers: boolean("has_international_transfers").default(false),

  transferCountries: json("transfer_countries").$type<string[]>().default([]),

  transferSafeguards: text("transfer_safeguards"), // 'SCCs', 'BCRs', 'Adequacy Decision'

  transferDetails: text("transfer_details"),

  // Retention

  retentionPeriod: text("retention_period"),

  retentionCriteria: text("retention_criteria"),

  deletionProcedure: text("deletion_procedure"),

  // Security Measures

  technicalMeasures: json("technical_measures").$type<string[]>().default([]),

  organizationalMeasures: json("organizational_measures").$type<string[]>().default([]),

  securityDescription: text("security_description"),

  // Metadata

  status: varchar("status", { length: 50 }).default("draft"), // 'draft', 'active', 'archived'

  lastReviewDate: timestamp("last_review_date"),

  nextReviewDate: timestamp("next_review_date"),

  createdBy: integer("created_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow()

}, (table) => {

  return {

    clientIdx: index("idx_pa_client").on(table.clientId),

    activityIdIdx: uniqueIndex("idx_pa_activity_id").on(table.activityId),

    statusIdx: index("idx_pa_status").on(table.status),

  };

});

export const processingActivityVendors = pgTable("processing_activity_vendors", {

  id: serial("id").primaryKey(),

  processingActivityId: integer("processing_activity_id").notNull().references(() => processingActivities.id, { onDelete: 'cascade' }),

  vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: 'cascade' }),

  role: varchar("role", { length: 50 }), // 'processor', 'sub-processor'

  createdAt: timestamp("created_at").defaultNow()

}, (table) => {

  return {

    paIdx: index("idx_pav_pa").on(table.processingActivityId),

    vendorIdx: index("idx_pav_vendor").on(table.vendorId),

  };

});

// Link processing activities to assets (systems)

export const certificationAudits = pgTable("certification_audits", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  frameworkId: integer("framework_id").references(() => complianceFrameworks.id),

  auditFirm: varchar("audit_firm", { length: 255 }),
  auditorName: varchar("auditor_name", { length: 255 }),

  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),

  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, preparation, in_progress, fieldwork, findings_review, completed
  stage: varchar("stage", { length: 50 }), // stage_1, stage_2, surveillance, recertification

  outcome: varchar("outcome", { length: 50 }), // pass, fail, major_nc, minor_nc

  notes: text("notes"),
  reportUrl: text("report_url"),

  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_audit_client").on(table.clientId),
    frameworkIdx: index("idx_audit_framework").on(table.frameworkId),
  };
});

export const companyMemoryRelations = pgTable("company_memory_relations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  sourceNodeId: integer("source_node_id").notNull(),
  targetNodeId: integer("target_node_id").notNull(),
  relationType: varchar("relation_type", { length: 100 }).notNull(), // depends_on, stores_data, mitigates, subject_to, subprocessor_of, monitored_by
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    sourceIdx: index("idx_cmr_source").on(table.sourceNodeId),
    targetIdx: index("idx_cmr_target").on(table.targetNodeId),
    clientRelIdx: index("idx_cmr_client").on(table.clientId),
  };
});

// Relations
export const emailTemplatesRelations = relations(emailTemplates, ({ }) => ({
}));

// Types
export type InsertImplementationProgress = typeof implementationProgress.$inferInsert;

export type InsertUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;

export type InsertClient = typeof clients.$inferInsert;

export type PersonalAccessToken = typeof personalAccessTokens.$inferSelect;

export type InsertPersonalAccessToken = typeof personalAccessTokens.$inferInsert;

export type UserClient = typeof userClients.$inferSelect;

export type InsertUserClient = typeof userClients.$inferInsert;

export type RemediationPlaybook = typeof remediationPlaybooks.$inferSelect;

export type InsertRemediationPlaybook = typeof remediationPlaybooks.$inferInsert;

// Compliance Posture Snapshots for Trending & Forecasting

export type ComplianceSnapshot = typeof complianceSnapshots.$inferSelect;

export type Consent = typeof consents.$inferSelect;

export type InsertConsent = typeof consents.$inferInsert;

export type DataFlowVisualization = typeof dataFlowVisualizations.$inferSelect;

export type InsertDataFlowVisualization = typeof dataFlowVisualizations.$inferInsert;

export type DataFlowNode = typeof dataFlowNodes.$inferSelect;

export type InsertDataFlowNode = typeof dataFlowNodes.$inferInsert;

export type IntegrationDefinition = typeof integrationDefinitions.$inferSelect;

export type InsertIntegrationDefinition = typeof integrationDefinitions.$inferInsert;

export type Integration = typeof integrations.$inferSelect;

export type InsertIntegration = typeof integrations.$inferInsert;

export type NotificationSettings = typeof notificationSettings.$inferSelect;

export type NotificationLog = typeof notificationLog.$inferSelect;

export type InsertNotificationLog = typeof notificationLog.$inferInsert;

export type EmailMessage = typeof emailMessages.$inferSelect;

export type InsertEmailMessage = typeof emailMessages.$inferInsert;

export type OrgRole = typeof orgRoles.$inferSelect;

export type InsertOrgRole = typeof orgRoles.$inferInsert;

export type OnboardingAssignment = typeof onboardingAssignments.$inferSelect;

export type EmailTrigger = typeof emailTriggers.$inferSelect;

export type InsertEmailTrigger = typeof emailTriggers.$inferInsert;

export type LLMProvider = typeof llmProviders.$inferSelect;

export type InsertLLMProvider = typeof llmProviders.$inferInsert;

export type LLMRouterRule = typeof llmRouterRules.$inferSelect;

export type InsertLLMRouterRule = typeof llmRouterRules.$inferInsert;

export type CrmEngagement = typeof crmEngagements.$inferSelect;

export type InsertCrmEngagement = typeof crmEngagements.$inferInsert;

export type Comment = typeof comments.$inferSelect;

export type InsertComment = typeof comments.$inferInsert;

// User Invitations

export type UserInvitation = typeof userInvitations.$inferSelect;

export type InsertUserInvitation = typeof userInvitations.$inferInsert;

export type RegulationMapping = typeof regulationMappings.$inferSelect;

export type InsertRegulationMapping = typeof regulationMappings.$inferInsert;

export type ClientReadinessResponse = typeof clientReadinessResponses.$inferSelect;

export type InsertClientReadinessResponse = typeof clientReadinessResponses.$inferInsert;

// Phase 5: Cloud Integrations

export type RemediationTask = typeof remediationTasks.$inferSelect;

export type RemediationPlan = typeof remediationPlans.$inferSelect;

export type InsertRemediationPlan = typeof remediationPlans.$inferInsert;

export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

export type InsertKnowledgeArticle = typeof knowledgeArticles.$inferInsert;

// Tech Suggestions from AI

export type TechSuggestion = typeof techSuggestions.$inferSelect;

export type Embedding = typeof embeddings.$inferSelect;

export type InsertEmbedding = typeof embeddings.$inferInsert;

// AI Usage Metrics for tracking token consumption and costs

export type InsertAIUsageMetric = typeof aiUsageMetrics.$inferInsert;

// AI Advisor Conversations

export type AdvisorConversation = typeof advisorConversations.$inferSelect;

export type InsertAdvisorConversation = typeof advisorConversations.$inferInsert;

// AI Advisor Messages

export type AdvisorMessage = typeof advisorMessages.$inferSelect;

export type KRI = typeof kris.$inferSelect;

export type InsertKRI = typeof kris.$inferInsert;

// ==================== CRM MODULE ====================

export type CrmContact = typeof crmContacts.$inferSelect;

export type InsertCrmContact = typeof crmContacts.$inferInsert;

export type NvdCveCache = typeof nvdCveCache.$inferSelect;

export type InsertNvdCveCache = typeof nvdCveCache.$inferInsert;

// CISA Known Exploited Vulnerabilities (KEV) Cache

export type CisaKevCache = typeof cisaKevCache.$inferSelect;

export type IocRecord = typeof iocRecords.$inferSelect;

export type InsertIocRecord = typeof iocRecords.$inferInsert;

// IOC Enrichment History - tracks enrichment calls

export type IocEnrichmentHistory = typeof iocEnrichmentHistory.$inferSelect;

export type IocExportHistory = typeof iocExportHistory.$inferSelect;

export type DataFlow = typeof dataFlows.$inferSelect;

export type InsertDataFlow = typeof dataFlows.$inferInsert;

export type ClientIntegration = typeof clientIntegrations.$inferSelect;

export type InsertClientIntegration = typeof clientIntegrations.$inferInsert;

export type BusinessProcess = typeof businessProcesses.$inferSelect;

export type ProcessDependency = typeof processDependencies.$inferSelect;

export type InsertProcessDependency = typeof processDependencies.$inferInsert;

// Business Impact Analysis (BIA)

export type BusinessImpactAnalysis = typeof businessImpactAnalyses.$inferSelect;

export type InsertBusinessImpactAnalysis = typeof businessImpactAnalyses.$inferInsert;

export type BcStrategy = typeof bcStrategies.$inferSelect;

export type PlanVersion = typeof planVersions.$inferSelect;

export type PlanChangeLog = typeof planChangeLog.$inferSelect;

export type InsertPlanChangeLog = typeof planChangeLog.$inferInsert;

// Plan Exercises (Testing)

export type PlanExercise = typeof planExercises.$inferSelect;

export type InsertPlanExercise = typeof planExercises.$inferInsert;

// Disruptive Scenarios (for Testing/Exercising)

export type DisruptiveScenario = typeof disruptiveScenarios.$inferSelect;

export type Task = typeof tasks.$inferSelect;

export type InsertTask = typeof tasks.$inferInsert;

export type BcApproval = typeof bcApprovals.$inferSelect;

export type InsertBcApproval = typeof bcApprovals.$inferInsert;

// ==========================================

// Advanced BIA Extensions (Phase 2)

// ==========================================

// Stakeholders & Roles

export type ImpactAssessment = typeof impactAssessments.$inferSelect;

export type InsertImpactAssessment = typeof impactAssessments.$inferInsert;

// Detailed Financial Impact Parameters

export type FinancialImpact = typeof financialImpacts.$inferSelect;

export type BiaSeasonalEvent = typeof biaSeasonalEvents.$inferSelect;

export type InsertBiaSeasonalEvent = typeof biaSeasonalEvents.$inferInsert;

export type BiaVitalRecord = typeof biaVitalRecords.$inferSelect;

export type InsertBiaVitalRecord = typeof biaVitalRecords.$inferInsert;

export type BcCommitteeMember = typeof bcCommitteeMembers.$inferSelect;

export type InsertBcCommitteeMember = typeof bcCommitteeMembers.$inferInsert;

export type ReadinessAssessment = typeof readinessAssessments.$inferSelect;

export type InsertReadinessAssessment = typeof readinessAssessments.$inferInsert;

export type ChecklistState = typeof checklistStates.$inferSelect;

export type InsertChecklistState = typeof checklistStates.$inferInsert;

// ==========================================

// Governance Workbench

// ==========================================

export type WorkItem = typeof workItems.$inferSelect;

export type InsertWorkItem = typeof workItems.$inferInsert;

export type EscalationRule = typeof escalationRules.$inferSelect;

export type InsertEscalationRule = typeof escalationRules.$inferInsert;

export type GovernanceEvent = typeof governanceEvents.$inferSelect;

export type InsertGovernanceEvent = typeof governanceEvents.$inferInsert;

export type FederalSSP = typeof federalSSPs.$inferSelect;

export type InsertFederalSSP = typeof federalSSPs.$inferInsert;

export type FederalSAR = typeof federalSARs.$inferSelect;

export type InsertFederalSAR = typeof federalSARs.$inferInsert;

// FIPS 199 Categorization Reference Data (NIST SP 800-60)

export type Fips199InformationTypeRef = typeof fips199InformationTypesRef.$inferSelect;

export type InsertFips199InformationTypeRef = typeof fips199InformationTypesRef.$inferInsert;

export type FipsCategorization = typeof fipsCategorizations.$inferSelect;

export type InsertFipsCategorization = typeof fipsCategorizations.$inferInsert;

export type FederalPoam = typeof federalPoams.$inferSelect;

export type InsertFederalPoam = typeof federalPoams.$inferInsert;

export type PoamItem = typeof poamItems.$inferSelect;

export type FederalFipsCategorization = typeof federalFipsCategorizations.$inferSelect;

export type InsertFederalFipsCategorization = typeof federalFipsCategorizations.$inferInsert;

// SAR Findings

export type FederalSarFinding = typeof federalSarFindings.$inferSelect;

export type FederalNist80053Assessment = typeof federalNist80053Assessments.$inferSelect;

export type InsertFederalNist80053Assessment = typeof federalNist80053Assessments.$inferInsert;

// FedRAMP Specific Metadata

export type FederalFedrampPackage = typeof federalFedrampPackages.$inferSelect;

export type InsertFederalFedrampPackage = typeof federalFedrampPackages.$inferInsert;

// FISMA Systems

export type FederalFismaSystem = typeof federalFismaSystems.$inferSelect;

export type InsertFederalFismaSystem = typeof federalFismaSystems.$inferInsert;

// RMF Workflow Tracking

export type FederalRmfWorkflow = typeof federalRmfWorkflows.$inferSelect;

export type InsertFederalRmfWorkflow = typeof federalRmfWorkflows.$inferInsert;

// DFARS / SPRS Scoring Assessment

export type FederalSprsAssessment = typeof federalSprsAssessments.$inferSelect;

export type InsertFederalSprsAssessment = typeof federalSprsAssessments.$inferInsert;

// FISMA Reporting

export type FederalFismaReport = typeof federalFismaReports.$inferSelect;

export type InsertFederalFismaReport = typeof federalFismaReports.$inferInsert;

// DISA STIG Hardening Checklists

export type FederalDisaStigChecklist = typeof federalDisaStigChecklists.$inferSelect;

export type InsertFederalDisaStigChecklist = typeof federalDisaStigChecklists.$inferInsert;

export type FederalDisaStigItem = typeof federalDisaStigItems.$inferSelect;

export type InsertFederalDisaStigItem = typeof federalDisaStigItems.$inferInsert;

// FIPS 140 Cryptography Tracking

export type FederalFips140Module = typeof federalFips140Modules.$inferSelect;

export type InsertFederalFips140Module = typeof federalFips140Modules.$inferInsert;

export type IntakeItem = typeof intakeItems.$inferSelect;

export type InsertIntakeItem = typeof intakeItems.$inferInsert;

// ==================== SALES CRM MODULE (Krayin Integration) ====================

// Sales CRM - Leads

export type CrmLead = typeof crmLeads.$inferSelect;

export type InsertCrmLead = typeof crmLeads.$inferInsert;

// Sales CRM - Pipelines/Stages

export type CrmDealStage = typeof crmDealStages.$inferSelect;

export type InsertCrmDealStage = typeof crmDealStages.$inferInsert;

// Sales CRM - Deals

export type CrmDeal = typeof crmDeals.$inferSelect;

export type InsertCrmDeal = typeof crmDeals.$inferInsert;

export type ReportLog = typeof reportLogs.$inferSelect;

export type InsertReportLog = typeof reportLogs.$inferInsert;

export type WaitingListEntry = typeof waitingList.$inferSelect;

export type InsertWaitingListEntry = typeof waitingList.$inferInsert;

// ============================================

// CRM Tables

// ============================================

// Global CRM - Platform-level contacts for admin sales/marketing

export type GlobalContact = typeof globalContacts.$inferSelect;

export type ClientContact = typeof clientContacts.$inferSelect;

export type GlobalCrmNote = typeof globalCrmNotes.$inferSelect;

export type InsertGlobalCrmNote = typeof globalCrmNotes.$inferInsert;

// Global CRM Deals - Track revenue opportunities

export type GlobalCrmDeal = typeof globalCrmDeals.$inferSelect;

export type InsertGlobalCrmDeal = typeof globalCrmDeals.$inferInsert;

// Global CRM Tags - Custom categorization labels

export type GlobalCrmTag = typeof globalCrmTags.$inferSelect;

export type InsertGlobalCrmTag = typeof globalCrmTags.$inferInsert;

// Global CRM Contact Tags - Join table for many-to-many

export type GlobalCrmContactTag = typeof globalCrmContactTags.$inferSelect;

export type InsertGlobalCrmContactTag = typeof globalCrmContactTags.$inferInsert;

// ==========================================

// Privacy Compliance (GDPR/CCPA)

// ==========================================

export type ProcessDataFlow = typeof processDataFlows.$inferSelect;

export type InsertProcessDataFlow = typeof processDataFlows.$inferInsert;

export type DsarRequest = typeof dsarRequests.$inferSelect;

export type SammMaturityAssessment = typeof sammMaturityAssessments.$inferSelect;

export type InsertSammMaturityAssessment = typeof sammMaturityAssessments.$inferInsert;

// ============================================================================
// Essential Eight Maturity Assessment Schema
// ============================================================================

export type EssentialEightAssessment = typeof essentialEightAssessments.$inferSelect;

export type SammStreamAssessment = typeof sammStreamAssessments.$inferSelect;

export type InsertSammStreamAssessment = typeof sammStreamAssessments.$inferInsert;

// SAMM Stream Questions - Reference Data (Read-Only)

export type SammStreamQuestion = typeof sammStreamQuestions.$inferSelect;

export type PrivacyAssessment = typeof privacyAssessments.$inferSelect;

export type KnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferSelect;

export type InsertKnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferInsert;

export type TaskAssignment = typeof taskAssignments.$inferSelect;

export type InsertTaskAssignment = typeof taskAssignments.$inferInsert;

// ==========================================

// Management Sign-off & Approvals

// ==========================================

export type ApprovalRequest = typeof approvalRequests.$inferSelect;

export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

export type ApprovalSignature = typeof approvalSignatures.$inferSelect;

export type ComplianceCertificate = typeof complianceCertificates.$inferSelect;

export type InsertProject = typeof projects.$inferInsert;

export type InsertProjectComplianceMapping = typeof projectComplianceMappings.$inferInsert;

export type DevProject = typeof devProjects.$inferSelect;

export type InsertDevProject = typeof devProjects.$inferInsert;

export type ProgramGuideAssignment = typeof programGuideAssignments.$inferSelect;

export type InsertProgramGuideAssignment = typeof programGuideAssignments.$inferInsert;

// ==========================================
// TRUST CENTER & NDA GATEKEEPING
// ==========================================

export type TrustCenterVisitor = typeof trustCenterVisitors.$inferSelect;

export type InsertTrustCenterVisitor = typeof trustCenterVisitors.$inferInsert;

export type NdaSignature = typeof ndaSignatures.$inferSelect;

export type InsertNdaSignature = typeof ndaSignatures.$inferInsert;

export type TrustDocument = typeof trustDocuments.$inferSelect;

export type InsertTrustDocument = typeof trustDocuments.$inferInsert;

export type InsertAiSystem = typeof aiSystems.$inferInsert;

export type InsertAiImpactAssessment = typeof aiImpactAssessments.$inferInsert;

export type InsertAiEuAiActCompliance = typeof aiEuAiActCompliance.$inferInsert;
;

export type MagicLink = typeof magicLinks.$inferSelect;

export type InsertMagicLink = typeof magicLinks.$inferInsert;

export type MagicLinkRedemption = typeof magicLinkRedemptions.$inferSelect;

export type InsertMagicLinkRedemption = typeof magicLinkRedemptions.$inferInsert;

// ============================================================================
// OWASP ASVS v4.0.3 Assessment Schema
// ============================================================================

// ASVS Categories (e.g., V1: Architecture)

export type AsvsCategory = typeof asvsCategories.$inferSelect;

export type InsertAsvsCategory = typeof asvsCategories.$inferInsert;

export type AsvsAssessment = typeof asvsAssessments.$inferSelect;

export type InsertAsvsAssessment = typeof asvsAssessments.$inferInsert;

// ==========================================
// FEDERAL INHERITANCE MANAGEMENT
// ==========================================

export type FederalInheritance = typeof federalInheritances.$inferSelect;

export type InsertFederalInheritance = typeof federalInheritances.$inferInsert;

// ==========================================
// SYSTEM FEEDBACK & BUG REPORTING
// ==========================================

export type SystemFeedback = typeof systemFeedback.$inferSelect;

export type Nist80030ImpactAssessment = typeof nist80030ImpactAssessments.$inferSelect;

export type InsertNist80030ImpactAssessment = typeof nist80030ImpactAssessments.$inferInsert;

// ============================================================================
// Learning Content - Editable learning guides stored in database
// ============================================================================

export type FederalContract = typeof federalContracts.$inferSelect;

export type InsertFederalContract = typeof federalContracts.$inferInsert;

// ==========================================
// NIS2 & ENISA Mapping Layer
// ==========================================

export type Nis2Mapping = typeof nis2Mappings.$inferSelect;

export type InsertNis2Mapping = typeof nis2Mappings.$inferInsert;

// ==========================================
// Access Review Module (W4)
// ==========================================

export type CompanyMemoryNode = typeof companyMemoryNodes.$inferSelect;

export type InsertCompanyMemoryNode = typeof companyMemoryNodes.$inferInsert;

export type CompanyMemoryRelation = typeof companyMemoryRelations.$inferSelect;

export type InsertCompanyMemoryRelation = typeof companyMemoryRelations.$inferInsert;

export * from "./common";

export * from "./common";

export type InsertAuditFinding = typeof auditFindings.$inferInsert;

export type InsertControl = typeof controls.$inferInsert;

export type InsertControlHistory = typeof controlHistory.$inferInsert;

// Cross-Framework Control Harmonization

export type InsertControlMapping = typeof controlMappings.$inferInsert;

// Automated Evidence Suggestions

export type InsertClientControl = typeof clientControls.$inferInsert;

export type InsertEvidence = typeof evidence.$inferInsert;

// Consent Management Tables

export type InsertEvidenceRequest = typeof evidenceRequests.$inferInsert;

export type InsertAuditNote = typeof auditNotes.$inferInsert;

export type InsertEvidenceFile = typeof evidenceFiles.$inferInsert;

export type ComplianceRequirement = typeof complianceRequirements.$inferSelect;

export type ClientFramework = typeof clientFrameworks.$inferSelect;

export type InsertClientFramework = typeof clientFrameworks.$inferInsert;

export type ClientFrameworkControl = typeof clientFrameworkControls.$inferSelect;

export type InsertClientFrameworkControl = typeof clientFrameworkControls.$inferInsert;

export type ClientFrameworkMapping = typeof clientFrameworkMappings.$inferSelect;

export type InsertClientFrameworkMapping = typeof clientFrameworkMappings.$inferInsert;

// ==================== AI ADVISOR SYSTEM ====================

// Knowledge Articles for RAG

export type InsertTechSuggestion = typeof techSuggestions.$inferInsert;

// Control to Technology Mappings (Catalog)

export type InsertControlTechMapping = typeof controlTechMappings.$inferInsert;

// Embeddings for RAG (pgvector ready)

export type TreatmentControl = typeof treatmentControls.$inferSelect;

export type InsertIocEnrichmentHistory = typeof iocEnrichmentHistory.$inferInsert;

// IOC Export History - tracks exports for audit

export type InsertGapAssessment = typeof gapAssessments.$inferInsert;

export type InsertGapResponse = typeof gapResponses.$inferInsert;

// ==================== FRAMEWORK MAPPINGS ====================

export type InsertPlanVersion = typeof planVersions.$inferInsert;

// Plan Change Log (Audit)

export type FederalSspControl = typeof federalSspControls.$inferSelect;

export type InsertFederalSspControl = typeof federalSspControls.$inferInsert;

// FIPS 199 Categorization

export type InsertFederalSarFinding = typeof federalSarFindings.$inferInsert;

// NIST 800-53 Rev 5 Framework Specifics

export type CommonControl = typeof commonControls.$inferSelect;

export type InsertCommonControl = typeof commonControls.$inferInsert;

export type InsertFrameworkMapping = typeof frameworkMappings.$inferInsert;

// ==========================================
// CERTIFICATION & AUDITS (Phase 3)
// ==========================================

export type CertificationAudit = typeof certificationAudits.$inferSelect;

export type InsertCertificationAudit = typeof certificationAudits.$inferInsert;

export type InsertFrameworkKnowledgeMapping = typeof frameworkKnowledgeMappings.$inferInsert;

export type InsertAiSystemControl = typeof aiSystemControls.$inferInsert;

// EU AI Act Compliance Tracking (Articles 9-15, 17, 29, 52)

export type AsvsRequirement = typeof asvsRequirements.$inferSelect;

export type InsertAsvsRequirement = typeof asvsRequirements.$inferInsert;

export type InsertEvidenceTemplate = typeof evidenceTemplates.$inferInsert;

// Remediation Playbooks

export type InsertPolicyTemplate = typeof policyTemplates.$inferInsert;

export type ClientPolicy = typeof clientPolicies.$inferSelect;

export type InsertClientPolicy = typeof clientPolicies.$inferInsert;

export type InsertControlPolicyMapping = typeof controlPolicyMappings.$inferInsert;

export type ConsentTemplate = typeof consentTemplates.$inferSelect;

export type InsertConsentTemplate = typeof consentTemplates.$inferInsert;

export type DsarTemplate = typeof dsarTemplates.$inferSelect;

export type InsertDsarTemplate = typeof dsarTemplates.$inferInsert;

export type DpiaTemplate = typeof dpiaTemplates.$inferSelect;

export type InsertDpiaTemplate = typeof dpiaTemplates.$inferInsert;

export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;

export type InsertCommunicationTemplate = typeof communicationTemplates.$inferInsert;

export type InsertComplianceRequirement = typeof complianceRequirements.$inferInsert;

// Onboarding Templates

export type OnboardingTemplate = typeof onboardingTemplates.$inferSelect;

export type InsertOnboardingTemplate = typeof onboardingTemplates.$inferInsert;

// Onboarding Assignments

export type EmailTemplate = typeof emailTemplates.$inferSelect;

export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

export type InsertPolicyVersion = typeof policyVersions.$inferInsert;

export type InsertRemediationTask = typeof remediationTasks.$inferInsert;

// Policy Review Feature

export type InsertPolicyReview = typeof policyReviews.$inferInsert;

export type InsertRiskPolicyMapping = typeof riskPolicyMappings.$inferInsert;

// ==================== THREAT INTELLIGENCE MODULE ====================

// NVD CVE Cache - Stores fetched CVE data to reduce API calls

export type DpaTemplate = typeof dpaTemplates.$inferSelect;

export type InsertDpaTemplate = typeof dpaTemplates.$inferInsert;

export type InsertPolicyAssignment = typeof policyAssignments.$inferInsert;

export type InsertPolicyException = typeof policyExceptions.$inferInsert;

export type InsertPolicyAcknowledgement = typeof policyAcknowledgements.$inferInsert;

// ==========================================
// Access Review Automation (scorecard P2 #7) — auto-provisioned reviews + certification.
// access_review_cycles = review campaigns; access_review_tasks = per user × role
// certification decisions (pending → certified | revoked | overdue).
// ==========================================

export * from "./common";

export * from "./common";

export type DataFlowConnection = typeof dataFlowConnections.$inferSelect;

export type InsertDataFlowConnection = typeof dataFlowConnections.$inferInsert;

export type InsertNotificationSettings = typeof notificationSettings.$inferInsert;

// Threat Intelligence Alert Settings

export type InsertThreatAlertSettings = typeof threatAlertSettings.$inferInsert;

export type InsertAuditLog = typeof auditLogs.$inferInsert;

// controlMappings table is defined earlier in the file (Cross-Framework Control Harmonization section)

export type CloudConnection = typeof cloudConnections.$inferSelect;

export type InsertCloudConnection = typeof cloudConnections.$inferInsert;

export type CloudAsset = typeof cloudAssets.$inferSelect;

export type InsertCloudAsset = typeof cloudAssets.$inferInsert;

// Phase 5: Issue Tracker Integrations

export type IssueTrackerConnection = typeof issueTrackerConnections.$inferSelect;

export type InsertIssueTrackerConnection = typeof issueTrackerConnections.$inferInsert;

export type InsertAdvisorMessage = typeof advisorMessages.$inferInsert;

// ==================== RISK MANAGEMENT MODULE ====================

export type InsertAsset = typeof assets.$inferInsert;

// 2. Risk Scenarios (The Risk Register)

export type InsertRiskScenario = typeof riskScenarios.$inferInsert;

// 3. Risk Framework Settings (Scope, Context, Appetite)

export type InsertRiskSettings = typeof riskSettings.$inferInsert;

// 4. Risk Assessments (Periodic Reviews) - Enhanced for comprehensive tracking

export type InsertRiskTreatment = typeof riskTreatments.$inferInsert;

// Many-to-Many: Treatments can have multiple Controls

export type InsertTreatmentControl = typeof treatmentControls.$inferInsert;

// 5. Key Risk Indicators (KRIs)

export type CrmActivity = typeof crmActivities.$inferSelect;

export type InsertCrmActivity = typeof crmActivities.$inferInsert;

export type InsertVulnerability = typeof vulnerabilities.$inferInsert;

export type InsertThreat = typeof threats.$inferInsert;

// Threat-Asset Mappings - Links threats to affected assets with metadata

export type InsertThreatAssetMapping = typeof threatAssetMappings.$inferInsert;

export type InsertRiskAssessment = typeof riskAssessments.$inferInsert;

export type InsertCisaKevCache = typeof cisaKevCache.$inferInsert;

// IOC (Indicators of Compromise) Records Table
// Stores IOCs extracted from threat feeds and manually added

export type InsertIocExportHistory = typeof iocExportHistory.$inferInsert;

// Asset to CVE Matches - Links discovered CVEs to assets

export type InsertAssetCveMatch = typeof assetCveMatches.$inferInsert;

// Threat Intelligence Sync Log - Tracks when data was last synced

export type InsertBusinessProcess = typeof businessProcesses.$inferInsert;

// Module 2: Process Dependencies

// Links processes to other entities (upstream, downstream, assets)

export type RecoveryObjective = typeof recoveryObjectives.$inferSelect;

export type InsertRecoveryObjective = typeof recoveryObjectives.$inferInsert;

// Business Continuity Strategies

export type InsertDisruptiveScenario = typeof disruptiveScenarios.$inferInsert;

// Link Risks to Disruptive Scenarios (Many-to-Many)

export type InsertRiskScenarioLink = typeof riskScenarioLinks.$inferInsert;

// ==========================================

// Collaboration & Workflow (Module 2 Extension)

// ==========================================

export type InsertRiskReport = typeof riskReports.$inferInsert;

// Federal Compliance (NIST 800-171/172, FIPS 199, POA&M)

export type InsertPoamItem = typeof poamItems.$inferInsert;

// SSP Content Sections (e.g. System Identification, Boundary, etc.)

export type FederalSspSection = typeof federalSspSections.$inferSelect;

export type InsertFederalSspSection = typeof federalSspSections.$inferInsert;

// SSP Control Implementation Details

export type FederalFips140ModuleAsset = typeof federalFips140ModuleAssets.$inferSelect;

// ==================== MANAGED SERVICE MODULE (Accountant Model) ====================

export type InsertClientContact = typeof clientContacts.$inferInsert;

// Global CRM Activities - Track calls, emails, meetings per global contact

export type GlobalCrmActivity = typeof globalCrmActivities.$inferSelect;

export type InsertGlobalCrmActivity = typeof globalCrmActivities.$inferInsert;

// Global CRM Notes - Notes for each global contact

export type InsertEssentialEightAssessment = typeof essentialEightAssessments.$inferInsert;

// ============================================================================
// OWASP SAMM v2 Stream-Based Assessment Schema
// This implements the proper SAMM v2 methodology with 30 streams (15 practices × 2 streams each)
// ============================================================================

export type InsertSammStreamQuestion = typeof sammStreamQuestions.$inferInsert;

// SAMM Practices - Reference Data (Read-Only)

export type SammPractice = typeof sammPractices.$inferSelect;

export type InsertSammPractice = typeof sammPractices.$inferInsert;

export type ProcessingActivity = typeof processingActivities.$inferSelect;

export type InsertComplianceCertificate = typeof complianceCertificates.$inferInsert;

// Developer Risk Management & Threat Modeling
// ==========================================

export type InsertThreatModel = typeof threatModels.$inferInsert;

export type InsertThreatModelComponent = typeof threatModelComponents.$inferInsert;

export type InsertThreatModelDataFlow = typeof threatModelDataFlows.$inferInsert;

// ==========================================
// FRAMEWORK INTELLIGENCE & MAPPINGS
// ==========================================

export type InsertSystemFeedback = typeof systemFeedback.$inferInsert;

// ==========================================
// NIST SP 800-30 - Risk Assessment Tables
// ==========================================

export type Nist80030ThreatSource = typeof nist80030ThreatSources.$inferSelect;

export type InsertNist80030ThreatSource = typeof nist80030ThreatSources.$inferInsert;

export type Nist80030ThreatEvent = typeof nist80030ThreatEvents.$inferSelect;

export type InsertNist80030ThreatEvent = typeof nist80030ThreatEvents.$inferInsert;

export type InsertComplianceSnapshot = typeof complianceSnapshots.$inferInsert;

// Gap Email Questionnaire Requests

export type InsertGapQuestionnaireRequest = typeof gapQuestionnaireRequests.$inferInsert;

export type InsertThreatIntelSyncLog = typeof threatIntelSyncLog.$inferInsert;

// ==================== TPRM MODULE (Vendors) ====================

export type InsertVendor = typeof vendors.$inferInsert;

export type InsertVendorChangeLog = typeof vendorChangeLogs.$inferInsert;

export type InsertVendorDpa = typeof vendorDpas.$inferInsert;

export type InsertVendorAuthorization = typeof vendorAuthorizations.$inferInsert;

export type InsertVendorAssessment = typeof vendorAssessments.$inferInsert;

export type InsertVendorContact = typeof vendorContacts.$inferInsert;

export type InsertVendorContract = typeof vendorContracts.$inferInsert;

export type InsertVendorRequest = typeof vendorRequests.$inferInsert;

// ==================== GAP ANALYSIS ====================

export type InsertVendorScan = typeof vendorScans.$inferInsert;

export type InsertVendorCveMatch = typeof vendorCveMatches.$inferInsert;

export type GlobalVendor = typeof globalVendors.$inferSelect;

export type InsertGlobalVendor = typeof globalVendors.$inferInsert;

// ==========================================

// Business Continuity Management System (BCMS)

// ==========================================

// Module 1: Project & Scope Setup

export type BiaQuestionnaire = typeof biaQuestionnaires.$inferSelect;

export type InsertBiaQuestionnaire = typeof biaQuestionnaires.$inferInsert;

export type InsertGlobalContact = typeof globalContacts.$inferInsert;

// Client CRM - Per-workspace contacts (stakeholders, vendors, auditors)

export type InsertDsarRequest = typeof dsarRequests.$inferInsert;

// =================================================================================

// Vendor Assessment Automation

// =================================================================================

export type InsertVendorAssessmentTemplate = typeof vendorAssessmentTemplates.$inferInsert;

export type InsertVendorAssessmentRequest = typeof vendorAssessmentRequests.$inferInsert;

export type InsertVendorDataRequest = typeof vendorDataRequests.$inferInsert;

// Policy Management & Attestation

export type InsertQuestionnaire = typeof questionnaires.$inferInsert;

export type InsertQuestionnaireQuestion = typeof questionnaireQuestions.$inferInsert;

// ==================== GDPR Article 30 - Records of Processing Activities (ROPA) ====================

export type InsertProjectTask = typeof projectTasks.$inferInsert;

// ==========================================

// Roadmap Module - Strategic Planning Layer

// ==========================================

export type InsertRoadmap = typeof roadmaps.$inferInsert;

// Roadmap milestones - key strategic milestones

export type InsertRoadmapMilestone = typeof roadmapMilestones.$inferInsert;

// ==========================================

// Implementation Plan Module - Execution Layer

// ==========================================

export type InsertImplementationPlan = typeof implementationPlans.$inferInsert;

// Implementation tasks - granular work items

export type InsertImplementationTask = typeof implementationTasks.$inferInsert;

// Progress tracking and feedback loops

export type InsertPolicyReviewResult = typeof policyReviewResults.$inferInsert;

// Features/Remediation Roadmap

export type InsertRoadmapItem = typeof roadmapItems.$inferInsert;

// Phase 3: BYOF (Bring Your Own Framework)

export type InsertBcpProject = typeof bcpProjects.$inferInsert;

// Module 2: Process Registry (Foundation)

// Catalog of critical business functions/processes

export type InsertBcStrategy = typeof bcStrategies.$inferInsert;

// Business Continuity Plans (BCP)

export type InsertBcPlan = typeof bcPlans.$inferInsert;

// --- New Normalized BCP Tables ---

// Join: Plan <-> BIA

export type InsertBcPlanBia = typeof bcPlanBias.$inferInsert;

// Join: Plan <-> Strategies

export type InsertBcPlanStrategy = typeof bcPlanStrategies.$inferInsert;

// Join: Plan <-> Scenarios

export type InsertBcPlanScenario = typeof bcPlanScenarios.$inferInsert;

// Plan Contacts (Call Tree / Stakeholders specific to a plan)

export type InsertBcPlanContact = typeof bcPlanContacts.$inferInsert;

// Plan Versions (History)

export type InsertBcpStakeholder = typeof bcpStakeholders.$inferInsert;

// Time-Based Impact Assessment

// Stores impact ratings for specific time intervals (e.g., 0-4h, 1-3d)

export type InsertFinancialImpact = typeof financialImpacts.$inferInsert;

// ==========================================

// BIA & BCP Enhancements (Comprehensive Pack)

// ==========================================

export type InsertBcPlanCommunicationChannel = typeof bcPlanCommunicationChannels.$inferInsert;

// BCP Logistics / Recovery Sites (Assembly Points, Alternate Work Sites)

export type InsertBcPlanLogistic = typeof bcPlanLogistics.$inferInsert;

// BC Program Governance

export type InsertBcProgram = typeof bcPrograms.$inferInsert;

export type InsertBcPlanSection = typeof bcPlanSections.$inferInsert;

export type InsertBcPlanAppendix = typeof bcPlanAppendices.$inferInsert;

export type InsertControlBaseline = typeof controlBaselines.$inferInsert;

// ==========================================

// Task Assignments (RACI)

// ==========================================

export type InsertApprovalSignature = typeof approvalSignatures.$inferInsert;

// ==========================================
// ROADMAP REPORTS
// ==========================================

export type InsertRoadmapReport = typeof roadmapReports.$inferInsert;

export type InsertImplementationTemplate = typeof implementationTemplates.$inferInsert;

// ==========================================
// Strategic Roadmap Reports (Rich Text)
// ==========================================

export type InsertEmployee = typeof employees.$inferInsert;

// Employee Acknowledgments - tracks compliance document signatures

export type InsertEmployeeAcknowledgment = typeof employeeAcknowledgments.$inferInsert;

// Employee Security Setup - tracks security configuration status

export type InsertEmployeeSecuritySetup = typeof employeeSecuritySetup.$inferInsert;

// Compliance Requirements for Onboarding

export type InsertOnboardingAssignment = typeof onboardingAssignments.$inferInsert;

// Employee Asset Receipts - tracks asset confirmation

export type InsertEmployeeAssetReceipt = typeof employeeAssetReceipts.$inferInsert;

export type InsertEmployeeTaskAssignment = typeof employeeTaskAssignments.$inferInsert;

export type BcTrainingRecord = typeof bcTrainingRecords.$inferSelect;

export type InsertBcTrainingRecord = typeof bcTrainingRecords.$inferInsert;

// ==========================================

// ISO 27001 Readiness Assessment (Wizard)

// ==========================================

export type InsertPrivacyAssessment = typeof privacyAssessments.$inferInsert;

// ==========================================

// Employees / HR

// ==========================================

export type InsertEvidenceComment = typeof evidenceComments.$inferInsert;

// ==========================================
// Employee Onboarding & Training Module
// ==========================================

export type InsertEmployeeTrainingRecord = typeof employeeTrainingRecords.$inferInsert;

// Training Modules defined by Admin

export type InsertTrainingModule = typeof trainingModules.$inferInsert;

export type InsertTrainingAssignment = typeof trainingAssignments.$inferInsert;

export type { ClientSettings, InsertClientSettings } from "../schema_client_settings";

// ==========================================
// Policy Acknowledgments (P1 #4) - user sign-off on client policies
// NOTE: a runtime-created `policy_acknowledgments` table (employee_email based)
// already exists for the legacy sign-off flow (lib/policy/policyAcknowledgmentService.ts).
// This table is the Drizzle-native user-based acknowledgment model used by the
// policyAck router (listPending / acknowledge / listForPolicy).
// ==========================================

export type InsertAccessReviewCycle = typeof accessReviewCycles.$inferInsert;

export type InsertAccessReviewTask = typeof accessReviewTasks.$inferInsert;

// ==========================================
// Native VFS + Vector Unified Memory Engine ("Compliance Cortex")
// ==========================================

export * from "./common";

export * from "./common";

export type InsertProcessingActivity = typeof processingActivities.$inferInsert;

// Link processing activities to vendors (subprocessors)

// Other Definitions
import { customType, pgEnum } from "drizzle-orm/pg-core";

// Custom type for pgvector - used for vector embeddings
