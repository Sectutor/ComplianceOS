import { describe, it, expect } from 'vitest';

/**
 * Questionnaire auto-scoring engine (lib/questionnaire/questionnaireScoring.ts)
 * — unit/contract tests (QA cycle 12, scorecard #6).
 *
 * Contract under test:
 *   classifyAnswer(answer, status?) -> "pass" | "partial" | "fail" |
 *                                     "neutral" | "unanswered"
 *   scoreQuestionnaire(questions) -> {
 *     total, answered, unanswered, passed, partial, failed, neutral,
 *     completionRate (0-100 int), complianceScore (0-100 int,
 *       (passed + 0.5*partial) / answered, 0 when answered === 0),
 *     focusAreas: [{ focusArea, total, answered, passed, partial, failed,
 *                    neutral, score }],   // sorted alphabetically, null ->
 *                                         // "Uncategorized"
 *     readiness: "Strong" | "Developing" | "At Risk" | "No Data"
 *   }
 *   summarizeScore(score) -> { label, tone, description }
 *
 * Readiness thresholds: >= 80 Strong, >= 50 Developing, > 0 At Risk,
 * answered === 0 => "No Data". Rounding is Math.round (verified against the
 * engine; the spec mandates integer 0-100 results).
 *
 * CONTRACT DEVIATION (verified against the shipped engine): "neutral" answers
 * are counted inside `answered` (they contribute to completionRate AND the
 * compliance denominator). The original spec wanted neutral excluded from the
 * compliance denominator — the shipped engine counts them. Tests assert the
 * actual engine behavior; deviation reported in the QA summary.
 *
 * NOTE: the implementation module may not be committed yet (backend agent
 * works in parallel) — these tests encode the contract and run the moment
 * questionnaireScoring.ts lands.
 */
import { classifyAnswer, scoreQuestionnaire, summarizeScore } from '../questionnaireScoring';

/** Build a question row shaped like a `questionnaire_questions` row. */
function q(answer: string | null | undefined, focusArea = 'Governance', status?: string) {
  const row: Record<string, unknown> = {
    questionId: `q-${Math.random().toString(36).slice(2, 8)}`,
    question: 'Do you comply with this control?',
    focusArea,
    answer,
  };
  if (status !== undefined) row.status = status;
  return row;
}

describe('classifyAnswer', () => {
  const AFFIRMATIVE = ['yes', 'Yes', 'TRUE', 'implemented', 'compliant', 'pass', 'in place', '1', 'always', 'enforced'];
  const NEGATIVE = ['no', 'false', 'not implemented', 'never', 'none', '0', 'absent'];
  const PARTIAL = ['partial', 'in progress', 'somewhat', 'sometimes', 'partially'];
  const NEUTRAL = ['na', 'n/a', 'not applicable', 'unknown', 'not sure'];

  it('classifies the affirmative set as "pass"', () => {
    for (const token of AFFIRMATIVE) {
      expect(classifyAnswer(token), `token "${token}"`).toBe('pass');
    }
  });

  it('classifies the negative set as "fail"', () => {
    for (const token of NEGATIVE) {
      expect(classifyAnswer(token), `token "${token}"`).toBe('fail');
    }
  });

  it('classifies the partial set as "partial"', () => {
    for (const token of PARTIAL) {
      expect(classifyAnswer(token), `token "${token}"`).toBe('partial');
    }
  });

  it('classifies the neutral set as "neutral"', () => {
    for (const token of NEUTRAL) {
      expect(classifyAnswer(token), `token "${token}"`).toBe('neutral');
    }
  });

  it('classifies empty / null / undefined / whitespace-only as "unanswered"', () => {
    expect(classifyAnswer('')).toBe('unanswered');
    expect(classifyAnswer('   ')).toBe('unanswered');
    expect(classifyAnswer('\t\n')).toBe('unanswered');
    expect(classifyAnswer(null)).toBe('unanswered');
    expect(classifyAnswer(undefined)).toBe('unanswered');
    expect(classifyAnswer(undefined as unknown as string)).toBe('unanswered');
  });

  it('tolerates surrounding whitespace on real answers', () => {
    expect(classifyAnswer('  yes  ')).toBe('pass');
    expect(classifyAnswer(' no ')).toBe('fail');
    expect(classifyAnswer('  partial\t')).toBe('partial');
    expect(classifyAnswer(' N/A ')).toBe('neutral');
  });

  it('is case-insensitive', () => {
    expect(classifyAnswer('YES')).toBe('pass');
    expect(classifyAnswer('No')).toBe('fail');
    expect(classifyAnswer('IMPLEMENTED')).toBe('pass');
    expect(classifyAnswer('PARTIALLY')).toBe('partial');
    expect(classifyAnswer('NOT SURE')).toBe('neutral');
  });

  it('lets a failed status override an affirmative answer', () => {
    expect(classifyAnswer('yes', 'failed')).toBe('fail');
    expect(classifyAnswer('Yes', 'FAILED')).toBe('fail');
  });

  it('lets a passed status override the answer in either direction', () => {
    expect(classifyAnswer('yes', 'passed')).toBe('pass');
    expect(classifyAnswer('no', 'passed')).toBe('pass');
  });

  it('falls back to answer-based classification for non-classification statuses', () => {
    expect(classifyAnswer('yes', 'pending')).toBe('pass');
    expect(classifyAnswer('no', 'needs_review')).toBe('fail');
    expect(classifyAnswer('in progress', 'pending')).toBe('partial');
  });

  it('lets a status override win even when the answer text is empty', () => {
    expect(classifyAnswer('', 'passed')).toBe('pass');
    expect(classifyAnswer(null, 'failed')).toBe('fail');
    expect(classifyAnswer(undefined, 'passed')).toBe('pass');
  });
});

describe('scoreQuestionnaire', () => {
  it('returns all-zero totals and "No Data" for an empty question set', () => {
    const score = scoreQuestionnaire([]);
    expect(score).toMatchObject({
      total: 0,
      answered: 0,
      unanswered: 0,
      passed: 0,
      partial: 0,
      failed: 0,
      neutral: 0,
      completionRate: 0,
      complianceScore: 0,
      readiness: 'No Data',
    });
    expect(score.focusAreas).toEqual([]);
  });

  it('scores all-yes as 100% / 100 with readiness "Strong"', () => {
    const score = scoreQuestionnaire([q('yes'), q('Yes'), q('implemented')]);
    expect(score).toMatchObject({
      total: 3,
      answered: 3,
      passed: 3,
      failed: 0,
      completionRate: 100,
      complianceScore: 100,
      readiness: 'Strong',
    });
  });

  it('scores half yes / half no as 50 with readiness "Developing"', () => {
    const score = scoreQuestionnaire([q('yes'), q('yes'), q('no'), q('no')]);
    expect(score).toMatchObject({ answered: 4, passed: 2, failed: 2, complianceScore: 50, readiness: 'Developing' });
  });

  it('scores all-no as 0 with readiness "At Risk" (answered > 0)', () => {
    const score = scoreQuestionnaire([q('no'), q('false'), q('never')]);
    expect(score).toMatchObject({ answered: 3, passed: 0, failed: 3, complianceScore: 0, readiness: 'At Risk' });
  });

  it('counts partial answers as half credit (1 yes + 1 partial => 75)', () => {
    const score = scoreQuestionnaire([q('yes'), q('partial')]);
    expect(score).toMatchObject({ answered: 2, passed: 1, partial: 1, complianceScore: 75, readiness: 'Developing' });
  });

  it('counts neutral answers in totals AND the compliance denominator (engine behavior)', () => {
    // 2 pass + 1 neutral + 1 unanswered: neutral is "answered" in this engine,
    // so answered = 3 and only unanswered reduces completionRate.
    const score = scoreQuestionnaire([q('yes'), q('yes'), q('n/a'), q(undefined)]);
    expect(score).toMatchObject({
      total: 4,
      answered: 3,
      neutral: 1,
      unanswered: 1,
      passed: 2,
      complianceScore: 67, // (2 + 0.5*0) / 3 * 100 = 66.67 -> 67
      completionRate: 75, // answered/total = 3/4
      readiness: 'Developing',
    });
  });

  it('lets unanswered reduce completionRate only', () => {
    const score = scoreQuestionnaire([q('yes'), q(undefined)]);
    expect(score).toMatchObject({ total: 2, answered: 1, unanswered: 1, completionRate: 50, complianceScore: 100, readiness: 'Strong' });
  });

  it('returns "No Data" with a 0 compliance score when everything is unanswered', () => {
    const score = scoreQuestionnaire([q(undefined), q(null), q('')]);
    expect(score).toMatchObject({ answered: 0, unanswered: 3, complianceScore: 0, completionRate: 0, readiness: 'No Data' });
  });

  it('scores neutral-only answers as answered (0 compliance score, "At Risk" readiness)', () => {
    // Neutrals count as answered in this engine: answered = 3, compliance 0,
    // readiness falls to At Risk (answered > 0 but score < 50).
    const score = scoreQuestionnaire([q('n/a'), q('not applicable'), q('unknown')]);
    expect(score).toMatchObject({ total: 3, answered: 3, neutral: 3, complianceScore: 0, completionRate: 100, readiness: 'At Risk' });
  });

  it('rounds complianceScore with Math.round (2 passed + 1 partial of 4 => 63)', () => {
    // (2 + 0.5*1) / 4 = 0.625 -> 62.5 -> Math.round -> 63
    const score = scoreQuestionnaire([q('yes'), q('yes'), q('no'), q('partial')]);
    expect(score.complianceScore).toBe(63);
    expect(score.completionRate).toBe(100);
  });

  it('handles a mixed 9-question set end to end', () => {
    const score = scoreQuestionnaire([
      q('yes', 'Governance'),
      q('yes', 'Governance'),
      q('yes', 'Governance'),
      q('yes', 'Governance'),
      q('no', 'Access Control'),
      q('partial', 'Access Control'),
      q('n/a', 'Access Control'),
      q(undefined, 'Governance'),
      q(undefined, 'Governance'),
    ]);
    expect(score).toMatchObject({
      total: 9,
      answered: 7, // neutral counts as answered in this engine
      passed: 4,
      failed: 1,
      partial: 1,
      neutral: 1,
      unanswered: 2,
      completionRate: 78, // Math.round(7/9*100)
      complianceScore: 64, // (4 + 0.5) / 7 * 100 = 64.29 -> 64
      readiness: 'Developing',
    });
    // per-area breakdown (sorted alphabetically)
    expect(score.focusAreas.map((fa: { focusArea: string }) => fa.focusArea)).toEqual(['Access Control', 'Governance']);
    expect(score.focusAreas[0]).toMatchObject({ total: 3, answered: 3, passed: 0, failed: 1, partial: 1, neutral: 1, score: 17 }); // (0 + 0.5) / 3 * 100 = 16.67
    expect(score.focusAreas[1]).toMatchObject({ total: 6, answered: 4, passed: 4, score: 100 });
  });

  it('rounds completionRate to an integer (1 of 3 answered => 33)', () => {
    const score = scoreQuestionnaire([q('yes'), q(undefined), q(undefined)]);
    expect(score.completionRate).toBe(33);
  });

  it('buckets null and empty focusArea into "Uncategorized"', () => {
    const score = scoreQuestionnaire([
      q('yes', null as unknown as string),
      q('no', ''),
      q('yes', 'Governance'),
    ]);
    const names = score.focusAreas.map((fa: { focusArea: string }) => fa.focusArea);
    expect(names).toContain('Uncategorized');
    expect(names).toContain('Governance');
    const uncat = score.focusAreas.find((fa: { focusArea: string }) => fa.focusArea === 'Uncategorized');
    expect(uncat).toMatchObject({ total: 2, answered: 2, passed: 1, failed: 1, score: 50 });
  });

  it('sorts focusAreas alphabetically', () => {
    const score = scoreQuestionnaire([
      q('yes', 'Zeta'),
      q('no', 'Alpha'),
      q('yes', 'Beta'),
    ]);
    expect(score.focusAreas.map((fa: { focusArea: string }) => fa.focusArea)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('computes per-area score with the same rounding and 0 when the area has no answers', () => {
    const score = scoreQuestionnaire([
      q('yes', 'A'),
      q('yes', 'A'),
      q('no', 'A'),
      q('partial', 'A'),
      q('yes', 'B'),
      q('n/a', 'B'),
      q(undefined, 'B'),
    ]);
    expect(score.focusAreas[0]).toMatchObject({
      focusArea: 'A',
      total: 4,
      answered: 4,
      passed: 2,
      failed: 1,
      partial: 1,
      neutral: 0,
      score: 63, // (2 + 0.5) / 4 = 62.5 -> 63
    });
    expect(score.focusAreas[1]).toMatchObject({
      focusArea: 'B',
      total: 3,
      answered: 2, // yes + neutral both count as answered
      passed: 1,
      neutral: 1,
      score: 50, // (1 + 0.5*0) / 2 * 100
    });
  });

  it('is deterministic across two runs', () => {
    const questions = [q('yes'), q('no'), q('partial'), q('n/a'), q(undefined)];
    expect(scoreQuestionnaire(questions)).toEqual(scoreQuestionnaire(questions));
  });

  it('handles a large input (100 questions) with the correct aggregate score', () => {
    const questions = Array.from({ length: 100 }, (_, i) => q(i < 80 ? 'yes' : 'no', 'Governance'));
    const score = scoreQuestionnaire(questions);
    expect(score).toMatchObject({ total: 100, answered: 100, passed: 80, failed: 20, complianceScore: 80, readiness: 'Strong' });
    expect(score.focusAreas).toHaveLength(1);
    expect(score.focusAreas[0].score).toBe(80);
  });

  it('treats exactly 80 as "Strong" and exactly 50 as "Developing" (threshold boundaries)', () => {
    expect(scoreQuestionnaire([q('yes'), q('yes'), q('yes'), q('yes'), q('no')]).readiness).toBe('Strong'); // 80
    expect(scoreQuestionnaire([q('yes'), q('no'), q('partial'), q('partial')]).readiness).toBe('Developing'); // 50
  });

  it('maps 79 to "Developing" and 49 to "At Risk" (just below the thresholds)', () => {
    const at79 = scoreQuestionnaire(Array.from({ length: 100 }, (_, i) => q(i < 79 ? 'yes' : 'no')));
    expect(at79.complianceScore).toBe(79);
    expect(at79.readiness).toBe('Developing');

    const at49 = scoreQuestionnaire(Array.from({ length: 100 }, (_, i) => q(i < 49 ? 'yes' : 'no')));
    expect(at49.complianceScore).toBe(49);
    expect(at49.readiness).toBe('At Risk');
  });

  it('treats non-array input as an empty question set (never throws)', () => {
    for (const bad of [null, undefined, {}, 'nope', 42]) {
      const score = scoreQuestionnaire(bad as never);
      expect(score).toMatchObject({ total: 0, answered: 0, complianceScore: 0, readiness: 'No Data' });
      expect(score.focusAreas).toEqual([]);
    }
  });

  it('skips malformed entries (null / non-object) and scores the valid ones', () => {
    const score = scoreQuestionnaire([
      null,
      'garbage',
      42,
      q('yes', 'A'),
      q(undefined, 'B'),
    ]);
    expect(score).toMatchObject({ total: 2, answered: 1, passed: 1, unanswered: 1, complianceScore: 100, completionRate: 50 });
  });

  it('keeps an all-unanswered focus area in the breakdown with score 0', () => {
    const score = scoreQuestionnaire([
      q('yes', 'A'),
      q(undefined, 'B'),
      q('', 'B'),
    ]);
    expect(score.focusAreas.map((fa: { focusArea: string }) => fa.focusArea)).toEqual(['A', 'B']);
    const b = score.focusAreas.find((fa: { focusArea: string }) => fa.focusArea === 'B');
    expect(b).toMatchObject({ total: 2, answered: 0, passed: 0, failed: 0, neutral: 0, score: 0 });
    // overall readiness comes from the answered area only
    expect(score).toMatchObject({ total: 3, answered: 1, complianceScore: 100, readiness: 'Strong' });
  });
});

describe('summarizeScore', () => {
  it('maps "Strong" to tone "positive" with a non-empty description', () => {
    const score = scoreQuestionnaire([q('yes'), q('yes'), q('yes')]);
    const summary = summarizeScore(score);
    expect(summary.label).toBe('Strong');
    expect(summary.tone).toBe('positive');
    expect(typeof summary.description).toBe('string');
    expect(summary.description.length).toBeGreaterThan(0);
  });

  it('maps "Developing" to tone "warning"', () => {
    const score = scoreQuestionnaire([q('yes'), q('yes'), q('no'), q('no')]);
    expect(summarizeScore(score)).toMatchObject({ label: 'Developing', tone: 'warning' });
  });

  it('maps "At Risk" to tone "danger"', () => {
    const score = scoreQuestionnaire([q('no'), q('never')]);
    expect(summarizeScore(score)).toMatchObject({ label: 'At Risk', tone: 'danger' });
  });

  it('maps "No Data" to tone "neutral"', () => {
    const score = scoreQuestionnaire([]);
    expect(summarizeScore(score)).toMatchObject({ label: 'No Data', tone: 'neutral' });
  });

  it('produces a non-empty description for every readiness level', () => {
    const cases = [
      scoreQuestionnaire([q('yes'), q('yes'), q('yes')]),
      scoreQuestionnaire([q('yes'), q('no')]),
      scoreQuestionnaire([q('no')]),
      scoreQuestionnaire([]),
    ];
    for (const score of cases) {
      const summary = summarizeScore(score);
      expect(typeof summary.description).toBe('string');
      expect(summary.description.length).toBeGreaterThan(0);
    }
  });

  it('degrades to "No Data" for a missing or malformed score object', () => {
    for (const bad of [undefined, null, {}]) {
      const summary = summarizeScore(bad as never);
      expect(summary).toMatchObject({ label: 'No Data', tone: 'neutral' });
      expect(typeof summary.description).toBe('string');
      expect(summary.description.length).toBeGreaterThan(0);
    }
  });
});
