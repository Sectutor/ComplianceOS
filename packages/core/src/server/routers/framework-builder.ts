/**
 * Custom Framework Builder — Import your own controls from CSV/XLSX
 *
 * POST /api/v1/frameworks/import  — Import a framework from CSV or XLSX
 * GET  /api/v1/frameworks/custom  — List all custom frameworks
 * DELETE /api/v1/frameworks/:name — Delete a custom framework
 */
import { Router, Request, Response } from "express";
import { getDb } from "../../db";
import { controls, clientControls } from "../../schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import * as XLSX from "xlsx";

export const frameworkBuilderRouter = Router();

const EXPECTED_COLS = ["control_id", "name", "description", "category"];

// ── POST /api/v1/frameworks/import ─────────────────────────────────────────
frameworkBuilderRouter.post("/import", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { framework, clientId, data, format } = req.body;

    if (!framework || typeof framework !== "string" || framework.trim().length === 0) {
      return res.status(400).json({ error: "Framework name is required", code: "BAD_REQUEST" });
    }
    if (!data || typeof data !== "string") {
      return res.status(400).json({ error: "File data is required (base64 or raw CSV)", code: "BAD_REQUEST" });
    }

    const fmt = (format || "csv").toLowerCase();
    let rows: Record<string, any>[] = [];

    // Parse the data
    if (fmt === "xlsx") {
      const buf = Buffer.from(data, "base64");
      const workbook = XLSX.read(buf, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } else {
      let csvText = data;
      if (/^[A-Za-z0-9+/=]+$/.test(data) && data.length > 100 && !data.includes("\n") && !data.includes(",")) {
        csvText = Buffer.from(data, "base64").toString("utf-8");
      }
      rows = parseCSV(csvText);
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "No data rows found", code: "EMPTY" });
    }

    // Normalize column names
    const normalized = rows.map((r) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(r)) {
        const key = k.toLowerCase().replace(/[\s_-]+/g, "_").trim();
        out[key] = typeof v === "string" ? v.trim() : String(v ?? "");
      }
      return out;
    });

    // Map expected columns to actual columns
    const colMap: Record<string, string> = {};
    for (const expected of EXPECTED_COLS) {
      const found = Object.keys(normalized[0]).find(
        (k) => k === expected || k === expected.replace("_", "") || k.includes(expected)
      );
      if (found) colMap[expected] = found;
    }

    if (!colMap["control_id"] || !colMap["name"]) {
      return res.status(400).json({
        error: "Missing required columns. Expected: control_id, name (optional: description, category)",
        foundColumns: Object.keys(normalized[0]),
        code: "MISSING_COLUMNS",
      });
    }

    const frameworkName = framework.trim();

    // Check if framework already exists
    const existingCount = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(controls)
      .where(eq(controls.framework, frameworkName));

    if (existingCount[0].count > 0) {
      return res.status(409).json({
        error: `Framework "${frameworkName}" already has ${existingCount[0].count} controls`,
        code: "FRAMEWORK_EXISTS",
        existingControls: existingCount[0].count,
      });
    }

    // Prepare control data
    const controlData = normalized.map((r, i) => ({
      controlId: String(r[colMap["control_id"]] || `CTRL-${i + 1}`),
      name: String(r[colMap["name"]] || `Control ${i + 1}`).substring(0, 255),
      description: colMap["description"] ? String(r[colMap["description"]] || "").substring(0, 2000) : null,
      category: colMap["category"] ? String(r[colMap["category"]] || "General").substring(0, 255) : "General",
      framework: frameworkName,
      status: "active" as const,
    }));

    // Validate: no duplicate control_ids within the import
    const ids = controlData.map((c) => c.controlId);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      return res.status(400).json({
        error: `Duplicate control_id found: ${[...new Set(dupes)].join(", ")}`,
        code: "DUPLICATE_IDS",
      });
    }

    // Insert controls
    const inserted = await db.insert(controls).values(controlData).returning({ id: controls.id, controlId: controls.controlId });

    // Create client_controls if clientId provided
    let clientControlsCreated = 0;
    if (clientId) {
      const ccData = inserted.map((c) => ({
        clientId,
        controlId: c.id,
        status: "not_implemented" as const,
        owner: "Imported",
      }));
      await db.insert(clientControls).values(ccData);
      clientControlsCreated = ccData.length;
    }

    res.status(201).json({
      framework: frameworkName,
      controlsCreated: inserted.length,
      clientControlsCreated,
      totalRows: rows.length,
      skippedRows: rows.length - inserted.length,
      columns: Object.keys(normalized[0]),
    });
  } catch (err: any) {
    console.error("[FrameworkBuilder] Import error:", err);
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// ── GET /api/v1/frameworks/custom ──────────────────────────────────────────
frameworkBuilderRouter.get("/custom", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const builtIn = [
      "ISO 27001:2022", "NIS2", "NIST CSF", "DORA", "GDPR",
      "ISO 22301:2019", "HITRUST", "SOC 2 Type II", "PCI DSS v4.0",
      "CIS Controls v8", "CSA CCM v4", "NIST SP 800-53 Rev 5",
      "FedRAMP Moderate", "Cyber Essentials", "NIST AI RMF",
      "OWASP AISVS", "OWASP ASVS", "OWASP MASVS", "OWASP SAMM",
      "OWASP API Security Top 10", "OWASP Web Top 10",
      "Australian Essential Eight", "CMMC 2.0", "SOC 1 Type II",
      "TISAX", "NIST SP 800-161", "SCF", "OWASP ML Security Top 10",
      "NIST SP 800-171",
    ];

    const allFrameworks = await db.execute(sql`
      SELECT c.framework,
        COUNT(DISTINCT c.id)::int AS total_controls,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'implemented')::int AS implemented
      FROM controls c
      LEFT JOIN client_controls cc ON cc.control_id = c.id
      GROUP BY c.framework
      ORDER BY c.framework
    `);

    const frameworks = (allFrameworks as any[]).filter(
      (f: any) => !builtIn.includes(f.framework)
    );

    res.json({ data: frameworks, total: frameworks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// ── DELETE /api/v1/frameworks/:name ────────────────────────────────────────
frameworkBuilderRouter.delete("/:name", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const name = req.params.name;
    const builtIn = ["ISO 27001:2022", "NIS2", "NIST CSF", "DORA", "GDPR"];
    if (builtIn.includes(name)) {
      return res.status(403).json({ error: `Cannot delete built-in framework: ${name}`, code: "PROTECTED" });
    }

    const toDelete = await db.select({ id: controls.id }).from(controls).where(eq(controls.framework, name));
    if (toDelete.length === 0) {
      return res.status(404).json({ error: `Framework "${name}" not found`, code: "NOT_FOUND" });
    }

    // Delete in order using subqueries in raw SQL
    await db.execute(sql`DELETE FROM evidence WHERE client_control_id IN (SELECT id FROM client_controls WHERE control_id IN (SELECT id FROM controls WHERE framework = ${name}))`);
    await db.execute(sql`DELETE FROM client_controls WHERE control_id IN (SELECT id FROM controls WHERE framework = ${name})`);
    const deleted = await db.delete(controls).where(eq(controls.framework, name)).returning({ id: controls.id });

    res.json({ framework: name, controlsDeleted: deleted.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// ── Simple CSV Parser ────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0].trim() === "")) continue;
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
