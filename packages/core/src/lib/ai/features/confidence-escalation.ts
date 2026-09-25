/**
 * Confidence-Escalation Loop — Smart human review routing.
 *
 * The core differentiator: every AI output is scored by confidence.
 * - High confidence (≥ threshold): auto-execute, no human needed
 * - Medium confidence: suggest + one-click approve
 * - Low confidence (< threshold): full human review required
 *
 * This module wraps any AI feature call and applies the escalation logic,
 * dramatically reducing the human review burden.
 */

import { withExternalAi, type ExternalAiCallResult, type GatekeeperCheck } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { aiFeatureToggles } from "../../../schema/ai-features";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EscalationLevel = "auto_execute" | "suggest" | "human_review";

export interface EscalationDecision {
  level: EscalationLevel;
  confidence: number;
  threshold: number;
  reasoning: string;
  actionRequired: string;
  autoExecutable: boolean;
  reviewReason?: string;
}

export interface ConfidenceEscalationResult<T> {
  data?: T;
  escalation: EscalationDecision;
  rawResult: ExternalAiCallResult<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Load per-client confidence threshold for a feature
// ─────────────────────────────────────────────────────────────────────────────

async function getConfidenceThreshold(clientId: number, featureId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 70;

  const toggles = await db.select().from(aiFeatureToggles).where(
    and(eq(aiFeatureToggles.clientId, clientId), eq(aiFeatureToggles.featureId, featureId as any))
  ).limit(1);

  return toggles[0]?.confidenceThreshold ?? 70;
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply escalation logic to any confidence score
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateEscalation(
  confidence: number,
  threshold: number,
  context?: { featureId?: string; entityType?: string; entityId?: number }
): EscalationDecision {
  if (confidence >= threshold + 15) {
    // Well above threshold → auto-execute
    return {
      level: "auto_execute",
      confidence,
      threshold,
      reasoning: `Confidence ${confidence}% is well above the ${threshold}% threshold. Safe to auto-execute.`,
      actionRequired: "No action required. Result has been applied automatically.",
      autoExecutable: true,
    };
  } else if (confidence >= threshold) {
    // At or slightly above threshold → suggest
    return {
      level: "suggest",
      confidence,
      threshold,
      reasoning: `Confidence ${confidence}% meets the ${threshold}% threshold. Suggest for quick approval.`,
      actionRequired: "Review suggestion and approve with one click.",
      autoExecutable: false,
    };
  } else {
    // Below threshold → human review
    return {
      level: "human_review",
      confidence,
      threshold,
      reasoning: `Confidence ${confidence}% is below the ${threshold}% threshold. Human review recommended.`,
      actionRequired: "Full human review required before this result can be applied.",
      autoExecutable: false,
      reviewReason: `Low confidence (${confidence}% < ${threshold}% threshold)${context?.featureId ? ` for ${context.featureId}` : ""}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Execute with escalation — wrapper for any AI feature
// ─────────────────────────────────────────────────────────────────────────────

export async function executeWithEscalation<T>(
  clientId: number,
  featureId: string,
  data: any,
  aiCallFn: (sanitizedData: any, jevConfig: any) => Promise<T>,
  options?: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    overrideThreshold?: number;
    autoExecuteFn?: (result: T) => Promise<void>;
  }
): Promise<ConfidenceEscalationResult<T>> {
  const threshold = options?.overrideThreshold ?? await getConfidenceThreshold(clientId, featureId);

  const result = await withExternalAi(
    {
      clientId,
      featureId: featureId as any,
      userId: options?.userId,
      entityType: options?.entityType,
      entityId: options?.entityId,
      data,
      provider: "jevai",
    },
    aiCallFn
  );

  // If not sent (blocked by gatekeeper), return with escalation info
  if (!result.sent && !result.dryRun) {
    return {
      escalation: {
        level: "human_review",
        confidence: 0,
        threshold,
        reasoning: `External AI call blocked: ${result.error}`,
        actionRequired: "AI feature is not available. Manual review required.",
        autoExecutable: false,
        reviewReason: result.error,
      },
      rawResult: result,
    };
  }

  // If dry-run, return without auto-executing
  if (result.dryRun) {
    return {
      escalation: {
        level: "human_review",
        confidence: 0,
        threshold,
        reasoning: "Dry-run mode — no external AI call was made.",
        actionRequired: "Enable external AI to get confidence-scored results.",
        autoExecutable: false,
        reviewReason: "Dry-run mode",
      },
      rawResult: result,
    };
  }

  // If we have a response, evaluate confidence
  if (result.response) {
    const confidence = result.confidenceScore ?? 50;
    const escalation = evaluateEscalation(confidence, threshold, {
      featureId,
      entityType: options?.entityType,
      entityId: options?.entityId,
    });

    // Auto-execute if appropriate
    if (escalation.autoExecutable && options?.autoExecuteFn) {
      try {
        await options.autoExecuteFn(result.response);
        escalation.actionRequired = "Result was applied automatically.";
      } catch (err: any) {
        escalation.level = "human_review";
        escalation.autoExecutable = false;
        escalation.actionRequired = `Auto-execution failed: ${err.message}. Manual review required.`;
      }
    }

    return {
      data: result.response,
      escalation,
      rawResult: result,
    };
  }

  // No response
  return {
    escalation: {
      level: "human_review",
      confidence: 0,
      threshold,
      reasoning: result.error || "No response from AI provider",
      actionRequired: "Manual review required.",
      autoExecutable: false,
      reviewReason: result.error,
    },
    rawResult: result,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary helper — get escalation stats for a client
// ─────────────────────────────────────────────────────────────────────────────

export async function getEscalationStats(clientId: number): Promise<{
  totalCalls: number;
  autoExecuted: number;
  suggested: number;
  humanReview: number;
  humanReviewReduction: number;
}> {
  const db = await getDb();
  if (!db) return { totalCalls: 0, autoExecuted: 0, suggested: 0, humanReview: 0, humanReviewReduction: 0 };

  // This would aggregate from aiAuditLog in a real implementation
  // For now, return placeholder
  return {
    totalCalls: 0,
    autoExecuted: 0,
    suggested: 0,
    humanReview: 0,
    humanReviewReduction: 0,
  };
}
