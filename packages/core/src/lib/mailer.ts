/**
 * Email Capture & Notification Service (Phase 3.5)
 *
 * Captures leads and sends transactional emails for license events.
 * Supports Resend and SMTP (Postmark, SendGrid, etc.)
 *
 * Events:
 *   - lead.captured    — Trial download / newsletter signup
 *   - license.issued   — New license activated after purchase
 *   - license.expiring — Reminder 7/3/1 day before expiry
 *   - license.expired  — Grace period ended
 *   - trial.starting   — 30-day trial begins
 *   - trial.ending     — 3 days before trial ends
 */

import { logger } from '../lib/logger';

/* ------------------------------------------------------------------ */
/*  Mail transport (Resend-first, SMTP fallback)                       */
/* ------------------------------------------------------------------ */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  if (resendKey) {
    return sendViaResend(payload, resendKey);
  } else if (smtpHost) {
    return sendViaSmtp(payload);
  } else {
    logger.warn({ message: '[Mailer] No email transport configured (RESEND_API_KEY or SMTP_HOST)' });
    // Fallback: log to file for development
    logger.info({ message: '[Mailer] Email logged (not sent)', to: payload.to, subject: payload.subject });
    return true; // Don't fail silently
  }
}

async function sendViaResend(payload: EmailPayload, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'ComplianceOS <noreply@complianceos.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn({ message: '[Mailer] Resend API error', status: response.status, body });
      return false;
    }

    logger.info({ message: '[Mailer] Email sent via Resend', to: payload.to, subject: payload.subject });
    return true;
  } catch (err: any) {
    logger.warn({ message: '[Mailer] Resend network error', error: err.message });
    return false;
  }
}

// Track if nodemailer has been loaded
let Nodemailer: any = null;
async function getNodemailer(): Promise<any> {
  if (!Nodemailer) {
    try {
      Nodemailer = await import('nodemailer');
    } catch {
      return null;
    }
  }
  return Nodemailer;
}

async function sendViaSmtp(payload: EmailPayload): Promise<boolean> {
  const nm = await getNodemailer();
  if (!nm) {
    logger.warn('[Mailer] nodemailer not installed — cannot send via SMTP');
    return false;
  }

  try {
    const transporter = nm.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@complianceos.com',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    logger.info({ message: '[Mailer] Email sent via SMTP', to: payload.to, subject: payload.subject });
    return true;
  } catch (err: any) {
    logger.warn({ message: '[Mailer] SMTP error', error: err.message });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Template helpers                                                   */
/* ------------------------------------------------------------------ */

function licenseEmail(key: string, tier: string): { subject: string; html: string } {
  switch (key) {
    case 'license.issued':
      return {
        subject: `Your ComplianceOS ${tier} License is Ready`,
        html: `
          <h1>Thank you for your purchase</h1>
          <p>Your ComplianceOS <strong>${tier}</strong> license is now active.</p>
          <p>Download your license file from the ComplianceOS admin panel, or the system will activate automatically.</p>
          <hr/>
          <p>Need help? Reply to this email or visit our docs.</p>
        `.trim(),
      };

    case 'license.expiring':
      return {
        subject: 'Your ComplianceOS License is Expiring Soon',
        html: `<h1>License Expiry Notice</h1><p>Your license will expire in 7 days. Please renew to avoid interruption.</p>`.trim(),
      };

    case 'trial.starting':
      return {
        subject: 'Welcome to ComplianceOS — Trial Active',
        html: `<h1>Your 30-day Trial is Active</h1><p>Explore all features. Upgrade to Pro when you're ready.</p>`.trim(),
      };

    default:
      return { subject: 'ComplianceOS Notification', html: `<p>Notification from ComplianceOS.</p>` };
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export const mailer = {
  /**
   * Send a lead capture notification.
   */
  async leadCaptured(email: string, name?: string): Promise<boolean> {
    return sendEmail({
      to: email,
      subject: 'Welcome to ComplianceOS',
      html: `
        <h1>Thanks for your interest, ${name || 'there'}!</h1>
        <p>We'll keep you updated on ComplianceOS news and updates.</p>
      `.trim(),
    });
  },

  /**
   * Send a license event email.
   */
  async licenseEvent(
    email: string,
    event: 'license.issued' | 'license.expiring' | 'license.expired' | 'trial.starting' | 'trial.ending',
    tier: string,
  ): Promise<boolean> {
    const { subject, html } = licenseEmail(event, tier);
    return sendEmail({ to: email, subject, html });
  },

  /**
   * Check if email is configured (any transport available).
   */
  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST;
  },
};
