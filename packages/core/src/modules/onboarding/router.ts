/**
 * Onboarding Module - Router
 * 
 * Handles employee onboarding workflows.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure } from "../../server/trpc";
import { eq, and, asc, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";

import { employees, employeeTrainingRecords, employeeAcknowledgments, employeeSecuritySetup, employeeAssetReceipts } from "../../schema";

export const onboardingRouter = router({
  /**
   * List employees for onboarding
   */
  listEmployees: clientProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      return db.select().from(employees).where(eq(employees.clientId, input.clientId)).orderBy(desc(employees.createdAt));
    }),

  /**
   * Get employee details
   */
  getEmployee: clientProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      const [employee] = await db.select().from(employees).where(eq(employees.id, input.id)).limit(1);
      return employee;
    }),

  /**
   * Create employee
   */
  createEmployee: clientEditorProcedure
    .input(z.object({
      clientId: z.number(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      department: z.string().optional(),
      role: z.string().optional(),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const [employee] = await db.insert(employees).values(input).returning();
      return employee;
    }),

  /**
   * Update employee
   */
  updateEmployee: clientEditorProcedure
    .input(z.object({
      id: z.number(),
      clientId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      department: z.string().optional(),
      role: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const { clientId, ...updateData } = input;
      const [updated] = await db.update(employees).set(updateData).where(and(eq(employees.id, input.id), eq(employees.clientId, clientId))).returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  /**
   * Delete employee
   */
  deleteEmployee: clientEditorProcedure
    .input(z.object({ id: z.number(), clientId: z.number() }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      await db.delete(employees).where(and(eq(employees.id, input.id), eq(employees.clientId, input.clientId)));
      return { success: true };
    }),

  // Training Records
  listTrainingRecords: clientProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      return db.select().from(employeeTrainingRecords).where(eq(employeeTrainingRecords.employeeId, input.employeeId));
    }),

  createTrainingRecord: clientEditorProcedure
    .input(z.object({
      employeeId: z.number(),
      moduleId: z.number().optional(),
      score: z.number().optional(),
      completedAt: z.string().optional(),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const [record] = await db.insert(employeeTrainingRecords).values({
        ...input,
        completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
      }).returning();
      return record;
    }),

  // Acknowledgments
  listAcknowledgments: clientProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      return db.select().from(employeeAcknowledgments).where(eq(employeeAcknowledgments.employeeId, input.employeeId));
    }),

  createAcknowledgment: clientEditorProcedure
    .input(z.object({
      employeeId: z.number(),
      policyId: z.number(),
      acknowledgedAt: z.string().optional(),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const [ack] = await db.insert(employeeAcknowledgments).values({
        employeeId: input.employeeId,
        policyId: input.policyId,
        acknowledgedAt: input.acknowledgedAt ? new Date(input.acknowledgedAt) : new Date(),
      }).returning();
      return ack;
    }),

  // Security Setup
  listSecuritySetup: clientProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      return db.select().from(employeeSecuritySetup).where(eq(employeeSecuritySetup.employeeId, input.employeeId));
    }),

  createSecuritySetup: clientEditorProcedure
    .input(z.object({
      employeeId: z.number(),
      task: z.string(),
      completed: z.boolean().default(false),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const [setup] = await db.insert(employeeSecuritySetup).values(input).returning();
      return setup;
    }),

  // Asset Receipts
  listAssetReceipts: clientProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      return db.select().from(employeeAssetReceipts).where(eq(employeeAssetReceipts.employeeId, input.employeeId));
    }),

  createAssetReceipt: clientEditorProcedure
    .input(z.object({
      employeeId: z.number(),
      assetId: z.number().optional(),
      description: z.string(),
      receivedAt: z.string().optional(),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const [receipt] = await db.insert(employeeAssetReceipts).values({
        ...input,
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : undefined,
      }).returning();
      return receipt;
    }),
});

export default onboardingRouter;
