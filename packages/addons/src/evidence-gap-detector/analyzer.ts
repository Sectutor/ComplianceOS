/**
 * AI Evidence Gap Detector — Gap Analysis Engine
 *
 * Analyzes clientControls and their associated evidence to identify:
 * - Controls missing evidence entirely
 * - Controls with expired evidence
 * - Controls with evidence about to expire
 *
 * Optionally uses an LLM provider to generate recommendations and summaries.
 */
export interface GapAnalysisResult {
  /** Total number of controls assessed */
  totalControls: number;
  /** Controls that have valid, non-expired evidence */
  controlsWithEvidence: number;
  /** Controls with zero evidence records attached */
  controlsMissingEvidence: number;
  /** Controls where the latest evidence has expired */
  controlsWithExpiredEvidence: number;
  /** Controls where evidence expires within the warning window */
  controlsWithExpiringEvidence: number;
  /** Detailed gap items for each control with a gap */
  gaps: GapItem[];
  /** LLM-generated or assembled human-readable summary */
  summary: string;
  /** ISO timestamp of when this analysis was performed */
  analyzedAt: string;
}

export type GapType = 'missing' | 'expired' | 'expiring_soon';

export interface GapItem {
  /** The client control's database ID */
  controlId: number;
  /** Human-readable control name */
  controlName: string;
  /** Control code (e.g. "NIST-CSF-2.0-PR.AC-1") */
  controlCode: string;
  /** Classification of the gap */
  gapType: GapType;
  /** Current status of the clientControl */
  status: string;
  /** Date of the most recent evidence, if any */
  lastEvidenceDate?: string;
  /** Days since the most recent evidence was collected */
  daysSinceLastEvidence?: number;
  /** Days until the most recent evidence expires (negative = already expired) */
  daysUntilExpiry?: number;
  /** LLM-generated remediation or recommendation text */
  recommendedAction: string;
}

interface EvidenceRecord {
  id: number;
  clientControlId: number;
  status: string;
  collectedAt: string;
  expiresAt: string | null;
  artifactType: string;
  artifactData: Record<string, unknown>;
}

interface ClientControlRecord {
  id: number;
  clientId: number;
  controlId: number;
  controlName: string;
  controlCode: string;
  status: string;
  frameworkId: number;
  frameworkSlug: string;
}

/**
 * Perform a full evidence gap analysis for a single client.
 */
export async function analyzeEvidenceGaps(
  db: {
    query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
    findMany: (table: string, where?: Record<string, unknown>) => Promise<unknown[]>;
    execute: (sql: string, params?: unknown[]) => Promise<void>;
  },
  clientId: number,
  options: {
    minEvidenceAge?: number;
    llmProvider?: string;
    callLlm?: (prompt: string, provider?: string) => Promise<string>;
  } = {},
): Promise<GapAnalysisResult> {
  const minEvidenceAge = options.minEvidenceAge ?? 90;
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + minEvidenceAge * 24 * 60 * 60 * 1000);

  // 1. Fetch all clientControls for this client
  const clientControls = (await db.findMany('clientControls', {
    clientId,
  })) as ClientControlRecord[];

  if (clientControls.length === 0) {
    return {
      totalControls: 0,
      controlsWithEvidence: 0,
      controlsMissingEvidence: 0,
      controlsWithExpiredEvidence: 0,
      controlsWithExpiringEvidence: 0,
      gaps: [],
      summary: 'No controls found for this client.',
      analyzedAt: now.toISOString(),
    };
  }

  // 2. Fetch all evidence for these controls
  const controlIds = clientControls.map((c) => c.id);
  const allEvidence = (await db.query(
    'SELECT * FROM evidence WHERE client_id = $1 AND client_control_id = ANY($2::int[]) ORDER BY client_control_id, collected_at DESC',
    [clientId, controlIds],
  )) as EvidenceRecord[];

  // Group evidence by clientControlId (latest first)
  const evidenceByControl = new Map<number, EvidenceRecord[]>();
  for (const ev of allEvidence) {
    const list = evidenceByControl.get(ev.clientControlId) ?? [];
    list.push(ev);
    evidenceByControl.set(ev.clientControlId, list);
  }

  // 3. Categorize each control
  const gaps: GapItem[] = [];
  let controlsWithEvidence = 0;
  let controlsMissingEvidence = 0;
  let controlsWithExpiredEvidence = 0;
  let controlsWithExpiringEvidence = 0;

  for (const ctrl of clientControls) {
    const evidenceList = evidenceByControl.get(ctrl.id) ?? [];
    const validEvidence = evidenceList.filter(
      (e) => e.status === 'collected' || e.status === 'verified',
    );

    if (validEvidence.length === 0) {
      controlsMissingEvidence++;
      gaps.push({
        controlId: ctrl.id,
        controlName: ctrl.controlName,
        controlCode: ctrl.controlCode,
        gapType: 'missing',
        status: ctrl.status,
        lastEvidenceDate: undefined,
        daysSinceLastEvidence: undefined,
        recommendedAction: 'No evidence has been collected. Create an evidence request and schedule collection.',
      });
      continue;
    }

    const latest = validEvidence[0];
    const collectedAt = new Date(latest.collectedAt);
    const daysSince = Math.floor((now.getTime() - collectedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (latest.expiresAt) {
      const expiresAt = new Date(latest.expiresAt);

      if (expiresAt <= now) {
        controlsWithExpiredEvidence++;
        const expiryStr = expiresAt.toISOString().split('T')[0];
        gaps.push({
          controlId: ctrl.id,
          controlName: ctrl.controlName,
          controlCode: ctrl.controlCode,
          gapType: 'expired',
          status: ctrl.status,
          lastEvidenceDate: latest.collectedAt,
          daysSinceLastEvidence: daysSince,
          daysUntilExpiry: Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          recommendedAction: 'Evidence expired on ' + expiryStr + '. Re-collect fresh evidence for this control.',
        });
        continue;
      }

      if (expiresAt <= warningThreshold) {
        controlsWithExpiringEvidence++;
        const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const expiryStr = expiresAt.toISOString().split('T')[0];
        gaps.push({
          controlId: ctrl.id,
          controlName: ctrl.controlName,
          controlCode: ctrl.controlCode,
          gapType: 'expiring_soon',
          status: ctrl.status,
          lastEvidenceDate: latest.collectedAt,
          daysSinceLastEvidence: daysSince,
          daysUntilExpiry: daysLeft,
          recommendedAction: 'Evidence expires in ' + daysLeft + ' day(s) on ' + expiryStr + '. Schedule re-collection proactively.',
        });
        continue;
      }
    }

    controlsWithEvidence++;
  }

  // 4. Generate summary (optionally via LLM)
  let summary = assembleSummary({
    totalControls: clientControls.length,
    controlsWithEvidence,
    controlsMissingEvidence,
    controlsWithExpiredEvidence,
    controlsWithExpiringEvidence,
    gaps,
  });

  if (options.callLlm && gaps.length > 0) {
    try {
      const llmSummary = await options.callLlm(
        buildLlmPrompt({
          clientId,
          totalControls: clientControls.length,
          controlsWithEvidence,
          controlsMissingEvidence,
          controlsWithExpiredEvidence,
          controlsWithExpiringEvidence,
          gaps: gaps.slice(0, 20),
        }),
        options.llmProvider,
      );
      if (llmSummary) {
        summary = llmSummary;
      }
    } catch (err) {
      console.error('[EvidenceGapDetector] LLM summary generation failed:', err);
    }
  }

  return {
    totalControls: clientControls.length,
    controlsWithEvidence,
    controlsMissingEvidence,
    controlsWithExpiredEvidence,
    controlsWithExpiringEvidence,
    gaps,
    summary,
    analyzedAt: now.toISOString(),
  };
}

function assembleSummary(stats: {
  totalControls: number;
  controlsWithEvidence: number;
  controlsMissingEvidence: number;
  controlsWithExpiredEvidence: number;
  controlsWithExpiringEvidence: number;
  gaps: GapItem[];
}): string {
  const totalGaps = stats.gaps.length;
  const pctCoverage =
    stats.totalControls > 0
      ? Math.round((stats.controlsWithEvidence / stats.totalControls) * 100)
      : 0;

  const lines: string[] = [
    'Evidence Gap Analysis Report',
    '--------------------------',
    'Total controls assessed: ' + stats.totalControls,
    'Controls with valid evidence: ' + stats.controlsWithEvidence + ' (' + pctCoverage + '%)',
    'Controls missing evidence: ' + stats.controlsMissingEvidence,
    'Controls with expired evidence: ' + stats.controlsWithExpiredEvidence,
    'Controls with expiring evidence: ' + stats.controlsWithExpiringEvidence,
    'Total gaps identified: ' + totalGaps,
    '',
  ];

  if (totalGaps === 0) {
    lines.push('All controls have valid, non-expiring evidence. No gaps detected.');
  } else {
    lines.push('Action required:');
    if (stats.controlsMissingEvidence > 0) {
      lines.push('  * ' + stats.controlsMissingEvidence + ' control(s) have no evidence at all - create evidence requests immediately.');
    }
    if (stats.controlsWithExpiredEvidence > 0) {
      lines.push('  * ' + stats.controlsWithExpiredEvidence + ' control(s) have expired evidence - re-collection is overdue.');
    }
    if (stats.controlsWithExpiringEvidence > 0) {
      lines.push('  * ' + stats.controlsWithExpiringEvidence + ' control(s) have evidence expiring soon - schedule re-collection proactively.');
    }
  }

  return lines.join('\n');
}

function buildLlmPrompt(context: {
  clientId: number;
  totalControls: number;
  controlsWithEvidence: number;
  controlsMissingEvidence: number;
  controlsWithExpiredEvidence: number;
  controlsWithExpiringEvidence: number;
  gaps: GapItem[];
}): string {
  const gapLines = context.gaps.map(function(g: GapItem) {
    let parts = '[' + g.gapType.toUpperCase() + '] ' + g.controlCode + ' - ' + g.controlName + ' (status: ' + g.status + ')';
    if (g.daysSinceLastEvidence !== undefined) parts += ', last evidence ' + g.daysSinceLastEvidence + ' days ago';
    if (g.daysUntilExpiry !== undefined) parts += ', expires in ' + g.daysUntilExpiry + ' days';
    return parts;
  });

  return 'You are a compliance evidence gap analysis assistant. Analyze the following data and produce a concise, actionable summary.\n\n'
    + 'CLIENT ID: ' + context.clientId + '\n\n'
    + 'OVERVIEW:\n'
    + '- Total controls: ' + context.totalControls + '\n'
    + '- With valid evidence: ' + context.controlsWithEvidence + '\n'
    + '- Missing evidence: ' + context.controlsMissingEvidence + '\n'
    + '- Expired evidence: ' + context.controlsWithExpiredEvidence + '\n'
    + '- Expiring soon: ' + context.controlsWithExpiringEvidence + '\n\n'
    + 'GAPS (' + context.gaps.length + ' total):\n'
    + gapLines.join('\n') + '\n\n'
    + 'Provide:\n'
    + '1. A brief summary of the overall evidence health (1-2 sentences)\n'
    + '2. Top 3 priorities for evidence collection\n'
    + '3. A risk assessment: low / medium / high based on gap severity and count\n'
    + '4. Recommended next steps (bullet points)';
}
