/**
 * Questionnaires — data contract + hooks
 * ======================================
 * UI-side typed view of the `questionnaire.*` tRPC procedures in
 * `packages/core/src/server/routers/questionnaire.ts` (registered as
 * `questionnaire:` on the AppRouter in `packages/core/src/routers.ts`).
 * Types mirror the shapes returned by
 * `packages/core/src/lib/questionnaire/questionnaireScoring.ts`.
 *
 * COORDINATION BY CONVENTION — if the procedures are not live yet the tRPC
 * HTTP call 404s and the query surfaces an error; every consumer in the UI
 * degrades to a graceful EmptyState / dash.
 *
 * ---------------------------------------------------------------------------
 * Procedures:
 *
 * 1) questionnaire.score
 *    input:  { id: number | string }
 *    output: { questionnaireId: number; score: QuestionnaireScore; summary: ScoreSummary }
 *            Never throws on read — on DB failure the backend returns an empty
 *            score (readiness "No Data"); unknown id returns null.
 *
 * 2) questionnaire.scoreAnswers
 *    input:  { questions: QuestionnaireAnswer[] }
 *    output: { score: QuestionnaireScore; summary: ScoreSummary }
 *            Pure passthrough (no DB), never throws.
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";
import { Progress } from "@complianceos/ui/ui/progress";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export type AnswerClassification = "pass" | "partial" | "fail" | "neutral" | "unanswered";
export type Readiness = "Strong" | "Developing" | "At Risk" | "No Data";
export type ScoreTone = "positive" | "warning" | "danger" | "neutral";

export interface QuestionnaireAnswer {
  questionId: string;
  question?: string | null;
  focusArea?: string | null;
  subFocusArea?: string | null;
  answer?: string | null;
  status?: string | null;
}

export interface FocusAreaScore {
  focusArea: string;
  total: number;
  answered: number;
  passed: number;
  partial: number;
  failed: number;
  neutral: number;
  score: number;
}

/** 0–100 integers; higher complianceScore = stronger posture. */
export interface QuestionnaireScore {
  total: number;
  answered: number;
  unanswered: number;
  passed: number;
  partial: number;
  failed: number;
  neutral: number;
  completionRate: number;
  complianceScore: number;
  focusAreas: FocusAreaScore[];
  readiness: Readiness | string;
}

export interface ScoreSummary {
  label: string;
  tone: ScoreTone | string;
  description: string;
}

export interface QuestionnaireScoreResponse {
  questionnaireId: number;
  score: QuestionnaireScore;
  summary: ScoreSummary;
}

export interface ScoreAnswersResponse {
  score: QuestionnaireScore;
  summary: ScoreSummary;
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query/mutation result shapes (runtime is a superset) */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface QuestionnaireTrpc {
  questionnaire: {
    score: {
      useQuery: (
        input: { id: number | string },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<QuestionnaireScoreResponse | null>;
    };
    scoreAnswers: {
      useQuery: (
        input: { questions: QuestionnaireAnswer[] },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<ScoreAnswersResponse>;
    };
  };
}

const questionnaireApi = trpc as unknown as QuestionnaireTrpc;

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
export function useQuestionnaireScore(id: number | string | null | undefined) {
  return questionnaireApi.questionnaire.score.useQuery(
    { id: id as number | string },
    {
      enabled: id !== null && id !== undefined && id !== "" && id !== "0" && id !== 0,
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
  return questionnaireApi.questionnaire.scoreAnswers.useQuery(
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
