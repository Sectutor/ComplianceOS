// ============================================================================
// PHASE 6: Evidence-Only Scoring Engine
// No config-based confidence. No inferences from Docker or approval mode.
// Only evidence + red team tests + manual attestation count.
// ============================================================================

import * as yaml from 'yaml';
import * as crypto from 'crypto';

const EVIDENCE_FRESH_DAYS = 90;
const ATTESTATION_FRESH_DAYS = 180;

function isFresh(date: Date | null, days: number = EVIDENCE_FRESH_DAYS): boolean {
  if (!date) return false;
  const diff = Date.now() - new Date(date).getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function decay(date: Date | null, days: number = EVIDENCE_FRESH_DAYS): number {
  if (!date) return 0;
  const diff = Date.now() - new Date(date).getTime();
  const daysSince = diff / (24 * 60 * 60 * 1000);
  if (daysSince <= days) return 1;
  return Math.max(0.5, 1 - (daysSince - days) / 30);
}

// ============================================================================
// SCORING ENGINE (Phase 6: Evidence-only)
// ============================================================================

export interface ScoreInput {
  agentId: number;
  mappings: Array<{
    framework: string;
    controlId: string;
    evidenceCount: number;
    lastEvidenceAt: Date | null;
    lastRedteamAt: Date | null;
    redteamPassed: boolean | null;
  }>;
  evidenceTotal: number;
  redteamPass: number;
  redteamFail: number;
}

export interface ScoreResult {
  overallScore: number;
  owaspCoverage: number;
  frameworkScores: Record<string, { total: number; covered: number; score: number }>;
  perControl: Array<{
    framework: string;
    controlId: string;
    confidence: number;
    source: 'evidence' | 'redteam' | 'manual' | 'none';
    explanation: string;
  }>;
  gaps: Array<{ framework: string; controlId: string; confidence: number }>;
  evidenceCount: number;
  redteamPassRate: number;
}

/**
 * Score a single control. No evidence = 0% confidence.
 */
function scoreControl(mapping: ScoreInput['mappings'][0]): {
  confidence: number;
  source: 'evidence' | 'redteam' | 'manual' | 'none';
  explanation: string;
} {
  // 1. Evidence (highest priority)
  if (mapping.evidenceCount > 0 && isFresh(mapping.lastEvidenceAt)) {
    const decayFactor = decay(mapping.lastEvidenceAt);
    const baseScore = Math.min(95, 70 + mapping.evidenceCount * 5);
    return {
      confidence: Math.round(baseScore * decayFactor),
      source: 'evidence',
      explanation: `${mapping.evidenceCount} evidence item(s)${decayFactor < 1 ? ' (decaying)' : ''}`,
    };
  }

  // 2. Red team test passed
  if (mapping.redteamPassed && mapping.lastRedteamAt && isFresh(mapping.lastRedteamAt)) {
    const decayFactor = decay(mapping.lastRedteamAt);
    return {
      confidence: Math.round(85 * decayFactor),
      source: 'redteam',
      explanation: `Red team test passed${decayFactor < 1 ? ' (decaying)' : ''}`,
    };
  }

  // 3. Red team test failed
  if (mapping.redteamPassed === false && mapping.lastRedteamAt) {
    return {
      confidence: 10,
      source: 'redteam',
      explanation: 'Red team test failed',
    };
  }

  // 4. Stale evidence (expired)
  if (mapping.evidenceCount > 0 && !isFresh(mapping.lastEvidenceAt)) {
    return {
      confidence: 15,
      source: 'evidence',
      explanation: `Evidence expired (>90 days)`,
    };
  }

  // 5. Nothing
  return {
    confidence: 0,
    source: 'none',
    explanation: 'No evidence or test',
  };
}

/**
 * Score an entire agent.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const perControl: ScoreResult['perControl'] = [];
  const gaps: ScoreResult['gaps'] = [];
  const frameworkTotals: Record<string, { total: number; covered: number }> = {};

  for (const mapping of input.mappings) {
    const result = scoreControl(mapping);

    perControl.push({
      framework: mapping.framework,
      controlId: mapping.controlId,
      confidence: result.confidence,
      source: result.source,
      explanation: result.explanation,
    });

    if (result.confidence < 70) {
      gaps.push({
        framework: mapping.framework,
        controlId: mapping.controlId,
        confidence: result.confidence,
      });
    }

    if (!frameworkTotals[mapping.framework]) {
      frameworkTotals[mapping.framework] = { total: 0, covered: 0 };
    }
    frameworkTotals[mapping.framework].total++;
    if (result.confidence >= 70) {
      frameworkTotals[mapping.framework].covered++;
    }
  }

  const frameworkScores: ScoreResult['frameworkScores'] = {};
  for (const [fw, totals] of Object.entries(frameworkTotals)) {
    frameworkScores[fw] = {
      total: totals.total,
      covered: totals.covered,
      score: totals.total > 0 ? Math.round((totals.covered / totals.total) * 100) : 0,
    };
  }

  const fwScoreValues = Object.values(frameworkScores).map(f => f.score);
  const overallScore = fwScoreValues.length > 0
    ? Math.round(fwScoreValues.reduce((a, b) => a + b, 0) / fwScoreValues.length)
    : 0;

  const owaspScore = frameworkScores['OWASP_LLM']?.score ?? 0;
  const redteamTotal = input.redteamPass + input.redteamFail;
  const redteamPassRate = redteamTotal > 0 ? Math.round((input.redteamPass / redteamTotal) * 100) : 0;

  return {
    overallScore,
    owaspCoverage: owaspScore,
    frameworkScores,
    perControl,
    gaps,
    evidenceCount: input.evidenceTotal,
    redteamPassRate,
  };
}

// ============================================================================
// CONFIG PARSERS (still useful for auto-fill, but NOT for scoring)
// ============================================================================

export interface ParsedDockerCompose {
  sandbox: 'docker' | 'none';
  networkMode: 'none' | 'bridge' | 'host' | string;
  readOnly: boolean;
  memLimit: string | null;
  cpus: string | null;
  pidsLimit: number | null;
  user: string | null;
  securityOpt: string[];
  capDrop: string[];
  volumes: string[];
}

export interface ParsedHermesConfig {
  terminalBackend: 'docker' | 'ssh' | 'local' | null;
  approvalMode: 'manual' | 'smart' | 'auto' | null;
  allowedPaths: string[];
  memoryEncryption: boolean;
  defenseInDepth: boolean;
  allowPrivateUrls: boolean;
  llmAuditEnabled: boolean;
  tools: string[];
  redactedLogging: boolean;
  contextProtection: boolean;
}

export function parseDockerCompose(content: string): ParsedDockerCompose {
  let parsed: any;
  try { parsed = yaml.parse(content); } catch { return getDefaultDockerCompose(); }
  const services = parsed?.services ?? {};
  const firstService = Object.values(services)[0] as any ?? {};
  return {
    sandbox: firstService.build || firstService.image ? 'docker' : 'none',
    networkMode: firstService.network_mode ?? 'bridge',
    readOnly: firstService.read_only ?? false,
    memLimit: firstService.mem_limit ?? firstService.deploy?.resources?.limits?.memory ?? null,
    cpus: firstService.cpus ?? firstService.deploy?.resources?.limits?.cpus ?? null,
    pidsLimit: firstService.pids_limit ?? null,
    user: firstService.user ?? null,
    securityOpt: firstService.security_opt ?? [],
    capDrop: firstService.cap_drop ?? [],
    volumes: (firstService.volumes as string[]) ?? [],
  };
}

function getDefaultDockerCompose(): ParsedDockerCompose {
  return { sandbox: 'none', networkMode: 'bridge', readOnly: false, memLimit: null, cpus: null, pidsLimit: null, user: null, securityOpt: [], capDrop: [], volumes: [] };
}

export function parseHermesConfig(content: string): ParsedHermesConfig {
  let parsed: any;
  try { parsed = yaml.parse(content); } catch { return getDefaultHermesConfig(); }
  const terminal = parsed?.terminal ?? {};
  const security = parsed?.security ?? {};
  const approvals = parsed?.approvals ?? {};
  const tools = parsed?.tools ?? {};
  const logging = parsed?.logging ?? {};
  const context = parsed?.context ?? {};
  const llmAudit = parsed?.llm_audit ?? {};
  return {
    terminalBackend: terminal.backend ?? null,
    approvalMode: approvals.mode ?? null,
    allowedPaths: tools.allowed_paths ?? [],
    memoryEncryption: security.memory_encryption ?? false,
    defenseInDepth: security.enable_defense_in_depth ?? false,
    allowPrivateUrls: security.allow_private_urls ?? true,
    llmAuditEnabled: llmAudit.enabled ?? false,
    tools: tools.enabled ?? [],
    redactedLogging: logging.redact_sensitive ?? false,
    contextProtection: context.protect_first_system ?? false,
  };
}

function getDefaultHermesConfig(): ParsedHermesConfig {
  return { terminalBackend: null, approvalMode: null, allowedPaths: [], memoryEncryption: false, defenseInDepth: false, allowPrivateUrls: true, llmAuditEnabled: false, tools: [], redactedLogging: false, contextProtection: false };
}

/**
 * Infer agent profile fields from parsed configs (for auto-fill ONLY, not scoring).
 */
export function inferProfileFromConfig(
  compose: ParsedDockerCompose,
  hermes: ParsedHermesConfig
): Partial<{
  sandbox: 'docker' | 'vm' | 'ssh' | 'none';
  approvalMode: 'manual' | 'smart' | 'auto';
  networkIsolation: boolean;
  memoryEncryption: boolean;
}> {
  let sandbox: 'docker' | 'vm' | 'ssh' | 'none' = 'none';
  if (hermes.terminalBackend === 'docker') sandbox = 'docker';
  else if (hermes.terminalBackend === 'ssh') sandbox = 'ssh';
  else if (compose.sandbox === 'docker') sandbox = 'docker';
  return {
    sandbox,
    approvalMode: hermes.approvalMode ?? 'manual',
    networkIsolation: compose.networkMode === 'none' || hermes.defenseInDepth,
    memoryEncryption: hermes.memoryEncryption,
  };
}

export function hashConfig(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function detectConfigDrift(
  oldCompose: ParsedDockerCompose | null,
  newCompose: ParsedDockerCompose | null,
  oldHermes: ParsedHermesConfig | null,
  newHermes: ParsedHermesConfig | null
): string[] {
  const changes: string[] = [];
  if (oldCompose && newCompose) {
    if (oldCompose.networkMode !== newCompose.networkMode) changes.push(`Network mode: ${oldCompose.networkMode} → ${newCompose.networkMode}`);
    if (oldCompose.readOnly !== newCompose.readOnly) changes.push(`Read-only: ${oldCompose.readOnly} → ${newCompose.readOnly}`);
  }
  if (oldHermes && newHermes) {
    if (oldHermes.approvalMode !== newHermes.approvalMode) changes.push(`Approval mode: ${oldHermes.approvalMode} → ${newHermes.approvalMode}`);
    if (oldHermes.memoryEncryption !== newHermes.memoryEncryption) changes.push(`Memory encryption: ${oldHermes.memoryEncryption} → ${newHermes.memoryEncryption}`);
  }
  return changes;
}
