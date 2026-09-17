import { describe, it, expect } from 'vitest';

/**
 * Honest prebuilt questionnaire templates (lib/questionnaire/templates.ts)
 * — unit/contract tests (QA cycle 12, scorecard #6).
 *
 * Contract under test:
 *   BUILTIN_TEMPLATES: exactly 6 templates with ids
 *     { sig-lite, caiq-v4, vsaq, cis-csat, soc2, iso27001 }.
 *   Each template: { id, name, description, category, version, questionCount,
 *                    questions: [{ questionId, question, focusArea, ... }] }
 *   where questionCount === questions.length (derived, honest).
 *   getBuiltinTemplate(id) -> template | undefined.
 *
 * Coverage requirements: soc2 >= 20 questions covering the CC / A1 / C1 / PI
 * families; iso27001 >= 15 questions covering >= 3 distinct "A.x" areas.
 * Original 4 template ids/names are preserved.
 *
 * NOTE: the implementation module may not be committed yet (backend agent
 * works in parallel) — these tests encode the contract and run the moment
 * templates.ts lands.
 */
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from '../questionnaire/templates';

const EXPECTED_IDS = ['sig-lite', 'caiq-v4', 'vsaq', 'cis-csat', 'soc2', 'iso27001'];

describe('BUILTIN_TEMPLATES', () => {
  it('exports exactly 6 builtin templates', () => {
    expect(Array.isArray(BUILTIN_TEMPLATES)).toBe(true);
    expect(BUILTIN_TEMPLATES).toHaveLength(6);
  });

  it('has a stable, unique id set matching the contract', () => {
    const ids = BUILTIN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
    expect([...ids].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it('keeps every template id in the contract set (no orphans, no duplicates)', () => {
    const expected = new Set(EXPECTED_IDS);
    for (const t of BUILTIN_TEMPLATES) {
      expect(expected.has(t.id), `unexpected template id "${t.id}"`).toBe(true);
    }
  });

  it('is honest: questionCount === questions.length for every template', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.questionCount, `${t.id}: questionCount derived from questions.length`).toBe(t.questions.length);
    }
  });

  it('gives every question a non-empty questionId, question text and focusArea', () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const question of t.questions) {
        expect(typeof question.questionId, `${t.id}: questionId`).toBe('string');
        expect(question.questionId.trim().length).toBeGreaterThan(0);
        expect(typeof question.question, `${t.id}: question text`).toBe('string');
        expect(question.question.trim().length).toBeGreaterThan(0);
        expect(typeof question.focusArea, `${t.id}: focusArea`).toBe('string');
        expect(question.focusArea.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps questionIds unique within each template', () => {
    for (const t of BUILTIN_TEMPLATES) {
      const ids = t.questions.map((question) => question.questionId);
      expect(new Set(ids).size, `${t.id}: unique questionIds`).toBe(ids.length);
    }
  });

  it('gives every template non-empty id, name, description, category and version', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.id.trim().length).toBeGreaterThan(0);
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(t.category.trim().length).toBeGreaterThan(0);
      expect(String(t.version ?? '').trim().length).toBeGreaterThan(0);
    }
  });
});

describe('soc2 template', () => {
  const soc2 = BUILTIN_TEMPLATES.find((t) => t.id === 'soc2');

  it('exists and has at least 20 questions', () => {
    expect(soc2).toBeDefined();
    expect(soc2!.questions.length).toBeGreaterThanOrEqual(20);
  });

  it('covers the CC, A1, C1 and PI control families', () => {
    const families = ['CC', 'A1', 'C1', 'PI'];
    for (const family of families) {
      const covered = soc2!.questions.some((question) => {
        const area = String(question.focusArea ?? '');
        const text = String(question.question ?? '');
        return (
          area.startsWith(family) ||
          area.includes(family) ||
          text.startsWith(family) ||
          text.includes(family)
        );
      });
      expect(covered, `soc2 should cover family "${family}"`).toBe(true);
    }
  });
});

describe('iso27001 template', () => {
  const iso27001 = BUILTIN_TEMPLATES.find((t) => t.id === 'iso27001');

  it('exists and has at least 15 questions', () => {
    expect(iso27001).toBeDefined();
    expect(iso27001!.questions.length).toBeGreaterThanOrEqual(15);
  });

  it('covers at least 3 distinct "A.x" annex areas', () => {
    const areas = new Set<string>();
    for (const question of iso27001!.questions) {
      const area = String(question.focusArea ?? '');
      const match = area.match(/^A\.\d/);
      if (match) areas.add(match[0].slice(0, 3)); // e.g. "A.5", "A.8", "A.12"
    }
    expect(areas.size).toBeGreaterThanOrEqual(3);
  });
});

describe('getBuiltinTemplate', () => {
  it('returns the matching template for every builtin id', () => {
    for (const id of EXPECTED_IDS) {
      expect(getBuiltinTemplate(id)?.id).toBe(id);
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(getBuiltinTemplate('does-not-exist')).toBeUndefined();
    expect(getBuiltinTemplate('')).toBeUndefined();
  });
});

describe('legacy template compatibility', () => {
  it('preserves the original 4 template ids and names', () => {
    const sig = BUILTIN_TEMPLATES.find((t) => t.id === 'sig-lite');
    const caiq = BUILTIN_TEMPLATES.find((t) => t.id === 'caiq-v4');
    const vsaq = BUILTIN_TEMPLATES.find((t) => t.id === 'vsaq');
    const cis = BUILTIN_TEMPLATES.find((t) => t.id === 'cis-csat');

    expect(sig?.name.toUpperCase()).toContain('SIG');
    expect(caiq?.name.toUpperCase()).toContain('CAIQ');
    expect(vsaq).toBeDefined();
    expect(vsaq!.name.toUpperCase()).toContain('VSAQ');
    expect(cis).toBeDefined();
    expect(cis!.name.toUpperCase()).toContain('CIS');
  });
});

describe('sig-lite template', () => {
  const sig = BUILTIN_TEMPLATES.find((t) => t.id === 'sig-lite');

  it('exists with at least 15 questions', () => {
    expect(sig).toBeDefined();
    expect(sig!.questions.length).toBeGreaterThanOrEqual(15);
  });

  it('covers the Governance, Access Control and Data Protection focus areas', () => {
    const areas = new Set(sig!.questions.map((question) => question.focusArea));
    for (const area of ['Governance', 'Access Control', 'Data Protection']) {
      expect(areas.has(area), `sig-lite should contain focusArea "${area}"`).toBe(true);
    }
  });
});

describe('caiq-v4 template', () => {
  const caiq = BUILTIN_TEMPLATES.find((t) => t.id === 'caiq-v4');

  it('covers all 15 CCM v4 control domains via subFocusArea codes', () => {
    expect(caiq).toBeDefined();
    const codes = ['AIS', 'BCR', 'CCC', 'CEF', 'DSI', 'DCS', 'GRM', 'HRS', 'IVS', 'LOG', 'MON', 'SEF', 'STA', 'TVM', 'UEM'];
    const subs = new Set(caiq!.questions.map((question) => question.subFocusArea));
    for (const code of codes) {
      expect(subs.has(code), `caiq-v4 should cover domain "${code}"`).toBe(true);
    }
  });
});

describe('responseType integrity', () => {
  const VALID = new Set(['yes_no', 'yes_no_na', 'text']);

  it('every responseType across all templates is a known value', () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const question of t.questions) {
        if (question.responseType === undefined) continue; // undefined defaults to yes_no_na
        expect(VALID.has(question.responseType), `${t.id}: bad responseType "${question.responseType}"`).toBe(true);
      }
    }
  });

  it('marks free-text questions with responseType "text" (sig-lite F.2, vsaq VSAQ-3)', () => {
    const sig = getBuiltinTemplate('sig-lite')!;
    const vsaq = getBuiltinTemplate('vsaq')!;
    expect(sig.questions.find((question) => question.questionId === 'F.2')?.responseType).toBe('text');
    expect(vsaq.questions.find((question) => question.questionId === 'VSAQ-3')?.responseType).toBe('text');
    expect(sig.questions.filter((question) => question.responseType === 'text')).toHaveLength(1);
    expect(vsaq.questions.filter((question) => question.responseType === 'text')).toHaveLength(1);
  });
});
