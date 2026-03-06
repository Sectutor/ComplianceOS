
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { taskAssignments, employees, users } from "../../schema";

export const createTaskAssignmentsRouter = (t: any, clientProcedure: any) => {
    return t.router({
        // Get assignments for a specific task
        summary: clientProcedure
            .input(z.object({
                clientId: z.number().optional(),
                taskType: z.string(), // 'control', etc.
                taskId: z.number(),
            }))
            .query(async ({ input, ctx }: any) => {
                const db = await getDb();
                const clientId = input.clientId || ctx.clientId;

                // Build the where clause
                const whereClause = and(
                    eq(taskAssignments.taskType, input.taskType),
                    eq(taskAssignments.taskId, input.taskId),
                    clientId ? eq(taskAssignments.clientId, clientId) : undefined
                );

                // Query assignments - try employees first, then users
                // We'll do two separate queries and combine results for backward compatibility
                const employeeAssignments = await db.select({
                    id: taskAssignments.id,
                    userId: taskAssignments.userId,
                    role: taskAssignments.raciRole,
                    firstName: employees.firstName,
                    lastName: employees.lastName,
                    email: employees.email,
                    source: sql<string>`'employees'`
                })
                    .from(taskAssignments)
                    .innerJoin(employees, eq(taskAssignments.userId, employees.id))
                    .where(whereClause);

                // Get user IDs that weren't found in employees
                const employeeUserIds = new Set(employeeAssignments.map((a: any) => a.userId));

                // Get all assignments for this task to find ones not in employees
                const allAssignments = await db.select({
                    id: taskAssignments.id,
                    userId: taskAssignments.userId,
                    role: taskAssignments.raciRole
                })
                    .from(taskAssignments)
                    .where(whereClause);

                // Find assignments where userId is not in employees table
                const missingUserIds = allAssignments
                    .filter((a: any) => !employeeUserIds.has(a.userId))
                    .map((a: any) => a.userId);

                // Query users for missing assignments
                let userAssignments: any[] = [];
                if (missingUserIds.length > 0) {
                    userAssignments = await db.select({
                        id: taskAssignments.id,
                        userId: taskAssignments.userId,
                        role: taskAssignments.raciRole,
                        firstName: users.name,
                        lastName: sql<string>`''`,
                        email: users.email,
                        source: sql<string>`'users'`
                    })
                        .from(taskAssignments)
                        .innerJoin(users, eq(taskAssignments.userId, users.id))
                        .where(and(
                            eq(taskAssignments.taskType, input.taskType),
                            eq(taskAssignments.taskId, input.taskId),
                            clientId ? eq(taskAssignments.clientId, clientId) : undefined,
                            // @ts-ignore - drizzle doesn't handle IN well here
                            sql`${taskAssignments.userId} IN (${sql.join(missingUserIds, sql`, `)})`
                        ));
                }

                // Combine results
                const assignments = [...employeeAssignments, ...userAssignments];

                // Group by role
                const result = {
                    responsible: [] as any[],
                    accountable: [] as any[],
                    consulted: [] as any[],
                    informed: [] as any[]
                };

                for (const assign of assignments) {
                    const userObj = {
                        id: assign.userId,
                        firstName: assign.firstName,
                        lastName: assign.lastName,
                        email: assign.email,
                        assignmentId: assign.id
                    };

                    if (assign.role === 'responsible') result.responsible.push(userObj);
                    else if (assign.role === 'accountable') result.accountable.push(userObj);
                    else if (assign.role === 'consulted') result.consulted.push(userObj);
                    else if (assign.role === 'informed') result.informed.push(userObj);
                }

                return result;
            }),

        // Assign a user to a role
        assignUser: clientProcedure
            .input(z.object({
                clientId: z.number(),
                taskType: z.string(),
                taskId: z.number(),
                userId: z.number(), // Changed from employeeId to userId
                raciRole: z.enum(['responsible', 'accountable', 'consulted', 'informed']),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();

                // Upsert? Or just insert (unique index handles duplicates)
                // If unique index exists, we can ignore conflict or do nothing
                await db.insert(taskAssignments)
                    .values({
                        clientId: input.clientId,
                        taskType: input.taskType,
                        taskId: input.taskId,
                        userId: input.userId,
                        raciRole: input.raciRole,
                        assignedBy: ctx.user?.id
                    })
                    .onConflictDoNothing(); // Prevent duplicate errors

                return { success: true };
            }),

        // Remove an assignment
        remove: clientProcedure
            .input(z.object({
                assignmentId: z.number().optional(), // If we have the ID
                // Or by composite key
                taskType: z.string().optional(),
                taskId: z.number().optional(),
                userId: z.number().optional(),
                raciRole: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();

                if (input.assignmentId) {
                    await db.delete(taskAssignments).where(eq(taskAssignments.id, input.assignmentId));
                } else if (input.taskType && input.taskId && input.userId && input.raciRole) {
                    await db.delete(taskAssignments)
                        .where(and(
                            eq(taskAssignments.taskType, input.taskType),
                            eq(taskAssignments.taskId, input.taskId),
                            eq(taskAssignments.userId, input.userId),
                            // @ts-ignore
                            eq(taskAssignments.raciRole, input.raciRole)
                        ));
                } else {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing parameters for removal' });
                }

                return { success: true };
            }),
    });
};

