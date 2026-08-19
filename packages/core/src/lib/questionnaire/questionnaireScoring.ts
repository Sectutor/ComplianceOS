/**
 * Deterministic questionnaire auto-scoring engine.
 *
 * Pure functions only: no I/O, no throws. Used by the `questionnaire.score`
 * and `questionnaire.scoreAnswers` tRPC procedures and unit tests.
 */

export type QuestionnaireAnswer = {
  questionId: string;
  question?: string | null;
  focusArea?: string | null;
  subFocusArea?: string | null;
  answer?: string | null;
  status?: string | null;
};

export type AnswerClassification = "pass" | "partial" | "fail" | "neutral" | "unanswered";

export type FocusAreaScore = {
  focusArea: string;
  total: number;
  answered: number;
  passed: number;
  partial: number;
  failed: number;
  neutral: number;
  score: number; // 0-100 integer, (passed + 0.5*partial)/answered rounded; 0 when answered 0
};

export type ReadinessLevel = "Strong" | "Developing" | "At Risk" | "No Data";

export type QuestionnaireScore = {
  total: number;
  answered: number;
  unanswered: number;
  passed: number;
  partial: number;
  failed: number;
  neutral: number;
  completionRate: number; // 0-100 integer, answered/total (0 when total 0)
  complianceScore: number; // 0-100 integer, (passed + 0.5*partial)/answered rounded; 0 when answered 0
  focusAreas: FocusAreaScore[]; // sorted alphabetically; "Uncategorized" bucket for null/empty focusArea
  readiness: ReadinessLevel;
};

export type ScoreSummary = {
  label: string;
  tone: "positive" | "warning" | "danger" | "neutral";
  description: string;
};

// --- classification helpers -------------------------------------------------

const RE_NEUTRAL = /\b(na|n\/a|unknown|not\s+sure|not\s+applicable|not\s+known)\b/;

// "not <positive>" must be detected BEFORE the positive keywords ("implemented",
// "in place", "compliant", "enforced") so "not implemented" is a fail, not a pass.
const RE_FAIL_NOT_POSITIVE = /\bnot\s+(implemented|in\s+place|compliant|enforced|present|deployed|configured|available|met|addressed|covered)\b/;

const RE_PARTIAL = /\b(partial|partially|somewhat|sometimes|in\s+progress)\b/;

const RE_PASS = /\b(yes|y|true|pass|always|enforced|compliant|implemented|in\s+place|1)\b/;

const RE_FAIL = /\b(no|false|never|none|zero|0|absent|not)\b/;

/**
 * Classify a single answer into pass / partial / fail / neutral / unanswered.
 *
 * Rules (checked in order):
 * 1. `status` overrides: "passed" => pass, "failed" => fail.
 * 2. Empty / null / undefined answer text => unanswered (unless status said otherwise).
 * 3. Neutral phrases: n/a, na, unknown, not sure, not applicable, not known.
 * 4. "not <positive-word>" phrases => fail (e.g. "not implemented").
 * 5. Partial phrases: partial(ly), somewhat, sometimes, in progress.
 * 6. Affirmative keywords: yes, y, true, pass, always, enforced, compliant,
 *    implemented, in place, 1.
 * 7. Negative keywords: no, false, never, none, zero, 0, absent, not.
 * 8. Any other non-empty free text => neutral (answered but neither pass nor fail).
 */
export function classifyAnswer(answer: string | null | undefined, status?: string | null): AnswerClassification {
  const text = (answer ?? "").trim().toLowerCase();
  const st = (status ?? "").trim().toLowerCase();

  if (st === "passed") return "pass";
  if (st === "failed") return "fail";

  if (text.length === 0) return "unanswered";

  if (RE_NEUTRAL.test(text)) return "neutral";
  if (RE_FAIL_NOT_POSITIVE.test(text)) return "fail";
  if (RE_PARTIAL.test(text)) return "partial";
  if (RE_PASS.test(text)) return "pass";
  if (RE_FAIL.test(text)) return "fail";

  return "neutral";
}

function areaScore(area: { passed: number; partial: number; answered: number }): number {
  if (area.answered === 0) return 0;
  return Math.round(((area.passed + 0.5 * area.partial) / area.answered) * 100);
}

/**
 * Score a list of answers. Never throws; an empty/invalid input yields a
 * zeroed score with readiness "No Data".
 */
export function scoreQuestionnaire(questions: QuestionnaireAnswer[]): QuestionnaireScore {
  const safe = Array.isArray(questions) ? questions : [];

  const byArea = new Map<string, FocusAreaScore>();

  let total = 0;
  let answered = 0;
  let passed = 0;
  let partial = 0;
  let failed = 0;
  let neutral = 0;

  for (const q of safe) {
    if (!q || typeof q !== "object") continue;
    total++;

    const focusAreaName = (q.focusArea ?? "").trim() || "Uncategorized";
    let area = byArea.get(focusAreaName);
    if (!area) {
      area = {
        focusArea: focusAreaName,
        total: 0,
        answered: 0,
        passed: 0,
        partial: 0,
        failed: 0,
        neutral: 0,
        score: 0,
      };
      byArea.set(focusAreaName, area);
    }
    area.total++;

    const cls = classifyAnswer(q.answer ?? null, q.status ?? null);
    switch (cls) {
      case "pass":
        answered++;
        passed++;
        area.answered++;
        area.passed++;
        break;
      case "partial":
        answered++;
        partial++;
        area.answered++;
        area.partial++;
        break;
      case "fail":
        answered++;
        failed++;
        area.answered++;
        area.failed++;
        break;
      case "neutral":
        answered++;
        neutral++;
        area.answered++;
        area.neutral++;
        break;
      case "unanswered":
        break;
    }
  }

  const complianceScore = answered > 0 ? Math.round(((passed + 0.5 * partial) / answered) * 100) : 0;
  const completionRate = total > 0 ? Math.round((answered / total) * 100) : 0;

  const focusAreas: FocusAreaScore[] = Array.from(byArea.values())
    .sort((a, b) => a.focusArea.localeCompare(b.focusArea))
    .map((a) => ({ ...a, score: areaScore(a) }));

  let readiness: ReadinessLevel;
  if (answered === 0) {
    readiness = "No Data";
  } else if (complianceScore >= 80) {
    readiness = "Strong";
  } else if (complianceScore >= 50) {
    readiness = "Developing";
  } else {
    readiness = "At Risk";
  }

  return {
    total,
    answered,
    unanswered: total - answered,
    passed,
    partial,
    failed,
    neutral,
    completionRate,
    complianceScore,
    focusAreas,
    readiness,
  };
}

/**
 * Human-readable summary of a computed score.
 */
export function summarizeScore(score: QuestionnaireScore): ScoreSummary {
  const safe = score && typeof score === "object" ? score : ({} as QuestionnaireScore);
  const complianceScore = typeof safe.complianceScore === "number" ? safe.complianceScore : 0;
  const answered = typeof safe.answered === "number" ? safe.answered : 0;

  switch (safe.readiness) {
    case "Strong":
      return {
        label: "Strong",
        tone: "positive",
        description: `Your compliance posture is strong (${complianceScore}% across ${answered} answered item${answered === 1 ? "" : "s"}). Continue monitoring controls and re-assess regularly to sustain readiness.`,
      };
    case "Developing":
      return {
        label: "Developing",
        tone: "warning",
        description: `Your compliance posture is developing (${complianceScore}%). Close gaps on partial and unanswered controls to move toward a Strong rating.`,
      };
    case "At Risk":
      return {
        label: "At Risk",
        tone: "danger",
        description: `Your compliance posture is at risk (${complianceScore}%). Prioritize remediation of failed controls and verify answered items to improve your score.`,
      };
    case "No Data":
    default:
      return {
        label: "No Data",
        tone: "neutral",
        description: "No answered questions yet. Complete the questionnaire to generate a compliance score.",
      };
  }
}
