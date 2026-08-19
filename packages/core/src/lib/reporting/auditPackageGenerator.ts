import PDFDocument from "pdfkit";
import archiver from "archiver";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and } from "drizzle-orm";
import { Writable } from "stream";

export interface AuditPackageOptions {
  clientId: number;
  framework: string; // e.g. "SOC2", "PCI_DSS", "HIPAA", "ISO27001", "NIS2"
  includeEvidenceFiles?: boolean;
  includeAiSummary?: boolean;
  auditorNotes?: string;
}

export interface GeneratedAuditPackage {
  zipBuffer: Buffer;
  pdfBuffer: Buffer;
  manifest: {
    framework: string;
    totalControls: number;
    implementedControls: number;
    passRate: number;
    generatedAt: string;
  };
}
/** Structured error for audit-package generation failures (cycle 13 hardening). */
export class AuditPackageError extends Error {
  code: "DB_UNAVAILABLE" | "CLIENT_NOT_FOUND" | "GENERATION_FAILED";
  constructor(code: AuditPackageError["code"], message: string) {
    super(message);
    this.name = "AuditPackageError";
    this.code = code;
  }
}

/** Pure: compute a 0-100 pass rate from implemented/total counts (never NaN). */
export function computePassRate(implemented: number, total: number): number {
  if (!total || total <= 0) return 100;
  const rate = Math.round((implemented / total) * 100);
  return Number.isFinite(rate) ? rate : 100;
}

/** Pure: build the controls CSV manifest (header + quoted rows). */
export function buildControlsCsv(
  clientControlsList: Array<{
    controlId?: string | null;
    id: number;
    name?: string | null;
    category?: string | null;
    status?: string | null;
    applicability?: string | null;
    justification?: string | null;
    owner?: string | null;
  }>
): string {
  const csvHeader = "Control ID,Control Name,Category,Status,Applicability,Justification,Owner\n";
  const quote = (v: string) => '"' + v.replace(/"/g, '""') + '"';
  const csvRows = clientControlsList.map((c) =>
    [
      c.controlId || String(c.id),
      quote(c.name || ""),
      c.category || "",
      c.status || "",
      c.applicability || "",
      quote(c.justification || ""),
      c.owner || "",
    ].join(",")
  );
  return csvHeader + csvRows.join("\n");
}

/** Pure: build the machine-readable JSON audit manifest payload. */
export function buildAuditManifestJson(params: {
  client: { id: number; name?: string | null };
  framework: string;
  controls: unknown[];
  evidence: unknown[];
  generatedAt?: string;
}): string {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  return JSON.stringify(
    {
      client: { id: params.client.id, name: params.client.name },
      framework: params.framework,
      generatedAt,
      summary: {
        totalControls: params.controls.length,
        implementedCount: params.controls.filter((c: any) => c.status === "implemented").length,
        evidenceCount: params.evidence.length,
      },
      controls: params.controls,
      evidence: params.evidence,
    },
    null,
    2
  );
}


/**
 * Generate a professional PDF Compliance Summary Report using PDFKit.
 */
export async function generatePdfSummaryReport(
  client: any,
  framework: string,
  clientControlsList: any[],
  evidenceList: any[],
  auditorNotes?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // --- COVER PAGE ---
      doc.fillColor("#0f172a").rect(0, 0, doc.page.width, doc.page.height).fill();

      // Brand Header
      doc.fillColor("#6366f1").fontSize(28).font("Helvetica-Bold").text("ComplianceOS", 50, 150);
      doc.fillColor("#94a3b8").fontSize(14).font("Helvetica").text("Enterprise GRC & Automated Audit Platform", 50, 185);

      doc.moveDown(4);

      // Title & Metadata
      doc.fillColor("#ffffff").fontSize(24).font("Helvetica-Bold").text(`${framework} Audit Package`, 50, 260);
      doc.fillColor("#cbd5e1").fontSize(12).font("Helvetica").text(`Client Organization: ${client.name || "Client #" + client.id}`, 50, 295);
      doc.text(`Generated On: ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}`, 50, 315);
      doc.text(`Classification: CONFIDENTIAL / AUDITOR PROOF`, 50, 335);

      // Pass Rate & Health Score Metric Box
      const totalCtrls = clientControlsList.length;
      const implemented = clientControlsList.filter((c) => c.status === "implemented").length;
      const passRate = totalCtrls > 0 ? Math.round((implemented / totalCtrls) * 100) : 100;

      doc.roundedRect(50, 400, doc.page.width - 100, 120, 10).fill("#1e293b");

      doc.fillColor("#6366f1").fontSize(36).font("Helvetica-Bold").text(`${passRate}%`, 80, 425);
      doc.fillColor("#94a3b8").fontSize(12).font("Helvetica").text("Readiness & Control Pass Rate", 80, 470);

      doc.fillColor("#38bdf8").fontSize(36).font("Helvetica-Bold").text(`${implemented}/${totalCtrls}`, 320, 425);
      doc.fillColor("#94a3b8").fontSize(12).font("Helvetica").text("Implemented Master Controls", 320, 470);

      doc.addPage({ margin: 50 });

      // --- PAGE 2: EXECUTIVE SUMMARY & STATEMENTS ---
      doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text("Executive Audit Summary");
      doc.moveDown(0.5);

      doc.fillColor("#334155").fontSize(10).font("Helvetica").text(
        `This audit evidence package compiles verified control assessments, governance policies, and technical evidence objects for ${client.name || "the client"} in support of formal ${framework} audit evaluation.`
      );
      doc.moveDown(1.5);

      if (auditorNotes) {
        doc.fillColor("#1e293b").fontSize(12).font("Helvetica-Bold").text("Auditor Scope Notes:");
        doc.fillColor("#475569").fontSize(10).font("Helvetica").text(auditorNotes);
        doc.moveDown(1.5);
      }

      // --- CONTROL IMPLEMENTATION TABLE ---
      doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text("Control Assessment Status");
      doc.moveDown(0.5);

      // Table Header
      let y = doc.y;
      doc.fillColor("#f1f5f9").rect(50, y, doc.page.width - 100, 20).fill();
      doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold");
      doc.text("Control ID", 60, y + 5);
      doc.text("Category", 180, y + 5);
      doc.text("Status", 340, y + 5);
      doc.text("Evidence Status", 440, y + 5);

      y += 25;
      const sampleControls = clientControlsList.slice(0, 15);

      sampleControls.forEach((ctrl) => {
        if (y > doc.page.height - 70) {
          doc.addPage({ margin: 50 });
          y = 50;
        }

        const isImplemented = ctrl.status === "implemented";
        doc.fillColor(isImplemented ? "#0284c7" : "#64748b").fontSize(8).font("Helvetica-Bold");
        doc.text(ctrl.controlId || `CTRL-${ctrl.id}`, 60, y);

        doc.fillColor("#334155").font("Helvetica");
        doc.text((ctrl.category || "General").substring(0, 25), 180, y);

        doc.fillColor(isImplemented ? "#16a34a" : "#ca8a04").font("Helvetica-Bold");
        doc.text((ctrl.status || "draft").toUpperCase(), 340, y);

        const evCount = evidenceList.filter((e) => e.clientControlId === ctrl.id).length;
        doc.fillColor("#475569").font("Helvetica");
        doc.text(evCount > 0 ? `${evCount} Verified` : "Pending", 440, y);

        y += 18;
      });

      doc.moveDown(2);

      // --- PAGE 3: EVIDENCE INVENTORY MANIFEST ---
      if (doc.y > doc.page.height - 150) doc.addPage({ margin: 50 });

      doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text("Evidence Object Manifest");
      doc.moveDown(0.5);

      doc.fillColor("#475569").fontSize(9).font("Helvetica");
      doc.text(`Total Evidence Files Captured: ${evidenceList.length}`);
      doc.text(`Manifest Timestamp: ${new Date().toISOString()}`);
      doc.moveDown(1);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a complete ZIP Audit Package with PDF summary report, CSV & JSON manifests.
 */
export async function generateFullAuditPackage(
  options: AuditPackageOptions
): Promise<GeneratedAuditPackage> {
  let db;
  try {
    db = await getDb();
  } catch {
    throw new AuditPackageError("DB_UNAVAILABLE", "Database unavailable while generating audit package.");
  }

  let client;
  try {
    // 1. Fetch client details
    const rows = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, options.clientId))
      .limit(1);
    client = rows[0];
  } catch {
    throw new AuditPackageError("DB_UNAVAILABLE", "Database unavailable while fetching client for audit package.");
  }

  if (!client) {
    throw new AuditPackageError("CLIENT_NOT_FOUND", `Client #${options.clientId} not found.`);
  }

  try {
    // 2. Fetch controls & evidence
    const clientControlsList = await db
      .select({
        id: schema.clientControls.id,
        controlId: schema.controls.controlId,
        name: schema.controls.name,
        category: schema.controls.category,
        status: schema.clientControls.status,
        owner: schema.clientControls.owner,
        applicability: schema.clientControls.applicability,
        justification: schema.clientControls.justification,
      })
      .from(schema.clientControls)
      .leftJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id))
      .where(eq(schema.clientControls.clientId, options.clientId));

    const evidenceList = await db
      .select()
      .from(schema.evidence)
      .where(eq(schema.evidence.clientId, options.clientId));

    // 3. Generate PDF Report
    const pdfBuffer = await generatePdfSummaryReport(
      client,
      options.framework,
      clientControlsList,
      evidenceList,
      options.auditorNotes
    );

    // 4. Build CSV & JSON Manifests (pure helpers)
    const csvContent = buildControlsCsv(clientControlsList);
    const jsonManifest = buildAuditManifestJson({
      client: { id: client.id, name: client.name },
      framework: options.framework,
      controls: clientControlsList,
      evidence: evidenceList,
    });

    // 5. Create ZIP Archive
    const archive = archiver("zip", { zlib: { level: 9 } });
    const zipBuffers: Buffer[] = [];

    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      const writable = new Writable({
        write(chunk, encoding, callback) {
          zipBuffers.push(chunk);
          callback();
        },
      });

      writable.on("finish", () => resolve(Buffer.concat(zipBuffers)));
      archive.on("error", (err) => reject(err));
      archive.pipe(writable);
    });

    // Append PDF report & manifests to ZIP
    const frameworkSlug = options.framework.toLowerCase().replace(/[^a-z0-9]/g, "_");
    archive.append(pdfBuffer, { name: `${frameworkSlug}_audit_report.pdf` });
    archive.append(csvContent, { name: `controls_manifest.csv` });
    archive.append(jsonManifest, { name: `audit_manifest.json` });

    // Append Readme / Auditor Instructions
    const readmeText = `# ComplianceOS Audit Evidence Package
Framework: ${options.framework}
Client: ${client.name || "Client #" + client.id}
Generated: ${new Date().toISOString()}

Contents:
1. ${frameworkSlug}_audit_report.pdf - Executive Audit Summary & Control Status Report
2. controls_manifest.csv - Full Control Implementation & Statement of Applicability Matrix
3. audit_manifest.json - Structured Audit Machine-Readable JSON Payload

For auditor inquiries or verification proof, contact audit@complianceos.local.
`;
    archive.append(readmeText, { name: `README_AUDITOR_INSTRUCTIONS.txt` });

    await archive.finalize();
    const zipBuffer = await zipPromise;

    const implementedCount = clientControlsList.filter((c) => c.status === "implemented").length;
    const passRate = computePassRate(implementedCount, clientControlsList.length);

    return {
      zipBuffer,
      pdfBuffer,
      manifest: {
        framework: options.framework,
        totalControls: clientControlsList.length,
        implementedControls: implementedCount,
        passRate,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof AuditPackageError) throw err;
    throw new AuditPackageError("GENERATION_FAILED", `Failed to generate audit package: ${(err as Error).message}`);
  }
}
