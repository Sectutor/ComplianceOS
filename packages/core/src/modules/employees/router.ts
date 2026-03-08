/**
 * Employees Module - Router
 * 
 * This module handles employee management.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure } from "../../server/trpc";
import { eq, and, asc, desc, or } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";

import { employees } from "../../schema";

export const employeesRouter = router({
    /**
     * List employees for a client
     */
    list: clientProcedure
        .input(z.object({
            clientId: z.number().optional(),
            search: z.string().optional(),
            department: z.string().optional(),
            status: z.string().optional(),
        }).optional())
        .query(async ({ input, ctx }: any) => {
            const db = await getDb();
            const clientId = input?.clientId || ctx.clientId;

            if (!clientId) {
                // If no clientId provided, return empty array for safety
                return [];
            }

            let query = db.select()
                .from(employees)
                .where(eq(employees.clientId, clientId));

            return query.orderBy(asc(employees.lastName));
        }),

    /**
     * Get a single employee
     */
    get: clientProcedure
        .input(z.object({
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [employee] = await db.select()
                .from(employees)
                .where(eq(employees.id, input.id))
                .limit(1);

            if (!employee) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return employee;
        }),

    /**
     * Get employee by email
     */
    getByEmail: clientProcedure
        .input(z.object({
            email: z.string(),
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [employee] = await db.select()
                .from(employees)
                .where(and(
                    eq(employees.email, input.email),
                    eq(employees.clientId, input.clientId)
                ))
                .limit(1);

            return employee || null;
        }),

    /**
     * Create employee
     */
    create: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            email: z.string().email(),
            department: z.string().optional(),
            title: z.string().optional(),
            status: z.string().default('active'),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const [employee] = await db.insert(employees)
                .values(input)
                .returning();

            return employee;
        }),

    /**
     * Update employee
     */
    update: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            department: z.string().optional(),
            title: z.string().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const { clientId, ...updateData } = input;

            const [updated] = await db.update(employees)
                .set(updateData)
                .where(and(
                    eq(employees.id, input.id),
                    eq(employees.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return updated;
        }),

    /**
     * Delete employee
     */
    delete: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            await db.delete(employees)
                .where(and(
                    eq(employees.id, input.id),
                    eq(employees.clientId, input.clientId)
                ));

            return { success: true };
        }),
});

export default employeesRouter;
