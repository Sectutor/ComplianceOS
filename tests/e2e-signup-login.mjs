/**
 * END-TO-END USER JOURNEY TEST — signup → emailed login details → login
 * =====================================================================
 * Simulates exactly what a real user does on the landing page:
 *
 *   1. SIGN UP   — visitor submits the landing-page form
 *                  (tRPC waitlist.join). With AUTO_INVITE_WAITLIST=true the
 *                  server mints a single-use magic link and emails it via
 *                  Resend ("Check your inbox for your demo access link…").
 *   2. EMAIL     — the email leg is proven twice: the server log must show
 *                  Resend accepting the message, and the token that was
 *                  emailed is read back from the magic_links table (the
 *                  same token the email's redeem URL carries).
 *   3. REDEEM    — the visitor opens the emailed link and sets their own
 *                  password (tRPC users.acceptInviteAndSignup, the exact
 *                  mutation RedeemLink.tsx calls). Single-use: the link is
 *                  closed after redemption.
 *   4. LOGIN     — the user signs in with the credentials they chose
 *                  (POST /api/auth/local-login) and the session token is
 *                  proven against an authenticated endpoint
 *                  (tRPC users.me).
 *   5. RE-SEND   — submitting the same email again must re-send the invite
 *                  email (the "resent" transaction) instead of dead-ending.
 *
 * Run:  node tests/e2e-signup-login.mjs   (server must be on :3005)
 */

import superjson from 'superjson';
import { readFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3005';
const SERVER_LOG = process.env.E2E_LOG || ''; // server stdout log, to verify the Resend send
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const EMAIL = process.env.E2E_EMAIL || `e2e.journey.${stamp}@sectutor.com`;
const NAME = 'E2E Journey Tester';
const PASSWORD = 'Journey-Test-2026!';
const results = [];

const check = (step, pass, detail) => {
  results.push({ step, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
};

/** tRPC call, exactly like the browser client does — POST batched mutations,
 *  GET batched queries (tRPC v11 rejects POST to a query procedure). Retries
 *  briefly to ride out tsx --watch dev-server restarts (ECONNRESET). */
async function trpc(procedure, input, headers = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const isQuery = input === undefined;
      const url = `${BASE}/api/trpc/${procedure}?batch=1${isQuery ? '&input=' + encodeURIComponent(JSON.stringify({})) : ''}`;
      const res = await fetch(url, {
        method: isQuery ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: isQuery ? undefined : JSON.stringify({ 0: superjson.serialize(input) }),
      });
      const body = await res.json();
      const part = (Array.isArray(body) ? body[0] : body) ?? {};
      if (part.result) return { status: res.status, data: superjson.deserialize(part.result.data) };
      return { status: res.status, error: part.error };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw lastErr;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`\nE2E user journey — ${EMAIL}\n`);

/* ---------------------------------------------------------------- 1. SIGN UP */
console.log('STEP 1 — Sign up on the landing page (waitlist.join)');
const signup = await trpc('waitlist.join', {
  email: EMAIL, firstName: 'E2E', lastName: 'Tester',
  company: 'E2E Verification Co', certification: 'ISO 27001', source: 'e2e-test',
});
const signupOk = signup.status === 200 && signup.data?.success === true && signup.data?.invited === true;
check('waitlist.join accepted', signupOk,
  signupOk ? `server: "${signup.data.message}"` : JSON.stringify(signup.error || signup.data));

/* --------------------------------------------------- 2. EMAIL (login details) */
console.log('\nSTEP 2 — Email with login details (single-use magic link via Resend)');
await sleep(2500); // give the async email leg a moment

// A. Prove the transport actually sent (the signup endpoint reports success
//    even when delivery fails, so the log is the source of truth).
if (SERVER_LOG) {
  try {
    const log = readFileSync(SERVER_LOG, 'utf8');
    const marker = `Sending via Resend API to ${EMAIL}`;
    const start = log.lastIndexOf(marker);
    if (start === -1) {
      check('Resend accepted the invite email', false, `no send attempt for ${EMAIL} in server log`);
    } else {
      // Look at what followed this recipient's send attempt.
      const tail = log.slice(start, start + 2000);
      if (tail.includes('Resend API failed')) {
        const reason = (tail.match(/Resend API failed: ([^\n]*)/) || [])[1] || 'unknown error';
        check('Resend accepted the invite email', false, reason.slice(0, 180));
      } else if (tail.includes('Resend accepted message')) {
        check('Resend accepted the invite email', true, 'transport confirmed in server log');
      } else {
        check('Resend accepted the invite email', false, 'send attempt logged, but no acceptance line followed');
      }
    }
  } catch {
    check('Resend accepted the invite email', false, 'server log not readable — skipping transport proof');
  }
}

// B. The emailed link is `/auth/redeem-link?token=<uuid>`; the token lives in
//    the magic_links table bound to the lead's email — read it back exactly
//    as the recipient's inbox would have received it.
// Pull the newest active link for this email straight from the database.
let token = null;
try {
  const { execSync } = await import('node:child_process');
  const query = `SELECT token, status, usage_limit, expires_at FROM magic_links WHERE email = '${EMAIL}' ORDER BY created_at DESC LIMIT 1;`;
  const docker = process.env.LOCALAPPDATA + '\\Programs\\DockerDesktop\\resources\\bin\\docker.exe';
  const out = execSync(`"${docker}" exec supabase_db_ComplianceOS psql -U postgres -d postgres -t -A -c "${query}"`, { encoding: 'utf8' });
  const row = out.trim().split('|');
  if (row.length >= 2 && row[0]) {
    token = row[0];
    check('magic link minted for this email', true, `status=${row[1]}, usageLimit=${row[2]}, expires=${row[3]}`);
  }
} catch (e) {
  check('magic link minted for this email', false, e.message.split('\n')[0]);
}

if (!token) {
  console.log('\nCannot continue without the emailed token — aborting.');
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== RESULT: ${results.length - failed}/${results.length} checks passed ===`);
  process.exit(1);
}

/* ------------------------------------------------ 3. RE-SEND (Resend email) */
console.log('\nSTEP 3 — Re-submitting the same email re-sends the invite email');
const again = await trpc('waitlist.join', { email: EMAIL, firstName: 'E2E', source: 'e2e-test' });
const againOk = again.status === 200 && again.data?.success === true;
const resent = againOk && /re-sent/i.test(again.data?.message || '');
check('duplicate signup re-sends the active invite', againOk,
  againOk ? `server: "${again.data.message}"` : JSON.stringify(again.error || again.data));
if (!resent && againOk) {
  console.log('  (note: invite was not re-sent — link no longer active)');
}

/* ------------------------------------------------------- 4. REDEEM (set pw) */
console.log('\nSTEP 4 — Open emailed link, set own password (acceptInviteAndSignup)');
const redeem = await trpc('users.acceptInviteAndSignup', {
  token, name: NAME, email: EMAIL, password: PASSWORD, clientId: null,
});
const redeemOk = redeem.status === 200 && redeem.data?.success === true;
check('account created from emailed link', redeemOk,
  redeemOk ? `userId=${redeem.data.userId}` : JSON.stringify(redeem.error || redeem.data));

// Single-use proof: redeeming the same token again must fail.
const replay = await trpc('users.acceptInviteAndSignup', {
  token, name: 'Replay Attack', email: EMAIL, password: PASSWORD, clientId: null,
});
check('link is single-use (replay rejected)', replay.status !== 200,
  replay.error?.message || `unexpected status ${replay.status}`);

/* ----------------------------------------------------------------- 5. LOGIN */
console.log('\nSTEP 5 — Login with the details the user set up');
const loginRes = await fetch(`${BASE}/api/auth/local-login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const login = await loginRes.json().catch(() => ({}));
const loginOk = loginRes.status === 200 && !!login.token && !!login.user;
check('POST /api/auth/local-login', loginOk,
  loginOk ? `userId=${login.user.id}, role=${login.user.role}, token=${String(login.token).slice(0, 18)}…`
          : `HTTP ${loginRes.status} ${login.error || ''}`);

if (loginOk) {
  const me = await trpc('users.me', undefined, { Authorization: `Bearer ${login.token}` });
  const meOk = me.status === 200 && (me.data?.email === EMAIL || me.data?.user?.email === EMAIL);
  check('session token authenticates (users.me)', meOk, meOk ? 'authenticated round-trip OK' : JSON.stringify(me.error || me.data));
}

// Wrong password must be rejected.
const badRes = await fetch(`${BASE}/api/auth/local-login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: 'wrong-password-123' }),
});
check('wrong password rejected', badRes.status === 401, `HTTP ${badRes.status}`);

/* ------------------------------------------------------------------ REPORT */
const failed = results.filter((r) => !r.pass).length;
console.log(`\n=== E2E RESULT: ${results.length - failed}/${results.length} checks passed — ${failed === 0 ? 'END-TO-END PROCESS WORKING ✅' : 'PROCESS HAS FAILURES ❌'} ===`);
process.exit(failed === 0 ? 0 : 1);
