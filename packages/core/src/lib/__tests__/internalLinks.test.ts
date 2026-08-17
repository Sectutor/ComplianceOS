/**
 * Internal Link Integrity Test
 *
 * Cross-checks internal navigation link literals in packages/core/src
 * against the route paths registered in App.tsx (plus any <Route path=...>
 * defined elsewhere). Prevents regressions of the "Governance dashboard
 * links to a nonexistent /clients/:id/risk-register" class of bug.
 *
 * Known intentional exceptions (query strings are valid on existing routes,
 * and some paths are rewritten at runtime by resolveNavigationPath or
 * prefixed with /clients/:id by their consumers) are allowlisted below.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// Links that are resolved/prefixed at runtime and therefore valid despite
// not matching a registered route literal.
const RUNTIME_RESOLVED = new Set([
  '/governance', // resolveNavigationPath rewrites to /clients/:id/governance
  '/governance/workbench', // same, plus WorkflowPlayer prefixes /clients/:id
]);

// Directories that can never contain UI routes or UI link literals. Scanning
// them (tRPC/express routers, DB + migration code, seed/mock/data payloads,
// build output) is pure budget burn on this OneDrive-synced tree and can push
// this walk past the 10s default timeout when the full suite runs in parallel.
// Route definitions live in App.tsx + pages/components, which are never skipped.
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'server',
  'migrations',
  'db',
  'mocks',
  'scripts',
  '_core',
  'data',
]);

function walk(dir: string, cb: (path: string, content: string) => void) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    try {
      const s = statSync(p);
      if (s.isDirectory()) {
        if (!SKIP_DIRS.has(entry) && !p.includes('node_modules')) walk(p, cb);
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        cb(p, readFileSync(p, 'utf-8'));
      }
    } catch {
      // unreadable entries are skipped
    }
  }
}

describe('internal link integrity', () => {
  // 30s budget (vs 10s global): the walk still reads ~900 UI-ish source files
  // and can stall on OneDrive sync during parallel full-suite runs; the
  // SKIP_DIRS prune above keeps it well under 30s while scanning all UI code.
  it('every internal UI link targets a registered route', () => {
    const routePaths = new Set<string>();
    const links = new Map<string, string[]>();

    walk(SRC_ROOT, (p, content) => {
      for (const m of content.matchAll(/path=["']([^"']+)["']/g)) {
        routePaths.add(m[1]);
      }
      for (const m of content.matchAll(
        /[`"']((?:\/clients|\/risks|\/risk|\/governance|\/vendors|\/policies|\/controls|\/dashboard)[^`"']*)[`"']/g,
      )) {
        let link = m[1];
        if (link.includes('api/') || /\.(tsx?|jsx?)$/.test(link) || link.includes(' ')) continue;
        link = link.replace(/\$\{[^}]+\}/g, '*');
        if (!links.has(link)) links.set(link, []);
        const short = p.split(/[\\/]/).slice(-2).join('/');
        if (links.get(link)!.length < 3 && !links.get(link)!.includes(short)) {
          links.get(link)!.push(short);
        }
      }
    });

    expect(routePaths.size).toBeGreaterThan(100); // sanity: routes were collected
    expect(links.size).toBeGreaterThan(300); // sanity: links were collected

    const normalizedRoutes = [...routePaths].map((r) => r.replace(/:[a-zA-Z]+/g, '*'));
    const misses: Array<[string, string[]]> = [];

    for (const [link, files] of links) {
      const bareLink = link.split('?')[0];
      if (RUNTIME_RESOLVED.has(bareLink)) continue;

      const hit = normalizedRoutes.some(
        (r) =>
          r === bareLink ||
          bareLink.startsWith(r + '/') ||
          (r.endsWith('*') && bareLink.startsWith(r.slice(0, -1))),
      );
      if (!hit) misses.push([bareLink, files]);
    }

    expect(
      misses,
      `Dead internal links (link -> files that reference it):\n${misses
        .map(([l, f]) => `  ${l}  <-  ${f.join(', ')}`)
        .join('\n')}`,
    ).toEqual([]);
  }, 30_000);
});
