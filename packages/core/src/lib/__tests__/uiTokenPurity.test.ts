import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * UI token purity scan (UI-STANDARD §2) — static acceptance gate for the
 * Trust Center / Audit Management pages (QA cycle 13, scorecard #8/#9).
 *
 * Forbidden hard-coded surface/text classes (slate/gray/white/indigo) must be
 * ZERO. Data-viz scale colors (§18) and glass borders are explicitly allowed.
 */

const PAGES = [
  'packages/core/src/pages/TrustCenter.tsx',
  'packages/core/src/pages/AuditHub.tsx',
  'packages/core/src/pages/AuditManager.tsx',
  'packages/core/src/pages/cyber/SecurityTestingPanels.tsx',
];

// Hard-coded surface/text classes that violate UI-STANDARD §2.
const FORBIDDEN =
  /(?:text-slate-\d|bg-slate-\d|border-slate-\d|bg-white(?!\/)|text-gray-\d|bg-gray-\d|bg-indigo-\d|text-indigo-\d|text-black)/g;

describe('UI token purity (UI-STANDARD §2)', () => {
  it.each(PAGES)('%s contains no hard-coded slate/gray/white/indigo surface tokens', (file) => {
    const abs = path.join(process.cwd(), file);
    const source = fs.readFileSync(abs, 'utf8');
    const matches = source.match(FORBIDDEN) || [];
    expect(matches, `forbidden classes found in ${file}: ${[...new Set(matches)].join(', ')}`).toEqual([]);
  });
});
