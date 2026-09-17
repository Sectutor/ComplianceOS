/**
 * Frameworks Module - Router
 * 
 * This module handles framework management.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure } from "../../server/trpc";
import { eq, and, asc, desc } from "drizzle-orm";
import { getDb } from "../../db";

import { complianceFrameworks as frameworks, frameworkMappings } from "../../schema";

export const frameworksRouter = router({
  /**
   * List all frameworks
   */
  list: clientProcedure
    .query(async () => {
      const db = await getDb();
      return db.select().from(frameworks).orderBy(asc(frameworks.name));
    }),

  /**
   * Get a framework
   */
  get: clientProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      const [framework] = await db.select()
        .from(frameworks)
        .where(eq(frameworks.id, input.id))
        .limit(1);
      return framework;
    }),

  /**
   * Get framework mappings for a client
   */
  getMappings: clientProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      return db.select()
        .from(frameworkMappings)
        .where(eq(frameworkMappings.clientId, input.clientId));
    }),

  /**
   * Create framework mapping
   */
  createMapping: clientEditorProcedure
    .input(z.object({
      clientId: z.number(),
      frameworkId: z.number(),
      status: z.string().default('in-progress'),
    }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      const [mapping] = await db.insert(frameworkMappings)
        .values(input)
        .returning();
      return mapping;
    }),
});

export default frameworksRouter;
