/**
 * AI Evidence Gap Detector — Addon Implementation
 *
 * This addon periodically scans a client's controls and their associated evidence
 * to identify gaps: controls missing evidence, controls with expired evidence,
 * and controls with evidence about to expire.
 *
 * For each gap, it optionally:
 * 1. Calls an LLM to generate a recommended action
 * 2. Creates evidence requests (if autoCreateRequests is enabled)
 * 3. Pushes a summary report as an evidence artifact
 */
import { AddonExecutor } from '../runtime/executor';
import { FindingsPusher } from '../runtime/pusher';
import type { AddonRunConfig, NormalizedFinding } from '../shared/types';
import { analyzeEvidenceGaps } from './analyzer';

export interface EvidenceGapDetectorSettings {
  schedule: 'daily' | 'weekly' | 'manual';
  llmProvider: 'deepseek' | 'qwen' | 'openai';
  autoCreateRequests: boolean;
  minEvidenceAge: number;
}

export function defaultEvidenceGapDetectorSettings(): EvidenceGapDetectorSettings {
  return {
    schedule: 'daily',
    llmProvider: 'deepseek',
    autoCreateRequests: true,
    minEvidenceAge: 90,
  };
}

/**
 * Register the evidence-gap-detector addon handler with the executor.
 * Called once at application startup.
 */
export function registerEvidenceGapDetector(
  executor: AddonExecutor,
  pusher: FindingsPusher,
): void {
  executor.register('evidence-gap-detector', async (config: AddonRunConfig) => {
    const settings = config.settings as unknown as EvidenceGapDetectorSettings;
    const startTime = Date.now();

    console.log(
      '[EvidenceGapDetector] Starting gap analysis for client ' + config.clientId,
    );

    // Get DB adapter from executor (injected by core app at registration time)
    const db = (executor as any).db;
    if (!db) {
      throw new Error(
        'No database adapter available. The Evidence Gap Detector requires a DbAdapter to be set on the executor.',
      );
    }

    const analysis = await analyzeEvidenceGaps(
      db,
      config.clientId,
      {
        minEvidenceAge: settings.minEvidenceAge ?? 90,
        llmProvider: settings.llmProvider ?? 'deepseek',
        callLlm: async (prompt: string, provider?: string) => {
          const { llmBridge } = await import('../shared/llm-bridge');
          return llmBridge.generateText(prompt, {
            systemPrompt: 'You are a compliance evidence gap analysis assistant. Analyze the following evidence status and provide a concise, actionable recommendation.',
            provider,
          });
        },
      },
    );

    const findings: NormalizedFinding[] = [];
    let riskCount = 0;

    // 2. Create evidence requests for gaps (optional)
    if (settings.autoCreateRequests !== false && analysis.gaps.length > 0) {
      console.log(
        '[EvidenceGapDetector] Creating ' + analysis.gaps.length + ' evidence request(s) for client ' + config.clientId,
      );

      for (const gap of analysis.gaps) {
        try {
          pusher.pushEvidence({
            clientId: config.clientId,
            title: 'Evidence Request: ' + gap.controlCode + ' - ' + gap.gapType.replace('_', ' '),
            artifactType: 'evidence_request',
            artifactData: {
              controlId: gap.controlId,
              controlName: gap.controlName,
              controlCode: gap.controlCode,
              gapType: gap.gapType,
              recommendedAction: gap.recommendedAction,
              requestedAt: new Date().toISOString(),
              priority: gap.gapType === 'missing' || gap.gapType === 'expired' ? 'high' : 'medium',
            },
            source: 'evidence-gap-detector',
          });

          findings.push({
            title: 'Evidence Gap: ' + gap.controlCode,
            severity: gap.gapType === 'missing' || gap.gapType === 'expired' ? 'high' : 'medium',
            description: gap.controlName + ' - ' + gap.recommendedAction,
            frameworkMappings: [gap.controlCode],
            resourceId: String(gap.controlId),
            remediation: gap.recommendedAction,
            rawEvidence: {
              controlId: gap.controlId,
              controlCode: gap.controlCode,
              gapType: gap.gapType,
              lastEvidenceDate: gap.lastEvidenceDate,
              daysSinceLastEvidence: gap.daysSinceLastEvidence,
              daysUntilExpiry: gap.daysUntilExpiry,
            },
          });
          riskCount++;
        } catch (err) {
          console.error(
            '[EvidenceGapDetector] Failed to create evidence request for gap ' + gap.controlId + ':', err,
          );
        }
      }
    }

    // 3. Push the summary report as an evidence artifact
    pusher.pushEvidence({
      clientId: config.clientId,
      title: 'Evidence Gap Analysis Report - ' + new Date().toISOString().split('T')[0],
      artifactType: 'gap_analysis_report',
      artifactData: {
        totalControls: analysis.totalControls,
        controlsWithEvidence: analysis.controlsWithEvidence,
        controlsMissingEvidence: analysis.controlsMissingEvidence,
        controlsWithExpiredEvidence: analysis.controlsWithExpiredEvidence,
        controlsWithExpiringEvidence: analysis.controlsWithExpiringEvidence,
        totalGaps: analysis.gaps.length,
        summary: analysis.summary,
        analyzedAt: analysis.analyzedAt,
        llmProvider: settings.llmProvider,
        autoCreateRequests: settings.autoCreateRequests,
      },
      source: 'evidence-gap-detector',
    });

    // 4. Flush everything to the database
    const flushResult = await pusher.flush();
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log(
      '[EvidenceGapDetector] Completed for client ' + config.clientId + '. ' +
      'Gaps: ' + analysis.gaps.length + ', ' +
      'Evidence requests created: ' + flushResult.evidencePushed + ', ' +
      'Duration: ' + elapsed + 's',
    );

    return {
      findings,
      summary: {
        total: analysis.totalControls,
        passed: analysis.controlsWithEvidence,
        failed: analysis.gaps.length,
        errors: analysis.controlsWithExpiredEvidence,
      },
      evidenceArtifacts: [
        {
          type: 'gap_analysis_report',
          data: {
            clientId: config.clientId,
            analyzedAt: analysis.analyzedAt,
            totalControls: analysis.totalControls,
            controlsWithEvidence: analysis.controlsWithEvidence,
            controlsMissingEvidence: analysis.controlsMissingEvidence,
            controlsWithExpiredEvidence: analysis.controlsWithExpiredEvidence,
            controlsWithExpiringEvidence: analysis.controlsWithExpiringEvidence,
            totalGaps: analysis.gaps.length,
            summary: analysis.summary,
            gapsCreated: riskCount,
          },
        },
      ],
      durationSeconds: elapsed,
    };
  });
}
