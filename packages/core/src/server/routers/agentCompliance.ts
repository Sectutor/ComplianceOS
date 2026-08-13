import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../../db';
import { sql, eq, and, desc } from 'drizzle-orm';
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
  type AgentProfile,
  type AgentPolicyCard,
} from '../../schema_agent_compliance';
import { computeScore } from '../../lib/agent/scoring';

// ============================================================================
// API KEY MIDDLEWARE (consistent with api-v1)
// ============================================================================

const API_KEY = process.env.COMPLIANCE_API_KEY || '';

const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user) return next();
  if (!API_KEY) return next(); // dev mode — no key configured, open access
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key', code: 'UNAUTHORIZED' });
  }
  next();
};

// ============================================================================
// AUTO-MAPPING ENGINE (Phase 7: Evidence-only initial confidence)
// ============================================================================

const OWASP_LLM_CONTROLS = [
  { code: 'LLM01', title: 'Prompt Injection', category: 'security' },
  { code: 'LLM02', title: 'Insecure Output Handling', category: 'security' },
  { code: 'LLM03', title: 'Training Data Poisoning', category: 'security' },
  { code: 'LLM04', title: 'Model Denial of Service', category: 'availability' },
  { code: 'LLM05', title: 'Supply Chain Vulnerabilities', category: 'security' },
  { code: 'LLM06', title: 'Sensitive Information Disclosure', category: 'privacy' },
  { code: 'LLM07', title: 'Insecure Plugin/Tool Design', category: 'security' },
  { code: 'LLM08', title: 'Excessive Agency', category: 'governance' },
  { code: 'LLM09', title: 'Overreliance', category: 'governance' },
  { code: 'LLM10', title: 'Model Theft', category: 'security' },
];

const NIST_AI_RMF_CONTROLS = [
  { code: 'GOVERN-1', title: 'Organizational AI policies established', category: 'governance' },
  { code: 'GOVERN-2', title: 'AI risk management roles assigned', category: 'governance' },
  { code: 'GOVERN-3', title: 'Organizational AI risk strategies', category: 'governance' },
  { code: 'MAP-1', title: 'AI context documented', category: 'context' },
  { code: 'MAP-2', title: 'AI system categorization', category: 'context' },
  { code: 'MAP-3', title: 'AI risks and benefits assessed', category: 'context' },
  { code: 'MEASURE-1', title: 'AI test, evaluation, verification', category: 'evaluation' },
  { code: 'MEASURE-2', title: 'AI risk monitoring established', category: 'evaluation' },
  { code: 'MEASURE-3', title: 'AI supply chain risk management', category: 'evaluation' },
  { code: 'MANAGE-1', title: 'AI risk responses implemented', category: 'mitigation' },
  { code: 'MANAGE-2', title: 'AI risk mitigation outcomes tracked', category: 'mitigation' },
];

const EU_AI_ACT_CONTROLS = [
  { code: 'Art.8', title: 'Compliance with requirements', category: 'compliance' },
  { code: 'Art.9', title: 'Risk management system', category: 'risk' },
  { code: 'Art.10', title: 'Data governance', category: 'privacy' },
  { code: 'Art.11', title: 'Technical documentation', category: 'documentation' },
  { code: 'Art.13', title: 'Transparency', category: 'transparency' },
  { code: 'Art.14', title: 'Human oversight', category: 'governance' },
  { code: 'Art.15', title: 'Accuracy, robustness, cybersecurity', category: 'security' },
  { code: 'Art.16', title: 'Conformity assessment', category: 'compliance' },
  { code: 'Art.53', title: 'Fundamental rights', category: 'rights' },
  { code: 'Art.72', title: 'Post-market monitoring', category: 'monitoring' },
];

const ISO_42001_CONTROLS = [
  { code: 'ISO42001-4', title: 'Organizational context', category: 'context' },
  { code: 'ISO42001-5', title: 'Leadership and commitment', category: 'governance' },
  { code: 'ISO42001-6', title: 'Planning for AI risks', category: 'risk' },
  { code: 'ISO42001-7', title: 'Support and resources', category: 'support' },
  { code: 'ISO42001-8', title: 'Operational planning', category: 'operations' },
  { code: 'ISO42001-9', title: 'Performance evaluation', category: 'evaluation' },
  { code: 'ISO42001-10', title: 'Improvement', category: 'improvement' },
];

/**
 * Phase 7: Auto-map creates mappings with 0% confidence.
 * Score is ALWAYS computed from evidence — never inferred from config.
 */
function getMappedStatus(control: { code: string; title: string; category: string }): { status: string; implementation: string; confidence: number } {
  return {
    status: 'mapped',
    implementation: 'Control identified — evidence required',
    confidence: 0, // Phase 7: No evidence = 0% confidence. Period.
  };
}

async function autoMapAgent(agentId: number) {
  const db = await getDb();
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
  if (!profile) throw new Error('Agent not found');

  const clientId = profile.clientId;
  const mappings: any[] = [];

  for (const ctrl of OWASP_LLM_CONTROLS) {
    const { status, implementation, confidence } = getMappedStatus(ctrl);
    mappings.push({ agentId, clientId, framework: 'OWASP_LLM', controlId: ctrl.code, controlTitle: ctrl.title, status, implementation, autoMapped: true, confidence, mappedBy: 'system' });
  }

  for (const ctrl of NIST_AI_RMF_CONTROLS) {
    const { status, implementation, confidence } = getMappedStatus(ctrl);
    mappings.push({ agentId, clientId, framework: 'NIST_AI_RMF', controlId: ctrl.code, controlTitle: ctrl.title, status, implementation, autoMapped: true, confidence, mappedBy: 'system' });
  }

  for (const ctrl of EU_AI_ACT_CONTROLS) {
    const { status, implementation, confidence } = getMappedStatus(ctrl);
    mappings.push({ agentId, clientId, framework: 'EU_AI_ACT', controlId: ctrl.code, controlTitle: ctrl.title, status, implementation, autoMapped: true, confidence, mappedBy: 'system' });
  }

  for (const ctrl of ISO_42001_CONTROLS) {
    const { status, implementation, confidence } = getMappedStatus(ctrl);
    mappings.push({ agentId, clientId, framework: 'ISO_42001', controlId: ctrl.code, controlTitle: ctrl.title, status, implementation, autoMapped: true, confidence, mappedBy: 'system' });
  }

  // Delete existing auto-mappings for this agent
  await db.delete(agentFrameworkMappings).where(
    and(eq(agentFrameworkMappings.agentId, agentId), eq(agentFrameworkMappings.autoMapped, true))
  );

  if (mappings.length > 0) {
    await db.insert(agentFrameworkMappings).values(mappings);
  }

  // Phase 7: OWASP coverage is computed from EVIDENCE, not mapping count
  // Compute the actual score to get the correct coverage
  const agentMappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
  const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
  const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));

  const score = computeScore({
    agentId,
    mappings: agentMappings.map(m => ({
      framework: m.framework, controlId: m.controlId, evidenceCount: m.evidenceCount,
      lastEvidenceAt: m.lastEvidenceAt, lastRedteamAt: m.lastRedteamAt, redteamPassed: m.redteamPassed,
    })),
    evidenceTotal: evidenceList.length,
    redteamPass: redteamList.filter(r => r.passed).length,
    redteamFail: redteamList.filter(r => !r.passed).length,
  });

  await db.update(agentProfiles)
    .set({ owaspCoverage: score.owaspCoverage, overallScore: score.overallScore, updatedAt: new Date() })
    .where(eq(agentProfiles.id, agentId));

  return { totalMapped: mappings.length, owaspCoverage: score.owaspCoverage, overallScore: score.overallScore };
}

// ============================================================================
// REPORT CARD GENERATOR
// ============================================================================

async function generateReportCard(agentId: number) {
  const db = await getDb();

  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
  if (!profile) throw new Error('Agent not found');

  const tools = await db.select().from(agentTools).where(eq(agentTools.agentId, agentId));
  const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
  const redteam = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));
  const evidence = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
  const policyCards = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.agentId, agentId));

  const activeCard = policyCards.find(c => c.status === 'active') || policyCards[0];
  const escalations = activeCard ? await db.select().from(agentPolicyEscalations).where(eq(agentPolicyEscalations.policyCardId, activeCard.id)) : [];
  const kpis = activeCard ? await db.select().from(agentPolicyKpis).where(eq(agentPolicyKpis.policyCardId, activeCard.id)) : [];
  const assuranceMappings = activeCard ? await db.select().from(agentPolicyAssuranceMappings).where(eq(agentPolicyAssuranceMappings.policyCardId, activeCard.id)) : [];

  const frameworks = ['OWASP_LLM', 'NIST_AI_RMF', 'EU_AI_ACT', 'ISO_42001'];
  const frameworkScores: Record<string, any> = {};
  for (const fw of frameworks) {
    const fwMappings = mappings.filter(m => m.framework === fw);
    const total = fwMappings.length;
    const mapped = fwMappings.filter(m => m.status === 'mapped').length;
    const implemented = fwMappings.filter(m => m.status === 'implemented').length;
    const failed = fwMappings.filter(m => m.status === 'failed').length;
    const score = total > 0 ? Math.round(((mapped + implemented) / total) * 100) : 0;
    frameworkScores[fw] = { total, mapped, implemented, failed, score };
  }

  const totalTests = redteam.length;
  const passedTests = redteam.filter(r => r.passed).length;
  const failedTests = redteam.filter(r => !r.passed).length;
  const criticalFindings = redteam.filter(r => !r.passed && r.severity === 'critical').length;
  const highFindings = redteam.filter(r => !r.passed && r.severity === 'high').length;

  const owaspCoverage: Record<string, any> = {};
  for (const mapping of mappings.filter(m => m.framework === 'OWASP_LLM')) {
    owaspCoverage[mapping.controlId] = { control: mapping.controlTitle, status: mapping.status, confidence: mapping.confidence };
  }

  const evidenceByType: Record<string, number> = {};
  for (const ev of evidence) {
    evidenceByType[ev.evidenceType] = (evidenceByType[ev.evidenceType] || 0) + 1;
  }

  const nextReview = profile.nextAuditDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return {
    generatedAt: new Date().toISOString(),
    agent: {
      id: profile.id, name: profile.name, type: profile.type, version: profile.version,
      hosting: profile.hosting, sandbox: profile.sandbox, overallScore: profile.overallScore,
      owaspCoverage: profile.owaspCoverage, owner: profile.owner,
      lastAuditDate: profile.lastAuditDate, nextAuditDate: nextReview,
    },
    executiveSummary: {
      totalControlsMapped: mappings.length, totalTools: tools.length,
      totalEvidenceItems: evidence.length, totalRedTeamTests: totalTests,
      redTeamPassRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      criticalFindings, highFindings,
      policyCardActive: policyCards.some(c => c.status === 'active'),
    },
    frameworkScores,
    owaspCoverage,
    redteamSummary: {
      totalTests, passedTests, failedTests, criticalFindings, highFindings,
      findings: redteam.map(r => ({
        test: r.testName, category: r.testCategory, passed: r.passed,
        severity: r.severity, status: r.status, details: r.details,
      })),
    },
    evidenceSummary: evidenceByType,
    policyCard: activeCard ? {
      name: activeCard.name, version: activeCard.version, status: activeCard.status,
      aiActRiskLevel: activeCard.aiActRiskLevel, intendedUses: activeCard.intendedUses,
      geography: activeCard.geography, rulesCount: assuranceMappings.length,
      escalationsCount: escalations.length, kpisCount: kpis.length,
    } : null,
    assuranceMappings: assuranceMappings.map(m => ({
      framework: m.framework, section: m.section, sectionTitle: m.sectionTitle,
      isCompliant: m.isCompliant, evidence: m.evidence,
    })),
    nextReviewDate: nextReview,
  };
}

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createAgentComplianceRouter() {
  const router = Router();

  // Apply API key auth to all routes
  router.use(apiKeyMiddleware);

  // Also accept tRPC-style authenticated requests (no API key needed if req.user exists)
  router.use((req: any, res: Response, next: NextFunction) => {
    if (req.user) return next();
    next();
  });

  // ========================================
  // AGENT PROFILES CRUD
  // ========================================

  router.post('/agents', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const {
        clientId, name, description, version, type, hosting, sandbox,
        sandboxDetails, memoryType, memoryEncryption, credentialHandling,
        approvalMode, networkIsolation, owner, vendorId, configPath,
        dockerComposePath, deploymentNotes
      } = req.body;

      if (!clientId || !name || !type || !hosting || !sandbox) {
        return res.status(400).json({ error: 'Missing required fields: clientId, name, type, hosting, sandbox', code: 'BAD_REQUEST' });
      }

      const [created] = await db.insert(agentProfiles).values({
        clientId, name, description, version: version || '1.0.0', type, hosting, sandbox,
        sandboxDetails, memoryType, memoryEncryption, credentialHandling,
        approvalMode, networkIsolation, owner, vendorId, configPath,
        dockerComposePath, deploymentNotes
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.query.clientId as string);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'clientId query parameter is required', code: 'BAD_REQUEST' });
      }

      const rows = await db.select().from(agentProfiles)
        .where(eq(agentProfiles.clientId, clientId))
        .orderBy(desc(agentProfiles.createdAt));

      res.json({ data: rows, total: rows.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/agents/:id', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, id)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const toolsList = await db.select().from(agentTools).where(eq(agentTools.agentId, id));
      const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, id));
      const redteam = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, id));
      const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, id));
      const policyCards = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.agentId, id));

      res.json({ data: { ...profile, tools: toolsList, mappings, redteam, evidence: evidenceList, policyCards } });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.patch('/agents/:id', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.clientId;

      const [updated] = await db.update(agentProfiles).set(updateData).where(eq(agentProfiles.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.delete('/agents/:id', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      // Delete related records using proper subqueries
      await db.execute(sql`DELETE FROM ${sql.identifier('agent_policy_rules')} WHERE policy_card_id IN (SELECT id FROM ${sql.identifier('agent_policy_cards')} WHERE agent_id = ${id})`);
      await db.execute(sql`DELETE FROM ${sql.identifier('agent_policy_escalations')} WHERE policy_card_id IN (SELECT id FROM ${sql.identifier('agent_policy_cards')} WHERE agent_id = ${id})`);
      await db.execute(sql`DELETE FROM ${sql.identifier('agent_policy_kpis')} WHERE policy_card_id IN (SELECT id FROM ${sql.identifier('agent_policy_cards')} WHERE agent_id = ${id})`);
      await db.execute(sql`DELETE FROM ${sql.identifier('agent_policy_assurance_mappings')} WHERE policy_card_id IN (SELECT id FROM ${sql.identifier('agent_policy_cards')} WHERE agent_id = ${id})`);
      await db.delete(agentPolicyCards).where(eq(agentPolicyCards.agentId, id));
      await db.delete(agentTools).where(eq(agentTools.agentId, id));
      await db.delete(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, id));
      await db.delete(agentRedteamResults).where(eq(agentRedteamResults.agentId, id));
      await db.delete(agentEvidence).where(eq(agentEvidence.agentId, id));
      await db.delete(agentProfiles).where(eq(agentProfiles.id, id));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // AGENT TOOLS CRUD
  // ========================================

  router.post('/agents/:id/tools', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { name, description, category, status, requiresApproval, allowlistOnly, riskLevel, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'Missing required field: name', code: 'BAD_REQUEST' });

      const [created] = await db.insert(agentTools).values({ agentId, name, description, category, status, requiresApproval, allowlistOnly, riskLevel, notes }).returning();
      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.patch('/agents/:id/tools/:toolId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const toolId = parseInt(req.params.toolId);
      if (isNaN(toolId)) return res.status(400).json({ error: 'Invalid tool id', code: 'BAD_REQUEST' });

      const [updated] = await db.update(agentTools).set(req.body).where(eq(agentTools.id, toolId)).returning();
      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.delete('/agents/:id/tools/:toolId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const toolId = parseInt(req.params.toolId);
      await db.delete(agentTools).where(eq(agentTools.id, toolId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // AUTO-MAP ENGINE
  // ========================================

  router.post('/agents/:id/auto-map', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const result = await autoMapAgent(agentId);
      res.json({ data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/agents/:id/mappings', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const framework = req.query.framework as string | undefined;
      const query = framework
        ? db.select().from(agentFrameworkMappings).where(and(eq(agentFrameworkMappings.agentId, agentId), eq(agentFrameworkMappings.framework, framework)))
        : db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));

      const rows = await query;
      res.json({ data: rows, total: rows.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.patch('/agents/:id/mappings/:mappingId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const mappingId = parseInt(req.params.mappingId);
      if (isNaN(mappingId)) return res.status(400).json({ error: 'Invalid mapping id', code: 'BAD_REQUEST' });

      const [updated] = await db.update(agentFrameworkMappings).set({ ...req.body, updatedAt: new Date() }).where(eq(agentFrameworkMappings.id, mappingId)).returning();
      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/agents/:id/mappings/summary', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
      const frameworks = ['OWASP_LLM', 'NIST_AI_RMF', 'EU_AI_ACT', 'ISO_42001'];
      const summary: Record<string, any> = {};

      for (const fw of frameworks) {
        const fwMappings = mappings.filter(m => m.framework === fw);
        const total = fwMappings.length;
        const mapped = fwMappings.filter(m => m.status === 'mapped').length;
        const implemented = fwMappings.filter(m => m.status === 'implemented').length;
        const verified = fwMappings.filter(m => m.status === 'verified').length;
        const failed = fwMappings.filter(m => m.status === 'failed').length;
        const waived = fwMappings.filter(m => m.status === 'waived').length;
        const coverage = total > 0 ? Math.round(((mapped + implemented + verified) / total) * 100) : 0;
        summary[fw] = { total, mapped, implemented, verified, failed, waived, coverage };
      }

      res.json({ data: { agentId, frameworks: summary } });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // RED TEAM RESULTS
  // ========================================

  router.post('/agents/:id/redteam', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { testName, testCategory, severity, passed, details, remediation, evidencePath, status } = req.body;
      if (!testName || !testCategory || passed === undefined) {
        return res.status(400).json({ error: 'Missing required fields: testName, testCategory, passed', code: 'BAD_REQUEST' });
      }

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const [created] = await db.insert(agentRedteamResults).values({
        agentId, clientId: profile.clientId, testName, testCategory, severity, passed, details, remediation, evidencePath, status: status || 'open'
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // AGENT EVIDENCE
  // ========================================

  router.post('/agents/:id/evidence', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { evidenceType, title, description, filePath, content, framework, controlId, status } = req.body;
      if (!evidenceType || !title) {
        return res.status(400).json({ error: 'Missing required fields: evidenceType, title', code: 'BAD_REQUEST' });
      }

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const [created] = await db.insert(agentEvidence).values({
        agentId, clientId: profile.clientId, evidenceType, title, description, filePath, content, framework, controlId, status: status || 'collected'
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // REPORT CARD
  // ========================================

  router.get('/agents/:id/report-card', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const report = await generateReportCard(agentId);
      res.json({ data: report });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/agents/:id/report-card/pdf', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const report = await generateReportCard(agentId);
      const html = generateReportCardHTML(report);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // ========================================
  // POLICY CARDS
  // ========================================

  router.post('/agents/:id/policy-cards', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const { name, description, version, status, aiActRiskLevel, intendedUses, prohibitedUses, geography, effectiveDate, reviewDate } = req.body;
      if (!name) return res.status(400).json({ error: 'Missing required field: name', code: 'BAD_REQUEST' });

      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const [created] = await db.insert(agentPolicyCards).values({
        agentId, clientId: profile.clientId, name, description, version: version || '1.0.0',
        status: status || 'draft', aiActRiskLevel: aiActRiskLevel || 'limited',
        intendedUses: intendedUses || [], prohibitedUses: prohibitedUses || [],
        geography: geography || [], effectiveDate, reviewDate
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/agents/:id/policy-cards', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const cards = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.agentId, agentId)).orderBy(desc(agentPolicyCards.createdAt));
      res.json({ data: cards, total: cards.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/policy-cards/:cardId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const [card] = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.id, cardId)).limit(1);
      if (!card) return res.status(404).json({ error: 'Policy card not found', code: 'NOT_FOUND' });

      const rules = await db.select().from(agentPolicyRules).where(eq(agentPolicyRules.policyCardId, cardId));
      const escalations = await db.select().from(agentPolicyEscalations).where(eq(agentPolicyEscalations.policyCardId, cardId));
      const kpis = await db.select().from(agentPolicyKpis).where(eq(agentPolicyKpis.policyCardId, cardId));
      const assuranceMappings = await db.select().from(agentPolicyAssuranceMappings).where(eq(agentPolicyAssuranceMappings.policyCardId, cardId));

      res.json({ data: { ...card, rules, escalations, kpis, assuranceMappings } });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.patch('/policy-cards/:cardId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const [updated] = await db.update(agentPolicyCards).set({ ...req.body, updatedAt: new Date() }).where(eq(agentPolicyCards.id, cardId)).returning();
      if (!updated) return res.status(404).json({ error: 'Policy card not found', code: 'NOT_FOUND' });

      res.json({ data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.post('/policy-cards/:cardId/rules', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const { ruleId, name, description, effect, conditionField, conditionOperator, conditionValue, actionType, actionMessage, severity, owaspCategory, nistCategory } = req.body;
      if (!ruleId || !name || !effect || !conditionField || !conditionOperator) {
        return res.status(400).json({ error: 'Missing required fields: ruleId, name, effect, conditionField, conditionOperator', code: 'BAD_REQUEST' });
      }

      const [created] = await db.insert(agentPolicyRules).values({
        policyCardId: cardId, ruleId, name, description, effect, conditionField, conditionOperator, conditionValue, actionType, actionMessage, severity, owaspCategory, nistCategory
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.post('/policy-cards/:cardId/escalations', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const { name, description, triggerCondition, triggerOperator, triggerValue, action, notifyEmails, priority } = req.body;
      if (!name || !triggerCondition || !triggerOperator || !action) {
        return res.status(400).json({ error: 'Missing required fields: name, triggerCondition, triggerOperator, action', code: 'BAD_REQUEST' });
      }

      const [created] = await db.insert(agentPolicyEscalations).values({
        policyCardId: cardId, name, description, triggerCondition, triggerOperator, triggerValue, action, notifyEmails, priority
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.post('/policy-cards/:cardId/kpis', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const { name, metric, targetValue, criticalThreshold, warningThreshold, unit } = req.body;
      if (!name || !metric || targetValue === undefined) {
        return res.status(400).json({ error: 'Missing required fields: name, metric, targetValue', code: 'BAD_REQUEST' });
      }

      const [created] = await db.insert(agentPolicyKpis).values({
        policyCardId: cardId, name, metric, targetValue, criticalThreshold, warningThreshold, unit
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.post('/policy-cards/:cardId/assurance', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const { framework, section, sectionTitle, isCompliant, evidence, notes } = req.body;
      if (!framework || !section) {
        return res.status(400).json({ error: 'Missing required fields: framework, section', code: 'BAD_REQUEST' });
      }

      const [created] = await db.insert(agentPolicyAssuranceMappings).values({
        policyCardId: cardId, framework, section, sectionTitle, isCompliant, evidence, notes
      }).returning();

      res.status(201).json({ data: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/policy-cards/:cardId/export/yaml', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid card id', code: 'BAD_REQUEST' });

      const [card] = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.id, cardId)).limit(1);
      if (!card) return res.status(404).json({ error: 'Policy card not found', code: 'NOT_FOUND' });

      const rules = await db.select().from(agentPolicyRules).where(eq(agentPolicyRules.policyCardId, cardId));
      const escalations = await db.select().from(agentPolicyEscalations).where(eq(agentPolicyEscalations.policyCardId, cardId));
      const kpis = await db.select().from(agentPolicyKpis).where(eq(agentPolicyKpis.policyCardId, cardId));
      const assuranceMappings = await db.select().from(agentPolicyAssuranceMappings).where(eq(agentPolicyAssuranceMappings.policyCardId, cardId));

      const yaml = generatePolicyCardYAML(card, rules, escalations, kpis, assuranceMappings);
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="policy-card-${card.name.replace(/\s+/g, '-').toLowerCase()}.yaml"`);
      res.send(yaml);
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.delete('/policy-cards/:cardId/rules/:ruleId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const ruleId = parseInt(req.params.ruleId);
      await db.delete(agentPolicyRules).where(eq(agentPolicyRules.id, ruleId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.delete('/policy-cards/:cardId/escalations/:escId', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const escId = parseInt(req.params.escId);
      await db.delete(agentPolicyEscalations).where(eq(agentPolicyEscalations.id, escId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}

// ============================================================================
// YAML GENERATOR
// ============================================================================

function generatePolicyCardYAML(card: AgentPolicyCard, rules: any[], escalations: any[], kpis: any[], assuranceMappings: any[]): string {
  const indent = (s: string, n: number) => ' '.repeat(n) + s;

  let yaml = `# Agent Policy Card\n`;
  yaml += `policy_card_version: "1.0"\n`;
  yaml += `name: "${card.name}"\n`;
  yaml += `description: "${card.description || ''}"\n`;
  yaml += `version: "${card.version}"\n`;
  yaml += `status: "${card.status}"\n\n`;

  yaml += `scope:\n`;
  yaml += indent(`ai_act_risk_level: "${card.aiActRiskLevel}"\n`, 2);
  yaml += indent(`intended_uses:\n`, 2);
  for (const use of card.intendedUses || []) yaml += indent(`- ${use}\n`, 4);
  yaml += indent(`geography:\n`, 2);
  for (const geo of card.geography || []) yaml += indent(`- ${geo}\n`, 4);
  yaml += `\n`;

  yaml += `rules:\n`;
  for (const rule of rules) {
    yaml += indent(`- id: ${rule.ruleId}\n`, 2);
    yaml += indent(`effect: ${rule.effect}\n`, 4);
    yaml += indent(`condition:\n`, 4);
    yaml += indent(`field: ${rule.conditionField}\n`, 6);
    yaml += indent(`operator: ${rule.conditionOperator}\n`, 6);
    yaml += indent(`values: ${rule.conditionValue || 'null'}\n`, 6);
    yaml += indent(`reason: "${rule.actionMessage || rule.description || ''}"\n`, 4);
    yaml += `\n`;
  }

  yaml += `escalation:\n`;
  yaml += indent(`triggers:\n`, 2);
  for (const esc of escalations) {
    yaml += indent(`- condition: "${esc.triggerCondition} ${esc.triggerOperator} ${esc.triggerValue}"\n`, 4);
    yaml += indent(`action: ${esc.action}\n`, 6);
    yaml += indent(`priority: ${esc.priority}\n`, 6);
  }
  yaml += `\n`;

  yaml += `monitoring:\n`;
  yaml += indent(`kpis:\n`, 2);
  for (const kpi of kpis) {
    yaml += indent(`- name: ${kpi.name}\n`, 4);
    yaml += indent(`metric: ${kpi.metric}\n`, 6);
    yaml += indent(`target: ${kpi.targetValue}\n`, 6);
    if (kpi.criticalThreshold !== null) yaml += indent(`critical_threshold: ${kpi.criticalThreshold}\n`, 6);
  }
  yaml += `\n`;

  yaml += `assurance_mapping:\n`;
  const fwGroups: Record<string, string[]> = {};
  for (const m of assuranceMappings) {
    if (!fwGroups[m.framework]) fwGroups[m.framework] = [];
    fwGroups[m.framework].push(m.section);
  }
  for (const [fw, sections] of Object.entries(fwGroups)) {
    yaml += indent(`${fw.toLowerCase()}: [${sections.join(', ')}]\n`, 2);
  }

  return yaml;
}

// ============================================================================
// REPORT CARD HTML GENERATOR
// ============================================================================

function generateReportCardHTML(report: any): string {
  const esc = (s: any) => s != null ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Agent Compliance Report Card - ${esc(report.agent.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#f0f0f5;padding:40px;font-size:14px;line-height:1.6}
@media print{body{padding:20px;background:#fff}.page-break{page-break-before:always}.no-print{display:none}}
.container{max-width:900px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a1a2e;padding-bottom:20px;margin-bottom:30px}
.header h1{font-size:28px;font-weight:700;color:#1a1a2e}
.header .meta{text-align:right;color:#666;font-size:12px}
.score-badge{display:inline-block;width:80px;height:80px;border-radius:50%;line-height:80px;text-align:center;font-size:28px;font-weight:700;color:#fff;margin:10px 0}
.score-green{background:#22c55e}.score-yellow{background:#eab308}.score-red{background:#ef4444}
.section{background:#fff;border-radius:12px;padding:24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.section h2{font-size:18px;font-weight:600;margin-bottom:12px;color:#1a1a2e;border-bottom:2px solid #e5e7eb;padding-bottom:8px}
.section h3{font-size:14px;font-weight:600;margin:12px 0 6px;color:#374151}
.stat{text-align:center;padding:16px;background:#f9fafb;border-radius:8px}
.stat .value{font-size:24px;font-weight:700;color:#1a1a2e}
.stat .label{font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
th{background:#f9fafb;font-weight:600;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge-green{background:#dcfce7;color:#166534}.badge-yellow{background:#fef9c3;color:#854d0e}
.badge-red{background:#fee2e2;color:#991b1b}.badge-blue{background:#dbeafe;color:#1e40af}
.badge-gray{background:#f3f4f6;color:#4b5563}
.coverage-bar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:4px 0}
.coverage-fill{height:100%;border-radius:4px}
.fill-green{background:#22c55e}.fill-yellow{background:#eab308}.fill-red{background:#ef4444}
.footer{text-align:center;padding:20px;color:#9ca3af;font-size:11px}
.alert{padding:12px;border-radius:8px;margin:8px 0;font-size:13px}
.alert-critical{background:#fee2e2;border-left:4px solid #ef4444;color:#991b1b}
.alert-high{background:#fef3c7;border-left:4px solid #f59e0b;color:#92400e}
.alert-info{background:#dbeafe;border-left:4px solid #3b82f6;color:#1e40af}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <h1>${esc(report.agent.name)}</h1>
      <p style="color:#6b7280;margin-top:4px">Agent Compliance Report Card &bull; ${esc(report.agent.type)} v${esc(report.agent.version || '1.0')}</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:8px">Owner: ${esc(report.agent.owner || 'Not assigned')} &bull; Hosting: ${esc(report.agent.hosting)}</p>
    </div>
    <div class="meta">
      <div style="text-align:center">
        <div class="score-badge ${report.agent.overallScore >= 80 ? 'score-green' : report.agent.overallScore >= 50 ? 'score-yellow' : 'score-red'}">${report.agent.overallScore}</div>
        <div style="font-size:11px;color:#9ca3af">Overall Score</div>
      </div>
      <p style="margin-top:12px">Generated: ${new Date(report.generatedAt).toLocaleDateString()}</p>
      <p>Next Review: ${new Date(report.agent.nextAuditDate).toLocaleDateString()}</p>
    </div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <div class="grid-4">
      <div class="stat"><div class="value">${report.executiveSummary.totalControlsMapped}</div><div class="label">Controls Mapped</div></div>
      <div class="stat"><div class="value">${report.executiveSummary.totalTools}</div><div class="label">Tools Managed</div></div>
      <div class="stat"><div class="value">${report.executiveSummary.totalEvidenceItems}</div><div class="label">Evidence Items</div></div>
      <div class="stat"><div class="value">${report.executiveSummary.redTeamPassRate}%</div><div class="label">Red Team Pass Rate</div></div>
    </div>
    ${report.executiveSummary.criticalFindings > 0 ? `<div class="alert alert-critical">${report.executiveSummary.criticalFindings} critical finding(s) require remediation</div>` : ''}
    ${report.executiveSummary.highFindings > 0 ? `<div class="alert alert-high">${report.executiveSummary.highFindings} high-severity finding(s)</div>` : ''}
    ${report.executiveSummary.criticalFindings === 0 && report.executiveSummary.highFindings === 0 ? `<div class="alert alert-info">No critical or high-severity findings</div>` : ''}
  </div>

  <div class="section page-break">
    <h2>Framework Coverage</h2>
    <table>
      <thead><tr><th>Framework</th><th>Total</th><th>Coverage</th><th>Score</th><th>Status</th></tr></thead>
      <tbody>
        ${Object.entries(report.frameworkScores).map(([fw, data]: [string, any]) => `
        <tr>
          <td><strong>${fw.replace(/_/g, ' ')}</strong></td>
          <td>${data.total}</td>
          <td style="width:200px"><div class="coverage-bar"><div class="coverage-fill ${data.score >= 80 ? 'fill-green' : data.score >= 50 ? 'fill-yellow' : 'fill-red'}" style="width:${data.score}%"></div></div><small style="color:#6b7280">${data.mapped} mapped, ${data.implemented} implemented, ${data.failed} failed</small></td>
          <td style="font-weight:700">${data.score}%</td>
          <td><span class="badge ${data.score >= 80 ? 'badge-green' : data.score >= 50 ? 'badge-yellow' : 'badge-red'}">${data.score >= 80 ? 'COMPLIANT' : data.score >= 50 ? 'IN PROGRESS' : 'AT RISK'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>OWASP LLM Top 10</h2>
    <div class="grid-2">
      ${Object.entries(report.owaspCoverage).map(([code, data]: [string, any]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f9fafb;border-radius:8px;margin:4px 0">
        <div><strong>${code}</strong> - ${esc(data.control)}<br><small style="color:${data.confidence >= 80 ? '#166534' : data.confidence >= 60 ? '#854d0e' : '#991b1b'}">Confidence: ${data.confidence}%</small></div>
        <span class="badge ${data.status === 'verified' ? 'badge-green' : data.status === 'implemented' ? 'badge-blue' : data.status === 'mapped' ? 'badge-yellow' : 'badge-red'}">${data.status.toUpperCase()}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="section page-break">
    <h2>Red Team Results</h2>
    <div class="grid-4">
      <div class="stat"><div class="value">${report.redteamSummary.totalTests}</div><div class="label">Total Tests</div></div>
      <div class="stat"><div class="value" style="color:#22c55e">${report.redteamSummary.passedTests}</div><div class="label">Passed</div></div>
      <div class="stat"><div class="value" style="color:#ef4444">${report.redteamSummary.failedTests}</div><div class="label">Failed</div></div>
      <div class="stat"><div class="value">${report.executiveSummary.redTeamPassRate}%</div><div class="label">Pass Rate</div></div>
    </div>
    ${report.redteamSummary.findings.length > 0 ? `
    <table>
      <thead><tr><th>Test</th><th>Category</th><th>Severity</th><th>Result</th><th>Status</th></tr></thead>
      <tbody>
        ${report.redteamSummary.findings.map((f: any) => `
        <tr><td>${esc(f.test)}</td><td><span class="badge badge-gray">${f.category}</span></td><td><span class="badge ${f.severity === 'critical' ? 'badge-red' : f.severity === 'high' ? 'badge-yellow' : 'badge-gray'}">${f.severity}</span></td><td>${f.passed ? 'PASS' : 'FAIL'}</td><td><span class="badge ${f.status === 'remediated' ? 'badge-green' : f.status === 'open' ? 'badge-red' : 'badge-gray'}">${f.status}</span></td></tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#6b7280;padding:12px">No red team tests recorded.</p>'}
  </div>

  ${report.policyCard ? `
  <div class="section">
    <h2>AI Policy Card: ${esc(report.policyCard.name)}</h2>
    <div class="grid-4">
      <div class="stat"><div class="value"><span class="badge ${report.policyCard.status === 'active' ? 'badge-green' : 'badge-yellow'}">${report.policyCard.status}</span></div><div class="label">Status</div></div>
      <div class="stat"><div class="value"><span class="badge badge-gray" style="text-transform:none">${esc(report.policyCard.aiActRiskLevel)}</span></div><div class="label">EU AI Act Risk</div></div>
      <div class="stat"><div class="value">${report.policyCard.rulesCount}</div><div class="label">Rules</div></div>
      <div class="stat"><div class="value">${report.policyCard.escalationsCount}</div><div class="label">Escalations</div></div>
    </div>
    <div style="margin-top:8px"><strong>Intended Uses:</strong> ${report.policyCard.intendedUses.length > 0 ? report.policyCard.intendedUses.join(', ') : 'None specified'}</div>
    <div style="margin-top:4px"><strong>Geography:</strong> ${report.policyCard.geography.length > 0 ? report.policyCard.geography.join(', ') : 'Not restricted'}</div>
  </div>` : ''}

  ${report.assuranceMappings.length > 0 ? `
  <div class="section page-break"><h2>Assurance Mapping</h2>
    <table><thead><tr><th>Framework</th><th>Section</th><th>Title</th><th>Compliant</th></tr></thead><tbody>
      ${report.assuranceMappings.map((m: any) => `<tr><td><span class="badge badge-blue">${esc(m.framework)}</span></td><td>${esc(m.section)}</td><td>${esc(m.sectionTitle || '')}</td><td><span class="badge ${m.isCompliant ? 'badge-green' : 'badge-red'}">${m.isCompliant ? 'YES' : 'NO'}</span></td></tr>`).join('')}
    </tbody></table>
  </div>` : ''}

  <div class="section"><h2>Evidence Inventory</h2>
    ${Object.keys(report.evidenceSummary).length > 0 ? `
    <div class="grid-4">
      ${Object.entries(report.evidenceSummary).map(([type, count]: [string, any]) => `<div class="stat"><div class="value">${count}</div><div class="label">${type.replace(/_/g, ' ')}</div></div>`).join('')}
    </div>` : '<p style="color:#6b7280;padding:12px">No evidence items recorded.</p>'}
  </div>

  <div class="footer"><p>Generated by GRCompliance Agent Compliance Engine &bull; ${new Date(report.generatedAt).toLocaleString()}</p><p>Next review: ${new Date(report.agent.nextAuditDate).toLocaleDateString()}</p><p style="margin-top:8px"><em>This report is generated automatically and should be reviewed by a qualified compliance professional.</em></p></div>
</div>
<button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;padding:12px 24px;background:#1a1a2e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Print / Save PDF</button>
</body>
</html>`;
}
