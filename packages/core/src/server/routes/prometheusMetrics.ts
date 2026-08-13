import { Request, Response } from "express";
import client from "prom-client";
import { getDb } from "../../db";
import { clientControls, evidence, riskAssessments } from "../../schema";
import { eq } from "drizzle-orm";

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "complianceos_" });

// Custom Compliance Metrics
const overallPassRateGauge = new client.Gauge({
  name: "complianceos_overall_pass_rate",
  help: "Overall continuous compliance pass rate percentage across active controls",
  labelNames: ["client_id"],
});

const totalControlsGauge = new client.Gauge({
  name: "complianceos_total_controls",
  help: "Total active controls assessed",
  labelNames: ["client_id"],
});

const implementedControlsGauge = new client.Gauge({
  name: "complianceos_implemented_controls",
  help: "Total implemented controls",
  labelNames: ["client_id"],
});

const verifiedEvidenceGauge = new client.Gauge({
  name: "complianceos_verified_evidence_count",
  help: "Total verified evidence proof objects",
  labelNames: ["client_id"],
});

register.registerMetric(overallPassRateGauge);
register.registerMetric(totalControlsGauge);
register.registerMetric(implementedControlsGauge);
register.registerMetric(verifiedEvidenceGauge);

export async function prometheusMetricsHandler(req: Request, res: Response) {
  try {
    const db = await getDb();
    const clientId = 1; // Primary default client

    const ctrlRows = await db
      .select({ id: clientControls.id, status: clientControls.status })
      .from(clientControls)
      .where(eq(clientControls.clientId, clientId));

    const totalCtrls = ctrlRows.length;
    const implemented = ctrlRows.filter((c) => c.status === "implemented").length;
    const passRate = totalCtrls > 0 ? Math.round((implemented / totalCtrls) * 100) : 100;

    const evidenceList = await db
      .select({ id: evidence.id, status: evidence.status })
      .from(evidence)
      .where(eq(evidence.clientId, clientId));
    const verifiedEv = evidenceList.filter((e) => e.status === "verified").length;

    // Update gauge values
    overallPassRateGauge.set({ client_id: String(clientId) }, passRate);
    totalControlsGauge.set({ client_id: String(clientId) }, totalCtrls);
    implementedControlsGauge.set({ client_id: String(clientId) }, implemented);
    verifiedEvidenceGauge.set({ client_id: String(clientId) }, verifiedEv);

    res.setHeader("Content-Type", register.contentType);
    const metricsStr = await register.metrics();
    res.status(200).send(metricsStr);
  } catch (err: any) {
    console.error("[PrometheusMetrics] Error generating metrics:", err);
    res.status(500).send("# Error generating Prometheus metrics\n");
  }
}
