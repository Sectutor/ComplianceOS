/**
 * PHASE 6: Agent Compliance Autopilot Integration
 * Registers agent compliance as an autopilot module that runs on schedule.
 */

import { getDb } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import {
  agentProfiles,
  agentScoreHistory,
  agentEngagements,
  agentFrameworkMappings,
  agentEvidence,
  agentRedteamResults,
  agentPolicyCards,
} from '../../schema_agent_compliance';
import { projectTasks } from '../../schema';
import { computeScore } from './scoring';

/**
 * Run agent compliance autopilot for all active agents.
 * Called by the hourly autopilot cron.
 */
export async function agentComplianceAutopilotTick(): Promise<{
  processed: number;
  results: { agentId: number; status: string; score?: number }[];
}> {
  const db = await getDb();
  const agents = await db.select().from(agentProfiles)
    .where(eq(agentProfiles.status, 'active'));

  const results: { agentId: number; status: string; score?: number }[] = [];

  for (const agent of agents) {
    try {
      const { score, tasksCreated, engagementAdvanced } = await runSingleAgentAutopilot(agent.id);
      results.push({ agentId: agent.id, status: 'completed', score });
    } catch (err: any) {
      console.error(`[AgentComplianceAutopilot] Failed for agent ${agent.id}:`, err);
      results.push({ agentId: agent.id, status: 'failed' });
    }
  }

  return { processed: results.length, results };
}

/**
 * Run autopilot for a single agent.
 */
export async function runSingleAgentAutopilot(agentId: number): Promise<{
  score: number;
  tasksCreated: number;
  engagementAdvanced: boolean;
}> {
  const db = await getDb();

  // 1. Recompute score
  const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
  const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
  const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);

  if (!profile) throw new Error('Agent not found');

  const redteamPass = redteamList.filter(r => r.passed).length;
  const redteamFail = redteamList.filter(r => !r.passed).length;

  const scoreResult = computeScore({
    agentId,
    mappings: mappings.map(m => ({
      framework: m.framework,
      controlId: m.controlId,
      evidenceCount: m.evidenceCount,
      lastEvidenceAt: m.lastEvidenceAt,
      lastRedteamAt: m.lastRedteamAt,
      redteamPassed: m.redteamPassed,
    })),
    evidenceTotal: evidenceList.length,
    redteamPass,
    redteamFail,
  });

  // 2. Update profile score
  await db.update(agentProfiles)
    .set({ overallScore: scoreResult.overallScore, owaspCoverage: scoreResult.owaspCoverage, updatedAt: new Date() })
    .where(eq(agentProfiles.id, agentId));

  // 3. Persist score history
  await db.insert(agentScoreHistory).values({
    agentId,
    clientId: profile.clientId,
    overallScore: scoreResult.overallScore,
    owaspCoverage: scoreResult.owaspCoverage,
    frameworkScores: scoreResult.frameworkScores,
    triggerSource: 'scan',
    triggerDetail: 'Scheduled autopilot scan',
    evidenceCount: evidenceList.length,
    redteamPassCount: redteamPass,
    redteamFailCount: redteamFail,
    gapCount: scoreResult.gaps.length,
  });

  // 4. Detect drift (placeholder - would re-parse configs in real implementation)
  const driftDetected = false;

  // 5. Create remediation tasks for new gaps
  let tasksCreated = 0;
  if (scoreResult.gaps.length > 0) {
    const existingTasks = await db.execute(sql`
      SELECT title FROM project_tasks
      WHERE client_id = ${profile.clientId}
        AND source_type = 'agent_compliance'
        AND source_id = ${agentId}
        AND status != 'done'
    `);
    const rows = Array.isArray(existingTasks) ? existingTasks : (existingTasks as any).rows || [];
    const existingTitles = new Set(rows.map((r: any) => r.title));

    for (const gap of scoreResult.gaps) {
      const title = `Remediate ${gap.controlId} (${gap.framework})`;
      if (!existingTitles.has(title)) {
        await db.insert(projectTasks).values({
          clientId: profile.clientId,
          title,
          description: `Auto-created: Control ${gap.controlId} has ${gap.confidence}% confidence (threshold: 70%)`,
          status: 'todo',
          priority: gap.confidence < 30 ? 'high' : gap.confidence < 50 ? 'medium' : 'low',
          sourceType: 'agent_compliance',
          sourceId: agentId,
          tags: ['agent-compliance', gap.framework.toLowerCase(), gap.controlId.toLowerCase()],
          dueDate: profile.nextAuditDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        tasksCreated++;
      }
    }
  }

  // 6. Evaluate engagement stage
  const engagementAdvanced = await evaluateEngagement(agentId, scoreResult.overallScore);

  return { score: scoreResult.overallScore, tasksCreated, engagementAdvanced };
}

/**
 * Evaluate and potentially advance engagement stage.
 */
async function evaluateEngagement(agentId: number, overallScore: number): Promise<boolean> {
  const db = await getDb();
  const [engagement] = await db.select().from(agentEngagements).where(eq(agentEngagements.agentId, agentId)).limit(1);
  if (!engagement) return false;

  let canAdvance = false;
  let nextStage: string | null = null;

  switch (engagement.stage) {
    case 'discovery': {
      const mappingCount = await db.select({ count: sql<number>`count(*)` }).from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
      if (parseInt(mappingCount[0]?.count as string) > 0) { canAdvance = true; nextStage = 'mapped'; }
      break;
    }
    case 'mapped': {
      const [activeCard] = await db.select().from(agentPolicyCards).where(and(eq(agentPolicyCards.agentId, agentId), eq(agentPolicyCards.status, 'active'))).limit(1);
      if (activeCard) { canAdvance = true; nextStage = 'policy_deployed'; }
      break;
    }
    case 'policy_deployed': {
      const [openTask] = await db.execute(sql`
        SELECT id FROM project_tasks
        WHERE source_type = 'agent_compliance' AND source_id = ${agentId} AND status != 'done' LIMIT 1
      `);
      if (openTask) { canAdvance = true; nextStage = 'remediation'; }
      break;
    }
    case 'remediation':
      if (overallScore >= 80) { canAdvance = true; nextStage = 'verified'; }
      break;
    case 'verified':
      if (overallScore >= 85) { canAdvance = true; nextStage = 'handoff'; }
      break;
  }

  if (canAdvance && nextStage) {
    await db.update(agentEngagements).set({ stage: nextStage, stageStartedAt: new Date(), updatedAt: new Date() }).where(eq(agentEngagements.id, engagement.id));
    return true;
  }
  return false;
}
