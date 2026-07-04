import { pgTable, serial, integer, varchar, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const autopilotConfigs = pgTable("autopilot_configs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique(),
  enabled: boolean("enabled").default(false),
  schedule: varchar("schedule", { length: 20 }).default("daily"),
  modules: jsonb("modules").$type<{
    collectEvidence: boolean;
    runHealthChecks: boolean;
    detectGaps: boolean;
    createRemediationTasks: boolean;
    generateReport: boolean;
    sendNotifications: boolean;
  }>().default({
    collectEvidence: true,
    runHealthChecks: true,
    detectGaps: true,
    createRemediationTasks: true,
    generateReport: false,
    sendNotifications: true,
  }),
  approvalMode: varchar("approval_mode", { length: 20 }).default("review"),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autopilotRuns = pgTable("autopilot_runs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).default("running"),
  modulesExecuted: jsonb("modules_executed").$type<string[]>(),
  results: jsonb("results").$type<{
    evidenceCollected: number;
    healthIssuesFound: number;
    gapsDetected: number;
    tasksCreated: number;
    reportGenerated: boolean;
    notificationsSent: number;
  }>(),
  errorMessage: text("error_message"),
  duration: integer("duration"),
}, (table) => ({
  clientIdx: index("idx_ap_run_client").on(table.clientId),
  statusIdx: index("idx_ap_run_status").on(table.status),
}));

export const autopilotActions = pgTable("autopilot_actions", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  clientId: integer("client_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  status: varchar("status", { length: 20 }).default("pending"),
  targetEntity: jsonb("target_entity"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by"),
}, (table) => ({
  runIdx: index("idx_ap_action_run").on(table.runId),
  clientStatusIdx: index("idx_ap_action_client_status").on(table.clientId, table.status),
}));
