import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Evidence-file attach flow contract gate (QA cycle 35).
 *
 * Static acceptance gate for the evidenceFiles attach flow end-to-end:
 *  - Evidence.tsx must consume files through a local typed contract layer,
 *    never `trpc.evidenceFiles.*` directly;
 *  - the page must carry the EVIDENCE_FILES_LIVE flag plus explicit
 *    degradation copy so users see why uploads are disabled;
 *  - routers.ts must keep importing AND mounting evidenceFiles — if someone
 *    unmounts the router while pages still consume it, this gate fails;
 *  - the evidenceFiles router itself must validate inputs with zod,
 *    wrap failures in TRPCError (no bare throws escaping raw DB errors),
 *    never console.log secrets/file contents, bound its list/read queries,
 *    and export reusable zod schemas/types for the contract layer.
 *
 * Pure text scans over source files: no DB, no network, no timers -> no flake.
 */

const PAGE_PATH = path.resolve('packages/core/src/pages/Evidence.tsx');
const ROUTERS_PATH = path.resolve('packages/core/src/routers.ts');
const ROUTER_PATH = path.resolve('packages/core/src/server/routers/evidenceFiles.ts');
const SELF_PATH = path.resolve('packages/core/src/lib/__tests__/evidenceFilesContractGate.test.ts');

const readSrc = (p: string): string => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

/** Drop JS/JSX comments so docblocks mentioning rules don't trip code scans. */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');

/** Split a t.router({...}) factory body into per-procedure source chunks. */
const procedureChunks = (src: string): Record<string, string> => {
  const parts = src.split(
    /(?=\n\s{2,}[A-Za-z_$][\w$]*\s*:\s*(?:adminProcedure|publicProcedure|protectedProcedure|clientProcedure)\b)/
  );
  const map: Record<string, string> = {};
  for (const part of parts) {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(part);
    if (m && !map[m[1]]) map[m[1]] = part;
  }
  return map;
};

describe('evidenceFiles contract gate (cycle 35)', () => {
  const page = readSrc(PAGE_PATH);
  const pageCode = stripComments(page);
  const routers = readSrc(ROUTERS_PATH);
  const router = readSrc(ROUTER_PATH);
  const self = readSrc(SELF_PATH);

  it('sources under gate are readable', () => {
    expect(page.length).toBeGreaterThan(1000);
    expect(routers.length).toBeGreaterThan(1000);
    expect(router.length).toBeGreaterThan(1000);
  });

  it('Evidence.tsx never references trpc.evidenceFiles.* directly', () => {
    // Attach flow goes through the local typed contract layer, mirroring
    // the AuditHub rule: direct calls bypass degradation + error wrapping.
    // Comments are stripped so documentation mentions don't count.
    expect(pageCode).not.toMatch(/trpc\s*\.\s*evidenceFiles/);
  });

  it('Evidence.tsx declares EVIDENCE_FILES_LIVE and carries degradation copy', () => {
    expect(page).toMatch(/\bEVIDENCE_FILES_LIVE\b/);
    expect(page).toMatch(/if\s*\(\s*!EVIDENCE_FILES_LIVE\s*\)|EVIDENCE_FILES_LIVE\s*\?\s*[^:]+:\s*toast/);
    // User-facing degradation copy for the gated affordances.
    expect(page).toMatch(/available in this deployment/i);
  });

  it('tripwire: routers.ts imports AND mounts evidenceFiles; mount agrees with the page flag', () => {
    const imported = /import\s*\{[^}]*createEvidenceFilesRouter[^}]*\}\s*from/.test(routers);
    const mounted = /evidenceFiles\s*:\s*createEvidenceFilesRouter/.test(routers);
    // Unmounting while Evidence.tsx still consumes the flow breaks the app
    // at mutation time -> fail loudly instead.
    expect(imported).toBe(true);
    expect(mounted).toBe(true);

    // Same coherence rule as the AuditHub gate: the AppRouter mount and the
    // page-side kill switch must agree (both on, or both off).
    const flagLive = /\bEVIDENCE_FILES_LIVE\s*=\s*true\b/.test(page);
    expect(mounted).toBe(flagLive);
  });

  it('router validates create + delete inputs with zod and exports reusable schemas', () => {
    const chunks = procedureChunks(router);
    expect(chunks.create).toBeTruthy();
    expect(chunks.delete).toBeTruthy();

    expect(chunks.create).toMatch(/\.input\s*\(\s*z\.object\s*\(/);
    expect(chunks.delete).toMatch(/\.input\s*\(\s*z\.object\s*\(/);
    // Delete must key on an id validated as a bounded integer — inline
    // z.number() or a shared declared *Schema identifier are both fine.
    expect(chunks.delete).toMatch(/\bid\s*:\s*(?:z\.number\b|[A-Za-z_$][\w$]*[Ss]chema\b)/);
    if (!/\bid\s*:\s*z\.number\b/.test(chunks.delete)) {
      expect(router).toMatch(/(?:const|let)\s+[A-Za-z_$][\w$]*[Ss]chema\s*=\s*z\.number\s*\(/);
    }

    // Contract layer needs exported schemas/types to bind against.
    const exportsSchemas =
      /export\s+const\s+\w+\s*(?::\s*[^=;\n]+)?=\s*z\s*[.\n]/.test(router) ||
      /export\s+type\s+\w+\s*=\s*z\.infer/.test(router);
    expect(exportsSchemas).toBe(true);
  });

  it('router wraps failures in TRPCError (no bare throws leaking raw DB errors)', () => {
    expect(router).toMatch(/TRPCError|BAD_REQUEST/);
    expect(router).not.toMatch(/throw\s+new\s+Error\s*\(/);
  });

  it('router never console.logs secrets/file contents and bounds list/read queries', () => {
    expect(router).not.toMatch(/console\s*\.\s*log/);

    const chunks = procedureChunks(router);
    const bound = /\.limit\s*\(|\.take\s*\(|MAX_LIMIT|maxLimit/;
    // Every multi-row read path must carry an explicit bound.
    expect(chunks.list).toMatch(bound);
    expect(chunks.listAll).toMatch(bound);
    expect(router).toMatch(bound);
  });

  it('gate itself is deterministic: pure text scans, no DB/timers', () => {
    expect(self.length).toBeGreaterThan(500);
    // Assemble tokens so this assertion never matches its own literals.
    const forbidden = [
      ['get', 'Db'].join(''),
      ['drizz', 'le'].join(''),
      ['set', 'Timeout'].join(''),
      ['set', 'Interval'].join(''),
      ['useFake', 'Timers'].join(''),
      ['fet', 'ch('].join(''),
    ];
    for (const token of forbidden) {
      expect(self.includes(token)).toBe(false);
    }
    expect(self).not.toMatch(/\bvi\s*\./);
  });
});
