import {
  generateFullAuditPackage,
  generatePdfSummaryReport,
} from "../../packages/core/src/lib/reporting/auditPackageGenerator";
import { getDb } from "../../packages/core/src/db";
import * as schema from "../../packages/core/src/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== One-Click Automated Audit Package & PDF Generator Test ===");
  const clientId = 1;

  // 1. Generate full ZIP Audit Package
  console.log("\nGenerating full ZIP Audit Package for SOC 2...");
  const pkgResult = await generateFullAuditPackage({
    clientId,
    framework: "SOC2",
    auditorNotes: "Formal Q3 2026 external audit package submission.",
  });

  console.log("ZIP Buffer Size:", pkgResult.zipBuffer.length, "bytes");
  console.log("PDF Buffer Size:", pkgResult.pdfBuffer.length, "bytes");
  console.log("Audit Manifest:", pkgResult.manifest);

  if (!pkgResult.zipBuffer || pkgResult.zipBuffer.length < 500) {
    throw new Error("FAILED: Generated ZIP package buffer is empty or corrupted!");
  }

  if (!pkgResult.pdfBuffer || pkgResult.pdfBuffer.length < 500) {
    throw new Error("FAILED: Generated PDF report buffer is empty or corrupted!");
  }

  // Check PDF magic bytes (%PDF-)
  const pdfHeader = pkgResult.pdfBuffer.toString("utf-8", 0, 5);
  console.log("PDF Magic Bytes Header:", pdfHeader);
  if (!pdfHeader.startsWith("%PDF-")) {
    throw new Error(`FAILED: Generated PDF buffer does not start with %PDF- header! Received: '${pdfHeader}'`);
  }

  // 2. Generate standalone PDF report for PCI DSS
  console.log("\nGenerating standalone PDF report for PCI DSS v4.0...");
  const db = await getDb();
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId));
  const controlsList = await db.select().from(schema.clientControls).where(eq(schema.clientControls.clientId, clientId));
  const evidenceList = await db.select().from(schema.evidence).where(eq(schema.evidence.clientId, clientId));

  const pciPdfBuffer = await generatePdfSummaryReport(
    client || { id: 1, name: "Test Client" },
    "PCI_DSS_v4.0",
    controlsList,
    evidenceList,
    "PCI DSS v4.0 Annual Assessment"
  );

  console.log("PCI DSS PDF Buffer Size:", pciPdfBuffer.length, "bytes");
  const pciHeader = pciPdfBuffer.toString("utf-8", 0, 5);
  if (!pciHeader.startsWith("%PDF-")) {
    throw new Error("FAILED: PCI DSS PDF buffer failed magic bytes check!");
  }

  console.log("\n=== One-Click Automated Audit Package & PDF Generator Test PASSED Successfully ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Audit Package test error:", err);
    process.exit(1);
  });
