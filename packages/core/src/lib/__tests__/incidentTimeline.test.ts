/**
 * NIS2 incident timeline management engine (lib/cyber/incidentTimeline.ts) —
 * unit/contract tests (QA cycle 16, NIS2 Phase 2 Task 2.2).
 *
 * The engine is being built in parallel by the backend agent; these tests
 * encode the documented contract and run the moment incidentTimeline.ts
 * lands. TDD-style: every assertion below is derived from the contract, not
 * from a shipped implementation.
 *
 * Contract under test (engine surface):
 *   buildIncidentTimeline(input) -> IncidentTimeline
 *     - always exactly 4 phases in order: detection, early-warning,
 *       notification, final-report; labels "Detection", "Early warning",
 *       "Incident notification", "Final report".
 *     - deadline math (same as incidentClassifier.getReportingDeadlines):
 *       early-warning at detectedAt+24h; notification at detectedAt+72h;
 *       final-report at detectedAt+30d.
 *     - detection is always "completed". A reporting phase is "completed"
 *       when its sentAt is present AND <= now; "current" = the first phase
 *       not completed (in order); "upcoming" = the rest. All sentAt present
 *       and <= now => all completed, currentPhase "final-report",
 *       isComplete true.
 *     - malformed/non-object input or invalid detectedAt => the exported
 *       EMPTY_INCIDENT_TIMELINE shape; never throws.
 *     - injectable clock: `now` pinned in the future/past flips statuses
 *       deterministically (sentAt <= now comparison).
 *     - deterministic: identical inputs => deep-equal output.
 *
 *   computeEscalations(input) -> EscalationTrigger[]
 *     - isSignificant false       => exactly one trigger, id "monitor",
 *       level "info".
 *     - isSignificant true + severity "high"/"critical" + notification not
 *       sent => id "sev-escalation" (level "warning") appears.
 *     - 12h due windows: "ew-due"/"notif-due"/"final-due" (level "warning")
 *       when now is within 12h before the respective deadline and that
 *       report is not sent. Boundaries mirror incidentClassifier: the due
 *       window starts exactly 12h before the deadline; a deadline that has
 *       been reached is "overdue", not "due".
 *     - overdue: "ew-overdue"/"notif-overdue"/"final-overdue" (level
 *       "critical") when now >= the respective deadline and not sent;
 *       dueBy === the deadline date.
 *     - all sent (finalReportSentAt present, all <= now) => "complete"
 *       (level "info") trigger present.
 *     - never throws on malformed input; never duplicates an id; stable
 *       order.
 *
 * NOT pinned (engine-owned, outside the contract): trigger title/detail
 * wording, the exact dates inside EMPTY_INCIDENT_TIMELINE, and the exact
 * escalation output for input states the contract leaves open (asserted
 * only as absence of the named triggers).
 *
 * VERIFIED against the shipped engine (cycle 16, after the backend landed
 * both files in parallel): EMPTY_INCIDENT_TIMELINE ships with all four
 * phases "upcoming", currentPhase "detection", isComplete false, and
 * clock-anchored `at` dates — the "detection is always completed" rule
 * applies to buildIncidentTimeline output for real inputs, not to the
 * static neutral constant. All other assertions above hold against the
 * shipped implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  buildIncidentTimeline,
  computeEscalations,
  EMPTY_INCIDENT_TIMELINE,
  type EscalationTrigger,
  type IncidentTimelineInput,
} from '../cyber/incidentTimeline';

/** Fixed detection instant so every test is deterministic. */
const DETECTED_AT = new Date('2026-08-18T08:00:00.000Z');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PHASE_IDS = ['detection', 'early-warning', 'notification', 'final-report'] as const;

/** Build a canonical timeline input; only detectedAt is required. */
function makeInput(overrides: Partial<IncidentTimelineInput> = {}): IncidentTimelineInput {
  return { detectedAt: DETECTED_AT, ...overrides };
}

/** Map an escalation list down to its trigger ids (preserving order). */
function idsOf(triggers: EscalationTrigger[]): string[] {
  return triggers.map((t) => t.id);
}

describe('EMPTY_INCIDENT_TIMELINE — neutral safe shape', () => {
  it('has the four documented phases in order, isComplete false, structurally valid phases', () => {
    // The contract pins the EMPTY shape only structurally; the shipped engine
    // (verified this cycle) uses all-'upcoming' statuses with currentPhase
    // "detection" and clock-anchored `at` dates — none of which is asserted
    // here so the neutral shape stays ship-proof. buildIncidentTimeline must
    // deep-equal this constant on malformed input (asserted below).
    expect(EMPTY_INCIDENT_TIMELINE.phases.map((p) => p.id)).toEqual([...PHASE_IDS]);
    expect(EMPTY_INCIDENT_TIMELINE.isComplete).toBe(false);
    expect([...PHASE_IDS]).toContain(EMPTY_INCIDENT_TIMELINE.currentPhase);
    for (const phase of EMPTY_INCIDENT_TIMELINE.phases) {
      expect(phase.at).toBeInstanceOf(Date);
      expect(typeof phase.label).toBe('string');
      expect(['completed', 'current', 'upcoming']).toContain(phase.status);
    }
  });
});

describe('buildIncidentTimeline — phase structure and deadlines', () => {
  it('always returns exactly 4 phases in order with the documented ids and labels', () => {
    const result = buildIncidentTimeline(makeInput({ now: DETECTED_AT }));
    expect(result.phases.map((p) => p.id)).toEqual(['detection', 'early-warning', 'notification', 'final-report']);
    expect(result.phases.map((p) => p.label)).toEqual([
      'Detection',
      'Early warning',
      'Incident notification',
      'Final report',
    ]);
    expect(result.phases).toHaveLength(4);
    for (const phase of result.phases) {
      expect(phase.at).toBeInstanceOf(Date);
      expect(typeof phase.id).toBe('string');
      expect(['completed', 'current', 'upcoming']).toContain(phase.status);
    }
  });

  it('computes the NIS2 deadlines from detectedAt (+24h / +72h / +30d)', () => {
    const result = buildIncidentTimeline(makeInput({ now: DETECTED_AT }));
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId['detection'].at.getTime()).toBe(DETECTED_AT.getTime());
    expect(byId['early-warning'].at.getTime()).toBe(DETECTED_AT.getTime() + 24 * HOUR_MS);
    expect(byId['notification'].at.getTime()).toBe(DETECTED_AT.getTime() + 72 * HOUR_MS);
    expect(byId['final-report'].at.getTime()).toBe(DETECTED_AT.getTime() + 30 * DAY_MS);
  });

  it('nothing sent => detection completed, early-warning current, rest upcoming, currentPhase early-warning', () => {
    const result = buildIncidentTimeline(makeInput({ now: DETECTED_AT }));
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId['detection'].status).toBe('completed');
    expect(byId['early-warning'].status).toBe('current');
    expect(byId['notification'].status).toBe('upcoming');
    expect(byId['final-report'].status).toBe('upcoming');
    expect(result.currentPhase).toBe('early-warning');
    expect(result.isComplete).toBe(false);
  });
});

describe('buildIncidentTimeline — reporting-phase statuses (sentAt vs injected now)', () => {
  it('early warning sent (<= now) => completed; notification becomes current', () => {
    const result = buildIncidentTimeline(
      makeInput({ earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS), now: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS) })
    );
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId['detection'].status).toBe('completed');
    expect(byId['early-warning'].status).toBe('completed');
    expect(byId['notification'].status).toBe('current');
    expect(byId['final-report'].status).toBe('upcoming');
    expect(result.currentPhase).toBe('notification');
    expect(result.isComplete).toBe(false);
  });

  it('early warning and notification sent => final report becomes current, still not complete', () => {
    const result = buildIncidentTimeline(
      makeInput({
        earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
        notificationSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
        now: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS),
      })
    );
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId['early-warning'].status).toBe('completed');
    expect(byId['notification'].status).toBe('completed');
    expect(byId['final-report'].status).toBe('current');
    expect(result.currentPhase).toBe('final-report');
    expect(result.isComplete).toBe(false);
  });

  it('all three sentAt present (and <= now) => all completed, currentPhase final-report, isComplete true', () => {
    const result = buildIncidentTimeline(
      makeInput({
        earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
        notificationSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
        finalReportSentAt: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS),
        now: new Date(DETECTED_AT.getTime() + 4 * HOUR_MS),
      })
    );
    expect(result.phases.every((p) => p.status === 'completed')).toBe(true);
    expect(result.currentPhase).toBe('final-report');
    expect(result.isComplete).toBe(true);
  });

  it('injectable clock: a sentAt in the future does not complete the phase; the same input with a later now flips it', () => {
    const base = makeInput({ earlyWarningSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS) });

    const beforeSent = buildIncidentTimeline({ ...base, now: new Date(DETECTED_AT.getTime() + HOUR_MS) });
    const byIdBefore = Object.fromEntries(beforeSent.phases.map((p) => [p.id, p]));
    expect(byIdBefore['early-warning'].status).toBe('current'); // sentAt (D+2h) > now (D+1h) => not completed
    expect(beforeSent.currentPhase).toBe('early-warning');
    expect(beforeSent.isComplete).toBe(false);

    const afterSent = buildIncidentTimeline({ ...base, now: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS) });
    const byIdAfter = Object.fromEntries(afterSent.phases.map((p) => [p.id, p]));
    expect(byIdAfter['early-warning'].status).toBe('completed'); // sentAt (D+2h) <= now (D+3h) => completed
    expect(afterSent.currentPhase).toBe('notification');
  });
});

describe('buildIncidentTimeline — malformed input tolerance', () => {
  it('null / undefined / non-object / missing or invalid detectedAt => EMPTY_INCIDENT_TIMELINE, never throws', () => {
    const badInputs = [
      null,
      undefined,
      {},
      42,
      'garbage',
      { detectedAt: 'not-a-date' },
      { detectedAt: new Date('nope') },
      { detectedAt: null },
    ];
    for (const bad of badInputs) {
      let result;
      expect(() => {
        result = buildIncidentTimeline(bad as never);
      }).not.toThrow();
      expect(result).toEqual(EMPTY_INCIDENT_TIMELINE);
    }
  });
});

describe('buildIncidentTimeline — determinism', () => {
  it('identical inputs produce deep-equal timelines', () => {
    const input = makeInput({
      earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
      notificationSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
      finalReportSentAt: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS),
      now: new Date(DETECTED_AT.getTime() + 4 * HOUR_MS),
    });
    expect(buildIncidentTimeline(input)).toEqual(buildIncidentTimeline(input));
  });
});

describe('computeEscalations — monitor trigger (isSignificant false)', () => {
  it('isSignificant false => exactly one trigger, id "monitor", level "info"', () => {
    for (const input of [
      makeInput({ isSignificant: false, severity: 'critical', now: DETECTED_AT }),
      makeInput({ isSignificant: false, now: DETECTED_AT }),
      makeInput({ now: DETECTED_AT }), // isSignificant omitted => falsy
    ]) {
      const result = computeEscalations(input);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('monitor');
      expect(result[0].level).toBe('info');
    }
  });
});

describe('computeEscalations — severity escalation (sev-escalation)', () => {
  it.each(['high', 'critical'] as const)(
    'isSignificant true + severity "%s" + notification not sent => exactly ["sev-escalation"] (warning)',
    (severity) => {
      const result = computeEscalations(makeInput({ isSignificant: true, severity, now: DETECTED_AT }));
      expect(idsOf(result)).toEqual(['sev-escalation']);
      expect(result[0].level).toBe('warning');
    }
  );

  it('no sev-escalation for low/medium severity even when significant', () => {
    for (const severity of ['low', 'medium'] as const) {
      const ids = idsOf(computeEscalations(makeInput({ isSignificant: true, severity, now: DETECTED_AT })));
      expect(ids).not.toContain('sev-escalation');
    }
  });

  it('no sev-escalation once the notification has been sent', () => {
    const ids = idsOf(
      computeEscalations(
        makeInput({
          isSignificant: true,
          severity: 'high',
          notificationSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
          now: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
        })
      )
    );
    expect(ids).not.toContain('sev-escalation');
  });
});

describe('computeEscalations — 12h due windows (ew-due / notif-due / final-due)', () => {
  it('ew-due fires while now is inside the 12h window before the 24h deadline (nothing sent)', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 13 * HOUR_MS) })
    );
    const ids = idsOf(result);
    expect(ids).toContain('ew-due');
    expect(result.find((t) => t.id === 'ew-due')?.level).toBe('warning');
    expect(ids).toContain('sev-escalation');
    expect(ids).not.toContain('ew-overdue');
  });

  it('boundary: exactly 12h before the deadline counts as due (mirrors incidentClassifier)', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 12 * HOUR_MS) })
    );
    expect(idsOf(result)).toContain('ew-due');
  });

  it('notif-due fires inside the 12h window before the 72h deadline', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 70 * HOUR_MS) })
    );
    const ids = idsOf(result);
    expect(ids).toContain('notif-due');
    expect(result.find((t) => t.id === 'notif-due')?.level).toBe('warning');
    // the 24h early warning was never sent and is already past => overdue, not due
    expect(ids).toContain('ew-overdue');
  });

  it('final-due fires inside the 12h window before the 30d deadline', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 29 * DAY_MS + 14 * HOUR_MS) })
    );
    const ids = idsOf(result);
    expect(ids).toContain('final-due');
    expect(result.find((t) => t.id === 'final-due')?.level).toBe('warning');
    expect(ids).not.toContain('final-overdue');
  });
});

describe('computeEscalations — overdue triggers (ew-overdue / notif-overdue / final-overdue)', () => {
  it('ew-overdue fires once now >= the 24h deadline (critical, dueBy = deadline)', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 25 * HOUR_MS) })
    );
    const trigger = result.find((t) => t.id === 'ew-overdue');
    expect(trigger).toBeDefined();
    expect(trigger?.level).toBe('critical');
    expect(trigger?.dueBy).toEqual(new Date(DETECTED_AT.getTime() + 24 * HOUR_MS));
    expect(idsOf(result)).not.toContain('ew-due');
  });

  it('boundary: exactly at the 24h deadline counts as overdue, not due', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 24 * HOUR_MS) })
    );
    const ids = idsOf(result);
    expect(ids).toContain('ew-overdue');
    expect(ids).not.toContain('ew-due');
  });

  it('notif-overdue fires once now >= the 72h deadline (dueBy = deadline)', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'high', now: new Date(DETECTED_AT.getTime() + 73 * HOUR_MS) })
    );
    const trigger = result.find((t) => t.id === 'notif-overdue');
    expect(trigger).toBeDefined();
    expect(trigger?.level).toBe('critical');
    expect(trigger?.dueBy).toEqual(new Date(DETECTED_AT.getTime() + 72 * HOUR_MS));
  });

  it('final-overdue fires once now >= the 30d deadline (dueBy = deadline)', () => {
    const result = computeEscalations(
      makeInput({ isSignificant: true, severity: 'critical', now: new Date(DETECTED_AT.getTime() + 31 * DAY_MS) })
    );
    const trigger = result.find((t) => t.id === 'final-overdue');
    expect(trigger).toBeDefined();
    expect(trigger?.level).toBe('critical');
    expect(trigger?.dueBy).toEqual(new Date(DETECTED_AT.getTime() + 30 * DAY_MS));
  });

  it('an overdue trigger is suppressed once that report has been sent', () => {
    const ids = idsOf(
      computeEscalations(
        makeInput({
          isSignificant: true,
          severity: 'high',
          earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
          now: new Date(DETECTED_AT.getTime() + 25 * HOUR_MS),
        })
      )
    );
    expect(ids).not.toContain('ew-overdue');
    expect(ids).not.toContain('ew-due');
    expect(ids).toContain('sev-escalation'); // notification still unsent
  });
});

describe('computeEscalations — completion (complete)', () => {
  it('all sentAt present (and <= now) => exactly one trigger, id "complete", level "info"', () => {
    const result = computeEscalations(
      makeInput({
        isSignificant: true,
        severity: 'high',
        earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
        notificationSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
        finalReportSentAt: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS),
        now: new Date(DETECTED_AT.getTime() + 4 * HOUR_MS),
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('complete');
    expect(result[0].level).toBe('info');
  });

  it('no "complete" while the final report is still pending', () => {
    const ids = idsOf(
      computeEscalations(
        makeInput({
          isSignificant: true,
          severity: 'high',
          earlyWarningSentAt: new Date(DETECTED_AT.getTime() + HOUR_MS),
          notificationSentAt: new Date(DETECTED_AT.getTime() + 2 * HOUR_MS),
          now: new Date(DETECTED_AT.getTime() + 3 * HOUR_MS),
        })
      )
    );
    expect(ids).not.toContain('complete');
    expect(ids).not.toContain('sev-escalation');
  });
});

describe('computeEscalations — malformed input, uniqueness, stable order', () => {
  it('never throws on malformed input; returns an array of well-formed triggers with unique ids', () => {
    const badInputs = [null, undefined, {}, 42, 'garbage', { detectedAt: 'not-a-date' }, { detectedAt: new Date('nope') }];
    for (const bad of badInputs) {
      let result;
      expect(() => {
        result = computeEscalations(bad as never);
      }).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
      const ids = idsOf(result);
      expect(new Set(ids).size).toBe(ids.length); // no duplicates
      for (const trigger of result) {
        expect(typeof trigger.id).toBe('string');
        expect(trigger.id.length).toBeGreaterThan(0);
        expect(['info', 'warning', 'critical']).toContain(trigger.level);
        expect(typeof trigger.title).toBe('string');
        expect(trigger.title.length).toBeGreaterThan(0);
        expect(typeof trigger.detail).toBe('string');
        expect(trigger.detail.length).toBeGreaterThan(0);
        if (trigger.dueBy !== undefined) expect(trigger.dueBy).toBeInstanceOf(Date);
      }
    }
  });

  it('never duplicates an id and keeps a stable order in the maximal scenario', () => {
    const input = makeInput({ isSignificant: true, severity: 'critical', now: new Date(DETECTED_AT.getTime() + 31 * DAY_MS) });
    const first = computeEscalations(input);
    const second = computeEscalations(input);

    expect(first).toEqual(second); // stable order + deterministic output

    const ids = idsOf(first);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    for (const expected of ['sev-escalation', 'ew-overdue', 'notif-overdue', 'final-overdue']) {
      expect(ids).toContain(expected);
    }
    for (const trigger of first) {
      expect(['info', 'warning', 'critical']).toContain(trigger.level);
      expect(typeof trigger.title).toBe('string');
      expect(typeof trigger.detail).toBe('string');
    }
  });
});
