import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Router mount coverage — regression guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three routers (`questionnaire`, `autopilot`, `gapAnalysis`) were imported at
 * the top of `routers.ts` but never registered on the AppRouter object. Nothing
 * failed at build time — TypeScript is happy with an unused import — so every
 * `trpc.questionnaire.*`, `trpc.autopilot.*` and `trpc.gapAnalysis.*` call from
 * the UI returned:
 *
 *     TRPCError: No procedure found on path "questionnaire.create"
 *
 * That silently killed whole features (Questionnaire Workspace, Autopilot
 * dashboard, Gap Analysis) across 8+ UI files.
 *
 * This test parses `routers.ts` statically (no DB, no tRPC bootstrap, no
 * transitive imports) and asserts that every router factory / router object it
 * imports is actually mounted somewhere in the file.
 *
 * If you intentionally import a router without mounting it, add its import name
 * to KNOWN_UNMOUNTED below with a comment explaining why.
 */

const ROUTERS_FILE = path.resolve(__dirname, '../../routers.ts');

/**
 * Imports that are deliberately not mounted on the AppRouter.
 * Keep this list SHORT and always explain the reason.
 *
 * Everything below was verified to have ZERO `trpc.<key>.*` call sites in
 * pages/ or components/ at the time of writing — they are built-but-unwired
 * backends (future features / server-side-only helpers). If you start calling
 * one from the UI, MOUNT it and remove it from this list.
 */
const KNOWN_UNMOUNTED = new Set<string>([
    'createAdversaryIntelRouter', // superseded by the inline adversaryIntel router (larger, premium-gated)
    'cisaKevRouter',              // no UI callers
    'remediationRouter',          // no UI callers
    'cloudAssetsRouter',          // no UI callers
    'vendorSoc2Router',           // no UI callers
    'accessReviewRouter',         // no UI callers (accessReviews — plural — is the live one)
    'policyGeneratorRouter',      // no UI callers
    'gapAnalysisEngineRouter',    // no UI callers (gapAnalysis is the live one)
    'privacySovereigntyRouter',   // no UI callers
    'createVendorRiskRouter',     // no UI callers
    'evidenceSentinelRouter',     // no UI callers
    'auditorFindingRouter',       // no UI callers
    'peerBenchmarkRouter',        // no UI callers
]);

/** Strip // line comments and block comments so commented-out code is ignored. */
function stripComments(src: string): string {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        // string literals pass through untouched
        if (c === '"' || c === "'" || c === '`') {
            const quote = c;
            out += c;
            i++;
            while (i < src.length) {
                out += src[i];
                if (src[i] === '\\') {
                    if (i + 1 < src.length) {
                        out += src[i + 1];
                        i += 2;
                        continue;
                    }
                } else if (src[i] === quote) {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }
        if (c === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && src[i + 1] === '*') {
            i += 2;
            while (i + 1 < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

interface Parsed {
    /** Router-ish identifiers imported into routers.ts */
    imported: string[];
    /** Identifiers referenced anywhere outside the import block */
    usedInBody: Set<string>;
    /** Top-level keys mounted on the AppRouter object */
    mountedKeys: string[];
}

function parseRoutersFile(): Parsed {
    const raw = fs.readFileSync(ROUTERS_FILE, 'utf-8');
    const src = stripComments(raw).replace(/\r\n/g, '\n');

    // ---- imported router identifiers ------------------------------------
    // Matches: import { createFooRouter } from "./server/routers/foo";
    //          import { fooRouter, barRouter } from "...";
    const imported: string[] = [];
    const importRe = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*routers?\/[^'"]*['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src)) !== null) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s+as\s+/).pop()?.trim();
            if (!name) continue;
            // Only consider router-shaped names to avoid types/helpers
            if (/Router$/.test(name) || /^create[A-Z].*Router$/.test(name)) {
                imported.push(name);
            }
        }
    }

    // ---- body (everything after the last import statement) ---------------
    const lastImport = src.lastIndexOf('\nimport ');
    const bodyStart = lastImport === -1 ? 0 : src.indexOf('\n', lastImport + 1);
    const body = src.slice(bodyStart);

    const usedInBody = new Set<string>();
    for (const name of imported) {
        // word-boundary reference anywhere in the body
        const re = new RegExp(`\\b${name}\\b`);
        if (re.test(body)) usedInBody.add(name);
    }

    // ---- mounted keys on the AppRouter ----------------------------------
    // Matches lines like:  foo: createFooRouter(...)   |   foo: fooRouter,
    const mountedKeys: string[] = [];
    const mountRe = /^\s{2,}([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
    while ((m = mountRe.exec(body)) !== null) {
        mountedKeys.push(m[1]);
    }

    return { imported: [...new Set(imported)], usedInBody, mountedKeys };
}

describe('AppRouter mount coverage', () => {
    const parsed = parseRoutersFile();

    it('finds the routers.ts file and parses router imports', () => {
        expect(fs.existsSync(ROUTERS_FILE)).toBe(true);
        // Sanity: this file imports a large number of routers; if this drops to
        // near-zero the regexes above have drifted and the test is worthless.
        expect(parsed.imported.length).toBeGreaterThan(50);
        expect(parsed.mountedKeys.length).toBeGreaterThan(50);
    });

    it('mounts every imported router (no dead imports)', () => {
        const dead = parsed.imported.filter(
            (name) => !parsed.usedInBody.has(name) && !KNOWN_UNMOUNTED.has(name)
        );

        expect(
            dead,
            dead.length
                ? `These routers are imported into routers.ts but never referenced in the ` +
                  `AppRouter body, so every trpc call to them returns ` +
                  `"No procedure found on path". Mount them, or add them to ` +
                  `KNOWN_UNMOUNTED with a reason:\n  - ${dead.join('\n  - ')}`
                : undefined
        ).toEqual([]);
    });

    it('mounts the routers whose absence previously broke features', () => {
        // Explicit guard for the three that regressed. These keys are what the
        // UI calls as trpc.<key>.*
        for (const key of ['questionnaire', 'autopilot', 'gapAnalysis']) {
            expect(
                parsed.mountedKeys,
                `trpc.${key}.* is called from the UI; it must be mounted on the AppRouter`
            ).toContain(key);
        }
    });

    it('does not mount the same top-level key twice', () => {
        // A duplicate top-level key silently shadows the earlier mount. Only
        // 2-space-indented keys are AppRouter members; deeper indentation is a
        // nested sub-router key (e.g. `controls:` inside another router) and is
        // legitimately allowed to repeat.
        const raw = fs.readFileSync(ROUTERS_FILE, 'utf-8');
        const body = stripComments(raw).replace(/\r\n/g, '\n');
        const topLevel: string[] = [];
        const topRe = /^ {2}([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
        let mm: RegExpExecArray | null;
        while ((mm = topRe.exec(body)) !== null) topLevel.push(mm[1]);

        const seen = new Map<string, number>();
        for (const k of topLevel) seen.set(k, (seen.get(k) ?? 0) + 1);

        const dupes = [...seen.entries()]
            .filter(([, n]) => n > 1)
            .map(([k, n]) => `${k} (x${n})`);

        expect(
            dupes,
            dupes.length ? `Duplicate top-level router mounts shadow each other: ${dupes.join(', ')}` : undefined
        ).toEqual([]);
    });
});
