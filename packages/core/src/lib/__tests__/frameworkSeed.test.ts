import { describe, it, expect, vi } from 'vitest';

/**
 * frameworkSeed tests — manifest shape + idempotent apply against a mocked db.
 * No live connection.
 */
const mocks = vi.hoisted(() => ({
  controlsTable: {
    id: 'controls.id',
    controlId: 'controls.controlId',
    name: 'controls.name',
    description: 'controls.description',
    framework: 'controls.framework',
    category: 'controls.category',
    status: 'controls.status',
    version: 'controls.version',
  },
}));

vi.mock('../../schema', () => ({ controls: mocks.controlsTable }));

import {
  FRAMEWORK_SEED_MANIFESTS,
  HIPAA_CONTROLS,
  PCI_DSS_V4_CONTROLS,
  SOC2_ADDITIONAL_CONTROLS,
  SOX_CONTROLS,
  applyFrameworkControls,
  listSeedControls,
  validateFrameworkManifest,
} from '../frameworkSeed';
import type { FrameworkControlManifest } from '../frameworkSeed';

// ---------------------------------------------------------------------------
// Manifest shape
// ---------------------------------------------------------------------------

describe('framework seed manifests', () => {
  const manifests: Record<string, FrameworkControlManifest[]> = FRAMEWORK_SEED_MANIFESTS;

  it('covers the four required frameworks', () => {
    expect(Object.keys(manifests).sort()).toEqual(['HIPAA', 'PCI DSS v4', 'SOC 2', 'SOX']);
  });

  it.each([
    ['SOC 2', SOC2_ADDITIONAL_CONTROLS],
    ['PCI DSS v4', PCI_DSS_V4_CONTROLS],
    ['HIPAA', HIPAA_CONTROLS],
    ['SOX', SOX_CONTROLS],
  ])('%s has between 8 and 12 controls', (_name, list) => {
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.length).toBeLessThanOrEqual(12);
  });

  it('every control matches the controls-table shape and passes validation', () => {
    const all = listSeedControls();
    const { ok, errors } = validateFrameworkManifest(all);
    expect(errors).toEqual([]);
    expect(ok).toBe(true);

    for (const c of all) {
      expect(c).toMatchObject({
        status: 'active',
        version: 1,
      });
      expect(typeof c.controlId).toBe('string');
      expect(c.controlId.length).toBeGreaterThan(0);
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      expect(typeof c.description).toBe('string');
      expect(c.description.length).toBeGreaterThan(0);
      expect(typeof c.framework).toBe('string');
      expect(typeof c.category).toBe('string');
    }
  });

  it('control ids are unique across all frameworks (ON CONFLICT safety)', () => {
    const ids = listSeedControls().map((c) => c.controlId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('framework field is consistent within each manifest', () => {
    for (const [framework, list] of Object.entries(manifests)) {
      for (const c of list) expect(c.framework).toBe(framework);
    }
  });

  it('detects duplicate ids and invalid versions in a malformed manifest', () => {
    const bad = [
      { ...SOC2_ADDITIONAL_CONTROLS[0] },
      { ...SOC2_ADDITIONAL_CONTROLS[0], version: 2 },
      { ...SOC2_ADDITIONAL_CONTROLS[1], controlId: SOC2_ADDITIONAL_CONTROLS[0].controlId },
      { ...SOC2_ADDITIONAL_CONTROLS[2], status: 'inactive' as const },
    ];
    const { ok, errors } = validateFrameworkManifest(bad as FrameworkControlManifest[]);
    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
    expect(errors.some((e) => e.includes('version must be 1'))).toBe(true);
    expect(errors.some((e) => e.includes('status must be "active"'))).toBe(true);
  });

  it('flags non-object entries, missing controlId and missing required fields', () => {
    const base = SOC2_ADDITIONAL_CONTROLS[0];
    const bad = [
      null,
      'not-an-object',
      { ...base, controlId: '' },
      { ...base, name: '' },
      { ...base, description: undefined },
      { ...base, framework: null },
      { ...base, category: '' },
    ];
    const { ok, errors } = validateFrameworkManifest(bad as unknown as FrameworkControlManifest[]);
    expect(ok).toBe(false);
    const joined = errors.join('\n');
    expect(joined).toContain('non-object entry');
    expect(joined).toContain('missing string controlId');
    expect(joined).toContain('missing name');
    expect(joined).toContain('missing description');
    expect(joined).toContain('missing framework');
    expect(joined).toContain('missing category');
  });

  it('accepts empty or undefined manifests as valid', () => {
    expect(validateFrameworkManifest([])).toEqual({ ok: true, errors: [] });
    expect(validateFrameworkManifest(undefined as never)).toEqual({ ok: true, errors: [] });
  });
});

// ---------------------------------------------------------------------------
// applyFrameworkControls (idempotent, mocked db)
// ---------------------------------------------------------------------------

describe('applyFrameworkControls', () => {
  function makeDb(existingControlIds: string[]) {
    const calls: { insertValues?: unknown[]; conflict?: unknown[] } = {};
    const chain = {
      select: vi.fn(() => chain),
      from: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      values: vi.fn((v: unknown[]) => {
        calls.insertValues = v;
        return chain;
      }),
      onConflictDoNothing: vi.fn((target: unknown) => {
        calls.conflict = [target];
        return Promise.resolve(undefined);
      }),
    };
    // The select().from() chain resolves to the existing rows.
    const selectChain = {
      ...chain,
      select: () => selectChain,
      from: () => Promise.resolve(existingControlIds.map((controlId) => ({ controlId }))),
    };
    return { db: { ...selectChain, insert: chain.insert, values: chain.values, onConflictDoNothing: chain.onConflictDoNothing }, calls };
  }

  it('inserts every seed control when the table is empty (ON CONFLICT control_id)', async () => {
    const { db, calls } = makeDb([]);

    const result = await applyFrameworkControls(db, FRAMEWORK_SEED_MANIFESTS);

    const total = listSeedControls().length;
    expect(result).toEqual({ inserted: total, skipped: 0, total });
    expect(calls.insertValues).toHaveLength(total);
    expect(calls.conflict).toEqual([{ target: mocks.controlsTable.controlId }]);
  });

  it('is idempotent — skips controls whose control_id already exists', async () => {
    const existing = listSeedControls().slice(0, 3).map((c) => c.controlId);
    const { db, calls } = makeDb(existing);

    const result = await applyFrameworkControls(db, FRAMEWORK_SEED_MANIFESTS);

    const total = listSeedControls().length;
    expect(result).toEqual({ inserted: total - 3, skipped: 3, total });
    expect(calls.insertValues).toHaveLength(total - 3);
  });

  it('does not insert at all when everything already exists', async () => {
    const existing = listSeedControls().map((c) => c.controlId);
    const { db, calls } = makeDb(existing);

    const result = await applyFrameworkControls(db, FRAMEWORK_SEED_MANIFESTS);

    expect(result).toEqual({ inserted: 0, skipped: result.total, total: result.total });
    expect(calls.insertValues).toBeUndefined();
  });

  it('accepts a flat array and dedupes repeated control ids', async () => {
    const { db, calls } = makeDb([]);
    const flat = [...SOC2_ADDITIONAL_CONTROLS, ...SOC2_ADDITIONAL_CONTROLS];

    const result = await applyFrameworkControls(db, flat);

    expect(result.inserted).toBe(SOC2_ADDITIONAL_CONTROLS.length);
    expect(calls.insertValues).toHaveLength(SOC2_ADDITIONAL_CONTROLS.length);
  });

  it('tolerates a non-array existingRows result (treated as empty)', async () => {
    const selectChain = {
      select: () => ({ from: () => Promise.resolve(undefined) }),
    };
    const chain = {
      ...selectChain,
      insert: vi.fn(() => chain),
      values: vi.fn(() => chain),
      onConflictDoNothing: vi.fn(() => Promise.resolve(undefined)),
    };
    const db = { ...selectChain, insert: chain.insert, values: chain.values, onConflictDoNothing: chain.onConflictDoNothing };

    const result = await applyFrameworkControls(db, FRAMEWORK_SEED_MANIFESTS);

    expect(result.inserted).toBe(listSeedControls().length);
    expect(chain.insert).toHaveBeenCalledTimes(1);
  });

  it('returns zeroes for an empty framework record and never inserts', async () => {
    const { db, calls } = makeDb([]);

    const result = await applyFrameworkControls(db, {});

    expect(result).toEqual({ inserted: 0, skipped: 0, total: 0 });
    expect(calls.insertValues).toBeUndefined();
  });
});
