/**
 * Supply Chain Router — tRPC facade over the pure NIS2 supply-chain security
 * engine (lib/nis2/supplyChain.ts).
 *
 * Cycle 17 (NIS2 Implementation Plan Phase 3 Task 3.1 — ENISA Measure 5.1
 * "Supply Chain Security", NIS2 Article 21(2)(d)): exposes supplier
 * criticality classification, security-posture scoring, incident SLA tracking
 * and security-monitoring SLA statuses as protected query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation. No secrets are ever echoed or
 * logged.
 */

import { z } from "zod";
import {
  classifySupplierCriticality,
  scoreSupplierSecurityPosture,
  trackSupplierIncident,
  monitorSecuritySla,
} from "../../lib/nis2/supplyChain";

/** Input schema for `classifySupplier` (exported for tests). */
export const supplyChainClassifySchema = z.object({
  supplierName: z.string().optional(),
  servicesEssentialToCriticalFunctions: z.boolean().optional(),
  processesSensitiveData: z.boolean().optional(),
  networkAccessLevel: z.enum(["none", "restricted", "broad"]).optional(),
  isSubcontractor: z.boolean().optional(),
  annualSpendEur: z.number().optional(),
  now: z.date().optional(),
});

/** Input schema for `scorePosture` (exported for tests). */
export const supplyChainPostureSchema = z.object({
  supplierName: z.string().optional(),
  // Lenient: the engine ignores unknown keys, so any string-keyed boolean
  // record is accepted (including partial/empty answer sets).
  answers: z.record(z.boolean()).optional(),
});

/** Input schema for `trackIncident` (exported for tests). */
export const supplyChainIncidentSchema = z.object({
  supplierName: z.string().optional(),
  incidentTitle: z.string().optional(),
  detectedAt: z.date().optional(),
  significant: z.boolean().optional(),
  notificationSlaHours: z.number().optional(),
  reportedToEntityAt: z.date().optional(),
  acknowledgedAt: z.date().optional(),
  now: z.date().optional(),
});

/** Input schema for `monitorSla` (exported for tests). */
export const supplyChainSlaSchema = z.object({
  supplierName: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        cadenceDays: z.number(),
        lastVerifiedAt: z.date().optional(),
        passed: z.boolean(),
      })
    )
    .optional(),
  now: z.date().optional(),
});

export const createSupplyChainRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Classify a supplier's NIS2 criticality (additive 0-100 score) and
     * resolve the review cadence plus next review date. Deterministic engine
     * output; safe shape on any input.
     */
    classifySupplier: protectedProcedure
      .input(supplyChainClassifySchema)
      .query(async ({ input }) => classifySupplierCriticality(input)),

    /**
     * Score a supplier's security posture against the 8 weighted contractual
     * controls and derive gaps plus recommended actions. Deterministic engine
     * output; safe shape on any input.
     */
    scorePosture: protectedProcedure
      .input(supplyChainPostureSchema)
      .query(async ({ input }) => scoreSupplierSecurityPosture(input)),

    /**
     * Track a supplier incident against its NIS2 notification SLA (24h/72h
     * defaults) with live status and remaining days. Deterministic engine
     * output; safe shape on any input.
     */
    trackIncident: protectedProcedure
      .input(supplyChainIncidentSchema)
      .query(async ({ input }) => trackSupplierIncident(input)),

    /**
     * Monitor the security-monitoring SLA statuses for a supplier's
     * assets/processes against their verification cadences. Deterministic
     * engine output; safe shape on any input.
     */
    monitorSla: protectedProcedure
      .input(supplyChainSlaSchema)
      .query(async ({ input }) => monitorSecuritySla(input)),
  });
};
