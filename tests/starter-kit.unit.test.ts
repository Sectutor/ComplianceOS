import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import http from 'node:http';
import { PgDialect } from 'drizzle-orm/pg-core';
import {
  createStarterKitRouter, validateStarterKitBody, buildStarterKitEmail,
  _resetStarterKitTableCache, STARTER_KIT_PATH,
} from '../packages/core/src/server/routes/starterKit';

const dialect = new PgDialect();

/** Minimal in-memory stand-in for the drizzle db used by the route. */
function fakeDb() {
  const leads = new Map<string, any>();
  let nextId = 1;
  const queries: string[] = [];
  return {
    leads, queries,
    async execute(q: any) {
      const { sql, params } = dialect.sqlToQuery(q);
      queries.push(sql);
      if (/^\s*CREATE/i.test(sql)) return [];
      // Mirror the real driver: raw execute() params must not be Date objects.
      if ((params as any[]).some(p => p instanceof Date)) throw new TypeError('Date param not supported by raw execute');
      if (/INSERT INTO "starter_kit_leads"/.test(sql)) {
        const [email, name, company, role, consentText, consentAt, consentIp, userAgent, source, us, um, uc, createdAt, last] = params as any[];
        const existing = leads.get(email);
        if (existing) {
          existing.request_count += 1; existing.last_requested_at = last;
          return [{ id: existing.id, email_sent_at: existing.email_sent_at }];
        }
        const row = { id: nextId++, email, name, company, role, consent_text: consentText, consent_at: consentAt, consent_ip: consentIp,
          user_agent: userAgent, source, utm_source: us, utm_medium: um, utm_campaign: uc, request_count: 1, email_sent_at: null,
          created_at: createdAt, last_requested_at: last };
        leads.set(email, row);
        return [{ id: row.id, email_sent_at: null }];
      }
      if (/UPDATE "starter_kit_leads" SET "email_sent_at"/.test(sql)) {
        const [ts, id] = params as any[];
        for (const r of leads.values()) if (r.id === id) r.email_sent_at = ts;
        return [];
      }
      throw new Error('unexpected query: ' + sql);
    },
  };
}

const ENV = ['STARTER_KIT_ENABLED', 'STARTER_KIT_DOWNLOAD_URL', 'STARTER_KIT_ALLOWED_ORIGINS', 'STARTER_KIT_RATE_LIMIT_PER_HOUR', 'STARTER_KIT_RESEND_COOLDOWN_MIN'];
let saved: Record<string, string | undefined>;
let server: any; let base: string; let db: ReturnType<typeof fakeDb>; let sendEmail: any; let clock: Date;

async function start() {
  db = fakeDb();
  sendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'mock' });
  const app = express();
  app.use(createStarterKitRouter({ getDb: async () => db, sendEmail, now: () => clock }));
  app.use((_req, res) => res.status(418).end()); // anything not handled by the router
  await new Promise<void>(r => { server = app.listen(0, '127.0.0.1', () => r()); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const good = { name: 'Ada Lovelace', email: 'Ada@Example.com', company: 'Analytical Ltd', role: 'CTO / VP Engineering',
  consent: 'yes', consent_text: 'I agree…', source: 'starter-kit-landing', utm_source: 'linkedin', website: '' };

type Res = { status: number; headers: { get(k: string): string | null }; json(): Promise<any> };
/** Plain node:http client (the test env's fetch would apply browser CORS rules). */
function req(method: string, headers: Record<string, string>, body?: string): Promise<Res> {
  return new Promise((resolve, reject) => {
    const r = http.request(base + STARTER_KIT_PATH, { method, headers }, (res) => {
      let data = ''; res.on('data', c => (data += c)); res.on('end', () => resolve({
        status: res.statusCode!, headers: { get: (k) => (res.headers[k.toLowerCase()] as string) ?? null },
        json: async () => JSON.parse(data),
      }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
function post(body: any, origin: string | null = 'https://grcompliance.com') {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (origin) headers.origin = origin;
  return req('POST', headers, typeof body === 'string' ? body : JSON.stringify(body));
}

beforeEach(async () => {
  saved = Object.fromEntries(ENV.map(k => [k, process.env[k]]));
  ENV.forEach(k => delete process.env[k]);
  process.env.STARTER_KIT_ENABLED = 'true';
  process.env.STARTER_KIT_DOWNLOAD_URL = 'https://downloads.example.com/iso27001-starter-kit.zip';
  clock = new Date('2026-10-16T12:00:00Z');
  _resetStarterKitTableCache();
  await start();
});
afterEach(async () => {
  await new Promise(r => server.close(r));
  ENV.forEach(k => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
});

describe('validateStarterKitBody', () => {
  it('normalises and accepts a good body', () => {
    const v = validateStarterKitBody(good);
    expect(v.ok && v.lead.email).toBe('ada@example.com');
  });
  it.each([
    [{ ...good, name: '' }, 'Name'], [{ ...good, email: 'nope' }, 'email'],
    [{ ...good, company: ' ' }, 'Company'], [{ ...good, consent: undefined }, 'Consent'], [{ ...good, consent: 'no' }, 'Consent'],
  ])('rejects %#', (body, msg) => {
    const v = validateStarterKitBody(body);
    expect(v.ok).toBe(false);
    expect(!v.ok && v.error).toContain(msg);
  });
  it('escapes HTML in the email', () => {
    expect(buildStarterKitEmail('<b>x</b>', 'https://e.com/a?b=1&c=2').html).not.toContain('<b>x</b>');
  });
});

describe('POST /api/public/starter-kit', () => {
  it('is disabled (404) unless STARTER_KIT_ENABLED=true', async () => {
    process.env.STARTER_KIT_ENABLED = 'false';
    const res = await post(good);
    expect(res.status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.queries).toHaveLength(0);
  });

  it('stores the lead with consent metadata and emails the download link', async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://grcompliance.com');
    const lead = db.leads.get('ada@example.com');
    expect(lead).toMatchObject({ name: 'Ada Lovelace', company: 'Analytical Ltd', source: 'starter-kit-landing', utm_source: 'linkedin', consent_text: 'I agree…' });
    expect(lead.consent_at).toBe(clock.toISOString());
    expect(lead.consent_ip).toBeTruthy();
    expect(lead.email_sent_at).toBe(clock.toISOString());
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('ada@example.com');
    expect(mail.html).toContain('https://downloads.example.com/iso27001-starter-kit.zip');
    expect(mail.text).toContain('https://downloads.example.com/iso27001-starter-kit.zip');
  });

  it('is idempotent on duplicate email (one row, no re-send within cooldown)', async () => {
    await post(good);
    const again = await post({ ...good, email: 'ada@example.com', name: 'Someone Else' });
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, duplicate: true });
    expect(db.leads.size).toBe(1);
    expect(db.leads.get('ada@example.com')).toMatchObject({ name: 'Ada Lovelace', request_count: 2 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    clock = new Date(clock.getTime() + 61 * 60 * 1000);
    await post(good);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('requires consent', async () => {
    const res = await post({ ...good, consent: false });
    expect(res.status).toBe(400);
    expect(db.leads.size).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('silently accepts honeypot submissions without storing or sending', async () => {
    const res = await post({ ...good, website: 'http://spam.example' });
    expect(res.status).toBe(200);
    expect(db.leads.size).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('only allows grcompliance.com / www.grcompliance.com origins', async () => {
    expect((await post(good, 'https://evil.example')).status).toBe(403);
    expect((await post(good, 'https://app.grcompliance.com')).status).toBe(403);
    const pre = await req('OPTIONS', { origin: 'https://www.grcompliance.com', 'access-control-request-method': 'POST' });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://www.grcompliance.com');
    expect(pre.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('rate-limits per IP', async () => {
    process.env.STARTER_KIT_RATE_LIMIT_PER_HOUR = '3';
    await new Promise(r => server.close(r)); await start();
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await post({ ...good, email: `u${i}@example.com` })).status);
    expect(codes).toEqual([200, 200, 200, 429]);
  });

  it('returns 503 when STARTER_KIT_DOWNLOAD_URL is missing and 502 when email fails', async () => {
    delete process.env.STARTER_KIT_DOWNLOAD_URL;
    expect((await post(good)).status).toBe(503);
    process.env.STARTER_KIT_DOWNLOAD_URL = 'https://downloads.example.com/kit.zip';
    sendEmail.mockResolvedValueOnce({ success: false, error: 'boom' });
    expect((await post({ ...good, email: 'b@example.com' })).status).toBe(502);
    expect(db.leads.get('b@example.com').email_sent_at).toBeNull();
  });

  it('rejects invalid JSON / oversize bodies without crashing', async () => {
    expect((await post('{not json')).status).toBe(400);
    expect((await post({ ...good, company: 'x'.repeat(20000) })).status).toBe(413);
  });
});
