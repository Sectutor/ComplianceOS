// ============================================================================
// PHASE 2: Scoring API + Config Parser + Engagement endpoints
// Added to Phase 1 router
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../../db';
import { sql, eq, and, desc } from 'drizzle-orm';
import { createHash } from 'crypto';
import {
  agentProfiles,
  agentTools,
  agentPolicyCards,
  agentPolicyRules,
  agentPolicyEscalations,
  agentPolicyKpis,
  agentPolicyAssuranceMappings,
  agentFrameworkMappings,
  agentRedteamResults,
  agentEvidence,
  agentEvidenceControls,
  agentScoreHistory,
  agentEngagements,
  type AgentProfile,
  type AgentPolicyCard,
} from '../../schema_agent_compliance';
import {
  computeScore,
  parseDockerCompose,
  parseHermesConfig,
  inferProfileFromConfig,
  hashConfig,
  detectConfigDrift,
} from '../../lib/agent/scoring';

const API_KEY = process.env.COMPLIANCE_API_KEY || '';

const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('report-card.pdf') || req.path.includes('/portal/')) return next();
  if ((req as any).user) return next();
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Invalid API key', code: 'UNAUTHORIZED' });
  next();
};

// ============================================================================
// SCORE COMPUTATION HELPER
// ============================================================================

async function computeAndPersistScore(agentId: number, triggerSource: string, triggerDetail: string): Promise<any> {
  const db = await getDb();
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
  if (!profile) throw new Error('Agent not found');

  const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
  const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
  const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));

  const redteamPass = redteamList.filter(r => r.passed).length;
  const redteamFail = redteamList.filter(r => !r.passed).length;

  const result = computeScore({
    agentId,
    mappings: mappings.map(m => ({
      framework: m.framework,
      controlId: m.controlId,
      autoMapped: m.autoMapped,
      confidence: m.confidence,
      evidenceCount: m.evidenceCount,
      lastEvidenceAt: m.lastEvidenceAt,
      lastRedteamAt: m.lastRedteamAt,
      redteamPassed: m.redteamPassed,
    })),
    evidenceTotal: evidenceList.length,
    redteamPass,
    redteamFail,
    profile: {
      sandbox: profile.sandbox,
      approvalMode: profile.approvalMode,
      memoryEncryption: profile.memoryEncryption,
      networkIsolation: profile.networkIsolation,
    },
  });

  // Update agent profile score
  await db.update(agentProfiles)
    .set({ overallScore: result.overallScore, owaspCoverage: result.owaspCoverage, updatedAt: new Date() })
    .where(eq(agentProfiles.id, agentId));

  // Persist score history
  await db.insert(agentScoreHistory).values({
    agentId,
    clientId: profile.clientId,
    overallScore: result.overallScore,
    owaspCoverage: result.owaspCoverage,
    frameworkScores: result.frameworkScores,
    triggerSource,
    triggerDetail,
    evidenceCount: evidenceList.length,
    redteamPassCount: redteamPass,
    redteamFailCount: redteamFail,
    gapCount: result.gaps.length,
  });

  return result;
}

// ============================================================================
// PHASE 2 ROUTER FACTORY
// ============================================================================

export function createAgentCompliancePhase2Router() {
  const router = Router();
  router.use(apiKeyMiddleware);

  // ========================================
  // SCORING ENDPOINTS (T1.5)
  // ========================================

  // Get full score breakdown with per-control explanation
  router.get('/agents/:id/score', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const result = await computeAndPersistScore(agentId, 'manual', 'Score breakdown requested');
      res.json({ data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Get score history (trend data)
  router.get('/agents/:id/score-history', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await db.select().from(agentScoreHistory)
        .where(eq(agentScoreHistory.agentId, agentId))
        .orderBy(desc(agentScoreHistory.createdAt))
        .limit(limit);

      res.json({ data: history, total: history.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // CONFIG PARSER ENDPOINTS (T4.3)
  // ========================================

  // Parse config files and return inferred profile
  router.post('/agents/:id/parse-config', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { dockerCompose, hermesConfig } = req.body;
      if (!dockerCompose && !hermesConfig) {
        return res.status(400).json({ error: 'Provide dockerCompose and/or hermesConfig', code: 'BAD_REQUEST' });
      }

      const compose = dockerCompose ? parseDockerCompose(dockerCompose) : null;
      const hermes = hermesConfig ? parseHermesConfig(hermesConfig) : null;

      // Infer profile from parsed configs
      const inferred = inferProfileFromConfig(
        compose ?? { sandbox: 'none', networkMode: 'bridge', readOnly: false, memLimit: null, cpus: null, pidsLimit: null, user: null, securityOpt: [], capDrop: [], volumes: [] },
        hermes ?? { terminalBackend: null, approvalMode: null, allowedPaths: [], memoryEncryption: false, defenseInDepth: false, allowPrivateUrls: true, llmAuditEnabled: false, tools: [], redactedLogging: false, contextProtection: false }
      );

      // Compute config hash for drift detection
      const configHash = dockerCompose ? hashConfig(dockerCompose) : hermesConfig ? hashConfig(hermesConfig) : null;

      // Detect drift if we have a previous hash
      const db = await getDb();
      const [existing] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      let drift: string[] = [];
      if (existing?.configHash && configHash && existing.configHash !== configHash) {
        drift = ['Config hash changed — deployment configuration has drifted'];
      }

      res.json({
        data: {
          inferred,
          parsed: {
            dockerCompose: compose,
            hermesConfig: hermes,
          },
          configHash,
          drift,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Auto-fill profile from parsed config
  router.post('/agents/:id/auto-fill', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { dockerCompose, hermesConfig } = req.body;
      const compose = dockerCompose ? parseDockerCompose(dockerCompose) : null;
      const hermes = hermesConfig ? parseHermesConfig(hermesConfig) : null;

      const inferred = inferProfileFromConfig(
        compose ?? { sandbox: 'none', networkMode: 'bridge', readOnly: false, memLimit: null, cpus: null, pidsLimit: null, user: null, securityOpt: [], capDrop: [], volumes: [] },
        hermes ?? { terminalBackend: null, approvalMode: null, allowedPaths: [], memoryEncryption: false, defenseInDepth: false, allowPrivateUrls: true, llmAuditEnabled: false, tools: [], redactedLogging: false, contextProtection: false }
      );

      const db = await getDb();
      const configHash = dockerCompose ? hashConfig(dockerCompose) : hermesConfig ? hashConfig(hermesConfig) : undefined;

      const [updated] = await db.update(agentProfiles)
        .set({
          ...inferred,
          ...(configHash ? { configHash } : {}),
          updatedAt: new Date(),
        })
        .where(eq(agentProfiles.id, agentId))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Drift detection: compare stored config hash with new upload
  router.post('/agents/:id/detect-drift', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { dockerCompose, hermesConfig } = req.body;
      const db = await getDb();
      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const newHash = dockerCompose ? hashConfig(dockerCompose) : hermesConfig ? hashConfig(hermesConfig) : null;
      const hasDrift = profile.configHash && newHash && profile.configHash !== newHash;

      res.json({
        data: {
          hasDrift: !!hasDrift,
          storedHash: profile.configHash,
          newHash,
          message: hasDrift ? 'Configuration drift detected' : 'No drift detected',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // EVIDENCE LINKAGE (T1.2)
  // ========================================

  // Link evidence to framework controls
  router.post('/evidence/:evidenceId/link', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const evidenceId = parseInt(req.params.evidenceId);
      if (isNaN(evidenceId)) return res.status(400).json({ error: 'Invalid evidence id', code: 'BAD_REQUEST' });

      const { links } = req.body; // Array of { agentId, framework, controlId, contributionType, weight }
      if (!Array.isArray(links) || links.length === 0) {
        return res.status(400).json({ error: 'links array required', code: 'BAD_REQUEST' });
      }

      const [evidence] = await db.select().from(agentEvidence).where(eq(agentEvidence.id, evidenceId)).limit(1);
      if (!evidence) return res.status(404).json({ error: 'Evidence not found', code: 'NOT_FOUND' });

      const values = links.map((l: any) => ({
        evidenceId,
        agentId: l.agentId,
        framework: l.framework,
        controlId: l.controlId,
        contributionType: l.contributionType || 'proof',
        weight: l.weight || 100,
      }));

      const existing = await db.select()
        .from(agentEvidenceControls)
        .where(eq(agentEvidenceControls.evidenceId, evidenceId));
      
      const existingKeys = new Set(existing.map(e => `${e.agentId}-${e.framework}-${e.controlId}`));
      const valuesToInsert = values.filter(v => !existingKeys.has(`${v.agentId}-${v.framework}-${v.controlId}`));

      if (valuesToInsert.length > 0) {
        await db.insert(agentEvidenceControls).values(valuesToInsert);
      }

      // Update denormalized evidence_count on mappings for NEW links only
      for (const link of links) {
        if (!existingKeys.has(`${link.agentId}-${link.framework}-${link.controlId}`)) {
          await db.execute(sql`
            UPDATE agent_framework_mappings
            SET evidence_count = evidence_count + 1,
                last_evidence_at = NOW()
            WHERE agent_id = ${link.agentId}
              AND framework = ${link.framework}
              AND control_id = ${link.controlId}
          `);
        }
      }

      res.status(201).json({ data: { linked: valuesToInsert.length } });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // ENGAGEMENT TRACKER (T8.1-T8.4)
  // ========================================

  // Get engagement status
  router.get('/agents/:id/engagement', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const [engagement] = await db.select().from(agentEngagements).where(eq(agentEngagements.agentId, agentId)).limit(1);
      if (!engagement) return res.status(404).json({ error: 'Engagement not found', code: 'NOT_FOUND' });

      res.json({ data: engagement });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Update engagement stage
  router.patch('/agents/:id/engagement', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { stage, assignedTo, notes } = req.body;
      const updateData: any = { updatedAt: new Date() };
      if (stage) {
        updateData.stage = stage;
        updateData.stageStartedAt = new Date();
        // Auto-complete previous stage
        if (stage === 'verified' || stage === 'handoff') {
          updateData.stageCompletedAt = new Date();
        }
      }
      if (assignedTo) updateData.assignedTo = assignedTo;
      if (notes) updateData.notes = notes;

      const [updated] = await db.update(agentEngagements)
        .set(updateData)
        .where(eq(agentEngagements.agentId, agentId))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Engagement not found', code: 'NOT_FOUND' });

      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Create engagement record (upsert)
  router.post('/agents/:id/engagement', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      // Check if engagement already exists
      const [existing] = await db.select().from(agentEngagements).where(eq(agentEngagements.agentId, agentId)).limit(1);
      if (existing) {
        const updateData: any = { updatedAt: new Date() };
        if (req.body.stage) {
          updateData.stage = req.body.stage;
          updateData.stageStartedAt = new Date();
        }
        if (req.body.assignedTo) updateData.assignedTo = req.body.assignedTo;
        if (req.body.notes) updateData.notes = req.body.notes;

        const [updated] = await db.update(agentEngagements)
          .set(updateData)
          .where(eq(agentEngagements.agentId, agentId))
          .returning();
        return res.json({ data: updated });
      }

      const [created] = await db.insert(agentEngagements).values({
        agentId,
        clientId: profile.clientId,
        stage: req.body.stage || 'discovery',
        assignedTo: req.body.assignedTo,
        notes: req.body.notes,
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // ENHANCED EVIDENCE UPLOAD (T10.1)
  // ========================================

  // Upload evidence with file hash
  router.post('/agents/:id/evidence/upload', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { title, description, content, evidenceType, framework, controlId, mimeType, sourceType } = req.body;
      if (!title || !evidenceType) {
        return res.status(400).json({ error: 'Missing required fields: title, evidenceType', code: 'BAD_REQUEST' });
      }

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      // Compute SHA-256 hash of content for integrity
      const fileHash = content ? createHash('sha256').update(content).digest('hex') : null;

      const [created] = await db.insert(agentEvidence).values({
        agentId,
        clientId: profile.clientId,
        evidenceType,
        title,
        description,
        content,
        fileHash,
        fileSize: content ? Buffer.byteLength(content, 'utf-8') : 0,
        mimeType: mimeType || 'text/plain',
        framework,
        controlId,
        sourceType: sourceType || 'upload',
        status: 'collected',
      }).returning();

      // Auto-link to framework control if provided
      if (framework && controlId) {
        await db.insert(agentEvidenceControls).values({
          evidenceId: created.id,
          agentId,
          framework,
          controlId,
          contributionType: 'proof',
          weight: 100,
        });

        // Update denormalized count
        await db.execute(sql`
          UPDATE agent_framework_mappings
          SET evidence_count = evidence_count + 1,
              last_evidence_at = NOW()
          WHERE agent_id = ${agentId}
            AND framework = ${framework}
            AND control_id = ${controlId}
        `);
      }

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // ENHANCED RED TEAM (link to controls)
  // ========================================

  router.post('/agents/:id/redteam', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { testName, testCategory, severity, passed, details, remediation, evidencePath, status, relatedFramework, relatedControlId } = req.body;
      if (!testName || !testCategory || passed === undefined) {
        return res.status(400).json({ error: 'Missing required fields: testName, testCategory, passed', code: 'BAD_REQUEST' });
      }

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const [created] = await db.insert(agentRedteamResults).values({
        agentId,
        clientId: profile.clientId,
        testName,
        testCategory,
        severity,
        passed,
        details,
        remediation,
        evidencePath,
        status: status || 'open',
        relatedFramework,
        relatedControlId,
      }).returning();

      // Update mapping if linked to a control
      if (relatedFramework && relatedControlId) {
        await db.execute(sql`
          UPDATE agent_framework_mappings
          SET last_redteam_at = NOW(),
              redteam_passed = ${passed}
          WHERE agent_id = ${agentId}
            AND framework = ${relatedFramework}
            AND control_id = ${relatedControlId}
        `);
      }

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
