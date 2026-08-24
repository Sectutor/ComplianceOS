/**
 * NIS2 Dashboard Router — protected read-only facade over the pure Article
 * 21(2) control-health engine (lib/nis2/controlHealth.ts).
 *
 * Cycle 38 (DASHBOARD_NIS2_ENHANCEMENT_PLAN Phase 1-2): three protected
 * queries powering the NIS2 dashboard:
 *
 *   controlHealth   -> all 12 Art. 21(2)(a)-(l) measure cards + generatedAt
 *   domainSummary   -> 8 posture tiles (risk/incident/bcp/supplyChain/asset/
 *                      training/access/policy)
 *   incidentClock   -> open significant incident count + next unmet Art. 23
 *                      reporting deadline ('24h Early Warning' / '72h Incident
 *                      Notification' / '30-day Final Report')
 *
 * Degradation discipline: every query aggregates through ONE Promise.all of
 * bounded reads (per-table .limit(500)) filtered by clientId, wrapped in a
 * try/catch. Any database failure yields the corresponding EMPTY_* payload —
 * these queries NEVER reject because of DB errors. Domains whose backing
 * table has no rows degrade to 'no-data' in the engine.
 *
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation. No mutations, no console
 * logging, no secrets echoed, and time always comes from the server clock
 * (never client-supplied).
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import * as schema from "../../schema";
import {
  computeControlHealth,
  computeDomainSummary,
  computeIncidentClock,
  EMPTY_CONTROL_HEALTH,
  EMPTY_DOMAIN_SUMMARY,
  EMPTY_INCIDENT_CLOCK,
} from "../../lib/nis2/controlHealth";

/* ------------------------------------------------------------------ */
/* Exported zod schemas (part of the contract — reused by UI/QA)        */
/* ------------------------------------------------------------------ */

/** Shape of the `controlHealth` input (client scoping only). */
export const nis2ControlHealthShape = {
  clientId: z.number().int().positive(),
};

/** Input schema for `controlHealth` (single source of truth: the shape above). */
export const nis2ControlHealthInputSchema = z.object(nis2ControlHealthShape);
export type Nis2ControlHealthInput = z.infer<typeof nis2ControlHealthInputSchema>;

/** Shape of the `domainSummary` input (client scoping only). */
export const nis2DomainSummaryShape = {
  clientId: z.number().int().positive(),
};

/** Input schema for `domainSummary` (single source of truth: the shape above). */
export const nis2DomainSummaryInputSchema = z.object(nis2DomainSummaryShape);
export type Nis2DomainSummaryInput = z.infer<typeof nis2DomainSummaryInputSchema>;

/** Shape of the `incidentClock` input (client scoping only). */
export const nis2IncidentClockShape = {
  clientId: z.number().int().positive(),
};

/** Input schema for `incidentClock` (single source of truth: the shape above). */
export const nis2IncidentClockInputSchema = z.object(nis2IncidentClockShape);
export type Nis2IncidentClockInput = z.infer<typeof nis2IncidentClockInputSchema>;

/** Hard upper bound applied to every per-table read. */
const ROW_LIMIT = 500;

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export const createNis2DashboardRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * All 12 NIS2 Article 21(2) measure health cards in canonical order.
     * DB failure degrades to EMPTY_CONTROL_HEALTH ({measures:[],generatedAt}),
     * never rejects.
     */
    controlHealth: protectedProcedure.input(nis2ControlHealthInputSchema).query(async ({ input }: any) => {
      try {
        const clientId = Number(input?.clientId);
        const dbConn = await getDb();
        // ONE bounded fan-out; every table verified against src/schema.ts.
        const [
          policyRows,
          riskRows,
          incidentRows,
          bcPlanRows,
          vendorRows,
          vendorAssessmentRows,
          vulnerabilityRows,
          evidenceRows,
          securityTestRows,
          trainingAssignmentRows,
          employeeRows,
          accessCampaignRows,
          assetRows,
        ] = await Promise.all([
          dbConn.select().from(schema.clientPolicies).where(eq(schema.clientPolicies.clientId, clientId)).limit(ROW_LIMIT),
          dbConn.select().from(schema.riskScenarios).where(eq(schema.riskScenarios.clientId, clientId)).limit(ROW_LIMIT),
          dbConn.select().from(schema.incidents).where(eq(schema.incidents.clientId, clientId)).limit(ROW_LIMIT),
          dbConn.select().from(schema.bcPlans).where(eq(schema.bcPlans.clientId, clientId)).limit(ROW_LIMIT),
          dbConn.select().from(schema.vendors).where(eq(schema.vendors.clientId, clientId)).limit(ROW_LIMIT),
          dbConn
            .select()
            .from(schema.vendorAssessments)
            .where(eq(schema.vendorAssessments.clientId, clientId))
            .limit(ROW_LIMIT),
          dbConn
            .select()
            .from(schema.vulnerabilities)
            .where(eq(schema.vulnerabilities.clientId, clientId))
            .limit(ROW_LIMIT),
          dbConn.select().from(schema.evidence).where(eq(schema.evidence.clientId, clientId)).limit(ROW_LIMIT),
          dbConn.select().from(schema.securityTests).where(eq(schema.securityTests.clientId, clientId)).limit(ROW_LIMIT),
          dbConn
            .select()
            .from(schema.trainingAssignments)
            .where(eq(schema.trainingAssignments.clientId, clientId))
            .limit(ROW_LIMIT),
          dbConn.select().from(schema.employees).where(eq(schema.employees.clientId, clientId)).limit(ROW_LIMIT),
          dbConn
            .select()
            .from(schema.accessReviewCampaigns)
            .where(eq(schema.accessReviewCampaigns.clientId, clientId))
            .limit(ROW_LIMIT),
          dbConn.select().from(schema.assets).where(eq(schema.assets.clientId, clientId)).limit(ROW_LIMIT),
        ]);

        return computeControlHealth(
          {
            policies: policyRows,
            risks: riskRows,
            incidents: incidentRows,
            bcPlans: bcPlanRows,
            vendors: vendorRows,
            vendorAssessments: vendorAssessmentRows,
            vulnerabilities: vulnerabilityRows,
            evidence: evidenceRows,
            securityTests: securityTestRows,
            trainingAssignments: trainingAssignmentRows,
            employees: employeeRows,
            accessCampaigns: accessCampaignRows,
            assets: assetRows,
          },
          { clock: () => new Date() }
        );
      } catch {
        // DB failure -> degraded but valid payload (never rejects).
        return { ...EMPTY_CONTROL_HEALTH, generatedAt: new Date().toISOString() };
      }
    }),

    /**
     * Eight-domain posture tiles (risk/incident/bcp/supplyChain/asset/
     * training/access/policy). Same bounded aggregation and degradation
     * discipline as `controlHealth`.
     */
    domainSummary: protectedProcedure.input(nis2DomainSummaryInputSchema).query(async ({ input }: any) => {
      try {
        const clientId = Number(input?.clientId);
        const dbConn = await getDb();
        const [policyRows, riskRows, incidentRows, bcPlanRows, vendorRows, vendorAssessmentRows, assetRows, trainingAssignmentRows, employeeRows, accessCampaignRows] =
          await Promise.all([
            dbConn.select().from(schema.clientPolicies).where(eq(schema.clientPolicies.clientId, clientId)).limit(ROW_LIMIT),
            dbConn.select().from(schema.riskScenarios).where(eq(schema.riskScenarios.clientId, clientId)).limit(ROW_LIMIT),
            dbConn.select().from(schema.incidents).where(eq(schema.incidents.clientId, clientId)).limit(ROW_LIMIT),
            dbConn.select().from(schema.bcPlans).where(eq(schema.bcPlans.clientId, clientId)).limit(ROW_LIMIT),
            dbConn.select().from(schema.vendors).where(eq(schema.vendors.clientId, clientId)).limit(ROW_LIMIT),
            dbConn
              .select()
              .from(schema.vendorAssessments)
              .where(eq(schema.vendorAssessments.clientId, clientId))
              .limit(ROW_LIMIT),
            dbConn.select().from(schema.assets).where(eq(schema.assets.clientId, clientId)).limit(ROW_LIMIT),
            dbConn
              .select()
              .from(schema.trainingAssignments)
              .where(eq(schema.trainingAssignments.clientId, clientId))
              .limit(ROW_LIMIT),
            dbConn.select().from(schema.employees).where(eq(schema.employees.clientId, clientId)).limit(ROW_LIMIT),
            dbConn
              .select()
              .from(schema.accessReviewCampaigns)
              .where(eq(schema.accessReviewCampaigns.clientId, clientId))
              .limit(ROW_LIMIT),
          ]);

        return computeDomainSummary(
          {
            policies: policyRows,
            risks: riskRows,
            incidents: incidentRows,
            bcPlans: bcPlanRows,
            vendors: vendorRows,
            vendorAssessments: vendorAssessmentRows,
            trainingAssignments: trainingAssignmentRows,
            employees: employeeRows,
            accessCampaigns: accessCampaignRows,
            assets: assetRows,
          },
          { clock: () => new Date() }
        );
      } catch {
        return { ...EMPTY_DOMAIN_SUMMARY };
      }
    }),

    /**
     * NIS2 Article 23 reporting clock: count of significant OPEN incidents +
     * the earliest unmet reporting milestone across them. Server clock only —
     * clients cannot influence `now`. DB failure degrades to
     * EMPTY_INCIDENT_CLOCK ({openSignificant:0,nextDeadline:null}).
     */
    incidentClock: protectedProcedure.input(nis2IncidentClockInputSchema).query(async ({ input }: any) => {
      try {
        const clientId = Number(input?.clientId);
        const dbConn = await getDb();
        const incidentRows = await dbConn
          .select()
          .from(schema.incidents)
          .where(eq(schema.incidents.clientId, clientId))
          .limit(ROW_LIMIT);
        return computeIncidentClock(incidentRows, new Date());
      } catch {
        return { ...EMPTY_INCIDENT_CLOCK };
      }
    }),
  });
};
