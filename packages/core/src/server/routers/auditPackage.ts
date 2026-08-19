import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import {
  generateFullAuditPackage,
  generatePdfSummaryReport,
  AuditPackageError,
} from "../../lib/reporting/auditPackageGenerator";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/** Translate structured AuditPackageError into tRPC errors (cycle 13 hardening). */
const toTrpcError = (err: unknown): never => {
  if (err instanceof AuditPackageError) {
    if (err.code === "CLIENT_NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: err.message });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (err as Error)?.message || "Audit package generation failed" });
};

export const auditPackageRouter = router({
  /**
   * Generate a complete ZIP Audit Package (PDF report + CSV + JSON manifests)
   */
  generatePackage: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        framework: z.string().default("SOC2"),
        auditorNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateFullAuditPackage({
          clientId: input.clientId,
          framework: input.framework,
          auditorNotes: input.auditorNotes,
        });

        const frameworkSlug = input.framework.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const filename = `audit_package_${frameworkSlug}_client${input.clientId}_${Date.now()}.zip`;

        return {
          base64Zip: result.zipBuffer.toString("base64"),
          filename,
          manifest: result.manifest,
        };
      } catch (err) {
        return toTrpcError(err);
      }
    }),

  /**
   * Generate standalone PDF Audit Summary Report
   */
  generatePdfReport: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        framework: z.string().default("SOC2"),
        auditorNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let db;
      try {
        db = await getDb();
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      try {
        const [client] = await db
          .select()
          .from(schema.clients)
          .where(eq(schema.clients.id, input.clientId));

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Client #${input.clientId} not found.` });
        }

        const clientControlsList = await db
          .select({
            id: schema.clientControls.id,
            controlId: schema.controls.controlId,
            name: schema.controls.name,
            category: schema.controls.category,
            status: schema.clientControls.status,
            owner: schema.clientControls.owner,
          })
          .from(schema.clientControls)
          .leftJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id))
          .where(eq(schema.clientControls.clientId, input.clientId));

        const evidenceList = await db
          .select()
          .from(schema.evidence)
          .where(eq(schema.evidence.clientId, input.clientId));

        const pdfBuffer = await generatePdfSummaryReport(
          client,
          input.framework,
          clientControlsList,
          evidenceList,
          input.auditorNotes
        );

        const frameworkSlug = input.framework.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const filename = `${frameworkSlug}_audit_report_${client.id}.pdf`;

        return {
          base64Pdf: pdfBuffer.toString("base64"),
          filename,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (err as Error)?.message || "PDF report generation failed" });
      }
    }),
});
