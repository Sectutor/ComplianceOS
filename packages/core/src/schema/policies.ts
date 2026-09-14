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
export const policyTemplates = pgTable("policy_templates", {

  id: serial("id").primaryKey(),

  templateId: varchar("template_id", { length: 50 }).notNull().unique(),

  name: varchar("name", { length: 255 }).notNull(),
  content: text("content"),
  // Ownership
  ownerId: integer("owner_id"),
  clientId: integer("client_id"),
  isPublic: boolean("is_public").default(false),

  sections: json("sections").$type<{

    id: string;

    title: string;

    content: string;

    optional: boolean;
    defaultEnabled: boolean;
    condition?: string;
  }[]>(),

  tailoringQuestions: json("tailoring_questions").$type<{
    id: string;
    question: string;
    type: 'boolean' | 'text' | 'select' | 'number';
    options?: string[];
    defaultValue?: any;
    placeholder?: string;
    category?: string;
  }[]>(),

  frameworks: json("frameworks").$type<string[]>(), // Changed from single framework string

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const policyVersions = pgTable("policy_versions", {

  id: serial("id").primaryKey(),

  clientPolicyId: integer("client_policy_id").notNull(),

  version: varchar("version", { length: 50 }).notNull(), // "1.0", "1.1"

  content: text("content"), // Snapshot

  status: varchar("status", { length: 50 }), // 'approved', 'archived'

  description: text("description"), // Change log / Release notes

  publishedBy: integer("published_by"), // User ID

  createdAt: timestamp("created_at").defaultNow(),

});

export const policyReviews = pgTable("policy_reviews", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  policyReviewId: varchar("policy_review_id", { length: 50 }).notNull().unique(),

  policyName: varchar("policy_name", { length: 500 }).notNull(),

  policyContent: text("policy_content").notNull(),

  selectedRequirements: json("selected_requirements").$type<string[]>(), // ["SOC2", "GDPR", "EU", "ISO27001"]

  status: policyReviewStatusEnum("status").default("analyzing"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const policyAcknowledgements = pgTable("policy_acknowledgements", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id").notNull(),
  userId: integer("user_id").notNull(),
  clientId: integer("client_id").notNull(),
  status: policyAckStatusEnum("status").default("pending"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_pa_ack_client").on(table.clientId),
    policyIdx: index("idx_pa_ack_policy").on(table.policyId),
    userIdx: index("idx_pa_ack_user").on(table.userId),
  };
});

export const policyAssignments = pgTable("policy_assignments", {

  id: serial("id").primaryKey(),

  policyId: integer("policy_id").notNull(), // FK to client_policies

  employeeId: integer("employee_id").notNull(), // FK to employees

  status: varchar("status", { length: 50 }).default("pending"), // pending, viewed, attested

  attestedAt: timestamp("attested_at"),

  assignedAt: timestamp("assigned_at").defaultNow(),

  viewedAt: timestamp("viewed_at"),

}, (table) => {

  return {

    policyIdx: index("idx_pa_policy").on(table.policyId),

    employeeIdx: index("idx_pa_employee").on(table.employeeId),

  };

});

export const policyExceptions = pgTable("policy_exceptions", {

  id: serial("id").primaryKey(),

  policyId: integer("policy_id"), // FK to client_policies (Nullable)
  requirementId: integer("requirement_id"), // FK to compliance_requirements (Nullable)
  policyType: varchar("policy_type", { length: 50 }).default("policy"), // 'policy' or 'document'

  employeeId: integer("employee_id").notNull(), // FK to employees (requester)

  reason: text("reason").notNull(),

  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, expired

  expirationDate: timestamp("expiration_date"),

  approvedBy: integer("approved_by"), // FK to users (approver) - Nullable if not approved yet or auto-approved

  approvedAt: timestamp("approved_at"),

  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    policyIdx: index("idx_pe_policy").on(table.policyId),

    employeeIdx: index("idx_pe_employee").on(table.employeeId),

    statusIdx: index("idx_pe_status").on(table.status),

  };

});

export const policyReviewResults = pgTable("policy_review_results", {

  id: serial("id").primaryKey(),

  policyReviewId: integer("policy_review_id").notNull(),

  overallScore: integer("overall_score"), // 0-100

  gaps: json("gaps").$type<{ requirement: string, issue: string, severity: string }[]>(),

  compliance: json("compliance").$type<{ requirement: string, status: string, details: string }[]>(),

  recommendations: json("recommendations").$type<{ section: string, current: string, improved: string, reasoning: string }[]>(),

  improvedPolicyContent: text("improved_policy_content"), // Full improved version

  aiProvider: varchar("ai_provider", { length: 100 }),

  aiModel: varchar("ai_model", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow(),

});

// Relations


// Types
export type PolicyTemplate = typeof policyTemplates.$inferSelect;

export type PolicyVersion = typeof policyVersions.$inferSelect;

export type PolicyReview = typeof policyReviews.$inferSelect;

export type PolicyReviewResult = typeof policyReviewResults.$inferSelect;

export type PolicyAssignment = typeof policyAssignments.$inferSelect;

export type PolicyException = typeof policyExceptions.$inferSelect;

export type PolicyAcknowledgement = typeof policyAcknowledgements.$inferSelect;

// Other Definitions

