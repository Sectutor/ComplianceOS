import { describe, it, expect } from 'vitest';

/**
 * Honest-responder contract tests (lib/ai/questionnaireAutoResponder.ts and
 * lib/questionnaire/answerLibrary.ts).
 *
 * Core guarantees under test:
 *   1. Review mode NEVER asserts an unverified control: every answer is a
 *      "Needs Review" placeholder with zero confidence and NO fabricated
 *      evidence IDs (EVD-*) or policy section numbers (§).
 *   2. Draft mode (in-place Excel populator) keeps template bodies but frames
 *      evidence/policy as suggestions, never as invented artifact IDs.
 *   3. Answer library matching: exact normalized-text matches win; fuzzy
 *      matches only above the similarity threshold; no match -> null.
 */
import {
  generateQuestionAnswer,
  autoAnswerQuestionnaire,
  needsReviewAnswer,
} from '../ai/questionnaireAutoResponder';
import {
  normalizeQuestionText,
  questionSimilarity,
  pickBestMatch,
  LIBRARY_MATCH_THRESHOLD,
  type LibraryEntry,
} from '../questionnaire/answerLibrary';
import { extractJsonPayload } from '../ai/questionnaireLlmResponder';

describe('generateQuestionAnswer — review mode (honest)', () => {
  it('returns a Needs Review placeholder even for strongly-matched domains', () => {
    const res = generateQuestionAnswer(
      'Is multi-factor authentication enforced for all users?',
      { companyName: 'Acme SaaS' },
      { mode: 'review' }
    );

    expect(res.shortAnswer).toBe('Needs Review');
    expect(res.confidenceScore).toBe(0);
    expect(res.answer).toContain('No verified answer');
    expect(res.answer).toContain('human');
  });

  it('never emits fabricated evidence IDs or policy section numbers', () => {
    for (const questionText of [
      'Is multi-factor authentication enforced for all users?',
      'Are database backups and disks encrypted at rest?',
      'Do you conduct annual penetration testing by independent third parties?',
      'Something entirely unmatched like quantum flux compliance?',
    ]) {
      const res = generateQuestionAnswer(questionText, {}, { mode: 'review' });
      expect(res.answer).not.toMatch(/EVD-/);
      expect(res.answer).not.toMatch(/§/);
      expect(res.supportingEvidence).toBe('');
      expect(res.policyCitation).toBe('');
    }
  });

  it('autoAnswerQuestionnaire is honest end-to-end (no fabricated Yes)', async () => {
    const result = await autoAnswerQuestionnaire(1, [
      { questionId: 'q1', questionText: 'Is multi-factor authentication enforced?' },
      { questionId: 'q2', questionText: 'Do you encrypt data at rest?' },
    ]);

    expect(result.answeredQuestions).toHaveLength(2);
    for (const a of result.answeredQuestions) {
      expect(a.shortAnswer).toBe('Needs Review');
      expect(a.confidenceScore).toBe(0);
    }
    expect(result.overallConfidence).toBe(0);
  });

  it('needsReviewAnswer carries the matched domain and evidence suggestion', () => {
    const ph = needsReviewAnswer('Is MFA enforced?', 'Access Control - MFA', 'identity provider MFA enforcement report');
    expect(ph.shortAnswer).toBe('Needs Review');
    expect(ph.answer).toContain('Access Control - MFA');
    expect(ph.answer).toContain('identity provider MFA enforcement report');
  });
});

describe('generateQuestionAnswer — draft mode (populator)', () => {
  it('keeps templated control bodies but reframes evidence/policy as suggestions', () => {
    const res = generateQuestionAnswer(
      'Is multi-factor authentication enforced for all users?',
      { companyName: 'Acme SaaS', idp: 'Okta & Google Workspace' },
      { mode: 'draft' }
    );

    expect(res.shortAnswer).toBe('Yes');
    expect(res.answer).toContain('Multi-Factor Authentication');
    expect(res.answer).toContain('Okta & Google Workspace');
    // Framed as suggestions — no invented artifact IDs or section numbers.
    expect(res.supportingEvidence).toContain('Suggested evidence');
    expect(res.supportingEvidence).not.toMatch(/EVD-/);
    expect(res.policyCitation).toContain('Relevant policy area');
    expect(res.policyCitation).not.toMatch(/§/);
  });

  it('defaults to draft mode (populator call sites)', () => {
    const res = generateQuestionAnswer('Is MFA enforced for all users?', {});
    expect(res.shortAnswer).toBe('Yes');
  });

  it('returns Needs Review (not a fabricated Yes) for unmatched questions', () => {
    const res = generateQuestionAnswer('What is your favorite color?', { companyName: 'Acme' });
    expect(res.shortAnswer).toBe('Needs Review');
    expect(res.confidenceScore).toBe(0);
  });
});

describe('extractJsonPayload (LLM response parsing)', () => {
  it('extracts a JSON object from a fenced response', () => {
    const text = '```json\n{"answers":[{"questionId":"q1","answer":"Yes"}]}\n```';
    expect(extractJsonPayload(text)).toBe('{"answers":[{"questionId":"q1","answer":"Yes"}]}');
  });

  it('extracts JSON embedded in prose', () => {
    const text = 'Here is the result:\n{"answers":[]}\nHope this helps!';
    expect(extractJsonPayload(text)).toBe('{"answers":[]}');
  });

  it('handles bare JSON and arrays', () => {
    expect(extractJsonPayload('{"a":1}')).toBe('{"a":1}');
    expect(extractJsonPayload('[{"a":1}]')).toBe('[{"a":1}]');
  });

  it('returns null when there is no JSON at all', () => {
    expect(extractJsonPayload('no json here')).toBeNull();
    expect(extractJsonPayload('')).toBeNull();
  });
});

describe('answer library matching', () => {
  const library: LibraryEntry[] = [
    {
      questionText: 'Is multi-factor authentication enforced for all remote access?',
      answer: 'Yes. MFA is enforced via our IdP for all remote access.',
      sourceQuestionnaireId: 1,
      sourceQuestionnaireName: 'Acme SIG Lite 2026',
      focusArea: 'Access Control',
    },
    {
      questionText: 'Do you encrypt customer data at rest?',
      answer: 'Yes, AES-256 at rest.',
      sourceQuestionnaireId: 2,
      sourceQuestionnaireName: 'Vendor CAIQ 2026',
    },
  ];

  it('normalizes case, punctuation and whitespace', () => {
    expect(normalizeQuestionText('  Is MFA Enforced??  ')).toBe('is mfa enforced');
    expect(normalizeQuestionText('Is   MFA\nenforced.')).toBe('is mfa enforced');
  });

  it('scores similarity by token overlap', () => {
    expect(questionSimilarity('Is MFA enforced?', 'Is MFA enforced?')).toBe(1);
    expect(questionSimilarity('Is MFA enforced for all remote access?', 'completely unrelated topic')).toBeLessThan(
      LIBRARY_MATCH_THRESHOLD
    );
  });

  it('returns exact normalized matches with similarity 1', () => {
    const match = pickBestMatch('Is Multi-Factor Authentication enforced for all remote access?', library);
    expect(match).not.toBeNull();
    expect(match!.similarity).toBe(1);
    expect(match!.answer).toContain('MFA is enforced');
    expect(match!.sourceQuestionnaireName).toBe('Acme SIG Lite 2026');
  });

  it('returns close paraphrases above the threshold', () => {
    const match = pickBestMatch('Is multi-factor authentication enforced for all remote access?', library);
    // Same normalized text modulo punctuation -> still an exact hit.
    expect(match).not.toBeNull();
    expect(match!.similarity).toBeGreaterThanOrEqual(1);
  });

  it('returns null below the similarity threshold', () => {
    const match = pickBestMatch('Describe your favorite pizza toppings in detail', library);
    expect(match).toBeNull();
  });

  it('returns null for empty inputs', () => {
    expect(pickBestMatch('', library)).toBeNull();
    expect(pickBestMatch('Is MFA enforced?', [])).toBeNull();
    expect(pickBestMatch('Is MFA enforced?', [{ ...library[0], answer: '' }])).toBeNull();
  });
});
