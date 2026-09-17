/**
 * TPRM risk router — per-vendor risk tiering & portfolio overview.
 *
 * Mirrors the router pattern from `vendorAssessments.ts`: `t.router({ ... })`
 * with zod inputs and `getDb` from `../../db`. Replaces the previous dead mock
 * router (static `calculateVendorRiskTier`) with a real, DB-backed pipeline:
 *
 *   vendors (client) -> latest vendorScans / open high-critical
 *   vendorAssessments / vendorContracts / vendorDpas / subprocessors
 *   -> computeVendorRiskTier -> VendorRiskResult
 *
 * Graceful degradation: `getOverview` NEVER throws for a read — if the DB is
 * unreachable it returns an empty overview + empty vendor list.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { vendors, vendorScans, vendorAssessments, vendorContracts, vendorDpas } from "../../schema";
import { computeVendorRiskTier, buildVendorRiskOverview } from "../../lib/vendor/vendorRisk";
import type { DataAccessType, RiskTier, VendorRiskInput, VendorRiskResult } from "../../lib/vendor/vendorRisk";

type Db = Awaited<ReturnType<typeof getDb>>;

/** Contract statuses that do NOT count as an active contract on file. */
const INACTIVE_CONTRACT_STATUSES = new Set(["expired", "archived", "terminated", "cancelled", "draft"]);

/** Assessment statuses that are NOT considered "open". */
const CLOSED_ASSESSMENT_STATUSES = new Set(["completed", "archived", "cancelled", "rejected"]);

/**
 * Heuristic mapping from the `vendors.data_access` classification
 * (Restricted / Confidential / Internal / Public) to the risk model's
 * data-access sensitivity class. Restricted and Confidential data are treated
 * as PII-class (conservative); Internal/Public/unknown default to medium risk.
 */
function mapDataAccessType(dataAccess?: string | null): DataAccessType | undefined {
  if (dataAccess === "Restricted" || dataAccess === "Confidential") {
    return "PII";
  }
  return undefined;
}

/**
 * A vendor assessment counts toward the "open high/critical" signal when its
 * status is open AND either its inherent or residual risk level is high/critical.
 */
function isOpenHighCriticalAssessment(a: {
  status?: string | null;
  inherentRiskLevel?: string | null;
  residualRiskLevel?: string | null;
}): boolean {
  const status = (a.status ?? "Planned").toLowerCase();
  const isOpen = !CLOSED_ASSESSMENT_STATUSES.has(status);
  const level = `${a.inherentRiskLevel ?? ""} ${a.residualRiskLevel ?? ""}`.toLowerCase();
  const isHighOrCritical = level.includes("high") || level.includes("critical");
  return isOpen && isHighOrCritical;
}

function tierRank(tier: RiskTier): number {
  return tier === "Tier 1 (Critical)" ? 0 : tier === "Tier 2 (High)" ? 1 : 2;
}

/**
 * Load every signal needed to tier each of a client's vendors in a handful of
 * client-scoped queries, grouped in memory. Returns vendorId -> VendorRiskInput.
 */
async function loadVendorRiskInputs(db: Db, clientId: number, now: Date): Promise<Map<number, VendorRiskInput>> {
  const vendorRows = await db.select().from(vendors).where(eq(vendors.clientId, clientId));
  const scanRows = await db.select().from(vendorScans).where(eq(vendorScans.clientId, clientId));
  const assessmentRows = await db.select().from(vendorAssessments).where(eq(vendorAssessments.clientId, clientId));
  const contractRows = await db
    .select({ vendorId: vendorContracts.vendorId, status: vendorContracts.status })
    .from(vendorContracts)
    .where(eq(vendorContracts.clientId, clientId));
  const dpaRows = await db
    .select({ vendorId: vendorDpas.vendorId, status: vendorDpas.status })
    .from(vendorDpas)
    .where(eq(vendorDpas.clientId, clientId));

  // Latest scan WITH a risk score per vendor (highest scanDate; fall back to createdAt).
  // Scans without a score (failed / in-progress rows with null riskScore) are
  // ignored so a valid prior completed scan is not shadowed by a broken row.
  const latestScanScoreByVendor = new Map<number, number | null>();
  const scansByVendor = new Map<number, typeof scanRows[number][]>();
  for (const scan of scanRows) {
    if (scan.riskScore === null || scan.riskScore === undefined) continue;
    const list = scansByVendor.get(scan.vendorId) ?? [];
    list.push(scan);
    scansByVendor.set(scan.vendorId, list);
  }
  for (const [vendorId, scans] of scansByVendor) {
    scans.sort(
      (a, b) =>
        new Date(b.scanDate ?? b.createdAt).getTime() - new Date(a.scanDate ?? a.createdAt).getTime()
    );
    const latest = scans[0];
    latestScanScoreByVendor.set(vendorId, latest?.riskScore ?? null);
  }

  // Open high/critical assessment count per vendor.
  const openHighCriticalByVendor = new Map<number, number>();
  for (const assessment of assessmentRows) {
    if (isOpenHighCriticalAssessment(assessment)) {
      openHighCriticalByVendor.set(
        assessment.vendorId,
        (openHighCriticalByVendor.get(assessment.vendorId) ?? 0) + 1
      );
    }
  }

  // Active contract presence per vendor.
  const hasContractByVendor = new Set<number>();
  for (const contract of contractRows) {
    if (!INACTIVE_CONTRACT_STATUSES.has((contract.status ?? "active").toLowerCase())) {
      hasContractByVendor.add(contract.vendorId);
    }
  }

  // Signed DPA presence per vendor.
  const hasDpaByVendor = new Set<number>();
  for (const dpa of dpaRows) {
    if ((dpa.status ?? "").toLowerCase() === "signed") {
      hasDpaByVendor.add(dpa.vendorId);
    }
  }

  const inputs = new Map<number, VendorRiskInput>();
  for (const vendor of vendorRows) {
    inputs.set(vendor.id, {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        dataAccessType: mapDataAccessType(vendor.dataAccess),
        // Heuristic: the vendors table has no explicit SOC 2 attestation flag;
        // the AI VRM agent's trustScore (0-100) >= 80 is used as the proxy.
        hasCleanSoc2: (vendor.trustScore ?? 0) >= 80,
      },
      latestScanRiskScore: latestScanScoreByVendor.get(vendor.id) ?? undefined,
      openHighCriticalAssessments: openHighCriticalByVendor.get(vendor.id) ?? 0,
      hasContract: hasContractByVendor.has(vendor.id),
      hasDpa: hasDpaByVendor.has(vendor.id),
      // No dedicated subprocessors table exists; the vendors table stores the
      // subprocessor chain in the `recursiveSubprocessors` JSON column.
      subprocessorCount: Array.isArray(vendor.recursiveSubprocessors) ? vendor.recursiveSubprocessors.length : 0,
      now,
    });
  }

  return inputs;
}

export const createVendorRiskRouter = (t: any, clientProcedure: any) => {
  return t.router({
    /**
     * Portfolio overview + per-vendor risk rows for a client.
     * NEVER throws: on DB failure returns an empty overview and vendor list.
     */
    getOverview: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: { input: { clientId: number } }) => {
        try {
          const db = await getDb();
          const now = new Date();
          const inputs = await loadVendorRiskInputs(db, input.clientId, now);

          const vendorRows: VendorRiskResult[] = [...inputs.values()].map(computeVendorRiskTier);
          // Deterministic ordering for the UI: highest tier first, then lowest score.
          vendorRows.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.residualScore - b.residualScore);

          return {
            summary: buildVendorRiskOverview(vendorRows, now),
            vendors: vendorRows,
          };
        } catch (err) {
          // Graceful degradation — a read must never 500 the client.
          console.error("[vendorRisk.getOverview] failed; returning empty overview:", err);
          const now = new Date();
          return { summary: buildVendorRiskOverview([], now), vendors: [] };
        }
      }),

    /**
     * Single-vendor risk tier (residual score, tier, next review, actions).
     * 404 when the vendor does not exist for this client.
     */
    getVendorRisk: clientProcedure
      .input(z.object({ clientId: z.number(), vendorId: z.number() }))
      .query(async ({ input }: { input: { clientId: number; vendorId: number } }) => {
        try {
          const db = await getDb();
          const now = new Date();
          const inputs = await loadVendorRiskInputs(db, input.clientId, now);

          const inputForVendor = inputs.get(input.vendorId);
          if (!inputForVendor) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found for this client" });
          }

          return computeVendorRiskTier(inputForVendor);
        } catch (err) {
          if (err instanceof TRPCError) {
            throw err;
          }
          // DB unreachable: surface as not-found so the UI shows an empty state
          // instead of a hard 500.
          console.error("[vendorRisk.getVendorRisk] failed:", err);
          throw new TRPCError({ code: "NOT_FOUND", message: "Vendor risk data unavailable" });
        }
      }),
  });
};
