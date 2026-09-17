import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import * as schema from "../../schema";
import {
  generateReport,
  exportReportPdf,
  getClientEvidenceByFramework,
  saveDraftReport,
} from "../../lib/evidence-report-pipeline";

const ReportSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  evidenceIds: z.array(z.number()),
  order: z.number(),
});

export const createEvidenceReportRouter = (
  t: any,
  clientProcedure: any,
  clientEditorProcedure: any
) => {
  return t.router({
    // Get evidence grouped by control for the report builder UI
    getEvidenceByFramework: clientProcedure
      .input(z.object({ clientId: z.number(), framework: z.string().optional() }))
      .query(async ({ input }: { input: { clientId: number; framework?: string } }) =>
        getClientEvidenceByFramework(input.clientId, input.framework)
      ),

    // Generate a report
    generate: clientEditorProcedure
      .input(
        z.object({
          clientId: z.number(),
          title: z.string().min(1).max(255),
          framework: z.string().optional(),
          sections: z.array(ReportSectionSchema).min(1),
          includeExecutiveSummary: z.boolean().default(true),
          includeTableOfContents: z.boolean().default(true),
          includeAppendices: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }: { input: any }) => {
        return generateReport({
          clientId: input.clientId,
          title: input.title,
          framework: input.framework,
          sections: input.sections,
          includeExecutiveSummary: input.includeExecutiveSummary,
          includeTableOfContents: input.includeTableOfContents,
          includeAppendices: input.includeAppendices,
        });
      }),

    // Export report as HTML (printable to PDF)
    exportPdf: clientProcedure
      .input(z.object({ report: z.any() }))
      .query(async ({ input }: { input: { report: any } }) =>
        exportReportPdf(input.report)
      ),

    // List past reports
    list: clientProcedure
      .input(z.object({ clientId: z.number(), limit: z.number().default(20) }))
      .query(async ({ input }: { input: { clientId: number; limit: number } }) => {
        const db = await getDb();
        return db
          .select()
          .from(schema.reportLogs)
          .where(eq(schema.reportLogs.clientId, input.clientId))
          .orderBy(desc(schema.reportLogs.timestamp))
          .limit(input.limit);
      }),

    // Save a draft report configuration
    saveDraft: clientEditorProcedure
      .input(
        z.object({
          clientId: z.number(),
          title: z.string().min(1).max(255),
          config: z.object({
            clientId: z.number(),
            title: z.string(),
            framework: z.string().optional(),
            sections: z.array(ReportSectionSchema),
            includeExecutiveSummary: z.boolean(),
            includeTableOfContents: z.boolean(),
            includeAppendices: z.boolean(),
          }),
        })
      )
      .mutation(async ({ input }: { input: any }) => {
        return saveDraftReport(input.clientId, input.title, input.config);
      }),
  });
};

// Type exports for use in other parts of the app
export type EvidenceReportRouter = ReturnType<typeof createEvidenceReportRouter>;
