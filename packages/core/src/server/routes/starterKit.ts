/**
 * Public lead-capture endpoint for the free ISO 27001 Starter Kit landing page.
 *
 *   POST /api/public/starter-kit   (JSON)
 *   { name, email, company, role?, consent, consent_text?, source?, utm_*?, website (honeypot) }
 *
 * Disabled (404) unless STARTER_KIT_ENABLED=true, so self-host installs are unaffected.
 * CORS: only https://grcompliance.com and https://www.grcompliance.com (+ STARTER_KIT_ALLOWED_ORIGINS).
 * Stores the lead with consent timestamp / IP / source, then emails the download link
 * (STARTER_KIT_DOWNLOAD_URL) through the shared sendEmail helper (Resend first).
 * Idempotent per email: a repeat submission updates nothing but last_requested_at and
 * re-sends at most once per STARTER_KIT_RESEND_COOLDOWN_MIN (default 60) minutes.
 */
import express, { type Request, type Response, type Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sql } from 'drizzle-orm';

export const STARTER_KIT_PATH = '/api/public/starter-kit';
const DEFAULT_ORIGINS = ['https://grcompliance.com', 'https://www.grcompliance.com'];
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export interface StarterKitDeps {
  getDb: () => Promise<any>;
  sendEmail: (o: { to: string; subject: string; html: string; text?: string }) => Promise<{ success: boolean; error?: any }>;
  now?: () => Date;
}

export interface StarterKitLead {
  name: string; email: string; company: string; role: string | null;
  consentText: string | null; source: string | null;
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
}

export function starterKitEnabled(): boolean {
  return process.env.STARTER_KIT_ENABLED === 'true';
}

function allowedOrigins(): string[] {
  const extra = (process.env.STARTER_KIT_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const opt = (v: unknown, max: number): string | null => str(v, max) || null;

export function validateStarterKitBody(body: any): { ok: true; lead: StarterKitLead } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body' };
  const name = str(body.name, 120);
  const email = str(body.email, 255).toLowerCase();
  const company = str(body.company, 160);
  const role = str(body.role, 60);
  const consent = body.consent === true || body.consent === 'yes' || body.consent === 'true' || body.consent === 'on';
  if (!name) return { ok: false, error: 'Name is required' };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' };
  if (!company) return { ok: false, error: 'Company is required' };
  if (!consent) return { ok: false, error: 'Consent is required' };
  return {
    ok: true,
    lead: {
      name, email, company,
      role: role || null,
      consentText: opt(body.consent_text, 1000),
      source: opt(body.source, 80),
      utmSource: opt(body.utm_source, 120),
      utmMedium: opt(body.utm_medium, 120),
      utmCampaign: opt(body.utm_campaign, 120),
    },
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function buildStarterKitEmail(name: string, url: string) {
  const first = escapeHtml(name.split(/\s+/)[0] || 'there');
  const safeUrl = escapeHtml(url);
  return {
    subject: 'Your ISO 27001 Starter Kit',
    html: `<p>Hi ${first},</p>
<p>Thanks for requesting the free ISO/IEC 27001:2022 Starter Kit. You can download it here:</p>
<p><a href="${safeUrl}">Download the Starter Kit</a></p>
<p>If the button does not work, copy this link into your browser:<br>${safeUrl}</p>
<p>— The GRCompliance team</p>`,
    text: `Hi ${first},\n\nThanks for requesting the free ISO/IEC 27001:2022 Starter Kit. Download it here:\n${url}\n\n— The GRCompliance team`,
  };
}

let tableReady: Promise<void> | null = null;
/** Idempotent; mirrors packages/core/drizzle/0028_starter_kit_leads.sql. */
export function ensureStarterKitTable(db: any): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS "starter_kit_leads" (
        "id" serial PRIMARY KEY,
        "email" varchar(255) NOT NULL,
        "name" varchar(120) NOT NULL,
        "company" varchar(160) NOT NULL,
        "role" varchar(60),
        "consent_text" text,
        "consent_at" timestamp NOT NULL,
        "consent_ip" varchar(64),
        "user_agent" varchar(300),
        "source" varchar(80),
        "utm_source" varchar(120),
        "utm_medium" varchar(120),
        "utm_campaign" varchar(120),
        "request_count" integer NOT NULL DEFAULT 1,
        "email_sent_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "last_requested_at" timestamp NOT NULL DEFAULT now()
      )`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "starter_kit_leads_email_uq" ON "starter_kit_leads" ("email")`);
    })().catch(err => { tableReady = null; throw err; });
  }
  return tableReady;
}

/** Test hook. */
export function _resetStarterKitTableCache() { tableReady = null; }

function rows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

export function createStarterKitRouter(deps: StarterKitDeps): Router {
  const router = express.Router();
  const now = deps.now || (() => new Date());

  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.STARTER_KIT_RATE_LIMIT_PER_HOUR) || 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });

  const cors = (req: Request, res: Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!allowedOrigins().includes(origin)) return res.status(403).json({ error: 'Origin not allowed' });
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };

  const enabledGuard = (_req: Request, res: Response, next: express.NextFunction) => {
    if (!starterKitEnabled()) return res.status(404).json({ error: 'Not found' });
    next();
  };

  router.options(STARTER_KIT_PATH, enabledGuard, cors);
  router.post(STARTER_KIT_PATH, enabledGuard, cors, limiter, express.json({ limit: '16kb' }), async (req: Request, res: Response) => {
    // Honeypot: pretend success so bots learn nothing.
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      return res.status(200).json({ ok: true });
    }

    const v = validateStarterKitBody(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const lead = v.lead;

    const downloadUrl = process.env.STARTER_KIT_DOWNLOAD_URL;
    if (!downloadUrl) {
      console.error('[StarterKit] STARTER_KIT_DOWNLOAD_URL is not set');
      return res.status(503).json({ error: 'Temporarily unavailable' });
    }

    try {
      const db = await deps.getDb();
      await ensureStarterKitTable(db);
      const ts = now();
      // Raw db.execute params must be strings (postgres-js does not serialise Date here).
      const tsIso = ts.toISOString();
      const ip = String(req.ip || '').slice(0, 64) || null;
      const ua = String(req.headers['user-agent'] || '').slice(0, 300) || null;

      // Upsert on email: first submission stores consent; repeats only bump counters.
      const result = await db.execute(sql`
        INSERT INTO "starter_kit_leads"
          ("email","name","company","role","consent_text","consent_at","consent_ip","user_agent",
           "source","utm_source","utm_medium","utm_campaign","created_at","last_requested_at")
        VALUES (${lead.email}, ${lead.name}, ${lead.company}, ${lead.role}, ${lead.consentText}, ${tsIso}, ${ip}, ${ua},
                ${lead.source}, ${lead.utmSource}, ${lead.utmMedium}, ${lead.utmCampaign}, ${tsIso}, ${tsIso})
        ON CONFLICT ("email") DO UPDATE SET
          "request_count" = "starter_kit_leads"."request_count" + 1,
          "last_requested_at" = EXCLUDED."last_requested_at"
        RETURNING "id", "email_sent_at"`);
      const row = rows(result)[0] || {};

      const cooldownMs = (Number(process.env.STARTER_KIT_RESEND_COOLDOWN_MIN) || 60) * 60 * 1000;
      const lastSent = row.email_sent_at ? new Date(row.email_sent_at).getTime() : 0;
      if (lastSent && ts.getTime() - lastSent < cooldownMs) {
        return res.status(200).json({ ok: true, duplicate: true });
      }

      const mail = buildStarterKitEmail(lead.name, downloadUrl);
      const sent = await deps.sendEmail({ to: lead.email, ...mail });
      if (!sent?.success) {
        console.error('[StarterKit] Delivery email failed', sent?.error);
        return res.status(502).json({ error: 'Could not send the email. Please try again.' });
      }
      await db.execute(sql`UPDATE "starter_kit_leads" SET "email_sent_at" = ${tsIso} WHERE "id" = ${row.id}`);
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('[StarterKit] Failed to process request:', err?.message || err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  });

  return router;
}
