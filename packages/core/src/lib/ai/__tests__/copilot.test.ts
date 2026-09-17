import { describe, it, expect } from 'vitest';
import { draftPolicyDraft, suggestEvidenceForControl, autoMapRequirement } from '../copilot';

/**
 * AI Copilot engine (lib/ai/copilot.ts) — unit tests
 * (QA cycle 14, scorecard #10).
 *
 * Contract under test (implemented in parallel by the backend agent):
 *   draftPolicyDraft({ topic, framework?, orgName? }) ->
 *     { title, purpose, scope, sections: {heading,body}[], controls: {code,title}[],
 *       reviewCadence, disclaimer }
 *   suggestEvidenceForControl({ controlTitle, framework? }) ->
 *     { evidence: {title,type,description,freshness}[], source: 'builtin' }
 *   autoMapRequirement({ requirement, frameworks? }) ->
 *     { matches: {framework,controlId,controlTitle,score,rationale}[], bestMatch|null }
 *
 * The engine is deterministic and pure: no DB, no LLM, no randomness. Every
 * test below also encodes the "never throws" guarantee for empty input.
 */

const SUPPORTED_FRAMEWORKS = ['SOC 2', 'ISO 27001', 'NIS2', 'GDPR', 'HIPAA', 'PCI DSS'] as const;
const TOPIC = 'Access Control';

const DRAFT_SHAPE = {
  title: expect.any(String),
  purpose: expect.any(String),
  scope: expect.any(String),
  sections: expect.any(Array),
  controls: expect.any(Array),
  reviewCadence: expect.any(String),
  disclaimer: expect.any(String),
};

describe('draftPolicyDraft', () => {
  it('produces a sensible title, purpose, scope, sections and cadence for a topic', () => {
    const draft = draftPolicyDraft({ topic: 'Data Retention' });

    // topic surfaces in the title; purpose is a real sentence, not a stub
    expect(draft.title.toLowerCase()).toContain('data retention');
    expect(draft.purpose.length).toBeGreaterThan(10);
    expect(draft.scope.length).toBeGreaterThan(0);

    // at least a couple of substantive sections
    expect(draft.sections.length).toBeGreaterThanOrEqual(2);
    for (const section of draft.sections) {
      expect(typeof section.heading).toBe('string');
      expect(section.heading.length).toBeGreaterThan(0);
      expect(typeof section.body).toBe('string');
      expect(section.body.length).toBeGreaterThan(0);
    }

    expect(typeof draft.reviewCadence).toBe('string');
    expect(draft.reviewCadence.length).toBeGreaterThan(0);
    expect(typeof draft.disclaimer).toBe('string');
    expect(draft.disclaimer.length).toBeGreaterThan(0);
    expect(draft).toMatchObject(DRAFT_SHAPE);
  });

  it.each(SUPPORTED_FRAMEWORKS)(
    'includes well-formed framework-specific controls for %s',
    (framework) => {
      const draft = draftPolicyDraft({ topic: TOPIC, framework });
      expect(draft.controls.length).toBeGreaterThan(0);
      for (const control of draft.controls) {
        expect(typeof control.code).toBe('string');
        expect(control.code.length).toBeGreaterThan(0);
        expect(typeof control.title).toBe('string');
        expect(control.title.length).toBeGreaterThan(0);
      }
    }
  );

  it('produces a distinct control set for each supported framework', () => {
    const controlSets = SUPPORTED_FRAMEWORKS.map((framework) =>
      draftPolicyDraft({ topic: TOPIC, framework }).controls
    );
    for (let i = 0; i < controlSets.length; i++) {
      for (let j = i + 1; j < controlSets.length; j++) {
        // Strictest reading of "framework-specific": no two frameworks share
        // an identical control list. Flag to the conductor if this fails —
        // it means the framework parameter is not actually selecting controls.
        expect(controlSets[i], `framework #${i} vs #${j}`).not.toEqual(controlSets[j]);
      }
    }
  });

  it('surfaces orgName in the scope or purpose', () => {
    const draft = draftPolicyDraft({ topic: TOPIC, orgName: 'Acme Corp' });
    const blob = `${draft.scope} ${draft.purpose}`.toLowerCase();
    expect(blob).toContain('acme corp');
  });

  it('returns a safe neutral shape for empty input without throwing', () => {
    for (const input of [{}, { topic: '' }, undefined]) {
      const draft = draftPolicyDraft(input as never);
      expect(draft).toMatchObject(DRAFT_SHAPE);
      // sections/controls still well-formed if the engine chooses to include any
      for (const section of draft.sections) {
        expect(typeof section.heading).toBe('string');
        expect(typeof section.body).toBe('string');
      }
      for (const control of draft.controls) {
        expect(typeof control.code).toBe('string');
        expect(typeof control.title).toBe('string');
      }
    }
  });

  it('is deterministic (identical output for identical input)', () => {
    const input = { topic: TOPIC, framework: 'SOC 2', orgName: 'Acme Corp' };
    expect(draftPolicyDraft(input)).toEqual(draftPolicyDraft(input));
    expect(draftPolicyDraft({})).toEqual(draftPolicyDraft({}));
  });
});

describe('suggestEvidenceForControl', () => {
  it.each(['Access Control', 'access control', 'MFA', 'Multi-factor authentication'])(
    'returns builtin evidence entries for known keyword "%s"',
    (controlTitle) => {
      const result = suggestEvidenceForControl({ controlTitle });
      expect(result.source).toBe('builtin');
      expect(result.evidence.length).toBeGreaterThan(0);
      for (const entry of result.evidence) {
        expect(typeof entry.title).toBe('string');
        expect(entry.title.length).toBeGreaterThan(0);
        expect(typeof entry.type).toBe('string');
        expect(entry.type.length).toBeGreaterThan(0);
        expect(typeof entry.description).toBe('string');
        expect(entry.description.length).toBeGreaterThan(0);
        expect(entry.freshness).toBeDefined();
        expect(['string', 'number']).toContain(typeof entry.freshness);
      }
    }
  );

  it('returns the neutral shape for empty input without throwing', () => {
    for (const input of [{}, { controlTitle: '' }, undefined]) {
      const result = suggestEvidenceForControl(input as never);
      expect(Array.isArray(result.evidence)).toBe(true);
      expect(result.source).toBe('builtin');
      for (const entry of result.evidence) {
        expect(typeof entry.title).toBe('string');
      }
    }
    // the neutral shape is the same regardless of which empty variant was passed
    expect(suggestEvidenceForControl({}).evidence).toEqual(
      suggestEvidenceForControl(undefined as never).evidence
    );
  });

  it('is deterministic (identical output for identical input)', () => {
    const input = { controlTitle: 'Access Control' };
    expect(suggestEvidenceForControl(input)).toEqual(suggestEvidenceForControl(input));
  });
});

describe('autoMapRequirement', () => {
  const REQUIREMENT = 'Enforce multi-factor authentication for all remote access';

  it('returns matches ranked by score desc with bestMatch as the top match', () => {
    const result = autoMapRequirement({ requirement: REQUIREMENT });

    expect(result.matches.length).toBeGreaterThan(0);
    for (let i = 0; i < result.matches.length; i++) {
      const match = result.matches[i];
      expect(typeof match.framework).toBe('string');
      expect(match.framework.length).toBeGreaterThan(0);
      expect(typeof match.controlId).toBe('string');
      expect(match.controlId.length).toBeGreaterThan(0);
      expect(typeof match.controlTitle).toBe('string');
      expect(match.controlTitle.length).toBeGreaterThan(0);
      expect(typeof match.score).toBe('number');
      expect(typeof match.rationale).toBe('string');
      expect(match.rationale.length).toBeGreaterThan(0);
      if (i > 0) {
        expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(match.score);
      }
    }
    expect(result.bestMatch).toEqual(result.matches[0]);
  });

  it('restricts matches to the requested frameworks and covers all of them', () => {
    const requested = ['SOC 2', 'ISO 27001'];
    const result = autoMapRequirement({ requirement: REQUIREMENT, frameworks: requested });

    expect(result.matches.length).toBeGreaterThan(0);
    const allowed = new Set(requested);
    for (const match of result.matches) {
      expect(allowed.has(match.framework)).toBe(true);
    }
    const covered = new Set(result.matches.map((m) => m.framework));
    for (const framework of requested) {
      expect(covered.has(framework)).toBe(true);
    }
  });

  it('keeps every score within 0-100', () => {
    const result = autoMapRequirement({ requirement: REQUIREMENT });
    expect(result.matches.length).toBeGreaterThan(0);
    for (const match of result.matches) {
      expect(match.score).toBeGreaterThanOrEqual(0);
      expect(match.score).toBeLessThanOrEqual(100);
    }
  });

  it('returns { matches: [], bestMatch: null } for empty input without throwing', () => {
    expect(autoMapRequirement({} as never)).toEqual({ matches: [], bestMatch: null });
    expect(autoMapRequirement(undefined as never)).toEqual({ matches: [], bestMatch: null });

    // empty-string requirement is treated as unmappable, never a crash
    const blank = autoMapRequirement({ requirement: '' });
    expect(Array.isArray(blank.matches)).toBe(true);
    expect(blank.bestMatch).toBeNull();
  });

  it('is deterministic (identical output for identical input)', () => {
    const input = { requirement: REQUIREMENT, frameworks: ['SOC 2', 'ISO 27001'] };
    expect(autoMapRequirement(input)).toEqual(autoMapRequirement(input));
  });
});
