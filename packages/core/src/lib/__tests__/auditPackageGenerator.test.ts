import { describe, it, expect } from 'vitest';
import {
  computePassRate,
  buildControlsCsv,
  buildAuditManifestJson,
  AuditPackageError,
} from '../../lib/reporting/auditPackageGenerator';

/**
 * Audit package generator (lib/reporting/auditPackageGenerator.ts) — pure
 * helper contract tests (QA cycle 13, scorecard #9). The helpers extracted
 * during cycle-13 hardening are deterministic and DB-free:
 *   - computePassRate       0-100, never NaN, empty list => 100
 *   - buildControlsCsv      header + quoted rows, embedded quotes escaped
 *   - buildAuditManifestJson structured machine-readable payload
 *   - AuditPackageError     structured error code
 * The full ZIP/PDF pipeline (archiver + pdfkit) is not unit-tested here
 * because it requires a live DB; the router translates AuditPackageError
 * into TRPCErrors (NOT_FOUND / INTERNAL_SERVER_ERROR).
 */

describe('computePassRate', () => {
  it('computes a rounded 0-100 rate', () => {
    expect(computePassRate(3, 10)).toBe(30);
    expect(computePassRate(82, 100)).toBe(82);
    expect(computePassRate(0, 4)).toBe(0);
  });

  it('returns 100 for an empty control list (never NaN)', () => {
    expect(computePassRate(0, 0)).toBe(100);
    expect(computePassRate(0, -1)).toBe(100);
  });

  it('is finite for any input', () => {
    expect(Number.isFinite(computePassRate(1, 3))).toBe(true);
  });
});

describe('buildControlsCsv', () => {
  const rows = [
    { id: 1, controlId: 'CC1.1', name: 'Access Control', category: 'Access', status: 'implemented', applicability: 'Yes', justification: 'Done "early"', owner: 'Alice' },
    { id: 2, controlId: null, name: null, category: null, status: 'draft' },
  ];

  it('includes the header row', () => {
    const csv = buildControlsCsv(rows);
    expect(csv.split('\n')[0]).toBe('Control ID,Control Name,Category,Status,Applicability,Justification,Owner');
  });

  it('quotes names/justifications and escapes embedded quotes', () => {
    const csv = buildControlsCsv(rows);
    expect(csv).toContain('"Done ""early"""');
  });

  it('falls back to the numeric id when controlId is absent', () => {
    const csv = buildControlsCsv(rows);
    expect(csv).toContain('2,"",,draft,,"",');
  });
});

describe('buildAuditManifestJson', () => {
  const controls = [
    { id: 1, controlId: 'A1', status: 'implemented' },
    { id: 2, controlId: 'A2', status: 'not_implemented' },
  ];

  it('builds the summary counts from the control/evidence arrays', () => {
    const raw = buildAuditManifestJson({
      client: { id: 7, name: 'Acme' },
      framework: 'SOC2',
      controls,
      evidence: [{ id: 1 }, { id: 2 }],
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    const parsed = JSON.parse(raw);
    expect(parsed.client).toEqual({ id: 7, name: 'Acme' });
    expect(parsed.framework).toBe('SOC2');
    expect(parsed.summary).toEqual({ totalControls: 2, implementedCount: 1, evidenceCount: 2 });
    expect(parsed.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('defaults generatedAt to now (valid ISO)', () => {
    const raw = buildAuditManifestJson({ client: { id: 1, name: 'X' }, framework: 'ISO27001', controls: [], evidence: [] });
    const parsed = JSON.parse(raw);
    expect(new Date(parsed.generatedAt).getTime()).not.toBeNaN();
  });
});

describe('AuditPackageError', () => {
  it('carries a structured code', () => {
    const err = new AuditPackageError('CLIENT_NOT_FOUND', 'Client #9 not found.');
    expect(err.code).toBe('CLIENT_NOT_FOUND');
    expect(err.message).toContain('Client #9');
    expect(err.name).toBe('AuditPackageError');
    expect(err).toBeInstanceOf(Error);
  });

  it('supports DB_UNAVAILABLE and GENERATION_FAILED codes', () => {
    expect(new AuditPackageError('DB_UNAVAILABLE', 'x').code).toBe('DB_UNAVAILABLE');
    expect(new AuditPackageError('GENERATION_FAILED', 'x').code).toBe('GENERATION_FAILED');
  });
});
