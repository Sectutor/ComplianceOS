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
export const employees = pgTable("employees", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  firstName: varchar("first_name", { length: 255 }).notNull(),

  lastName: varchar("last_name", { length: 255 }).notNull(),

  email: varchar("email", { length: 255 }).notNull(),

  jobTitle: varchar("job_title", { length: 255 }),

  department: varchar("department", { length: 255 }),

  role: varchar("role", { length: 255 }), // Keeping for fallback/legacy

  orgRoleId: integer("org_role_id"), // Link to structured role

  managerId: integer("manager_id"), // Link to manager (another employee)

  employmentStatus: varchar("employment_status", { length: 50 }),

  startDate: timestamp("start_date"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const employeeAcknowledgments = pgTable("employee_acknowledgments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  acknowledgmentType: varchar("acknowledgment_type", { length: 100 }).notNull(), // 'code_of_conduct', 'aup', 'data_protection', 'confidentiality'
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

export const employeeSecuritySetup = pgTable("employee_security_setup", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  employeeId: integer("employee_id").notNull().unique(),
  mfaEnrolled: boolean("mfa_enrolled").default(false),
  mfaEnrolledAt: timestamp("mfa_enrolled_at"),
  passwordManagerSetup: boolean("password_manager_setup").default(false),
  passwordManagerSetupAt: timestamp("password_manager_setup_at"),
  securityQuestionsSet: boolean("security_questions_set").default(false),
  securityQuestionsSetAt: timestamp("security_questions_set_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeAssetReceipts = pgTable("employee_asset_receipts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  assetType: varchar("asset_type", { length: 100 }).notNull(), // 'laptop', 'badge', 'software_access'
  status: varchar("status", { length: 50 }).notNull().default('assigned'), // 'assigned', 'confirmed', 'returned'
  serialNumber: varchar("serial_number", { length: 100 }),
  assetId: integer("asset_id"), // Optional link to specific asset inventory
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: integer("assigned_by"),
  confirmedAt: timestamp("confirmed_at"),
  expiresAt: timestamp("expires_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const employeeTaskAssignments = pgTable("employee_task_assignments", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  employeeId: integer("employee_id").notNull(),

  taskType: taskTypeEnum("task_type").notNull(),

  taskId: integer("task_id").notNull(),

  raciRole: raciRoleEnum("raci_role").notNull(),

  notes: text("notes"),

  dueDate: timestamp("due_date"),

  assignedAt: timestamp("assigned_at").defaultNow().notNull(),

  assignedBy: integer("assigned_by"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),

});

export const employeeTrainingRecords = pgTable("employee_training_records", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  employeeId: integer("employee_id").notNull(),

  // Training identification
  frameworkId: varchar("framework_id", { length: 100 }).notNull(), // iso-27001, soc-2, etc.
  sectionId: varchar("section_id", { length: 100 }).notNull(), // intro, implementation, etc.

  // Completion tracking
  completedAt: timestamp("completed_at").notNull(),
  completedByUserId: integer("completed_by_user_id").notNull(),

  // Audit trail
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),

  // Optional metadata
  timeSpentSeconds: integer("time_spent_seconds"),
  score: integer("score"), // For future quiz/assessment integration

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    employeeIdx: index("idx_training_employee").on(table.employeeId),
    clientIdx: index("idx_training_client").on(table.clientId),
    frameworkIdx: index("idx_training_framework").on(table.frameworkId),
    uniqueCompletion: uniqueIndex("idx_training_unique").on(
      table.employeeId,
      table.frameworkId,
      table.sectionId
    ),
  };
});

export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // 'video', 'text'
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  content: text("content"),
  durationMinutes: integer("duration_minutes").default(0),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_training_module_client").on(table.clientId),
  };
});

// Assignment and completion records for training modules

export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  moduleId: integer("module_id").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed
  score: integer("score"),
  feedback: text("feedback"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_training_assignment_client").on(table.clientId),
    employeeIdx: index("idx_training_assignment_employee").on(table.employeeId),
    moduleIdx: index("idx_training_assignment_module").on(table.moduleId),
  };
});

export const accessReviewCampaigns = pgTable("access_review_campaigns", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  scope: varchar("scope", { length: 50 }).default("all"),
  scopeValue: varchar("scope_value", { length: 255 }),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 50 }).default("draft"),
  createdById: integer("created_by_id"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accessReviewAssignments = pgTable("access_review_assignments", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  revieweeId: integer("reviewee_id").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  justification: text("justification"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accessReviewHistory = pgTable("access_review_history", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  campaignId: integer("campaign_id"),
  userId: integer("user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb("details"),
  reviewedBy: integer("reviewed_by").notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
});

// Client-specific settings (branding, feature flags) — must be in the shared schema
// so drizzle's db.query.clientSettings is available at runtime
export { clientSettings } from "../schema_client_settings";

export const accessReviewCycles = pgTable("access_review_cycles", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  status: accessReviewCycleStatusEnum("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_arc_client").on(table.clientId),
    dueIdx: index("idx_arc_due").on(table.dueDate),
  };
});

export const accessReviewTasks = pgTable("access_review_tasks", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  clientId: integer("client_id").notNull(),
  userId: integer("user_id"),
  role: varchar("role", { length: 100 }),
  status: accessReviewTaskStatusEnum("status").default("pending"),
  dueDate: timestamp("due_date"),
  note: text("note"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    cycleIdx: index("idx_art_cycle").on(table.cycleId),
    clientIdx: index("idx_art_client").on(table.clientId),
    statusIdx: index("idx_art_status").on(table.status),
  };
});

// Relations


// Types
export type Employee = typeof employees.$inferSelect;

export type EmployeeAcknowledgment = typeof employeeAcknowledgments.$inferSelect;

export type EmployeeSecuritySetup = typeof employeeSecuritySetup.$inferSelect;

export type EmployeeAssetReceipt = typeof employeeAssetReceipts.$inferSelect;

export type EmployeeTaskAssignment = typeof employeeTaskAssignments.$inferSelect;

export type EmployeeTrainingRecord = typeof employeeTrainingRecords.$inferSelect;

export type TrainingModule = typeof trainingModules.$inferSelect;

export type TrainingAssignment = typeof trainingAssignments.$inferSelect;

export type AccessReviewCycle = typeof accessReviewCycles.$inferSelect;

export type AccessReviewTask = typeof accessReviewTasks.$inferSelect;

// Other Definitions

