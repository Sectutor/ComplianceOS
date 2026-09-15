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
import { clients, users } from "./core";


// Tables
export const implementationPhases = pgTable("implementation_phases", {
  id: serial("id").primaryKey(),
  frameworkId: integer("framework_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  order: integer("order").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    frameworkIdx: index("idx_phase_framework").on(table.frameworkId),
  };
});

export const implementationTemplates = pgTable("implementation_templates", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"), // Null for system templates
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  estimatedHours: integer("estimated_hours").default(0),
  priority: varchar("priority", { length: 50 }).default("medium"),
  category: varchar("category", { length: 100 }), // e.g. "Security", "Compliance"

  // JSON Structure: [{ title, description, phase, estimatedHours }]
  // Phase is implied or explicit 1-3
  tasks: jsonb("tasks").default([]),

  riskMitigationFocus: jsonb("risk_mitigation_focus").$type<string[]>().default([]),

  isSystem: boolean("is_system").default(false),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("planning"), // planning, active, completed, archived
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  owner: varchar("owner", { length: 255 }),
  projectType: varchar("project_type", { length: 50 }).default("it"), // it, ai, infra, privacy
  securityCriticality: varchar("security_criticality", { length: 50 }).default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_projects_client").on(table.clientId),
  };
});

export const projectComplianceMappings = pgTable("project_compliance_mappings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"), // Nullable for general projects
  devProjectId: integer("dev_project_id"), // New: Linked to developer projects
  framework: varchar("framework", { length: 100 }).notNull(), // NIST CSF, OWASP ASVS
  requirementId: varchar("requirement_id", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  evidenceId: integer("evidence_id"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    projectIdx: index("idx_pcm_project").on(table.projectId),
    devProjectIdx: index("idx_pcm_dev_project").on(table.devProjectId),
  };
});

export const bcPlanContacts = pgTable("bc_plan_contacts", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  userId: integer("user_id"), // Internal user

  vendorContactId: integer("vendor_contact_id"), // External vendor contact

  role: varchar("role", { length: 100 }), // e.g. "Incident Commander", "Legal", "PR"

  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),

});

export const projectTasks = pgTable("project_tasks", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 500 }).notNull(),

  description: text("description"),

  status: kanbanStatusEnum("status").default("todo"),

  priority: varchar("priority", { length: 50 }).default("medium"), // low, medium, high, critical

  dueDate: timestamp("due_date"),

  assigneeId: integer("assignee_id"), // User ID

  position: integer("position").default(0), // For Kanban ordering

  tags: json("tags").$type<string[]>(),

  sourceType: varchar("source_type", { length: 50 }), // 'remediation', 'policy', 'control', etc.

  sourceId: integer("source_id"), // ID of the linked entity

  updatedAt: timestamp("updated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_pt_client_status").on(table.clientId, table.status),

    assigneeIdx: index("idx_pt_assignee").on(table.assigneeId),

  };

});

export const roadmaps = pgTable("roadmaps", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  // Strategic planning

  vision: text("vision"), // Overall compliance vision

  objectives: json("objectives").$type<string[]>(), // High-level objectives

  framework: varchar("framework", { length: 100 }), // ISO 27001, SOX, HIPAA, etc.

  // Timeline and status

  status: roadmapStatusEnum("status").default("draft"),

  startDate: timestamp("start_date"),

  targetDate: timestamp("target_date"),

  actualStartDate: timestamp("actual_start_date"),

  actualEndDate: timestamp("actual_end_date"),

  // KPIs and metrics

  kpiTargets: json("kpi_targets").$type<{ name: string; target: number; current?: number; unit: string }[]>(),

  // Metadata

  createdById: integer("created_by_id").notNull(),

  approvedById: integer("approved_by_id"),

  approvedAt: timestamp("approved_at"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_roadmap_client_status").on(table.clientId, table.status),

    frameworkIdx: index("idx_roadmap_framework").on(table.framework),

  };

});

export const roadmapMilestones = pgTable("roadmap_milestones", {

  id: serial("id").primaryKey(),

  roadmapId: integer("roadmap_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  // Timeline

  targetDate: timestamp("target_date").notNull(),

  actualDate: timestamp("actual_date"),

  // Status and dependencies

  status: varchar("status", { length: 50 }).default("pending"), // pending, completed, delayed

  dependencies: json("dependencies").$type<number[]>(), // IDs of prerequisite milestones

  // Progress tracking

  progressPercentage: integer("progress_percentage").default(0),

  completedItemsCount: integer("completed_items_count").default(0),

  totalItemsCount: integer("total_items_count").default(0),

  // Significance

  isGate: boolean("is_gate").default(false), // Gate milestone blocks progress

  priority: varchar("priority", { length: 50 }).default("medium"), // low, medium, high, critical

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    roadmapIdx: index("idx_milestone_roadmap").on(table.roadmapId),

    targetDateIdx: index("idx_milestone_target").on(table.targetDate),

  };

});

export const implementationPlans = pgTable("implementation_plans", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  roadmapId: integer("roadmap_id"), // Links to strategic roadmap

  frameworkId: integer("framework_id"),
  customFrameworkName: varchar("custom_framework_name", { length: 255 }),
  harmonizationSourceIds: json("harmonization_source_ids").$type<number[]>(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  // Planning and scope

  status: implementationStatusEnum("status").default("not_started"),

  priority: varchar("priority", { length: 50 }).default("medium"),

  // Timeline

  plannedStartDate: timestamp("planned_start_date"),

  plannedEndDate: timestamp("planned_end_date"),

  actualStartDate: timestamp("actual_start_date"),

  actualEndDate: timestamp("actual_end_date"),

  // Resources and budget

  estimatedHours: integer("estimated_hours"),

  actualHours: integer("actual_hours"),

  budgetAmount: integer("budget_amount"), // In cents/currency units

  actualCost: integer("actual_cost"),

  // Team assignments

  projectManagerId: integer("project_manager_id"),

  teamMemberIds: json("team_member_ids").$type<number[]>(),

  // Risk and compliance context

  linkedFramework: varchar("linked_framework", { length: 100 }),

  linkedControls: json("linked_controls").$type<number[]>(),

  riskMitigationFocus: json("risk_mitigation_focus").$type<string[]>(),

  // Dependencies

  prerequisites: json("prerequisites").$type<number[]>(), // IDs of prerequisite implementation plans

  blockedBy: json("blocked_by").$type<number[]>(),

  createdById: integer("created_by_id").notNull(),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    clientStatusIdx: index("idx_impl_plan_client_status").on(table.clientId, table.status),

    roadmapIdx: index("idx_impl_plan_roadmap").on(table.roadmapId),

    timelineIdx: index("idx_impl_plan_timeline").on(table.plannedStartDate, table.plannedEndDate),

  };

});

export const implementationTasks = pgTable("implementation_tasks", {

  id: serial("id").primaryKey(),

  implementationPlanId: integer("implementation_plan_id").notNull(),

  title: varchar("title", { length: 500 }).notNull(),

  description: text("description"),

  // Status and tracking

  status: kanbanStatusEnum("status").default("todo"),
  pdca: varchar("pdca", { length: 100 }), // Plan, Do, Check, Act or Framework Chapters
  nist: varchar("nist", { length: 50 }), // Govern, Identify, Protect, Detect, Respond, Recover

  progressPercentage: integer("progress_percentage").default(0),

  // Assignment

  assigneeId: integer("assignee_id"),

  reviewerId: integer("reviewer_id"),

  // Timeline

  estimatedHours: integer("estimated_hours"),

  actualHours: integer("actual_hours"),

  plannedStartDate: timestamp("planned_start_date"),

  plannedEndDate: timestamp("planned_end_date"),

  actualStartDate: timestamp("actual_start_date"),

  actualEndDate: timestamp("actual_end_date"),

  // Dependencies

  dependencies: json("dependencies").$type<number[]>(),

  blockedBy: json("blocked_by").$type<number[]>(),

  // Quality and deliverables

  acceptanceCriteria: text("acceptance_criteria"),

  deliverables: json("deliverables").$type<string[]>(),

  evidenceRequired: json("evidence_required").$type<string[]>(),

  // Risk and controls

  riskMitigation: text("risk_mitigation"),

  controlId: varchar("control_id", { length: 100 }),

  // Metadata

  tags: json("tags").$type<string[]>(),

  subtasks: json("subtasks").$type<{ id: string; title: string; completed: boolean; evidenceId?: string; evidenceUrl?: string; filename?: string }[]>(),

  priority: varchar("priority", { length: 50 }).default("medium"),

  createdById: integer("created_by_id").notNull(),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    planIdx: index("idx_impl_task_plan").on(table.implementationPlanId),

    assigneeIdx: index("idx_impl_task_assignee").on(table.assigneeId),

    statusIdx: index("idx_impl_task_status").on(table.status),

  };

});

export const implementationProgress = pgTable("implementation_progress", {

  id: serial("id").primaryKey(),

  implementationPlanId: integer("implementation_plan_id").notNull(),

  // Progress snapshot

  completedTasksCount: integer("completed_tasks_count").default(0),

  totalTasksCount: integer("total_tasks_count").default(0),

  overallProgressPercentage: integer("overall_progress_percentage").default(0),

  // Status changes

  statusChangeDate: timestamp("status_change_date").defaultNow(),

  previousStatus: varchar("previous_status", { length: 50 }),

  newStatus: varchar("new_status", { length: 50 }),

  // Milestone impact

  affectedMilestoneIds: json("affected_milestone_ids").$type<number[]>(),

  milestoneProgressUpdates: json("milestone_progress_updates").$type<{ milestoneId: number; progress: number }[]>(),

  // Workflows feedback

  workflowsCompletedCount: integer("workflows_completed_count").default(0),

  workflowsBlockedCount: integer("workflows_blocked_count").default(0),

  // Quality metrics

  qualityScore: integer("quality_score"), // 1-100 based on task completion quality

  adherenceScore: integer("adherence_score"), // 1-100 based on timeline/budget adherence

  reportedById: integer("reported_by_id").notNull(),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    planIdx: index("idx_impl_progress_plan").on(table.implementationPlanId),

    dateIdx: index("idx_impl_progress_date").on(table.statusChangeDate),

  };

});

export const roadmapItems = pgTable("roadmap_items", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(), // FK to remediation_plans

  controlId: varchar("control_id", { length: 100 }), // Optional link to control

  gapResponseId: integer("gap_response_id"), // Optional link to specific gap

  title: varchar("title", { length: 500 }).notNull(),

  description: text("description"),

  phase: integer("phase").default(1), // 1, 2, 3...

  order: integer("order").default(0), // Ordering within phase

  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, done

  ownerRole: varchar("owner_role", { length: 255 }), // Suggested role e.g. "CISO"

  assigneeId: integer("assignee_id"), // Actual user

  estimatedDuration: integer("estimated_duration"), // In days

  actualStartDate: timestamp("actual_start_date"),

  actualEndDate: timestamp("actual_end_date"),

  dependencies: json("dependencies").$type<number[]>(), // IDs of prerequisite roadmap_items

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

}, (table) => {

  return {

    planPhaseIdx: index("idx_ri_plan_phase").on(table.planId, table.phase),

  };

});

export const bcpProjects = pgTable("bcp_projects", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  scope: text("scope"), // e.g. "Organization-wide", "IT Dept Only"

  managerId: integer("manager_id"),

  startDate: timestamp("start_date"),

  targetDate: timestamp("target_date"),

  status: varchar("status", { length: 50 }).default('planning'), // planning, active, review, completed

  createdAt: timestamp("created_at").defaultNow(),

});

export const bcPlans = pgTable("bc_plans", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  version: varchar("version", { length: 50 }).default('1.0'),

  status: varchar("status", { length: 50 }).default('draft'),

  ownerId: integer("owner_id"),

  lastTestedDate: timestamp("last_tested_date"),

  nextTestDate: timestamp("next_test_date"),

  content: text("content"), // Can be JSON or stricture text for the plan details (LEGACY / SNAPSHOT)

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const bcPlanBias = pgTable("bc_plan_bias", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  biaId: integer("bia_id").notNull(),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    planBiaIdx: index("idx_bpb_plan_bia").on(table.planId, table.biaId),

  };

});

export const bcPlanStrategies = pgTable("bc_plan_strategies", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  strategyId: integer("strategy_id").notNull(),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    planStratIdx: index("idx_bps_plan_strat").on(table.planId, table.strategyId),

  };

});

export const bcPlanScenarios = pgTable("bc_plan_scenarios", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  scenarioId: integer("scenario_id").notNull(),

  coverageNotes: text("coverage_notes"),

  createdAt: timestamp("created_at").defaultNow(),

}, (table) => {

  return {

    planScenIdx: index("idx_bpsc_plan_scen").on(table.planId, table.scenarioId),

  };

});

export const bcpStakeholders = pgTable("bcp_stakeholders", {

  id: serial("id").primaryKey(),

  projectId: integer("project_id"),

  processId: integer("process_id"),

  userId: integer("user_id").notNull(),

  role: varchar("role", { length: 50 }).notNull(), // 'owner', 'contributor', 'reviewer', 'approver'

  assignedDate: timestamp("assigned_date").defaultNow(),

});

export const bcPlanCommunicationChannels = pgTable("bc_plan_communication_channels", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  audience: varchar("audience", { length: 100 }).notNull(), // Staff, Customers, Media, Regulators

  channel: varchar("channel", { length: 100 }), // Email, SMS, Phone Call, Press Release

  responsibleRole: varchar("responsible_role", { length: 255 }),

  messageTemplate: text("message_template"),

  frequency: varchar("frequency", { length: 100 }), // Initial, Daily, Resolution

  createdAt: timestamp("created_at").defaultNow(),

});

export const bcPlanLogistics = pgTable("bc_plan_logistics", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(), // FK to bc_plans

  type: varchar("type", { length: 50 }).notNull(), // 'assembly_point', 'alternate_site', 'war_room', 'shelter'

  locationName: varchar("location_name", { length: 255 }).notNull(),

  address: text("address"),

  capacity: integer("capacity"),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),

});

export const bcPrograms = pgTable("bc_programs", {

  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),

  programName: varchar("program_name", { length: 255 }).notNull().default('Business Continuity Management Program'),

  scopeDescription: text("scope_description"), // Geographical, Organizational, Assets

  policyStatement: text("policy_statement"), // The BCP Policy

  budgetAllocated: varchar("budget_allocated", { length: 100 }),

  programManagerId: integer("program_manager_id"),

  executiveSponsorId: integer("executive_sponsor_id"),

  status: varchar("status", { length: 50 }).default('draft'), // draft, approved, active

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const bcPlanSections = pgTable("bc_plan_sections", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  sectionKey: varchar("section_key", { length: 100 }).notNull(), // 'intro', 'scope', 'assumptions', 'activation_criteria'

  content: text("content"),

  order: integer("order").default(0),

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const bcPlanAppendices = pgTable("bc_plan_appendices", {

  id: serial("id").primaryKey(),

  planId: integer("plan_id").notNull(),

  title: varchar("title", { length: 255 }).notNull(),

  description: text("description"),

  fileUrl: varchar("file_url", { length: 1024 }), // Or internal link

  type: varchar("type", { length: 50 }), // 'file', 'link', 'contact_list'

  updatedAt: timestamp("updated_at").defaultNow(),

});

export const roadmapReports = pgTable("roadmap_reports", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id"),
  clientId: integer("client_id").notNull(),

  title: varchar("title", { length: 500 }).notNull(),
  version: varchar("version", { length: 50 }).default("draft"),

  content: text("content"), // Rich text HTML content for editing

  includedSections: jsonb("included_sections"),
  dataSources: jsonb("data_sources"),
  branding: jsonb("branding"),

  filePath: text("file_path"),
  fileSize: integer("file_size"),

  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: integer("generated_by"),

  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_rr_client").on(table.clientId),
    roadmapIdx: index("idx_rr_roadmap").on(table.roadmapId),
    generatedByIdx: index("idx_rr_generated_by").on(table.generatedBy),
  };
});

// Relations
export const roadmapReportsRelations = relations(roadmapReports, ({ one }) => ({
  client: one(clients, {
    fields: [roadmapReports.clientId],
    references: [clients.id],
  }),
  roadmap: one(roadmaps, {
    fields: [roadmapReports.roadmapId],
    references: [roadmaps.id],
  }),
  generatedByUser: one(users, {
    fields: [roadmapReports.generatedBy],
    references: [users.id],
  }),
}));

// ==========================================
// IMPLEMENTATION TEMPLATES
// ==========================================

// Types
export type ImplementationProgress = typeof implementationProgress.$inferSelect;

export type Project = typeof projects.$inferSelect;

export type ProjectComplianceMapping = typeof projectComplianceMappings.$inferSelect;

export type ImplementationTemplate = typeof implementationTemplates.$inferSelect;

export type ProjectTask = typeof projectTasks.$inferSelect;

export type Roadmap = typeof roadmaps.$inferSelect;

export type RoadmapMilestone = typeof roadmapMilestones.$inferSelect;

export type ImplementationPlan = typeof implementationPlans.$inferSelect;

export type ImplementationTask = typeof implementationTasks.$inferSelect;

export type RoadmapItem = typeof roadmapItems.$inferSelect;

export type BcpProject = typeof bcpProjects.$inferSelect;

export type BcPlan = typeof bcPlans.$inferSelect;

export type BcPlanBia = typeof bcPlanBias.$inferSelect;

export type BcPlanStrategy = typeof bcPlanStrategies.$inferSelect;

export type BcPlanScenario = typeof bcPlanScenarios.$inferSelect;

export type BcPlanContact = typeof bcPlanContacts.$inferSelect;

export type BcpStakeholder = typeof bcpStakeholders.$inferSelect;

export type BcPlanCommunicationChannel = typeof bcPlanCommunicationChannels.$inferSelect;

export type BcPlanLogistic = typeof bcPlanLogistics.$inferSelect;

export type BcProgram = typeof bcPrograms.$inferSelect;

export type BcPlanSection = typeof bcPlanSections.$inferSelect;

export type BcPlanAppendix = typeof bcPlanAppendices.$inferSelect;

export type RoadmapReport = typeof roadmapReports.$inferSelect;

// Other Definitions

