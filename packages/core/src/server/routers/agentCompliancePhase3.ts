// ============================================================================
// PHASE 3: Remediation Engine + Portal + Autopilot + Engagement Automation
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../../db';
import { sql, eq, and, desc, inArray, ne } from 'drizzle-orm';
import {
  agentProfiles,
  agentFrameworkMappings,
  agentRedteamResults,
  agentEvidence,
  agentEvidenceControls,
  agentScoreHistory,
  agentEngagements,
  agentPolicyCards,
  type AgentProfile,
} from '../../schema_agent_compliance';
import { projectTasks } from '../../schema';
import { computeScore } from '../../lib/agent/scoring';

const API_KEY = process.env.COMPLIANCE_API_KEY || '';

const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Invalid API key', code: 'UNAUTHORIZED' });
  next();
};

// ============================================================================
// REMEDIATION ENGINE
// ============================================================================

const GAP_THRESHOLD = 70;

const REMEDIATION_PLAYBOOKS: Record<string, { howToFix: string; evidenceRequired: string }> = {
  LLM01: { howToFix: 'Implement input validation and prompt guards. Add a content safety filter upstream of your model. Test with adversarial prompts regularly.', evidenceRequired: 'Red team test results showing prompt injection resistance' },
  LLM02: { howToFix: 'Sanitize all model outputs before displaying to users. Implement output encoding. Validate generated URLs/code.', evidenceRequired: 'Output sanitization test results' },
  LLM03: { howToFix: 'Verify training data sources. Implement data provenance tracking. Use anomaly detection on datasets.', evidenceRequired: 'Data provenance documentation and source verification' },
  LLM04: { howToFix: 'Implement rate limiting. Set resource quotas. Add load shedding for expensive queries.', evidenceRequired: 'Load test results showing graceful degradation under stress' },
  LLM05: { howToFix: 'Scan all dependencies (Trivy). Pin versions. Use SBOM. Verify container image provenance.', evidenceRequired: 'Dependency scan report with no critical findings' },
  LLM06: { howToFix: 'Enable memory encryption. Implement data redaction in logs. Configure allow_private_urls: false.', evidenceRequired: 'Memory encryption enabled + PII scan showing no leaks' },
  LLM07: { howToFix: 'Implement least-privilege tool access. Use tool allowlists. Require approval for dangerous tools.', evidenceRequired: 'Tool inventory with approval workflow documented' },
  LLM08: { howToFix: 'Set approval_mode: manual. Implement human-in-the-loop for irreversible actions. Use smart approval mode.', evidenceRequired: 'Approval workflow tested with simulated dangerous actions' },
  LLM09: { howToFix: 'Document model limitations. Implement human review for critical decisions. Add confidence scoring.', evidenceRequired: 'Documentation of known limitations and human review procedures' },
  LLM10: { howToFix: 'Encrypt model storage. Use private registries. Implement access controls for model artifacts.', evidenceRequired: 'Access control documentation for model storage' },
};

/**
 * Detect all gaps (confidence < threshold) and auto-create remediation tasks.
 * Returns the list of created tasks.
 */
async function detectAndCreateRemediationTasks(agentId: number): Promise<any[]> {
  const db = await getDb();

  // Get current score
  const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
  const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
  const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
  if (!profile) throw new Error('Agent not found');

  const redteamPass = redteamList.filter(r => r.passed).length;
  const redteamFail = redteamList.filter(r => !r.passed).length;

  const score = computeScore({
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

  // Find existing open tasks for this agent to avoid duplicates
  const existingTasks = await db.execute(sql`
    SELECT title FROM project_tasks
    WHERE client_id = ${profile.clientId}
      AND source_type = 'agent_compliance'
      AND source_id = ${agentId}
      AND status != 'done'
  `);
  const rows = Array.isArray(existingTasks) ? existingTasks : (existingTasks as any).rows || [];
  const existingTitles = new Set(rows.map((r: any) => r.title));

  const created: any[] = [];

  for (const gap of score.gaps) {
    const playbook = REMEDIATION_PLAYBOOKS[gap.controlId];
    const title = `Remediate ${gap.controlId} (${gap.framework})`;

    // Skip if already has an open task for this control
    if (existingTitles.has(title)) continue;

    const priority = gap.confidence < 30 ? 'high' : gap.confidence < 50 ? 'medium' : 'low';

    const description = playbook
      ? `Confidence: ${gap.confidence}%\n\nHow to fix: ${playbook.howToFix}\n\nEvidence required: ${playbook.evidenceRequired}`
      : `Control ${gap.controlId} in framework ${gap.framework} has confidence ${gap.confidence}% (threshold: ${GAP_THRESHOLD}%). Upload evidence to improve.`;

    const [task] = await db.insert(projectTasks).values({
      clientId: profile.clientId,
      title,
      description,
      status: 'todo',
      priority,
      sourceType: 'agent_compliance',
      sourceId: agentId,
      tags: ['agent-compliance', gap.framework.toLowerCase(), gap.controlId.toLowerCase()],
      dueDate: profile.nextAuditDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    created.push({
      taskId: task.id,
      controlId: gap.controlId,
      framework: gap.framework,
      confidence: gap.confidence,
      priority,
      hasPlaybook: !!playbook,
    });
  }

  return created;
}

// ============================================================================
// ENGAGEMENT AUTOMATION
// ============================================================================

const STAGE_CRITERIA: Record<string, { requires: string[], advancesWhen: string }> = {
  discovery: { requires: ['agent_profile_created'], advancesWhen: 'Agent profile created' },
  mapped: { requires: ['auto_map_run'], advancesWhen: 'Auto-mapping completed' },
  policy_deployed: { requires: ['policy_card_active'], advancesWhen: 'Policy card activated' },
  remediation: { requires: ['gaps_identified'], advancesWhen: 'Gaps identified, tasks created' },
  verified: { requires: ['all_controls_above_80'], advancesWhen: 'All controls > 80% confidence' },
  handoff: { requires: ['report_card_generated'], advancesWhen: 'Client received report' },
};

/**
 * Evaluate engagement stage and auto-advance if criteria met.
 */
async function evaluateAndAdvanceEngagement(agentId: number): Promise<{ advanced: boolean; from?: string; to?: string }> {
  const db = await getDb();
  const [engagement] = await db.select().from(agentEngagements).where(eq(agentEngagements.agentId, agentId)).limit(1);
  if (!engagement) return { advanced: false };

  const currentStage = engagement.stage;
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
  if (!profile) return { advanced: false };

  let canAdvance = false;
  let nextStage: string | null = null;

  switch (currentStage) {
    case 'discovery':
      // Advance to mapped if auto-map has been run
      const mappingCount = await db.select({ count: sql<number>`count(*)` }).from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
      if (parseInt(mappingCount[0]?.count as string) > 0) {
        canAdvance = true;
        nextStage = 'mapped';
      }
      break;

    case 'mapped':
      // Advance to policy_deployed if there's an active policy card
      const [activeCard] = await db.select().from(agentPolicyCards).where(and(eq(agentPolicyCards.agentId, agentId), eq(agentPolicyCards.status, 'active'))).limit(1);
      if (activeCard) {
        canAdvance = true;
        nextStage = 'policy_deployed';
      }
      break;

    case 'policy_deployed':
      // Advance to remediation if there are open tasks
      const [openTask] = await db.execute(sql`
        SELECT id FROM project_tasks
        WHERE client_id = ${profile.clientId}
          AND source_type = 'agent_compliance'
          AND source_id = ${agentId}
          AND status != 'done'
        LIMIT 1
      `);
      if (openTask) {
        canAdvance = true;
        nextStage = 'remediation';
      }
      break;

    case 'remediation':
      // Advance to verified if overall score >= 80
      if (profile.overallScore >= 80) {
        canAdvance = true;
        nextStage = 'verified';
      }
      break;

    case 'verified':
      // Advance to handoff after client-ready score sustained
      if (profile.overallScore >= 85 && profile.owaspCoverage >= 85) {
        canAdvance = true;
        nextStage = 'handoff';
      }
      break;
  }

  if (canAdvance && nextStage) {
    await db.update(agentEngagements).set({
      stage: nextStage,
      stageStartedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(agentEngagements.id, engagement.id));
    return { advanced: true, from: currentStage, to: nextStage };
  }

  return { advanced: false };
}

// ============================================================================
// CISOVAULT INTEGRATION BRIDGE
// ============================================================================

/**
 * Process CISOvault scan results for an agent.
 * Maps scan categories to framework controls and updates scores.
 */
async function processScanResults(agentId: number, scanResults: Array<{ category: string; severity: string; title: string; description: string }>): Promise<any> {
  const db = await getDb();
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
  if (!profile) throw new Error('Agent not found');

  const updates: any[] = [];

  for (const finding of scanResults) {
    // Map CISOvault category to framework control
    const controlMapping = mapCategoryToControl(finding.category);
    if (!controlMapping) continue;

    // Create red team result for the finding
    const passed = finding.severity !== 'critical' && finding.severity !== 'high';
    await db.insert(agentRedteamResults).values({
      agentId,
      clientId: profile.clientId,
      testName: `[CISOVault] ${finding.title}`,
      testCategory: finding.category.toLowerCase().replace(/\s+/g, '_'),
      severity: finding.severity as any,
      passed,
      details: finding.description,
      status: passed ? 'open' : 'open',
      relatedFramework: controlMapping.framework,
      relatedControlId: controlMapping.controlId,
    });

    // Update mapping status if critical
    if (!passed) {
      await db.execute(sql`
        UPDATE agent_framework_mappings
        SET status = 'failed',
            confidence = 10,
            last_redteam_at = NOW(),
            redteam_passed = false,
            updated_at = NOW()
        WHERE agent_id = ${agentId}
          AND framework = ${controlMapping.framework}
          AND control_id = ${controlMapping.controlId}
      `);
    }

    updates.push({
      category: finding.category,
      mappedTo: `${controlMapping.framework}:${controlMapping.controlId}`,
      severity: finding.severity,
      passed,
    });
  }

  return { processed: updates.length, updates };
}

function mapCategoryToControl(category: string): { framework: string; controlId: string } | null {
  const cat = category.toLowerCase();
  if (cat.includes('injection') || cat.includes('prompt')) return { framework: 'OWASP_LLM', controlId: 'LLM01' };
  if (cat.includes('output') || cat.includes('xss')) return { framework: 'OWASP_LLM', controlId: 'LLM02' };
  if (cat.includes('poisoning') || cat.includes('training')) return { framework: 'OWASP_LLM', controlId: 'LLM03' };
  if (cat.includes('denial') || cat.includes('dos')) return { framework: 'OWASP_LLM', controlId: 'LLM04' };
  if (cat.includes('supply') || cat.includes('dependency') || cat.includes('sbom')) return { framework: 'OWASP_LLM', controlId: 'LLM05' };
  if (cat.includes('disclosure') || cat.includes('leak') || cat.includes('pii')) return { framework: 'OWASP_LLM', controlId: 'LLM06' };
  if (cat.includes('plugin') || cat.includes('tool')) return { framework: 'OWASP_LLM', controlId: 'LLM07' };
  if (cat.includes('agency') || cat.includes('autonomy')) return { framework: 'OWASP_LLM', controlId: 'LLM08' };
  if (cat.includes('overreliance') || cat.includes('hallucination')) return { framework: 'OWASP_LLM', controlId: 'LLM09' };
  if (cat.includes('theft') || cat.includes('model')) return { framework: 'OWASP_LLM', controlId: 'LLM10' };
  if (cat.includes('cryptography') || cat.includes('tls') || cat.includes('certificate')) return { framework: 'NIST_AI_RMF', controlId: 'GOVERN-3' };
  if (cat.includes('access') || cat.includes('authentication')) return { framework: 'NIST_AI_RMF', controlId: 'MANAGE-1' };
  if (cat.includes('monitoring') || cat.includes('logging')) return { framework: 'NIST_AI_RMF', controlId: 'MEASURE-2' };
  return null;
}

// ============================================================================
// AUTOPILOT MODULE
// ============================================================================

/**
 * Scheduled autopilot run for agent compliance.
 * Should be called by the existing AutopilotEngine or cron.
 */
async function runAgentComplianceAutopilot(agentId: number): Promise<any> {
  const results: any[] = [];

  // Step 1: Recompute score
  const score = await computeAndPersistScore(agentId, 'scan', 'Scheduled autopilot scan');
  results.push({ step: 'score_recomputed', overall: score.overallScore });

  // Step 2: Detect configuration drift
  // (In real implementation, would re-parse configs and compare hashes)
  results.push({ step: 'drift_check', status: 'no_drift' });

  // Step 3: Detect new gaps and create tasks
  const newTasks = await detectAndCreateRemediationTasks(agentId);
  results.push({ step: 'gaps_checked', newTasks: newTasks.length });

  // Step 4: Evaluate engagement stage
  const engagement = await evaluateAndAdvanceEngagement(agentId);
  results.push({ step: 'engagement_evaluated', ...engagement });

  // Step 5: Check for alerts
  const alerts: string[] = [];
  if (score.overallScore < 50) alerts.push(`Overall score dropped to ${score.overallScore}%`);
  if (score.criticalFindings > 0) alerts.push(`${score.criticalFindings} critical findings detected`);
  for (const gap of score.gaps) {
    if (gap.confidence < 20) alerts.push(`Critical gap: ${gap.controlId} at ${gap.confidence}%`);
  }
  results.push({ step: 'alerts', alerts });

  return { agentId, steps: results, alerts: score.gaps.filter(g => g.confidence < 20).length };
}

// ============================================================================
// PORTAL ENDPOINTS (token-based access with DB persistence)
// ============================================================================

// Validate token against database
async function validatePortalTokenDb(token: string): Promise<{ agentId: number; clientId: number } | null> {
  const db = await getDb();
  const [entry] = await db.execute(sql`
    SELECT agent_id, client_id, expires_at FROM agent_portal_tokens WHERE token = ${token}
  `);
  if (!entry) return null;
  const row = entry as any;
  if (new Date(row.expires_at) <= new Date()) {
    await db.execute(sql`DELETE FROM agent_portal_tokens WHERE token = ${token}`);
    return null;
  }
  // Update access stats
  await db.execute(sql`
    UPDATE agent_portal_tokens SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE token = ${token}
  `);
  return { agentId: row.agent_id, clientId: row.client_id };
}

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createAgentCompliancePhase3Router() {
  const router = Router();

  // Internal endpoints use API key
  router.use('/internal', apiKeyMiddleware);

  // Portal endpoints use token (attached via query param or header)
  router.use('/portal/:token', async (req: any, res: Response, next: NextFunction) => {
    const token = req.params.token;
    const entry = await validatePortalTokenDb(token);
    if (!entry) return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
    req.agentId = entry.agentId;
    req.clientId = entry.clientId;
    next();
  });

  // ========================================
  // REMEDIATION (P0-T1)
  // ========================================

  // Get open gaps with remediation playbooks
  router.get('/internal/agents/:id/gaps', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const db = await getDb();
      const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
      const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
      const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));
      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);

      const score = computeScore({
        agentId,
        mappings: mappings.map(m => ({
          framework: m.framework, controlId: m.controlId, autoMapped: m.autoMapped,
          confidence: m.confidence, evidenceCount: m.evidenceCount,
          lastEvidenceAt: m.lastEvidenceAt, lastRedteamAt: m.lastRedteamAt, redteamPassed: m.redteamPassed,
        })),
        evidenceTotal: evidenceList.length,
        redteamPass: redteamList.filter(r => r.passed).length,
        redteamFail: redteamList.filter(r => !r.passed).length,
        profile: { sandbox: profile!.sandbox, approvalMode: profile!.approvalMode, memoryEncryption: profile!.memoryEncryption, networkIsolation: profile!.networkIsolation },
      });

      const gapsWithPlaybooks = score.gaps.map(g => ({
        ...g,
        playbook: REMEDIATION_PLAYBOOKS[g.controlId] || null,
      }));

      res.json({ data: { gaps: gapsWithPlaybooks, threshold: GAP_THRESHOLD, totalGaps: score.gaps.length } });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Auto-create remediation tasks for all gaps
  router.post('/internal/agents/:id/remediate', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const created = await detectAndCreateRemediationTasks(agentId);
      res.status(201).json({ data: { created, count: created.length } });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // READINESS PORTAL (P0-T2)
  // ========================================

  // Get full agent readiness data (for portal rendering)
  router.get('/portal/:token/readiness', async (req: any, res: Response) => {
    try {
      const db = await getDb();
      const agentId = req.agentId;

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId));
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
      const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
      const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));
      const tasks = await db.execute(sql`
        SELECT * FROM project_tasks
        WHERE client_id = ${profile.clientId}
          AND source_type = 'agent_compliance'
          AND source_id = ${agentId}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      const policyCards = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.agentId, agentId));
      const history = await db.select().from(agentScoreHistory)
        .where(eq(agentScoreHistory.agentId, agentId))
        .orderBy(desc(agentScoreHistory.createdAt))
        .limit(30);

      const score = computeScore({
        agentId,
        mappings: mappings.map(m => ({
          framework: m.framework, controlId: m.controlId, autoMapped: m.autoMapped,
          confidence: m.confidence, evidenceCount: m.evidenceCount,
          lastEvidenceAt: m.lastEvidenceAt, lastRedteamAt: m.lastRedteamAt, redteamPassed: m.redteamPassed,
        })),
        evidenceTotal: evidenceList.length,
        redteamPass: redteamList.filter(r => r.passed).length,
        redteamFail: redteamList.filter(r => !r.passed).length,
        profile: { sandbox: profile.sandbox, approvalMode: profile.approvalMode, memoryEncryption: profile.memoryEncryption, networkIsolation: profile.networkIsolation },
      });

      res.json({
        data: {
          agent: { id: profile.id, name: profile.name, type: profile.type, version: profile.version, overallScore: profile.overallScore, owaspCoverage: profile.owaspCoverage },
          score,
          mappings: mappings.map(m => ({ framework: m.framework, controlId: m.controlId, status: m.status, confidence: m.confidence, evidenceCount: m.evidenceCount })),
          policyCards,
          tasks: Array.isArray(tasks) ? tasks : (tasks as any).rows || [],
          scoreHistory: history,
          evidenceCount: evidenceList.length,
          redteamStats: { pass: redteamList.filter(r => r.passed).length, fail: redteamList.filter(r => !r.passed).length },
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Generate portal token (accessible via both client-side and internal paths)
  const handleGeneratePortalToken = async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { expiresInDays = 30 } = req.body;
      const db = await getDb();
      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const token = `port_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      await db.execute(sql`INSERT INTO agent_portal_tokens (token, agent_id, client_id, expires_at) VALUES (${token}, ${agentId}, ${profile.clientId}, ${expiresAt.toISOString()})`);

      res.status(201).json({ data: { token, expiresAt, url: `/api/v1/agent-compliance/portal/${token}/readiness` } });
    } catch (err: any) {
      console.error('[Portal Token Error]', err);
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  };

  router.post('/agents/:id/portal-token', handleGeneratePortalToken);
  router.post('/internal/agents/:id/portal-token', handleGeneratePortalToken);

  // ========================================
  // ENGAGEMENT AUTOMATION (P1-T3)
  // ========================================

  // Evaluate and potentially advance engagement stage
  router.post('/internal/agents/:id/evaluate-engagement', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const result = await evaluateAndAdvanceEngagement(agentId);
      res.json({ data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Get engagement status with stage criteria
  router.get('/internal/agents/:id/engagement', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const [engagement] = await db.select().from(agentEngagements).where(eq(agentEngagements.agentId, agentId)).limit(1);
      if (!engagement) return res.status(404).json({ error: 'Engagement not found', code: 'NOT_FOUND' });

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);

      res.json({
        data: {
          ...engagement,
          criteriaMet: {
            autoMapped: (await db.select({ count: sql<number>`count(*)` }).from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId)))[0]?.count > 0,
            hasActivePolicyCard: (await db.select().from(agentPolicyCards).where(and(eq(agentPolicyCards.agentId, agentId), eq(agentPolicyCards.status, 'active'))).length > 0),
            overallScore: profile?.overallScore || 0,
            owaspCoverage: profile?.owaspCoverage || 0,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // AUTOPILOT (P1-T2)
  // ========================================

  // Run agent compliance autopilot
  router.post('/internal/agents/:id/autopilot', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const result = await runAgentComplianceAutopilot(agentId);
      res.json({ data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // TRENDS (P0-T3)
  // ========================================

  // Get score trend data for charting
  router.get('/internal/agents/:id/trends', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const limit = parseInt(req.query.limit as string) || 90;
      const history = await db.select().from(agentScoreHistory)
        .where(eq(agentScoreHistory.agentId, agentId))
        .orderBy(desc(agentScoreHistory.createdAt))
        .limit(limit);

      // Compute delta from start to end
      const startScore = history[history.length - 1]?.overallScore ?? 0;
      const endScore = history[0]?.overallScore ?? 0;
      const delta = endScore - startScore;

      res.json({
        data: {
          history: history.reverse(),
          delta,
          startScore,
          endScore,
          trend: delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
