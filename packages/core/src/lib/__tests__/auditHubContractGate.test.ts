import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * AuditHub data-contract gate (QA cycle 34, UI-STANDARD sec.16).
 *
 * Static acceptance gate for the AuditHub local contract layer:
 *  - the page must never call trpc.evidenceFiles.* directly (that router
 *    factory is imported in routers.ts but never mounted on the AppRouter,
 *    so any call would fail at mutation time);
 *  - the degraded affordances must keep their user-facing toast copy;
 *  - if a later cycle mounts evidenceFiles on the AppRouter, this gate
 *    fails on purpose to force flipping EVIDENCE_FILES_LIVE back to true
 *    and re-enabling the file upload/delete mutations.
 */

const HUB_PATH = path.resolve('packages/core/src/pages/AuditHub.tsx');
const ROUTERS_PATH = path.resolve('packages/core/src/routers.ts');

const readSrc = (p: string): string => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

describe('AuditHub contract gate (cycle 34)', () => {
  const src = readSrc(HUB_PATH);
  const routers = readSrc(ROUTERS_PATH);

  it('page source is readable', () => {
    expect(src.length).toBeGreaterThan(1000);
    expect(routers.length).toBeGreaterThan(1000);
  });

  it('never references the unmounted trpc.evidenceFiles.* procedures', () => {
    expect(src).not.toMatch(/trpc\s*\.\s*evidenceFiles/);
  });

  it('keeps the local typed contract layer per UI-STANDARD sec.16', () => {
    expect(src).toContain('hubApi = trpc as unknown as AuditHubApi');
    // Queries degrade quietly (no infinite retry spam against missing data).
    expect((src.match(/retry:\s*false/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it('degrades file upload/delete affordances with explicit user-facing copy', () => {
    expect(src).toContain("Evidence file uploads aren't available in this deployment.");
    expect(src).toContain("Evidence file management isn't available in this deployment.");
    expect(src).toContain('if (!EVIDENCE_FILES_LIVE)');
  });

  it('tripwire: mounting evidenceFiles requires flipping EVIDENCE_FILES_LIVE', () => {
    const mounted = /evidenceFiles\s*:\s*createEvidenceFilesRouter/.test(routers);
    const flagLive = /\bEVIDENCE_FILES_LIVE\s*=\s*true\b/.test(src);
    // Allowed states:
    //  - not mounted AND flag false (today)
    //  - mounted AND flag true (file management restored end-to-end)
    // Anything else means the page and the API disagree -> fail loudly.
    expect(mounted).toBe(flagLive);
  });
});
