/**
 * PHASE 5: Multi-Agent Portfolio Engine
 * Provides cross-agent compliance overview for enterprise clients and MSSPs.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../../db';
import { sql, eq, and, desc, inArray } from 'drizzle-orm';
import {
  agentProfiles,
  agentFrameworkMappings,
  agentScoreHistory,
} from '../../schema_agent_compliance';
import { computeScore } from '../../lib/agent/scoring';

const API_KEY = process.env.COMPLIANCE_API_KEY || '';

const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('report-card.pdf') || req.path.includes('/portal/')) return next();
  if ((req as any).user) return next();
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Invalid API key', code: 'UNAUTHORIZED' });
  next();
};

export function createAgentPortfolioRouter() {
  const router = Router();
  router.use(apiKeyMiddleware);

  // Get portfolio overview for a client (all agents, sorted by risk = lowest score first)
  router.get('/portfolio', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.query.clientId as string);
      if (isNaN(clientId)) return res.status(400).json({ error: 'clientId required', code: 'BAD_REQUEST' });

      const agents = await db.select().from(agentProfiles).where(eq(agentProfiles.clientId, clientId));

      const portfolio = await Promise.all(agents.map(async (agent) => {
        const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agent.id));
        const history = await db.select().from(agentScoreHistory)
          .where(eq(agentScoreHistory.agentId, agent.id))
          .orderBy(desc(agentScoreHistory.createdAt))
          .limit(2);

        const score = computeScore({
          agentId: agent.id,
          mappings: mappings.map(m => ({
            framework: m.framework, controlId: m.controlId, autoMapped: m.autoMapped,
            confidence: m.confidence, evidenceCount: m.evidenceCount,
            lastEvidenceAt: m.lastEvidenceAt, lastRedteamAt: m.lastRedteamAt, redteamPassed: m.redteamPassed,
          })),
          evidenceTotal: 0, redteamPass: 0, redteamFail: 0,
          profile: { sandbox: agent.sandbox, approvalMode: agent.approvalMode, memoryEncryption: agent.memoryEncryption, networkIsolation: agent.networkIsolation },
        });

        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          overallScore: score.overallScore,
          owaspCoverage: score.owaspCoverage,
          gapCount: score.gaps.length,
          criticalGaps: score.gaps.filter(g => g.confidence < 30).length,
          frameworkScores: score.frameworkScores,
          trend: history.length > 1 ? (history[0].overall_score > history[1].overall_score ? 'up' : history[0].overall_score < history[1].overall_score ? 'down' : 'flat') : 'stable',
        };
      }));

      // Sort by risk: lowest score first (most critical)
      portfolio.sort((a, b) => a.overallScore - b.overallScore);

      const avgScore = portfolio.length > 0 ? Math.round(portfolio.reduce((a, b) => a + b.overallScore, 0) / portfolio.length) : 0;
      const criticalAgents = portfolio.filter(a => a.criticalGaps > 0).length;

      res.json({
        data: {
          agents: portfolio,
          summary: {
            totalAgents: portfolio.length,
            averageScore: avgScore,
            criticalAgents,
            healthyAgents: portfolio.filter(a => a.overallScore >= 80).length,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  // Get weakest controls across all agents (recurring gaps)
  router.get('/portfolio/weaknesses', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const clientId = parseInt(req.query.clientId as string);
      if (isNaN(clientId)) return res.status(400).json({ error: 'clientId required', code: 'BAD_REQUEST' });

      const agents = await db.select().from(agentProfiles).where(eq(agentProfiles.clientId, clientId));
      const agentIds = agents.map(a => a.id);

      if (agentIds.length === 0) return res.json({ data: [] });

      const mappings = await db.select().from(agentFrameworkMappings)
        .where(inArray(agentFrameworkMappings.agentId, agentIds));

      // Aggregate weaknesses
      const controlStats: Record<string, { totalScore: number; count: number; agents: string[] }> = {};
      for (const m of mappings) {
        const key = `${m.framework}:${m.controlId}`;
        if (!controlStats[key]) controlStats[key] = { totalScore: 0, count: 0, agents: [] };
        controlStats[key].totalScore += m.confidence;
        controlStats[key].count++;
      }

      const weaknesses = Object.entries(controlStats)
        .map(([key, stats]) => ({
          control: key,
          framework: key.split(':')[0],
          controlId: key.split(':')[1],
          averageConfidence: Math.round(stats.totalScore / stats.count),
          affectedAgents: stats.count,
        }))
        .sort((a, b) => a.averageConfidence - b.averageConfidence)
        .slice(0, 10);

      res.json({ data: weaknesses });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
