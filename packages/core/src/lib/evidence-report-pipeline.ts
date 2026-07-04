import { getDb } from "../db";
import * as schema from "../schema";
import { eq, and, inArray, desc } from "drizzle-orm";

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  evidenceIds: number[];
  order: number;
}

export interface ReportConfig {
  clientId: number;
  title: string;
  framework?: string;
  sections: ReportSection[];
  includeExecutiveSummary: boolean;
  includeTableOfContents: boolean;
  includeAppendices: boolean;
}

export interface GeneratedReport {
  id: string;
  title: string;
  clientId: number;
  framework?: string;
  sections: ReportSection[];
  executiveSummary?: string;
  tableOfContents: { section: string; page: number }[];
  generatedAt: string;
  evidenceCount: number;
  controlCount: number;
  status: string;
}

interface EvidenceWithFiles {
  id: number;
  clientId: number;
  clientControlId: number;
  evidenceId: string;
  description: string | null;
  framework: string | null;
  type: string | null;
  status: string | null;
  owner: string | null;
  lastVerified: Date | null;
  files: {
    id: number;
    filename: string;
    fileUrl: string;
    fileSize: number | null;
    contentType: string | null;
  }[];
}

interface ControlWithEvidence {
  controlId: number;
  controlName: string;
  controlStatus: string | null;
  evidenceItems: EvidenceWithFiles[];
}

// ── Core Functions ────────────────────────────────────────────────────────────

/**
 * Fetches evidence grouped by control for a given client and optional framework.
 */
export async function getClientEvidenceByFramework(
  clientId: number,
  framework?: string
): Promise<ControlWithEvidence[]> {
  const db = await getDb();

  const conditions = [eq(schema.clientControls.clientId, clientId)];
  if (framework) {
    conditions.push(eq(schema.controls.framework, framework));
  }

  const rows = await db
    .select({
      clientControlId: schema.clientControls.id,
      controlId: schema.controls.id,
      controlName: schema.controls.name,
      controlStatus: schema.clientControls.status,
      framework: schema.controls.framework,
      evidenceId: schema.evidence.id,
      evidenceEvidenceId: schema.evidence.evidenceId,
      evidenceDescription: schema.evidence.description,
      evidenceFramework: schema.evidence.framework,
      evidenceType: schema.evidence.type,
      evidenceStatus: schema.evidence.status,
      evidenceOwner: schema.evidence.owner,
      evidenceLastVerified: schema.evidence.lastVerified,
      evidenceClientControlId: schema.evidence.clientControlId,
    })
    .from(schema.clientControls)
    .innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id))
    .leftJoin(
      schema.evidence,
      eq(schema.clientControls.id, schema.evidence.clientControlId)
    )
    .where(and(...conditions))
    .orderBy(schema.controls.name);

  const evidenceIds = rows
    .map((r) => r.evidenceId)
    .filter((id): id is number => id !== null);
  const uniqueEvidenceIds = Array.from(new Set(evidenceIds));

  let fileMap = new Map<number, any[]>();
  if (uniqueEvidenceIds.length > 0) {
    const files = await db
      .select()
      .from(schema.evidenceFiles)
      .where(inArray(schema.evidenceFiles.evidenceId, uniqueEvidenceIds));
    for (const f of files) {
      if (!fileMap.has(f.evidenceId)) fileMap.set(f.evidenceId, []);
      fileMap.get(f.evidenceId)!.push({
        id: f.id,
        filename: f.filename,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
        contentType: f.contentType,
      });
    }
  }

  const controlMap = new Map<number, ControlWithEvidence>();
  for (const row of rows) {
    if (!controlMap.has(row.controlId)) {
      controlMap.set(row.controlId, {
        controlId: row.controlId,
        controlName: row.controlName,
        controlStatus: row.controlStatus,
        evidenceItems: [],
      });
    }
    if (row.evidenceId !== null) {
      const control = controlMap.get(row.controlId)!;
      if (!control.evidenceItems.find((e) => e.id === row.evidenceId)) {
        control.evidenceItems.push({
          id: row.evidenceId,
          clientId: clientId,
          clientControlId: row.evidenceClientControlId,
          evidenceId: row.evidenceEvidenceId,
          description: row.evidenceDescription,
          framework: row.evidenceFramework,
          type: row.evidenceType,
          status: row.evidenceStatus,
          owner: row.evidenceOwner,
          lastVerified: row.evidenceLastVerified,
          files: fileMap.get(row.evidenceId) || [],
        });
      }
    }
  }

  return Array.from(controlMap.values());
}

/**
 * Generates a complete report from a ReportConfig.
 */
export async function generateReport(config: ReportConfig): Promise<GeneratedReport> {
  const db = await getDb();

  const allEvidenceIds = Array.from(new Set(config.sections.flatMap((s) => s.evidenceIds)));

  let evidenceItems: any[] = [];
  if (allEvidenceIds.length > 0) {
    evidenceItems = await db
      .select()
      .from(schema.evidence)
      .where(inArray(schema.evidence.id, allEvidenceIds));
  }

  const clientControlRows = await db
    .select()
    .from(schema.clientControls)
    .where(eq(schema.clientControls.clientId, config.clientId));

  const totalControls = clientControlRows.length;
  const implementedControls = clientControlRows.filter(
    (c) => c.status === "implemented"
  ).length;
  const implementationRate =
    totalControls > 0
      ? ((implementedControls / totalControls) * 100).toFixed(1)
      : "0.0";

  const evidencePassRate =
    evidenceItems.length > 0
      ? (
          (evidenceItems.filter(
            (e: any) => e.status === "passed" || e.status === "compliant"
          ).length /
            evidenceItems.length) *
          100
        ).toFixed(1)
      : "0.0";

  const executiveSummary = `This report, "${config.title}", provides a comprehensive overview of compliance evidence for client #${config.clientId}. It covers ${config.sections.length} section(s) with ${evidenceItems.length} evidence item(s) across ${totalControls} control(s). The current implementation rate is ${implementationRate}% (${implementedControls} of ${totalControls} controls implemented). Evidence pass rate is ${evidencePassRate}%.`;

  const tableOfContents = config.sections
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({
      section: s.title,
      page: i + 3,
    }));

  const report: GeneratedReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    title: config.title,
    clientId: config.clientId,
    framework: config.framework,
    sections: config.sections,
    executiveSummary: config.includeExecutiveSummary ? executiveSummary : undefined,
    tableOfContents: config.includeTableOfContents ? tableOfContents : [],
    generatedAt: new Date().toISOString(),
    evidenceCount: evidenceItems.length,
    controlCount: totalControls,
    status: "generated",
  };

  try {
    await db.insert(schema.reportLogs).values({
      clientId: config.clientId,
      reportType: "compliance",
      format: "pdf",
      metadata: {
        filename: `${config.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        aiGenerated: false,
        bundleContents: ["evidence-report"],
      },
    });
  } catch (err) {
    console.warn("Failed to create reportLog entry:", err);
  }

  return report;
}

/**
 * Generates an HTML string for the report, suitable for printing to PDF.
 */
export async function exportReportPdf(report: GeneratedReport): Promise<string> {
  const db = await getDb();

  let clientName = `Client #${report.clientId}`;
  try {
    const clientRows = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, report.clientId))
      .limit(1);
    if (clientRows.length > 0) {
      clientName = clientRows[0].name;
    }
  } catch {
    // fallback
  }

  const allEvidenceIds = Array.from(
    new Set(report.sections.flatMap((s) => s.evidenceIds)),
  );
  let evidenceItems: any[] = [];
  if (allEvidenceIds.length > 0) {
    evidenceItems = await db
      .select()
      .from(schema.evidence)
      .where(inArray(schema.evidence.id, allEvidenceIds));
  }

  let fileMap = new Map<number, any[]>();
  if (allEvidenceIds.length > 0) {
    const files = await db
      .select()
      .from(schema.evidenceFiles)
      .where(inArray(schema.evidenceFiles.evidenceId, allEvidenceIds));
    for (const f of files) {
      if (!fileMap.has(f.evidenceId)) fileMap.set(f.evidenceId, []);
      fileMap.get(f.evidenceId)!.push(f);
    }
  }

  const sectionsHtml = report.sections
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const sectionEvidence = evidenceItems.filter((e: any) =>
        section.evidenceIds.includes(e.id)
      );

      const evidenceCards = sectionEvidence
        .map((e: any) => {
          const files = fileMap.get(e.id) || [];
          const filesList = files
            .map(
              (f: any) =>
                `<li><a href="${f.fileUrl}" target="_blank">${f.filename}</a> ${
                  f.fileSize ? `(${(f.fileSize / 1024).toFixed(1)} KB)` : ""
                }</li>`
            )
            .join("");

          const statusBadge = e.status
            ? `<span class="badge badge-${e.status}">${e.status}</span>`
            : "";

          return `
        <div class="evidence-card">
          <div class="evidence-header">
            <span class="evidence-id">${e.evidenceId}</span>
            ${statusBadge}
          </div>
          <p class="evidence-desc">${e.description || "No description"}</p>
          <div class="evidence-meta">
            <span><strong>Owner:</strong> ${e.owner || "Unassigned"}</span>
            <span><strong>Type:</strong> ${e.type || "N/A"}</span>
            ${
              e.lastVerified
                ? `<span><strong>Last Verified:</strong> ${new Date(
                    e.lastVerified
                  ).toLocaleDateString()}</span>`
                : ""
            }
          </div>
          ${
            files.length > 0
              ? `<div class="evidence-files"><strong>Attachments:</strong><ul>${filesList}</ul></div>`
              : ""
          }
        </div>`;
        })
        .join("\n");

      return `
    <div class="report-section">
      <h2>${section.title}</h2>
      ${
        section.description
          ? `<p class="section-desc">${section.description}</p>`
          : ""
      }
      <div class="evidence-list">
        ${evidenceCards || '<p class="no-evidence">No evidence assigned to this section.</p>'}
      </div>
    </div>`;
    })
    .join("\n");

  const tocHtml =
    report.tableOfContents && report.tableOfContents.length > 0
      ? `<div class="toc">
      <h2>Table of Contents</h2>
      <ul>
        ${report.tableOfContents
          .map((t) => `<li>${t.section} <span class="page-num">${t.page}</span></li>`)
          .join("\n")}
      </ul>
    </div>`
      : "";

  const execSummaryHtml = report.executiveSummary
    ? `<div class="executive-summary">
      <h2>Executive Summary</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${report.controlCount}</div>
          <div class="stat-label">Total Controls</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${report.evidenceCount}</div>
          <div class="stat-label">Evidence Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${report.sections.length}</div>
          <div class="stat-label">Report Sections</div>
        </div>
      </div>
      <p class="summary-text">${report.executiveSummary}</p>
    </div>`
    : "";

  const appendixHtml = `
    <div class="appendix">
      <h2>Appendix: Raw Evidence Data</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Evidence ID</th>
            <th>Description</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Files</th>
          </tr>
        </thead>
        <tbody>
          ${evidenceItems
            .map(
              (e: any) => `
            <tr>
              <td>${e.evidenceId}</td>
              <td>${(e.description || "").substring(0, 100)}</td>
              <td><span class="badge badge-${e.status || "pending"}">${
                e.status || "pending"
              }</span></td>
              <td>${e.owner || "\u2014"}</td>
              <td>${(fileMap.get(e.id) || []).length}</td>
            </tr>`
            )
            .join("\n")}
        </tbody>
      </table>
    </div>`;

  const coverHtml = `
    <div class="cover-page">
      <div class="cover-content">
        <h1>${report.title}</h1>
        <div class="cover-meta">
          <p><strong>Client:</strong> ${clientName}</p>
          ${
            report.framework
              ? `<p><strong>Framework:</strong> ${report.framework}</p>`
              : ""
          }
          <p><strong>Generated:</strong> ${new Date(
            report.generatedAt
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
          <p><strong>Status:</strong> ${report.status}</p>
        </div>
        <div class="cover-footer">
          <p>Generated by ComplianceOS</p>
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${report.title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 25mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      background: #ffffff;
    }
    .cover-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      page-break-after: always;
      text-align: center;
    }
    .cover-content h1 {
      font-size: 28pt;
      color: #1a1a2e;
      margin-bottom: 2rem;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 1rem;
    }
    .cover-meta { font-size: 12pt; margin: 2rem 0; }
    .cover-meta p { margin: 0.5rem 0; }
    .cover-footer { margin-top: 4rem; font-size: 10pt; color: #6b7280; }
    .toc { page-break-after: always; padding: 2rem 0; }
    .toc h2 {
      font-size: 18pt;
      color: #1a1a2e;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    .toc ul { list-style: none; }
    .toc li {
      padding: 0.5rem 0;
      border-bottom: 1px dotted #d1d5db;
      display: flex;
      justify-content: space-between;
    }
    .page-num { color: #6b7280; }
    .executive-summary { page-break-after: always; padding: 2rem 0; }
    .executive-summary h2 {
      font-size: 18pt;
      color: #1a1a2e;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }
    .stat-value { font-size: 24pt; font-weight: bold; color: #3b82f6; }
    .stat-label { font-size: 10pt; color: #6b7280; margin-top: 0.25rem; }
    .summary-text { font-size: 11pt; line-height: 1.8; color: #374151; }
    .report-section { page-break-after: always; padding: 2rem 0; }
    .report-section h2 {
      font-size: 16pt;
      color: #1a1a2e;
      margin-bottom: 1rem;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.5rem;
    }
    .section-desc { color: #6b7280; margin-bottom: 1.5rem; font-style: italic; }
    .evidence-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }
    .evidence-card:nth-child(odd) { background: #f9fafb; }
    .evidence-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .evidence-id { font-weight: 600; font-size: 10pt; color: #3b82f6; }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 500;
      text-transform: uppercase;
    }
    .badge-passed, .badge-compliant { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-failed, .badge-non_compliant { background: #fee2e2; color: #991b1b; }
    .evidence-desc { color: #374151; margin-bottom: 0.5rem; }
    .evidence-meta {
      display: flex;
      gap: 1.5rem;
      font-size: 9pt;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    .evidence-files {
      font-size: 9pt;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e5e7eb;
    }
    .evidence-files ul { list-style: none; margin-top: 0.25rem; }
    .evidence-files li { padding: 0.15rem 0; }
    .evidence-files a { color: #3b82f6; text-decoration: none; }
    .no-evidence { color: #9ca3af; font-style: italic; padding: 1rem; text-align: center; }
    .appendix { padding: 2rem 0; }
    .appendix h2 {
      font-size: 18pt;
      color: #1a1a2e;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    .data-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .data-table th {
      background: #f3f4f6;
      padding: 0.5rem;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #d1d5db;
    }
    .data-table td { padding: 0.5rem; border-bottom: 1px solid #e5e7eb; }
    .data-table tr:nth-child(even) td { background: #f9fafb; }
    @media print {
      .page-footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; }
    }
    .page-footer { text-align: center; font-size: 8pt; color: #9ca3af; padding: 1rem 0; margin-top: 2rem; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  ${coverHtml}
  ${(report.tableOfContents && report.tableOfContents.length > 0) ? tocHtml : ""}
  ${report.executiveSummary ? execSummaryHtml : ""}
  ${sectionsHtml}
  ${report.framework ? appendixHtml : ""}
  <div class="page-footer">Generated by ComplianceOS — ${new Date(
    report.generatedAt
  ).toLocaleDateString()}</div>
</body>
</html>`;

  return html;
}

/**
 * Saves a draft report configuration to the database.
 */
export async function saveDraftReport(
  clientId: number,
  title: string,
  config: ReportConfig
): Promise<{ id: number; success: boolean }> {
  const db = await getDb();

  const result = await db.insert(schema.reportLogs).values({
    clientId,
    reportType: "compliance",
    format: "draft",
    metadata: {
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.draft`,
      aiGenerated: false,
      bundleContents: ["evidence-report-draft"],
      draftConfig: {
        title: config.title,
        framework: config.framework,
        sections: config.sections,
        includeExecutiveSummary: config.includeExecutiveSummary,
        includeTableOfContents: config.includeTableOfContents,
        includeAppendices: config.includeAppendices,
      },
    },
  });

  return { id: result[0]?.id ?? 0, success: true };
}
