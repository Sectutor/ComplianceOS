// Client compliance journey state machine schema
// Tracks where a client is in their guided setup/compliance journey
import { pgTable, serial, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const clientJourney = pgTable("client_journey", {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().unique(),
    currentStep: varchar("current_step", { length: 64 }).notNull().default('welcome'),
    completedSteps: jsonb("completed_steps").$type<string[]>().notNull().default([]),
    skippedSteps: jsonb("skipped_steps").$type<string[]>().notNull().default([]),
    selectedFramework: varchar("selected_framework", { length: 64 }),
    onboardingStatus: varchar("onboarding_status", { length: 32 }).notNull().default('not_started'),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type ClientJourney = typeof clientJourney.$inferSelect;
export type InsertClientJourney = typeof clientJourney.$inferInsert;
