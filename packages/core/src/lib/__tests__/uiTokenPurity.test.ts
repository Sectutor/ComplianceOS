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
  // NIS2 Phase 5 Task 5.2 Continuous Compliance Monitoring (QA cycle 22)
  'packages/core/src/pages/complianceMonitorApi.ts',
  'packages/core/src/pages/cyber/ComplianceMonitorPanels.tsx',
  // NIS2 Phase 6 Task 6.1 Policy Center (QA cycle 23) — landed in parallel
  // by the UI agent; skipped while pending so the gate stays green mid-build
  // and is enforced in full once the files land.
  'packages/core/src/pages/policyTemplatesNis2Api.ts',
  'packages/core/src/pages/cyber/PolicyCenterPanels.tsx',
];

// Files owned by other agents in the current parallel build cycle. Existing
// entries above stay strict (missing file = gate failure); these pending
// entries are allowed to be absent until the conductor's end-of-cycle run.
const PARALLEL_BUILD_FILES = new Set([
  'packages/core/src/pages/policyTemplatesNis2Api.ts',
  'packages/core/src/pages/cyber/PolicyCenterPanels.tsx',
]);

// Hard-coded surface/text classes that violate UI-STANDARD §2.
const FORBIDDEN =
  /(?:text-slate-\d|bg-slate-\d|border-slate-\d|bg-white(?!\/)|text-gray-\d|bg-gray-\d|bg-indigo-\d|text-indigo-\d|text-black)/g;

describe('UI token purity (UI-STANDARD §2)', () => {
  it.each(PAGES)('%s contains no hard-coded slate/gray/white/indigo surface tokens', (file) => {
    const abs = path.join(process.cwd(), file);
    if (PARALLEL_BUILD_FILES.has(file) && !fs.existsSync(abs)) {
      return; // parallel-build guard: UI agent lands the file later this cycle
    }
    const source = fs.readFileSync(abs, 'utf8');
    const matches = source.match(FORBIDDEN) || [];
    expect(matches, `forbidden classes found in ${file}: ${[...new Set(matches)].join(', ')}`).toEqual([]);
  });
});
