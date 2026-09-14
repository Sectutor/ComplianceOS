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
export const vendorDpas = pgTable("vendor_dpas", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  templateId: integer("template_id"), // Optional: can be custom without template

  name: varchar("name", { length: 255 }).notNull(),

  content: text("content").notNull(), // Generated or custom DPA content

  status: varchar("status", { length: 50 }).default('Draft'), // Draft, Review, Signed, Archived

  version: integer("version").default(1),

  signedAt: timestamp("signed_at"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientVendorIdx: index("idx_vdpa_client_vendor").on(table.clientId, table.vendorId),

  };

});

export const vendorAuthorizations = pgTable("vendor_authorizations", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  initiatedBy: integer("initiated_by"), // User ID

  status: varchar("status", { length: 50 }).default("Pending"), // Pending, Notified, Objection_Window, Approved, Rejected

  notificationDate: timestamp("notification_date"),

  objectionDeadline: timestamp("objection_deadline"),

  approvalDate: timestamp("approval_date"),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientVendorIdx: index("idx_va_client_vendor").on(table.clientId, table.vendorId),

  };

});

export const vendorAssessments = pgTable("vendor_assessments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  type: varchar("type", { length: 100 }), // e.g. "Security Questionnaire", "SOC2 Review"

  status: varchar("status", { length: 50 }).default("Planned"), // Planned, Sent, In Progress, Review, Completed

  reviewStatus: varchar("review_status", { length: 50 }).default("pending"),

  // Risk Assessment

  // Inherent Risk (Before Controls)

  inherentImpact: varchar("inherent_impact", { length: 50 }),

  inherentLikelihood: varchar("inherent_likelihood", { length: 50 }),

  inherentRiskLevel: varchar("inherent_risk_level", { length: 50 }),

  // Residual Risk (After Controls/Assessment)

  residualImpact: varchar("residual_impact", { length: 50 }),

  residualLikelihood: varchar("residual_likelihood", { length: 50 }),

  residualRiskLevel: varchar("residual_risk_level", { length: 50 }),

  score: integer("score"), // 0-100 or specific rating

  findings: text("findings"), // Summary of risks found

  documentUrl: varchar("document_url", { length: 1024 }), // Link to stored evidence

  dueDate: timestamp("due_date"),

  completedDate: timestamp("completed_date"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    vendorAssessmentIdx: index("idx_assessment_vendor").on(table.vendorId),
    clientAssessmentIdx: index("idx_assessment_client").on(table.clientId),
  };

});

export const vendorContacts = pgTable("vendor_contacts", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  email: varchar("email", { length: 255 }),

  phone: varchar("phone", { length: 50 }),

  role: varchar("role", { length: 100 }), // e.g. "Account Manager", "Security Lead"

  isPrimary: boolean("is_primary").default(false),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    vendorContactIdx: index("idx_contact_vendor").on(table.vendorId),

  };

});

export const vendorContracts = pgTable("vendor_contracts", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  startDate: timestamp("start_date"),

  endDate: timestamp("end_date"),

  autoRenew: boolean("auto_renew").default(false),

  value: varchar("value", { length: 50 }), // stored as string for flexibility e.g. "$10,000/yr"

  status: varchar("status", { length: 50 }).default('Active'), // Active, Expired, Draft

  documentUrl: text("document_url"),

  // Enhanced Vanta-style fields

  noticePeriod: varchar("notice_period", { length: 50 }), // e.g., "30 days"

  paymentTerms: varchar("payment_terms", { length: 50 }), // e.g., "Net 30"

  slaDetails: text("sla_details"), // e.g., "99.9% uptime"

  dpaStatus: varchar("dpa_status", { length: 50 }).default('Not Signed'), // Signed, Not Signed, Not Required

  owner: varchar("owner", { length: 100 }), // Internal owner name/email

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    vendorContractIdx: index("idx_contract_vendor").on(table.vendorId),

  };

});

export const vendorScans = pgTable("vendor_scans", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  scanDate: timestamp("scan_date").defaultNow(),

  status: varchar("status", { length: 50 }).default("Completed"), // In Progress, Completed, Failed

  riskScore: integer("risk_score"), // 0-100 calculated risk

  vulnerabilityCount: integer("vulnerability_count").default(0),

  breachCount: integer("breach_count").default(0),

  rawResult: text("raw_result"), // JSON string of full results if needed

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    vendorScanIdx: index("idx_scan_vendor").on(table.vendorId),

  };

});

export const vendorCveMatches = pgTable("vendor_cve_matches", {

  id: serial("id").primaryKey(),

  vendorId: integer("vendor_id").notNull(),

  scanId: integer("scan_id"), // Links CVE to a specific scan

  cveId: varchar("cve_id", { length: 50 }).notNull(),

  matchScore: integer("match_score"),

  matchReason: text("match_reason"),

  description: text("description"),

  cvssScore: varchar("cvss_score", { length: 10 }),

  status: varchar("status", { length: 50 }).default("Active"), // Active, Ignored, Remediated

  discoveredAt: timestamp("discovered_at").defaultNow(),

}, (table) => {

  return {

    vendorCveIdx: index("idx_vendor_cve").on(table.vendorId),

    cveIdIdx: index("idx_vendor_cve_id").on(table.cveId),

  };

});

export const vendorBreaches = pgTable("vendor_breaches", {

  id: serial("id").primaryKey(),

  vendorId: integer("vendor_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  breachDate: timestamp("breach_date"),

  severity: varchar("severity", { length: 50 }), // High, Medium, Low

  source: varchar("source", { length: 255 }), // e.g., "HaveIBeenPwned", "DarkWeb"

  status: varchar("status", { length: 50 }).default("Active"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    vendorBreachIdx: index("idx_breach_vendor").on(table.vendorId),

  };

});

export const vendorAssessmentTemplates = pgTable("vendor_assessment_templates", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  content: json("content").$type<{

    sections: {

      title: string;

      description?: string;

      questions: {

        id: string;

        text: string;

        type: 'text' | 'yes_no' | 'multiple_choice' | 'file_upload';

        options?: string[];

        required?: boolean;

      }[];

    }[];

  }>(),

  createdBy: integer("created_by"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_vat_client").on(table.clientId),

  };

});

export const vendorAssessmentRequests = pgTable("vendor_assessment_requests", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(), // Link to vendors table

  templateId: integer("template_id").notNull(),

  // Access Control

  token: varchar("token", { length: 64 }).notNull().unique(), // Secure access token

  recipientEmail: varchar("recipient_email", { length: 255 }),

  // Status Tracking

  status: varchar("status", { length: 50 }).default("draft"), // draft, sent, in_progress, submitted, under_review, completed

  // Assessment Data

  responses: json("responses").$type<Record<string, {

    value: any;

    comment?: string;

    evidenceUrl?: string;

  }>>(),

  score: integer("score"), // 0-100

  // Dates

  sentAt: timestamp("sent_at"),

  expiresAt: timestamp("expires_at"),

  viewedAt: timestamp("viewed_at"),

  submittedAt: timestamp("submitted_at"),

  completedAt: timestamp("completed_at"), // Review completed

  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientVendorIdx: index("idx_var_client_vendor").on(table.clientId, table.vendorId),

    tokenIdx: uniqueIndex("idx_var_token").on(table.token),

    statusIdx: index("idx_var_status").on(table.status),

  };

});

export const vendorDataRequests = pgTable("vendor_data_requests", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  token: varchar("token", { length: 64 }).notNull().unique(),

  recipientEmail: varchar("recipient_email", { length: 255 }),

  message: text("message"), // Optional custom message for the vendor

  status: varchar("status", { length: 50 }).default("sent"), // sent, in_progress, completed

  // Array of items: { type: 'questionnaire' | 'document', id?: number, name: string, status: 'pending' | 'completed', resultId?: number }

  items: json("items").$type<Array<{

    type: 'questionnaire' | 'document';

    id?: number; // Template ID for questionnaire

    name: string; // "SOC 2 Report", "Pentest", etc.

    status: 'pending' | 'completed';

    completedAt?: string;

    fileUrl?: string; // For documents

    assessmentRequestId?: number; // Linked ID if it's a questionnaire

  }>>(),

  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientVendorIdx: index("idx_vdr_client_vendor").on(table.clientId, table.vendorId),

    tokenIdx: uniqueIndex("idx_vdr_token").on(table.token),

  };

});

export const questionnaires = pgTable("questionnaires", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: text("name").notNull(),

  senderName: text("sender_name"), // "Account" in screenshot, e.g. who sent it

  productName: text("product_name"),

  status: varchar("status", { length: 50 }).default("open"), // open, in_progress, completed, archived, vendor_pending, pending_review

  direction: varchar("direction", { length: 20 }).default("inbound"), // inbound (businesses send to you) | outbound (you send to vendors)

  progress: integer("progress").default(0),

  dueDate: timestamp("due_date"),

  ownerId: integer("owner_id"), // FK to users

  // Vendor assessment fields
  vendorName: text("vendor_name"),
  vendorEmail: text("vendor_email"),
  vendorToken: text("vendor_token"),
  vendorLinkExpiresAt: timestamp("vendor_link_expires_at"),

  // Enhanced workflow fields
  category: varchar("category", { length: 100 }),
  priority: varchar("priority", { length: 20 }).default('medium'),
  controlId: text("control_id"),
  controlFramework: varchar("control_framework", { length: 50 }),
  remediationDeadline: timestamp("remediation_deadline"),
  answeredBy: integer("answered_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  version: integer("version").default(1),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientIdx: index("idx_qn_client").on(table.clientId),

    statusIdx: index("idx_qn_status").on(table.status),

    // Unique index for vendor token to prevent duplicates and enable efficient lookups
    vendorTokenIdx: uniqueIndex("idx_qn_vendor_token").on(table.vendorToken),

  };

});

export const questionnaireQuestions = pgTable("questionnaire_questions", {

  id: serial("id").primaryKey(),

  questionnaireId: integer("questionnaire_id").notNull().references(() => questionnaires.id, { onDelete: 'cascade' }),

  questionId: text("question_id"), // Unique ID from the questionnaire (e.g., "A&A-01.1", "1.1.1")

  focusArea: text("focus_area"),

  subFocusArea: text("sub_focus_area"),

  question: text("question").notNull(),

  answer: text("answer"),

  comment: text("comment"), // Additional comments/notes

  tags: json("tags").$type<string[]>().default([]), // Tags for categorization

  // New fields for enhanced workflow
  category: varchar("category", { length: 100 }), // e.g., "Access Control", "Data Security"
  priority: varchar("priority", { length: 20 }).default('medium'), // high, medium, low
  controlId: text("control_id"), // Maps to compliance control
  controlFramework: varchar("control_framework", { length: 50 }), // ISO27001, NIST, etc.
  remediationDeadline: timestamp("remediation_deadline"),

  access: varchar("access", { length: 50 }).default("internal"), // internal, external, confidential

  assigneeId: integer("assignee_id").references(() => users.id), // Assigned user
  answeredBy: integer("answered_by").references(() => users.id), // Who answered
  approvedBy: integer("approved_by").references(() => users.id), // Who approved
  approvedAt: timestamp("approved_at"), // When approved

  confidence: integer("confidence"),

  sources: json("sources").$type<any[]>().default([]),

  extraFields: jsonb("extra_fields").$type<Record<string, string>>().default({}),

  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, flagged, needs_review

  version: integer("version").default(1), // For versioning

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    questionnaireIdx: index("idx_qq_questionnaire").on(table.questionnaireId),

  };

});

export const vendors = pgTable("vendors", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description"),

  website: varchar("website", { length: 512 }),

  // Risk Profiling

  criticality: varchar("criticality", { length: 50 }).default("Low"), // High, Medium, Low

  dataAccess: varchar("data_access", { length: 50 }).default("Internal"), // Restricted, Confidential, Internal, Public

  miscData: json("misc_data"), // Flexible storage for tags, custom fields

  serviceDescription: text("service_description"),

  // AI Risk Flagging
  usesAi: boolean("uses_ai").default(false),
  isAiService: boolean("is_ai_service").default(false),
  aiDataUsage: text("ai_data_usage"), // e.g., "Inputs used for training", "Zero retention"

  additionalNotes: text("additional_notes"),

  additionalDocuments: json("additional_documents").$type<{ name: string; url: string; date?: string }[]>(),

  // Lifecycle

  status: varchar("status", { length: 50 }).default("Active"), // Onboarding, Active, Offboarding, Offboarded

  ownerId: integer("owner_id"), // Internal employee owner (Business Owner)

  securityOwnerId: integer("security_owner_id"), // Internal security owner

  // Discovery & Classification

  category: varchar("category", { length: 100 }).default("Unassigned"),

  source: varchar("source", { length: 100 }), // e.g. "Google Workspace", "Manual", "Netskope"

  discoveryDate: timestamp("discovery_date"),

  reviewStatus: varchar("review_status", { length: 50 }).default("needs_review"), // needs_review, ignored, active, rejected

  // AI VRM Agent Data

  trustCenterUrl: varchar("trust_center_url", { length: 512 }),

  trustCenterData: json("trust_center_data"), // Stores analyzed docs, gaps, etc.

  trustScore: integer("trust_score"),

  // Advanced GDPR / Subprocessor Fields

  isSubprocessor: boolean("is_subprocessor").default(false),

  dataLocation: varchar("data_location", { length: 255 }), // e.g., "EU/Amsterdam", "US-East-1"

  transferMechanism: varchar("transfer_mechanism", { length: 255 }), // SCCs, DPF, Adequacy, etc.

  recursiveSubprocessors: json("recursive_subprocessors").$type<{ name: string; purpose: string; location: string }[]>(), // Chain of Trust

  dpaAnalysis: json("dpa_analysis").$type<{

    liabilityCap?: string;

    auditRights?: string;

    breachNoticeWindow?: string;

    lastVerified?: string;

  }>(),

  lastTrustCenterChange: timestamp("last_trust_center_change"),
  
  // NIS2 Supply Chain Compliance
  nis2Category: varchar("nis2_category", { length: 100 }), // e.g., "Cloud Service Provider", "ICT Security Service"
  isEssentialService: boolean("is_essential_service").default(false),
  supplyChainImpact: integer("supply_chain_impact").default(1), // 1-5 scale of dependence
  lastSupplyChainReview: timestamp("last_supply_chain_review"),

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientVendorIdx: index("idx_vendor_client").on(table.clientId),

  };

});

export const vendorChangeLogs = pgTable("vendor_change_logs", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  vendorId: integer("vendor_id").notNull(),

  changeType: varchar("change_type", { length: 50 }).notNull(), // 'trust_center_update', 'dpa_signed', 'subprocessor_added'

  description: text("description"),

  oldValue: json("old_value"),

  newValue: json("new_value"),

  detectedAt: timestamp("detected_at").defaultNow(),

}, (table) => {

  return {

    clientVendorIdx: index("idx_vcl_client_vendor").on(table.clientId, table.vendorId),

  };

});

export const vendorRequests = pgTable("vendor_requests", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  requesterId: integer("requester_id"), // User ID of employee

  name: varchar("name", { length: 255 }).notNull(),

  website: varchar("website", { length: 255 }),

  category: varchar("category", { length: 100 }), // SaaS, Contractor, etc.

  description: text("description"),

  status: varchar("status", { length: 50 }).default('pending'), // pending, approved, rejected

  businessOwner: varchar("business_owner", { length: 100 }),

  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    vendorRequestClientIdx: index("idx_vendor_request_client").on(table.clientId),

    vendorRequestStatusIdx: index("idx_vendor_request_status").on(table.status),

  };

});

// Relations


// Types
export type Vendor = typeof vendors.$inferSelect;

export type VendorChangeLog = typeof vendorChangeLogs.$inferSelect;

export type VendorDpa = typeof vendorDpas.$inferSelect;

export type VendorAuthorization = typeof vendorAuthorizations.$inferSelect;

export type VendorAssessment = typeof vendorAssessments.$inferSelect;

export type VendorContact = typeof vendorContacts.$inferSelect;

export type VendorContract = typeof vendorContracts.$inferSelect;

export type VendorRequest = typeof vendorRequests.$inferSelect;

export type VendorScan = typeof vendorScans.$inferSelect;

export type VendorCveMatch = typeof vendorCveMatches.$inferSelect;

export type VendorBreach = typeof vendorBreaches.$inferSelect;

export type VendorAssessmentTemplate = typeof vendorAssessmentTemplates.$inferSelect;

export type VendorAssessmentRequest = typeof vendorAssessmentRequests.$inferSelect;

export type VendorDataRequest = typeof vendorDataRequests.$inferSelect;

export type Questionnaire = typeof questionnaires.$inferSelect;

export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;

// Other Definitions

