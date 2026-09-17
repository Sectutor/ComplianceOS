import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GlobalNotificationCenter UI wiring gate (QA cycle 40).
 *
 * Static source-scan acceptance gate over
 * components/common/GlobalNotificationCenter.tsx — read as text, never
 * rendered (vitest include pattern is *.test.ts; no React mount needed).
 *
 * Proves the component:
 *   1. wires ONLY real tRPC notifications procedures — the four contracted
 *      routes (getNotifications, getUnreadCount, markAsRead, markAllAsRead)
 *      are all referenced and NO invented route (trpc.notifications.foo)
 *      sneaks in;
 *   2. stays keyboard/AT accessible — aria-expanded on the bell button,
 *      role="button" + tabIndex on notification items, and an onKeyDown
 *      handler activating items on Enter AND Space;
 *   3. closes on outside clicks (mousedown listener with cleanup);
 *   4. resolves deep links safely — :clientId/:id placeholders are replaced,
 *      external http(s) links open in a new tab with noopener,noreferrer;
 *   5. caps the unread badge at "9+" (no three-digit badge overflow);
 *   6. passes the UI-STANDARD §2 token-purity scan — ZERO raw surface/text
 *      classes (slate/gray/white/indigo/black) from the uiTokenPurity
 *      forbidden list. Written against the TARGET state (token-only): the
 *      parallel UI build converts the file within this cycle, and the
 *      conductor runs this gate last.
 *
 * Deterministic: pure text scans — no DB, no network, no timers -> no flake.
 */

const COMPONENT_PATH = path.resolve('packages/core/src/components/common/GlobalNotificationCenter.tsx');
// Deep-link resolution was extracted into a sibling pure-helper file (cycle 40);
// link-safety gates below scan BOTH sources as one logical unit.

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

/** Hard-coded surface/text classes that violate UI-STANDARD §2 (same list as
 *  uiTokenPurity.test.ts). Data-viz scale colors and glass borders stay OK. */
const FORBIDDEN =
  /(?:text-slate-\d|bg-slate-\d|border-slate-\d|bg-white(?!\/)|text-gray-\d|bg-gray-\d|bg-indigo-\d|text-indigo-\d|text-black)/g;

/** The only notifications procedures the router actually exposes. */
const ALLOWED_PROCEDURES = new Set(['getNotifications', 'getUnreadCount', 'markAsRead', 'markAllAsRead']);

describe('GlobalNotificationCenter UI gate — static source scan (cycle 40)', () => {
  const raw = readSrc(COMPONENT_PATH);
  const code = stripComments(raw);
  const wiring = code + stripComments(readSrc(path.resolve('packages/core/src/components/common/notificationDestinations.ts')));

  it('component source is readable', () => {
    expect(raw.length).toBeGreaterThan(5000);
  });

  // -----------------------------------------------------------------------
  // 1. tRPC wiring contract — only real procedures, all four present
  // -----------------------------------------------------------------------

  it('references exactly the four real trpc.notifications procedures and nothing invented', () => {
    // Accepts BOTH call idioms: raw trpc.notifications.X and the UI-STANDARD
    // §16 typed contract layer (const notificationsApi = trpc as unknown as
    // { notifications: NotificationsApi }; applied by the conductor to clear
    // the router-factory inference-collapse TS2339s). The whitelist below
    // still rejects any invented procedure either way.
    const used = [...code.matchAll(/(?:trpc|notificationsApi)\.notifications\.([A-Za-z_$][\w$]*)\s*[.\(]/g)].map(
      (m) => m[1]
    );
    expect(used.length, 'component must call trpc.notifications.* at all').toBeGreaterThan(0);
    for (const name of used) {
      expect(ALLOWED_PROCEDURES.has(name), `invented router procedure: trpc.notifications.${name}`).toBe(true);
    }
    for (const required of ALLOWED_PROCEDURES) {
      expect(used, `contracted procedure ${required} must be wired`).toContain(required);
    }
  });

  it('unread count feeds the bell badge via getUnreadCount data', () => {
    expect(code).toMatch(/getUnreadCount\s*\.\s*useQuery\s*\(/);
    expect(code).toMatch(/totalUnreadCount/);
  });

  it('mutations refetch list + count after success', () => {
    expect(code).toMatch(/markAsRead\s*\.\s*useMutation\s*\(/);
    expect(code).toMatch(/markAllAsRead\s*\.\s*useMutation\s*\(/);
    expect(code).toMatch(/refetchNotifications/);
    expect(code).toMatch(/refetchUnreadCount/);
  });

  // -----------------------------------------------------------------------
  // 2. A11y gates
  // -----------------------------------------------------------------------

  it('bell button carries aria-expanded', () => {
    expect(code).toMatch(/aria-expanded\s*=\s*\{?\s*(isOpen|open)/);
  });

  it('notification items are role="button" and keyboard focusable', () => {
    expect(code).toMatch(/role\s*=\s*["']button["']/);
    expect(code).toMatch(/tabIndex\s*=\s*\{\s*0\s*\}/);
  });

  it('onKeyDown activates items on Enter AND Space', () => {
    expect(code).toMatch(/onKeyDown\s*=\s*\{/);
    expect(code).toMatch(/e\.key\s*===\s*["']Enter["']/);
    expect(code).toMatch(/e\.key\s*===\s*["'] ["']/);
    // Activation must not also fire a scroll/submit side effect.
    expect(code).toMatch(/preventDefault\s*\(\s*\)/);
  });

  it('closes on click outside (mousedown listener with cleanup)', () => {
    expect(code).toMatch(/document\.addEventListener\s*\(\s*["']mousedown["']/);
    expect(code).toMatch(/document\.removeEventListener\s*\(\s*["']mousedown["']/);
  });

  // -----------------------------------------------------------------------
  // 3. Deep-link safety
  // -----------------------------------------------------------------------

  it('replaces :clientId/:id placeholders when resolving deep links', () => {
    expect(wiring).toMatch(/replace\s*\(\s*\/:clientId\/g\s*,/);
    expect(wiring).toMatch(/replace\s*\(\s*\/:id\/g\s*,/);
  });

  it('external http(s) links open with noopener,noreferrer (reverse-tabnabbing guard)', () => {
    expect(wiring).toMatch(/startsWith\s*\(\s*["']https?:\/\//);
    expect(wiring).toMatch(/window\.open\s*\([^)]*["']_blank["'][^)]*["']noopener,noreferrer["']/);
  });

  // -----------------------------------------------------------------------
  // 4. Badge cap
  // -----------------------------------------------------------------------

  it('caps the unread badge display at 9+', () => {
    // The capping comparison AND the literal cap string must both exist.
    expect(code).toMatch(/\?\s*["']9\+["']/);
    expect(code).toMatch(/>\s*9\s*\?/);
  });

  // -----------------------------------------------------------------------
  // 5. Token purity (UI-STANDARD §2) — enforced against the TARGET state
  // -----------------------------------------------------------------------

  it('contains zero hard-coded slate/gray/white/indigo surface tokens', () => {
    const matches = code.match(FORBIDDEN) || [];
    expect(
      matches,
      `forbidden classes found in GlobalNotificationCenter.tsx: ${[...new Set(matches)].join(', ')}`
    ).toEqual([]);
  });
});
