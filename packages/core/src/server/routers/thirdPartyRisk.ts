/**
 * Third-Party Risk Router — tRPC facade over the pure NIS2 third-party risk
 * engine (lib/nis2/thirdPartyRisk.ts).
 *
 * Cycle 18 (NIS2 Implementation Plan Phase 3 Task 3.2 — ENISA Measure 5.1
 * "Supply Chain Security", NIS2 Article 21(2)(d)): exposes composite supplier
 * risk scoring, certificate-expiry tracking and the supply-chain dependency
 * map as protected query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation. No secrets are ever echoed or
 * logged.
 */

import { z } from "zod";
import {
  aggregateSupplierRisk,
  trackSupplierCertificate,
  buildSupplyChainMap,
} from "../../lib/nis2/thirdPartyRisk";

/** One supplier row for the composite risk + supply-chain map queries. */
export const thirdPartySupplierSchema = z.object({
  supplierId: z.union([z.string(), z.number()]),
  supplierName: z.string().optional(),
  // NIS2 criticality factors.
  servicesEssentialToCriticalFunctions: z.boolean().optional(),
  processesSensitiveData: z.boolean().optional(),
  networkAccessLevel: z.enum(["none", "restricted", "broad"]).optional(),
  isSubcontractor: z.boolean().optional(),
  annualSpendEur: z.number().optional(),
  // Security posture answers (lenient: unknown keys ignored by the engine).
  answers: z.record(z.boolean()).optional(),
  // Per-vendor TPRM signals.
  dataAccessType: z.enum(["PII", "ePHI", "Infrastructure", "None"]).optional(),
  hasCleanSoc2: z.boolean().optional(),
  latestScanRiskScore: z.number().optional(),
  openHighCriticalAssessments: z.number().optional(),
  hasContract: z.boolean().optional(),
  hasDpa: z.boolean().optional(),
  subprocessorCount: z.number().optional(),
  // Optional precomputed residual score (0-100).
  vendorResidualScore: z.number().optional(),
});

/** Input schema for `aggregateRisk` (exported for tests). */
export const thirdPartyAggregateRiskSchema = z.object({
  suppliers: z.array(thirdPartySupplierSchema).optional(),
  now: z.date().optional(),
});

/** One supplier row for the certificate tracker. */
export const thirdPartyCertificateSupplierSchema = z.object({
  supplierId: z.union([z.string(), z.number()]),
  supplierName: z.string().optional(),
  certificates: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().optional(),
        validFrom: z.date().optional(),
        validTo: z.date().optional(),
      })
    )
    .optional(),
});

/** Input schema for `certificates` (exported for tests). */
export const thirdPartyCertificatesSchema = z.object({
  suppliers: z.array(thirdPartyCertificateSupplierSchema).optional(),
  now: z.date().optional(),
});

/** One dependency edge for the supply-chain map. */
export const thirdPartyDependencySchema = z.object({
  from: z.union([z.string(), z.number()]),
  to: z.union([z.string(), z.number()]),
  weight: z.number().optional(),
});

/** Input schema for `supplyChainMap` (exported for tests). */
export const thirdPartySupplyChainMapSchema = z.object({
  suppliers: z.array(thirdPartySupplierSchema).optional(),
  dependencies: z.array(thirdPartyDependencySchema).optional(),
  now: z.date().optional(),
});

export const createThirdPartyRiskRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Aggregate NIS2 third-party risk across a supplier portfolio: composite
     * 0-100 score per supplier (criticality 40% / posture 40% / residual 20%,
     * redistributed 50/50 when no residual signal exists) plus risk tiers,
     * verdicts, recommended actions and portfolio totals. Deterministic
     * engine output; safe shape on any input.
     */
    aggregateRisk: protectedProcedure
      .input(thirdPartyAggregateRiskSchema)
      .query(async ({ input }) => aggregateSupplierRisk(input)),

    /**
     * Track certificate validity across suppliers against the injectable
     * clock (valid / expiring <= 90 days / expired / missing) with days until
     * expiry and a coverage-rate summary. Deterministic engine output; safe
     * shape on any input.
     */
    certificates: protectedProcedure
      .input(thirdPartyCertificatesSchema)
      .query(async ({ input }) => trackSupplierCertificate(input)),

    /**
     * Build a supply-chain dependency map: supplier nodes with composite risk
     * scores plus dependency edges weighted by the source node's risk tier.
     * Deterministic engine output; safe shape on any input.
     */
    supplyChainMap: protectedProcedure
      .input(thirdPartySupplyChainMapSchema)
      .query(async ({ input }) => buildSupplyChainMap(input)),
  });
};
