/**
 * Questionnaires — data contract + hooks
 * ======================================
 * UI-side hooks over the `questionnaire.*` tRPC procedures in
 * `packages/core/src/server/routers/questionnaire.ts` (registered as
 * `questionnaire:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * Hooks call tRPC DIRECTLY (inferred types — no hand-written casts) so that
 * procedure drift between frontend and backend is a compile error, not a
 * runtime 404.
 *
 * Graceful degradation: score reads never throw server-side (DB failure =>
 * empty "No Data" score; unknown id => null); consumers render a dash.
 */

import { trpc } from "@/lib/trpc";
import {
  type QuestionnaireAnswer,
  type QuestionnaireScore,
  type ScoreSummary,
  type ReadinessLevel,
} from "../../lib/questionnaire/questionnaireScoring";

/* ------------------------------------------------------------------ */
/* Types (re-exported from the scoring engine — single source of truth)*/
/* ------------------------------------------------------------------ */

export type AnswerClassification =
  | "pass"
  | "partial"
  | "fail"
  | "neutral"
  | "unanswered";
export type Readiness = ReadinessLevel;
export type ScoreTone = "positive" | "warning" | "danger" | "neutral";
export type { QuestionnaireAnswer, QuestionnaireScore, ScoreSummary };

export interface QuestionnaireScoreResponse {
  questionnaireId: number;
  score: QuestionnaireScore;
  summary: ScoreSummary;
}

export interface ScoreAnswersResponse {
  score: QuestionnaireScore;
  summary: ScoreSummary;
}

export interface BatchedScoreItem extends QuestionnaireScoreResponse {}

/* ------------------------------------------------------------------ */
/* Readiness / tone helpers (token-safe, dark-mode friendly)          */
/* ------------------------------------------------------------------ */

/** Human label + semantic tone for a readiness level. */
export function getReadinessMeta(readiness: Readiness | string | undefined | null): { label: string; tone: ScoreTone } {
  switch (readiness) {
    case "Strong":
      return { label: "Strong", tone: "positive" };
    case "Developing":
      return { label: "Developing", tone: "warning" };
    case "At Risk":
      return { label: "At Risk", tone: "danger" };
    case "No Data":
    default:
      return { label: readiness || "No Data", tone: "neutral" };
  }
}

/** Tailwind badge classes per tone (matches existing page palette). */
export function getScoreToneClass(tone: ScoreTone | string | undefined): string {
  switch (tone) {
    case "positive":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    case "danger":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
    case "neutral":
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Tailwind bar color per tone. */
export function getScoreBarClass(tone: ScoreTone | string | null | undefined): string {
  switch (tone) {
    case "positive":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-rose-500";
    case "neutral":
    default:
      return "bg-muted-foreground/50";
  }
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Per-questionnaire readiness score. Gracefully degrades: loading => no
 * data yet, error or null => caller shows a dash / EmptyState.
 */
export function useQuestionnaireScore(id: number | string | null | undefined, clientId?: number) {
  return trpc.questionnaire.score.useQuery(
    { id: id as number | string, clientId },
    {
      enabled: id !== null && id !== undefined && id !== "" && id !== "0" && id !== 0,
      retry: false,
      staleTime: 15_000,
    }
  );
}

/**
 * Batched readiness scores for a list view — one round-trip instead of one
 * per row. Disabled until there is a tenant.
 */
export function useQuestionnaireScoresBatch(
  input: { clientId?: number; direction?: "inbound" | "outbound"; ids?: number[] },
  opts?: { enabled?: boolean }
) {
  return trpc.questionnaire.scoreAll.useQuery(
    { clientId: input.clientId, direction: input.direction, ids: input.ids },
    {
      enabled: opts?.enabled ?? (input.clientId !== undefined || (input.ids?.length ?? 0) > 0),
      retry: false,
      staleTime: 15_000,
    }
  );
}

/**
 * Live score for a set of answers (used in the workspace review step).
 * Pure passthrough — no DB round-trip beyond the tRPC call. Disabled until
 * there is at least one question so we never score an empty set.
 */
export function useQuestionnaireAnswersScore(answers: QuestionnaireAnswer[] | any[] | undefined | null) {
  const safeAnswers = Array.isArray(answers)
    ? answers.map((a) => ({
        questionId: a?.questionId ?? "",
        question: a?.question ?? null,
        focusArea: a?.focusArea ?? null,
        subFocusArea: a?.subFocusArea ?? null,
        answer: a?.answer ?? null,
        status: a?.status ?? null,
      }))
    : [];
  return trpc.questionnaire.scoreAnswers.useQuery(
    { questions: safeAnswers },
    {
      enabled: safeAnswers.length > 0,
      retry: false,
      staleTime: 5_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Presentational bits (token-only, dark-mode safe)                    */
/* ------------------------------------------------------------------ */

/** Compact "82 · Strong" style badge. */
export function ScoreBadge({
  score,
  readiness,
  tone,
  className = "",
}: {
  score: number | null | undefined;
  readiness: Readiness | string | null | undefined;
  tone?: ScoreTone | string | null;
  className?: string;
}) {
  const meta = getReadinessMeta(readiness);
  const toneClass = getScoreToneClass(tone ?? meta.tone);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${toneClass} ${className}`}
      title={`${meta.label} readiness — ${score ?? 0}% compliance score`}
    >
      <span className="font-semibold tabular-nums">{score ?? 0}%</span>
      <span aria-hidden="true">·</span>
      <span>{meta.label}</span>
    </span>
  );
}

/** Small progress bar with tone-colored fill. */
export function ScoreProgress({ value, tone, className = "" }: { value: number; tone?: ScoreTone | string | null; className?: string }) {
  const barClass = getScoreBarClass(tone);
  const clamped = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`w-full bg-muted rounded-full h-2.5 overflow-hidden ${className}`}>
      <div className={`${barClass} h-2.5 rounded-full transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
