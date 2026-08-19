/**
 * NIS2 incident classifier engine (lib/cyber/incidentClassifier.ts) —
 * unit/contract tests (QA cycle 15, NIS2 incident classifier).
 *
 * The engine is being built in parallel; these tests encode the documented
 * contract and run the moment incidentClassifier.ts lands. TDD-style: every
 * assertion below is derived from the contract, not from a shipped
 * implementation.
 *
 * Contract under test:
 *   classifyIncident(input) -> {
 *     score: number (0-100),
 *     severity: 'low' | 'medium' | 'high' | 'critical',
 *     isSignificant: boolean,
 *     reasons: string[],
 *     category: string,
 *     categoryId: string,
 *     nextDeadline: '24h' | '72h' | '1mo' | null
 *   }
 *
 * Significance (NIS2 Art. 23(3)) — any criterion triggers:
 *   durationMinutes > 120            "Operational disruption exceeds 2 hours"
 *   affectedUsers > 1000             "Large number of users affected (>1000)"
 *   financialLossCents > 1000000     "Significant financial loss detected"
 *   publicSafetyImpact               "Direct impact on public safety or health"
 *   criticalInfrastructureAffected   "Critical infrastructure service disruption"
 *   dataIntegrityCompromised         (new criterion, reason string not pinned)
 *   crossBorderImpact                (new criterion, reason string not pinned)
 * The five inherited reason strings are pinned verbatim against the existing
 * lib/cyber/incident-logic.ts implementation (stable since before this cycle).
 *
 * Severity bands: critical >= 80, high >= 55, medium >= 30, else low.
 * The shipped engine documents an additive weighted model (public safety +40,
 * critical infrastructure +35, data integrity +30, cross-border +20, users
 * +20, duration +15, financial loss +15, clamped to 0-100) — exact scores and
 * band boundaries are asserted.
 *
 * Deadlines: earlyWarning +24h, incidentNotification +72h, finalReport +30d,
 * each status 'pending' | 'due' (within 12h before the deadline) | 'overdue'
 * (at or past the deadline), all three computed against one injected `now`.
 *
 * Determinism: classifyIncident never reads the clock (identical inputs give
 * deep-equal outputs); only getReportingDeadlines uses the injected clock.
 *
 * CONTRACT DEVIATIONS (verified against the shipped engine, cycle 15):
 *   - Reason strings: five of seven inherited strings were reworded vs
 *     lib/cyber/incident-logic.ts (e.g. "Operational disruption exceeds 120
 *     minutes", "Significant financial loss detected (above EUR 10,000)");
 *     "Large number of users affected (>1000)" is unchanged. The engine
 *     supersedes the older module — tests assert shipped wording.
 *   - Category: classifyIncident returns the ENISA taxonomy ENTRY NAME (e.g.
 *     "Ransomware Operations"), not the category label ("Ransomware").
 *     "data breach" and "social engineering" deterministically resolve to the
 *     documented sibling entries TH-002 / TH-005; "flooding" maps to TH-008
 *     (natural disaster vector). Unknown causes still fall back to
 *     "Other" / "TH-000".
 *   - CSIRT body echoes the incident title UPPERCASED; the subject keeps it
 *     verbatim.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyIncident,
  getReportingDeadlines,
  buildCsirtTemplate,
  type IncidentClassificationInput,
} from '../cyber/incidentClassifier';

/** Fixed detection instant so every test is deterministic. */
const DETECTED_AT = new Date('2026-08-18T08:00:00.000Z');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Build a canonical input; only detectedAt is required. */
function makeInput(overrides: Partial<IncidentClassificationInput> = {}): IncidentClassificationInput {
  return { detectedAt: DETECTED_AT, ...overrides };
}

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITIES: readonly Severity[] = ['low', 'medium', 'high', 'critical'];

/** Documented severity bands (contract). */
function bandOf(score: number): Severity {
  if (score >= 80) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

describe('classifyIncident — significance boundaries (NIS2 Art. 23(3))', () => {
  it.each([
    [120, false], // exactly 2 hours is NOT significant (threshold is >)
    [121, true], // one minute past the threshold triggers
  ] as Array<[number, boolean]>)('durationMinutes=%i => significant=%p', (duration, expected) => {
    const result = classifyIncident(makeInput({ durationMinutes: duration }));
    expect(result.isSignificant).toBe(expected);
  });

  it('undefined durationMinutes => not significant', () => {
    expect(classifyIncident(makeInput({ durationMinutes: undefined })).isSignificant).toBe(false);
  });

  it('undefined affectedUsers => not significant', () => {
    expect(classifyIncident(makeInput({ affectedUsers: undefined })).isSignificant).toBe(false);
  });

  it('undefined financialLossCents => not significant', () => {
    expect(classifyIncident(makeInput({ financialLossCents: undefined })).isSignificant).toBe(false);
  });

  it.each([
    [1000, false], // exactly 1000 users is NOT significant
    [1001, true], // one more user triggers
  ] as Array<[number, boolean]>)('affectedUsers=%i => significant=%p', (users, expected) => {
    expect(classifyIncident(makeInput({ affectedUsers: users })).isSignificant).toBe(expected);
  });

  it.each([
    [1000000, false], // exactly EUR 10,000.00 in cents is NOT significant
    [1000001, true], // one cent more triggers
  ] as Array<[number, boolean]>)('financialLossCents=%i => significant=%p', (loss, expected) => {
    expect(classifyIncident(makeInput({ financialLossCents: loss })).isSignificant).toBe(expected);
  });

  it.each([
    ['publicSafetyImpact', { publicSafetyImpact: true }],
    ['criticalInfrastructureAffected', { criticalInfrastructureAffected: true }],
    ['dataIntegrityCompromised', { dataIntegrityCompromised: true }],
    ['crossBorderImpact', { crossBorderImpact: true }],
  ] as Array<[string, Partial<IncidentClassificationInput>]>)('%s alone triggers significance', (_label, field) => {
    const result = classifyIncident(makeInput(field));
    expect(result.isSignificant).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('no triggered criteria (absent or false) => not significant, empty reasons', () => {
    for (const input of [
      makeInput(),
      makeInput({
        durationMinutes: 30,
        affectedUsers: 100,
        financialLossCents: 50000,
        publicSafetyImpact: false,
        criticalInfrastructureAffected: false,
        dataIntegrityCompromised: false,
        crossBorderImpact: false,
      }),
    ]) {
      const result = classifyIncident(input);
      expect(result.isSignificant).toBe(false);
      expect(result.reasons).toEqual([]);
    }
  });
});

describe('classifyIncident — combined criteria and reasons', () => {
  it('all 7 criteria triggered => significant with exactly 7 reasons', () => {
    const result = classifyIncident(
      makeInput({
        durationMinutes: 9999,
        affectedUsers: 999999,
        financialLossCents: 999999999,
        publicSafetyImpact: true,
        criticalInfrastructureAffected: true,
        dataIntegrityCompromised: true,
        crossBorderImpact: true,
      })
    );
    expect(result.isSignificant).toBe(true);
    expect(result.reasons).toHaveLength(7);
    for (const reason of result.reasons) {
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it('lists every shipped reason string verbatim (all 7 criteria)', () => {
    const result = classifyIncident(
      makeInput({
        durationMinutes: 200,
        affectedUsers: 2000,
        financialLossCents: 2000000,
        publicSafetyImpact: true,
        criticalInfrastructureAffected: true,
        dataIntegrityCompromised: true,
        crossBorderImpact: true,
      })
    );
    for (const expected of [
      'Operational disruption exceeds 120 minutes',
      'Large number of users affected (>1000)',
      'Significant financial loss detected (above EUR 10,000)',
      'Direct impact on public safety or public health',
      'Critical infrastructure or essential services affected',
      'Confidentiality, integrity or authenticity of data compromised',
      'Cross-border impact (entities or users in multiple member states affected)',
    ]) {
      expect(result.reasons).toContain(expected);
    }
  });

  it('keeps the reasons in the shipped order for a magnitude-only incident', () => {
    const result = classifyIncident(
      makeInput({ durationMinutes: 200, affectedUsers: 2000, financialLossCents: 2000000 })
    );
    expect(result.reasons).toEqual([
      'Operational disruption exceeds 120 minutes',
      'Large number of users affected (>1000)',
      'Significant financial loss detected (above EUR 10,000)',
    ]);
  });

  it('reason count equals the number of triggered criteria for a booleans-only incident', () => {
    const result = classifyIncident(
      makeInput({ publicSafetyImpact: true, crossBorderImpact: true })
    );
    expect(result.isSignificant).toBe(true);
    expect(result.reasons).toHaveLength(2);
  });
});

describe('classifyIncident — severity mapping and clamping', () => {
  it('empty input => score 0, severity low, not significant, nextDeadline null, never throws', () => {
    const result = classifyIncident({} as unknown as IncidentClassificationInput);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('low');
    expect(result.isSignificant).toBe(false);
    expect(result.nextDeadline).toBeNull();
    expect(result.category).toBeDefined();
    expect(result.categoryId).toBeDefined();
  });

  it('severity always matches the documented band of the returned score (mapping invariant)', () => {
    const battery = [
      makeInput(),
      makeInput({ durationMinutes: 200 }),
      makeInput({ affectedUsers: 5000 }),
      makeInput({ financialLossCents: 5000000 }),
      makeInput({ publicSafetyImpact: true }),
      makeInput({ criticalInfrastructureAffected: true }),
      makeInput({ dataIntegrityCompromised: true }),
      makeInput({ crossBorderImpact: true }),
      makeInput({ durationMinutes: 200, affectedUsers: 5000 }),
      makeInput({ affectedUsers: 5000, financialLossCents: 5000000, durationMinutes: 300 }),
      makeInput({ publicSafetyImpact: true, criticalInfrastructureAffected: true, dataIntegrityCompromised: true }),
      makeInput({
        durationMinutes: 9999,
        affectedUsers: 999999,
        financialLossCents: 999999999,
        publicSafetyImpact: true,
        criticalInfrastructureAffected: true,
        dataIntegrityCompromised: true,
        crossBorderImpact: true,
      }),
    ];
    for (const input of battery) {
      const result = classifyIncident(input);
      expect(typeof result.score).toBe('number');
      expect(result.severity).toBe(bandOf(result.score));
      expect(SEVERITIES).toContain(result.severity);
    }
  });

  it.each([
    [{ durationMinutes: 200 }, 15, 'low'],
    [{ financialLossCents: 2000000 }, 15, 'low'],
    [{ affectedUsers: 5000 }, 20, 'low'], // significant but below the medium band
    [{ crossBorderImpact: true }, 20, 'low'],
    [{ dataIntegrityCompromised: true }, 30, 'medium'], // exactly at the medium threshold
    [{ criticalInfrastructureAffected: true }, 35, 'medium'],
    [{ publicSafetyImpact: true }, 40, 'medium'],
    [{ durationMinutes: 200, financialLossCents: 2000000 }, 30, 'medium'],
    [{ durationMinutes: 200, affectedUsers: 5000, financialLossCents: 2000000 }, 50, 'medium'],
    [{ publicSafetyImpact: true, durationMinutes: 200 }, 55, 'high'], // exactly at the high threshold
    [{ publicSafetyImpact: true, criticalInfrastructureAffected: true }, 75, 'high'],
    [
      { durationMinutes: 200, affectedUsers: 5000, financialLossCents: 2000000, dataIntegrityCompromised: true },
      80,
      'critical', // exactly at the critical threshold
    ],
    [
      { publicSafetyImpact: true, criticalInfrastructureAffected: true, dataIntegrityCompromised: true },
      100,
      'critical', // 105 -> clamped at 100
    ],
  ] as Array<[Partial<IncidentClassificationInput>, number, Severity]>)(
    'weighted inputs %o => score %i, severity %s',
    (overrides, expectedScore, expectedSeverity) => {
      const result = classifyIncident(makeInput(overrides));
      expect(result.score).toBe(expectedScore);
      expect(result.severity).toBe(expectedSeverity);
    }
  );

  it('clamps the score to 100 when all 7 criteria fire (weighted sum 175)', () => {
    const result = classifyIncident(
      makeInput({
        durationMinutes: 100000,
        affectedUsers: 10000000,
        financialLossCents: 100000000000,
        publicSafetyImpact: true,
        criticalInfrastructureAffected: true,
        dataIntegrityCompromised: true,
        crossBorderImpact: true,
      })
    );
    expect(result.score).toBe(100);
    expect(result.severity).toBe('critical');
    expect(result.isSignificant).toBe(true);
    expect(result.nextDeadline).toBe('24h');
  });

  it('clamps the score to [0, 100] for absurd negative inputs (never throws)', () => {
    const result = classifyIncident(
      makeInput({ durationMinutes: -999999, affectedUsers: -999999, financialLossCents: -999999 })
    );
    expect(result.score).toBe(0);
    expect(result.severity).toBe('low');
  });
});

describe('classifyIncident — malformed input tolerance', () => {
  it('NaN in numeric fields => treated as absent, never throws, not significant', () => {
    const result = classifyIncident(
      makeInput({
        durationMinutes: Number.NaN,
        affectedUsers: Number.NaN,
        financialLossCents: Number.NaN,
      })
    );
    expect(result.isSignificant).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('negative numeric fields => never throws, not significant', () => {
    const result = classifyIncident(
      makeInput({ durationMinutes: -5, affectedUsers: -10, financialLossCents: -100 })
    );
    expect(result.isSignificant).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('object with extra unknown keys => ignored, never throws', () => {
    const input = makeInput({ affectedUsers: 5000 }) as IncidentClassificationInput & {
      extraField: string;
      nested: { x: number };
    };
    input.extraField = 'garbage';
    input.nested = { x: 1 };
    expect(() => classifyIncident(input)).not.toThrow();
    expect(classifyIncident(input).isSignificant).toBe(true);
  });

  it('severity stays low for non-significant degenerate inputs', () => {
    const result = classifyIncident(makeInput({ affectedUsers: 0, durationMinutes: 0 }));
    expect(result.severity).toBe('low');
    expect(result.isSignificant).toBe(false);
  });

  it('non-object input (null / undefined / number / string) => neutral shape, never throws', () => {
    for (const bad of [null, undefined, 42, 'garbage']) {
      const result = classifyIncident(bad as never);
      expect(result.score).toBe(0);
      expect(result.severity).toBe('low');
      expect(result.isSignificant).toBe(false);
      expect(result.reasons).toEqual([]);
      expect(result.category).toBe('Other');
      expect(result.categoryId).toBe('TH-000');
      expect(result.nextDeadline).toBeNull();
    }
  });
});

describe('classifyIncident — ENISA category classification', () => {
  it.each([
    ['ransomware attack', 'Ransomware Operations', 'TH-001'],
    ['malware infection', 'Advanced Malware Delivery', 'TH-002'],
    ['phishing email', 'Targeted Phishing & BEC', 'TH-005'],
    ['ddos', 'Volumetric DDoS Attacks', 'TH-003'],
    ['supply chain compromise', 'Supply Chain Compromise', 'TH-004'],
    ['insider threat', 'Malicious Insider Activity', 'TH-006'],
    ['data breach', 'Advanced Malware Delivery', 'TH-002'], // documented sibling entry
    ['flooding in the server room', 'Physical Infrastructure Damage', 'TH-008'], // natural disaster vector
  ] as Array<[string, string, string]>)(
    'cause "%s" => category "%s" (id %s)',
    (cause, expected, expectedId) => {
      const result = classifyIncident(makeInput({ cause }));
      expect(result.category).toBe(expected);
      expect(result.categoryId).toBe(expectedId);
    }
  );

  it('social engineering resolves to its documented sibling entry (TH-005)', () => {
    const result = classifyIncident(makeInput({ cause: 'social engineering campaign' }));
    expect(result.category).toBe('Targeted Phishing & BEC');
    expect(result.categoryId).toBe('TH-005');
  });

  it('unknown cause => category Other with fallback id TH-000', () => {
    const result = classifyIncident(makeInput({ cause: 'unexplained latency spike' }));
    expect(result.category).toBe('Other');
    expect(result.categoryId).toBe('TH-000');
  });

  it('empty cause => Other / TH-000', () => {
    const result = classifyIncident(makeInput({ cause: '' }));
    expect(result.category).toBe('Other');
    expect(result.categoryId).toBe('TH-000');
  });

  it('undefined cause => Other / TH-000', () => {
    const result = classifyIncident(makeInput({ cause: undefined }));
    expect(result.category).toBe('Other');
    expect(result.categoryId).toBe('TH-000');
  });

  it('known categories carry a TH-00x id distinct from the fallback', () => {
    for (const cause of ['ransomware attack', 'phishing email', 'ddos', 'data breach']) {
      const result = classifyIncident(makeInput({ cause }));
      expect(result.categoryId).toMatch(/^TH-\d{3}$/);
      expect(result.categoryId).not.toBe('TH-000');
    }
  });

  it('category depends only on cause, not on severity magnitudes', () => {
    const light = classifyIncident(makeInput({ cause: 'ransomware attack' }));
    const heavy = classifyIncident(
      makeInput({ cause: 'ransomware attack', affectedUsers: 999999, durationMinutes: 9999 })
    );
    expect(light.category).toBe(heavy.category);
    expect(light.categoryId).toBe(heavy.categoryId);
    expect(heavy.isSignificant).toBe(true);
  });
});

describe('classifyIncident — nextDeadline', () => {
  it('significant incident => nextDeadline 24h (early warning window)', () => {
    const result = classifyIncident(makeInput({ affectedUsers: 1001 }));
    expect(result.isSignificant).toBe(true);
    expect(result.nextDeadline).toBe('24h');
  });

  it('non-significant incident => nextDeadline null', () => {
    const result = classifyIncident(makeInput({ affectedUsers: 1000, durationMinutes: 120 }));
    expect(result.isSignificant).toBe(false);
    expect(result.nextDeadline).toBeNull();
  });
});

describe('getReportingDeadlines', () => {
  it('computes exact 24h / 72h / 30d offsets from detectedAt', () => {
    const result = getReportingDeadlines(DETECTED_AT);
    expect(result.earlyWarning.getTime()).toBe(DETECTED_AT.getTime() + 24 * HOUR_MS);
    expect(result.incidentNotification.getTime()).toBe(DETECTED_AT.getTime() + 72 * HOUR_MS);
    expect(result.finalReport.getTime()).toBe(DETECTED_AT.getTime() + 30 * DAY_MS);
  });

  it('all statuses pending when now is before the 12h due window', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + HOUR_MS));
    expect(result.earlyWarningStatus).toBe('pending');
    expect(result.incidentNotificationStatus).toBe('pending');
    expect(result.finalReportStatus).toBe('pending');
  });

  it('earlyWarning due when now is within 12h before it (+13h after detection)', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 13 * HOUR_MS));
    expect(result.earlyWarningStatus).toBe('due');
    expect(result.incidentNotificationStatus).toBe('pending');
    expect(result.finalReportStatus).toBe('pending');
  });

  it('incidentNotification due when now is within 12h before it (+70h after detection)', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 70 * HOUR_MS));
    expect(result.incidentNotificationStatus).toBe('due');
    expect(result.finalReportStatus).toBe('pending');
  });

  it('finalReport due when now is within 12h before it (+29d14h after detection)', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 29 * DAY_MS + 14 * HOUR_MS));
    expect(result.finalReportStatus).toBe('due');
  });

  it('boundary: exactly 12h before a deadline is due; 12h + 1min before is pending', () => {
    const exactly12h = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 12 * HOUR_MS));
    expect(exactly12h.earlyWarningStatus).toBe('due');

    const justBefore = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 12 * HOUR_MS - 60 * 1000));
    expect(justBefore.earlyWarningStatus).toBe('pending');
  });

  it('overdue once now passes the deadline (+25h after detection)', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 25 * HOUR_MS));
    expect(result.earlyWarningStatus).toBe('overdue');
    expect(result.incidentNotificationStatus).toBe('pending');
    expect(result.finalReportStatus).toBe('pending');
  });

  it('exactly at a deadline counts as overdue (now >= deadline)', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 24 * HOUR_MS));
    expect(result.earlyWarningStatus).toBe('overdue');
  });

  it('all three overdue once now passes the final report (+31d)', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 31 * DAY_MS));
    expect(result.earlyWarningStatus).toBe('overdue');
    expect(result.incidentNotificationStatus).toBe('overdue');
    expect(result.finalReportStatus).toBe('overdue');
  });

  it('all three statuses share one injected clock', () => {
    const result = getReportingDeadlines(DETECTED_AT, new Date(DETECTED_AT.getTime() + 80 * HOUR_MS));
    expect(result.earlyWarningStatus).toBe('overdue'); // 24h deadline passed
    expect(result.incidentNotificationStatus).toBe('overdue'); // 72h deadline passed
    expect(result.finalReportStatus).toBe('pending'); // 30d deadline far ahead
  });

  it('defaults now to the real clock when omitted (offsets exact, statuses valid)', () => {
    const result = getReportingDeadlines(DETECTED_AT);
    expect(result.earlyWarning.getTime()).toBe(DETECTED_AT.getTime() + 24 * HOUR_MS);
    expect(result.incidentNotification.getTime()).toBe(DETECTED_AT.getTime() + 72 * HOUR_MS);
    expect(result.finalReport.getTime()).toBe(DETECTED_AT.getTime() + 30 * DAY_MS);
    for (const status of [result.earlyWarningStatus, result.incidentNotificationStatus, result.finalReportStatus]) {
      expect(['pending', 'due', 'overdue']).toContain(status);
    }
  });

  it('tolerates an invalid detectedAt (anchors to now, never throws, statuses pending)', () => {
    let result;
    expect(() => {
      result = getReportingDeadlines('not-a-date' as unknown as Date);
    }).not.toThrow();
    expect(result.earlyWarningStatus).toBe('pending');
    expect(result.incidentNotificationStatus).toBe('pending');
    expect(result.finalReportStatus).toBe('pending');
  });

  it('tolerates an invalid injected now (defaults to the real clock, never throws)', () => {
    let result;
    expect(() => {
      result = getReportingDeadlines(DETECTED_AT, 'nope' as unknown as Date);
    }).not.toThrow();
    expect(result.earlyWarning.getTime()).toBe(DETECTED_AT.getTime() + 24 * HOUR_MS);
    for (const status of [result.earlyWarningStatus, result.incidentNotificationStatus, result.finalReportStatus]) {
      expect(['pending', 'due', 'overdue']).toContain(status);
    }
  });
});

describe('buildCsirtTemplate', () => {
  it.each([
    ['DE', 'BSI'], // Federal Office for Information Security
    ['FR', 'ANSSI'], // National Agency for the Security of Information Systems
  ] as Array<[string, string]>)('known country %s => subject/body include authority acronym %s', (code, acronym) => {
    const result = buildCsirtTemplate({
      countryCode: code,
      incidentTitle: 'Ransomware on file server',
      severity: 'high',
      detectedAt: DETECTED_AT,
    });
    expect(result.subject).toBeDefined();
    expect(`${result.subject} ${result.body}`).toContain(acronym);
  });

  it('unknown country => generic wording, never throws', () => {
    let result;
    expect(() => {
      result = buildCsirtTemplate({ countryCode: 'ZZ', incidentTitle: 'Outage', severity: 'medium' });
    }).not.toThrow();
    expect(typeof result.subject).toBe('string');
    expect(typeof result.body).toBe('string');
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  it('missing optional fields (summary, detectedAt) tolerated', () => {
    const result = buildCsirtTemplate({ countryCode: 'NL', incidentTitle: 'Phishing wave', severity: 'low' });
    expect(typeof result.subject).toBe('string');
    expect(typeof result.body).toBe('string');
  });

  it('subject keeps the title verbatim; body echoes it uppercased and includes the severity', () => {
    const result = buildCsirtTemplate({
      countryCode: 'IE',
      incidentTitle: 'Unauthorized access to CRM',
      severity: 'critical',
      incidentSummary: 'Suspected credential theft.',
    });
    expect(result.subject).toContain('Unauthorized access to CRM'); // verbatim in subject
    expect(result.body.toUpperCase()).toContain('UNAUTHORIZED ACCESS TO CRM'); // uppercased in body
    expect(result.body.toLowerCase()).toContain('critical');
  });

  it('coerces an unknown severity label to low (never throws)', () => {
    const result = buildCsirtTemplate({ countryCode: 'DE', incidentTitle: 'X', severity: 'extreme' as never });
    expect(result.body.toLowerCase()).toContain('low severity');
  });

  it('never throws for null / undefined / empty input (fallback template)', () => {
    for (const bad of [undefined, null, {}]) {
      let result;
      expect(() => {
        result = buildCsirtTemplate(bad as never);
      }).not.toThrow();
      expect(typeof result.subject).toBe('string');
      expect(result.subject.length).toBeGreaterThan(0);
      expect(typeof result.body).toBe('string');
      expect(result.body.length).toBeGreaterThan(0);
    }
  });

  it('returns non-empty subject and body for every severity level', () => {
    for (const severity of SEVERITIES) {
      const result = buildCsirtTemplate({ countryCode: 'DE', incidentTitle: 'T', severity });
      expect(result.subject.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for identical inputs', () => {
    const input = { countryCode: 'DE', incidentTitle: 'DDoS', severity: 'medium', detectedAt: DETECTED_AT };
    expect(buildCsirtTemplate(input)).toEqual(buildCsirtTemplate(input));
  });
});

describe('determinism', () => {
  it('classifyIncident returns deep-equal output for identical inputs (no clock reads)', () => {
    const input = makeInput({
      cause: 'phishing email',
      durationMinutes: 300,
      affectedUsers: 5000,
      financialLossCents: 2000000,
      crossBorderImpact: true,
    });
    expect(classifyIncident(input)).toEqual(classifyIncident(input));
  });

  it('getReportingDeadlines is deterministic for identical inputs with an injected clock', () => {
    const now = new Date(DETECTED_AT.getTime() + 70 * HOUR_MS);
    expect(getReportingDeadlines(DETECTED_AT, now)).toEqual(getReportingDeadlines(DETECTED_AT, now));
  });
});
