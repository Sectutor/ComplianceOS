/**
 * PHASE 7: Autopilot Run Summary + White-Label Branding + CISOvault Webhook + Stage Workflows
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../../db';
import { sql, eq, and, desc } from 'drizzle-orm';
import {
  agentProfiles,
  agentScoreHistory,
  agentEngagements,
  agentFrameworkMappings,
  agentRedteamResults,
} from '../../schema_agent_compliance';
import { projectTasks } from '../../schema';

const API_KEY = process.env.COMPLIANCE_API_KEY || '';

const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Invalid API key', code: 'UNAUTHORIZED' });
  next();
};

import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';

// ============================================================================
// CLIENT BRANDING (White-Label)
// ============================================================================

export const clientBranding = pgTable('client_branding', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().unique(),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3b82f6'),
  logoUrl: varchar('logo_url', { length: 500 }),
  customDomain: varchar('custom_domain', { length: 255 }),
  emailSenderName: varchar('email_sender_name', { length: 255 }),
  emailSenderEmail: varchar('email_sender_email', { length: 255 }),
  portalTitle: varchar('portal_title', { length: 255 }),
  portalSubtitle: varchar('portal_subtitle', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return { clientIdx: index('idx_cb_client').on(table.clientId) };
});

// ============================================================================
// USAGE TRACKING
// ============================================================================

export const clientUsage = pgTable('client_usage', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().unique(),
  agentCount: integer('agent_count').default(0),
  evidenceCount: integer('evidence_count').default(0),
  portalAccessCount: integer('portal_access_count').default(0),
  pdfDownloadCount: integer('pdf_download_count').default(0),
  lastBilledAt: timestamp('last_billed_at'),
  planTier: varchar('plan_tier', { length: 50 }).default('team'), // team, enterprise, partner
  agentLimit: integer('agent_limit').default(3),
  evidenceLimit: integer('evidence_limit').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return { clientIdx: index('idx_cu_client').on(table.clientId) };
});

// ============================================================================
// STAGE WORKFLOW TRIGGERS
// ============================================================================

const STAGE_TRIGGERS: Record<string, { email?: string; slack?: string; task?: string }> = {
  discovery: {},
  mapped: {},
  policy_deployed: {},
  remediation: { email: 'gap_summary', task: 'review_gaps' },
  verified: { email: 'compliance_ready' },
  handoff: { email: 'retainer_offer' },
};

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createAgentCompliancePhase7Router() {
  const router = Router();
  router.use('/internal', apiKeyMiddleware);

  // ========================================
  // CLIENT BRANDING
  // ========================================

  router.get('/internal/clients/:clientId/branding', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.params.clientId);
      const [branding] = await db.select().from(clientBranding).where(eq(clientBranding.clientId, clientId)).limit(1);
      if (!branding) return res.json({ data: null }); // Use defaults
      res.json({ data: branding });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/internal/clients/:clientId/branding', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.params.clientId);
      const { primaryColor, logoUrl, customDomain, emailSenderName, emailSenderEmail, portalTitle, portalSubtitle } = req.body;

      const existing = await db.select().from(clientBranding).where(eq(clientBranding.clientId, clientId)).limit(1);
      if (existing.length > 0) {
        const [updated] = await db.update(clientBranding)
          .set({ primaryColor, logoUrl, customDomain, emailSenderName, emailSenderEmail, portalTitle, portalSubtitle, updatedAt: new Date() })
          .where(eq(clientBranding.clientId, clientId))
          .returning();
        res.json({ data: updated });
      } else {
        const [created] = await db.insert(clientBranding)
          .values({ clientId, primaryColor, logoUrl, customDomain, emailSenderName, emailSenderEmail, portalTitle, portalSubtitle })
          .returning();
        res.json({ data: created });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========================================
  // USAGE TRACKING
  // ========================================

  router.get('/internal/clients/:clientId/usage', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.params.clientId);
      const [usage] = await db.select().from(clientUsage).where(eq(clientUsage.clientId, clientId)).limit(1);
      if (!usage) return res.json({ data: null });

      // Check limits
      const atAgentLimit = usage.agentCount >= usage.agentLimit;
      const atEvidenceLimit = usage.evidenceCount >= usage.evidenceLimit;

      res.json({ data: { ...usage, atAgentLimit, atEvidenceLimit } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/internal/clients/:clientId/usage/increment', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.params.clientId);
      const { field } = req.body; // 'agentCount', 'evidenceCount', 'portalAccessCount', 'pdfDownloadCount'

      if (!['agentCount', 'evidenceCount', 'portalAccessCount', 'pdfDownloadCount'].includes(field)) {
        return res.status(400).json({ error: 'Invalid field' });
      }

      const existing = await db.select().from(clientUsage).where(eq(clientUsage.clientId, clientId)).limit(1);
      if (existing.length > 0) {
        await db.execute(sql`UPDATE client_usage SET ${sql.identifier(field)} = ${sql.identifier(field)} + 1, updated_at = NOW() WHERE client_id = ${clientId}`);
      } else {
        await db.insert(clientUsage).values({ clientId, [field]: 1 });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========================================
  // STAGE TRIGGER WORKFLOW
  // ========================================

  router.post('/internal/agents/:id/stage-trigger', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      const { stage, previousStage } = req.body;

      const trigger = STAGE_TRIGGERS[stage];
      if (!trigger) return res.json({ data: { triggered: false } });

      const actions: string[] = [];

      // Email trigger
      if (trigger.email) {
        // In production, this would queue an email via the existing notification system
        actions.push(`email:${trigger.email}`);
      }

      // Task trigger
  if (trigger.task) {
        const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
        if (profile) {
          await db.insert(projectTasks).values({
            clientId: profile.clientId,
            title: 'Review compliance gaps',
            description: 'New gaps have been identified. Review and assign remediation.',
            status: 'todo',
            priority: 'medium',
            sourceType: 'agent_compliance',
            sourceId: agentId,
            tags: ['agent-compliance', 'stage-remediation'],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          actions.push('task:review_gaps');
        }
      }

      res.json({ data: { triggered: true, actions } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// ============================================================================
// AUTO PILOT RUN SUMMARY (Human-Readable Delta)
// ============================================================================

export interface AutopilotRunSummary {
  runId: string;
  agentsScored: number;
  changes: AutopilotChange[];
}

export interface AutopilotChange {
  agentId: number;
  agentName: string;
  previousScore: number;
  newScore: number;
  delta: number;
  reason: string;
  actionCreated?: string;
}

/**
 * Generate human-readable delta for autopilot run.
 */
export function generateAutopilotDelta(
  agentId: number,
  agentName: string,
  previousScore: number,
  newScore: number,
  gaps: Array<{ framework: string; controlId: string; confidence: number }>
): AutopilotChange {
  const delta = newScore - previousScore;
  let reason = 'No change';

  if (delta < 0) {
    reason = `Score dropped by ${Math.abs(delta)}% — evidence expired or new gaps detected`;
  } else if (delta > 0) {
    reason = `Score improved by ${delta}% — new evidence or tests added`;
  }

  const criticalGaps = gaps.filter(g => g.confidence === 0);
  if (criticalGaps.length > 0 && delta < 0) {
    reason = `${criticalGaps.length} control(s) with 0% confidence (no evidence)`;
  }

  return {
    agentId,
    agentName,
    previousScore,
    newScore,
    delta,
    reason,
    actionCreated: delta < -5 ? `Remediation tasks created for ${criticalGaps.length} gap(s)` : undefined,
  };
}
