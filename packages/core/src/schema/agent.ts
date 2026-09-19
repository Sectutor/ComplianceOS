/**
 * Autonomous agent fleet schema.
 *
 * agent_tasks is the persistent work queue that the fleet runtime
 * (server/runtime/agentFleet.ts) drains. Each row is one unit of work
 * assigned to a named agent (Tara, Marcus, Morgan, …). The runtime picks up
 * pending tasks, runs them as real LLM calls, writes the result back, and
 * posts the agent's reply to the War Room channel.
 */
import { pgTable, serial, integer, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export type AgentTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export const agentTasks = pgTable("agent_tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  channelId: varchar("channel_id", { length: 64 }).default("war_room").notNull(),
  agentId: varchar("agent_id", { length: 64 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  result: jsonb("result").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  clientStatusIdx: index("idx_agent_task_client_status").on(t.clientId, t.status),
  agentIdx: index("idx_agent_task_agent").on(t.agentId, t.status),
}));
