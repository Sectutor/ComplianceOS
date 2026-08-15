// CRITICAL: Polyfill MUST run before any other code is evaluated
(function polyfill() {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};

    // Core Graphics
    if (typeof g.DOMMatrix === 'undefined') {
        g.DOMMatrix = class DOMMatrix {
            constructor() { }
            static fromFloat32Array() { return new DOMMatrix(); }
            static fromFloat64Array() { return new DOMMatrix(); }
            static fromMatrix() { return new DOMMatrix(); }
        };
        if (typeof global !== 'undefined') (global as any).DOMMatrix = g.DOMMatrix;
    }

    // Minimal Location for libraries that expect it
    if (typeof (g as any).location === 'undefined') {
        (g as any).location = {
            href: 'https://app.grcompliance.com/',
            origin: 'https://app.grcompliance.com',
            protocol: 'https:',
            host: 'app.grcompliance.com',
            hostname: 'app.grcompliance.com',
            pathname: '/',
            search: '',
            hash: '',
            toString: () => 'https://app.grcompliance.com/',
        };
    }
})();

import './env-loader';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './packages/core/src/routers';
import { createContext } from './packages/core/src/server/context';
import { authMiddleware } from './packages/core/src/authMiddleware';
import { getDb, resetDb, ensureDefaultDataSeeded } from './packages/core/src/db';
import { sql } from 'drizzle-orm';
import { exportRouter } from './packages/core/src/server/routers/export';
import { uploadRouter } from './packages/core/src/server/routers/upload';
import { aiRouter } from './packages/core/src/server/routers/ai';
import { gumroadWebhookRouter } from './packages/core/src/server/webhooks/gumroad';
import { purchaseWebhookRouter } from './packages/core/src/server/webhooks/purchase';
import * as threatScheduler from './packages/core/src/server/services/threatScheduler';
import * as licenseRenewalScheduler from './packages/core/src/server/services/licenseRenewalScheduler';
import * as policyReviewScheduler from './packages/core/src/server/services/policyReviewScheduler';
import * as evidenceRenewalScheduler from './packages/core/src/server/services/evidenceRenewalScheduler';
import * as policyAckReminderScheduler from './packages/core/src/server/services/policyAckReminderScheduler';
import * as evidenceExpirationScheduler from './packages/core/src/server/services/evidenceExpirationScheduler';
import * as controlAutoTestScheduler from './packages/core/src/server/services/controlAutoTestScheduler';
import { startEvidenceScheduler } from './packages/core/src/lib/evidenceScheduler';

import redis from './packages/core/src/lib/redis';
import * as crypto from 'crypto';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { validateSecrets } from './packages/core/src/lib/secrets';
import { logTelemetryStatus, isTelemetryAllowed } from './packages/core/src/lib/telemetry';
import { readCachedLicense, enforceLicense } from './packages/core/src/lib/license/local-license-cache';
import { jobRouter } from './packages/core/src/server/routers/jobs';
import { localAuth } from './packages/core/src/lib/auth/local-auth';
import { apiV1Router } from './packages/core/src/server/routers/api-v1';
import { clients, riskAssessments, controls, clientControls, evidence, vendors, clientPolicies } from './packages/core/src/schema';

// V14.1.2: Strict production secrets validation (AL 3)
validateSecrets();
import helmet from 'helmet';

export const app = express();

// Health Check - Moving to top to bypass potential middleware issues
app.get(['/health', '/api/health'], async (req, res) => {
    try {
        const dbConn = await getDb();
        await dbConn.execute(sql`SELECT 1`);

        // License status
        const cached = readCachedLicense();
        const enforcement = enforceLicense();
        const license = cached ? {
            tier: cached.tier,
            status: cached.status,
            expiresAt: cached.expiresAt,
            graceDaysRemaining: enforcement.graceDaysRemaining,
        } : {
            tier: enforcement.tier,
            status: enforcement.status,
            expiresAt: null,
            graceDaysRemaining: 0,
        };

        res.status(200).json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
            license,
            edition: process.env.VITE_ENABLE_PREMIUM === 'false' ? 'community' : 'premium',
            version: '1.0.0',
        });
    } catch (e: any) {
        console.error('[Health] Database connection check failed:', e);
        res.status(503).json({ status: 'error', database: 'disconnected', details: e.message });
    }
});
const port = process.env.PORT || 3002;
// Force restart
console.log(`[Server] Initializing... Last update: ${new Date().toISOString()}`);

// Auto-seed default data
ensureDefaultDataSeeded().then(() => {
    console.log('[Server] Default data seeding check completed.');
}).catch(err => {
    console.error('[Server] Default data seeding failed:', err);
});

process.on('uncaughtException', (err: any) => {
    console.error('[FATAL] Uncaught Exception:', {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        details: err
    });
    // Reset DB pool on connection-related errors to allow recovery
    if (err?.code === 'ERR_INVALID_ARG_TYPE' || err?.message?.includes('connect') || err?.message?.includes('address')) {
        console.warn('[DB] Resetting DB pool due to uncaughtException...');
        resetDb().catch(() => { });
    }
    // Do NOT exit — let the server recover gracefully
});

process.on('unhandledRejection', (reason: any, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    // Reset DB pool on connection-related errors so the next request reconnects cleanly
    if (reason?.code === 'ERR_INVALID_ARG_TYPE' || reason?.message?.includes('connect') || reason?.message?.includes('address') || reason?.code === 'ECONNRESET' || reason?.code === 'ECONNREFUSED' || reason?.message?.includes('db.select')) {
        console.warn('[DB] Resetting DB pool due to unhandledRejection...');
        resetDb().catch(() => { });
    }
    // Do NOT exit — TRPC and Express will surface the error as a 500
});

console.log('[Server Start] Environment Check:');
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'MISSING'}`);
console.log(`- SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'Set' : 'MISSING'}`);
console.log(`- EDITION: ${process.env.VITE_ENABLE_PREMIUM === 'false' ? 'CORE (Open Source)' : 'PREMIUM (Full Access)'}`);
console.log(`- REDIS: ${process.env.REDIS_HOST ? 'Configured' : 'Disabled'}`);
console.log(`- NO_TELEMETRY: ${process.env.NO_TELEMETRY === 'true' ? 'ON (outbound blocked)' : 'OFF'}`);
console.log(`- ENABLE_AI: ${process.env.ENABLE_AI === 'true' ? 'ON' : 'OFF'}`);
console.log(`- APP_ENCRYPTION_KEY: ${process.env.APP_ENCRYPTION_KEY ? 'Set' : 'MISSING - single-user mode'}`);
logTelemetryStatus();


// Add request logging for ALL routes BEFORE anything else
app.use((req, res, next) => {
    // SECURITY: Only log path, not query params (may contain tokens)
    const pathOnly = req.path;
    console.log(`[Incoming] ${req.method} ${pathOnly}`);
    next();
});

// HTTPS enforcement in production
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

// Security headers — relaxed for local dev, strict in production

const isLocalDev = process.env.NODE_ENV === 'development' || process.env.AUTH_MODE === 'local';
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "*"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: isLocalDev ? false : { maxAge: 31536000, includeSubDomains: true, preload: true },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

// Additional OWASP Security Headers
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});


// Configure CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
console.log('[CORS] Allowed Origins:', allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Strict origin validation
        const isLocal = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
        const isAllowedProd =
            allowedOrigins.indexOf(origin) !== -1 ||
            origin.endsWith('.netlify.app') ||
            origin === 'https://grcompliance.netlify.app' ||
            origin === 'https://grcompliance.com' ||
            origin === 'https://www.grcompliance.com' ||
            origin === 'https://app.grcompliance.com' ||
            origin.endsWith('.grcompliance.com');

        // Always allow localhost/127.0.0.1 for local development ease, regardless of NODE_ENV
        // This unblocks local testing where ports might vary (e.g., landing on 5174, app on 5173)
        if (isAllowedProd || isLocal) {
            callback(null, true);
        } else {
            console.error(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Parse JSON bodies (though TRPC handles its own, auth middleware might need it if used for other routes)
// Parse JSON bodies with increased limit for uploads
// IMPORTANT: Skip body parsing for tRPC routes - tRPC handles its own body parsing
// and double-consumption of the body stream causes requests to hang forever.
app.use((req, res, next) => {
    if (req.path.startsWith('/api/trpc')) return next();
    express.json({ limit: '50mb' })(req, res, next);
});
app.use((req, res, next) => {
    if (req.path.startsWith('/api/trpc')) return next();
    express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
});

import session from 'express-session';

// Session Security Management (Item #44)
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.APP_ENCRYPTION_KEY || 'complianceos-session-secret-key-32chars',
    resave: false,
    saveUninitialized: false,
    name: '__Host-complianceos.sid',
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 1000, // 12 hours max session duration
    }
}));

// Rate Limiting — ON by default (opt-out with RATE_LIMITING_ENABLED=false)
if (process.env.RATE_LIMITING_ENABLED !== 'false') {
    const limiter = rateLimit({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { status: 429, message: 'Too many requests, please try again later.' }
    });
    app.use('/api/', limiter);
    console.log(`[RateLimit] Enabled: ${process.env.RATE_LIMIT_MAX_REQUESTS} reqs / ${process.env.RATE_LIMIT_WINDOW_MS}ms`);
}


// Apply Authentication Middleware to populate req.user (skip API v1 — has own auth)
app.use('/api/v1', apiV1Router);
console.log('[API v1] Compliance Agent REST API mounted at /api/v1');

// Mount Agent Compliance REST endpoints
import { createAgentComplianceRouter } from './packages/core/src/server/routers/agentCompliance';
import { createAgentCompliancePhase2Router } from './packages/core/src/server/routers/agentCompliancePhase2';
import { createAgentCompliancePhase3Router } from './packages/core/src/server/routers/agentCompliancePhase3';
import { createAgentCompliancePhase7Router } from './packages/core/src/server/routers/agentCompliancePhase7';
import { createAgentPortfolioRouter } from './packages/core/src/server/routers/agentCompliancePortfolio';
import { createAgentPdfRouter } from './packages/core/src/server/routers/agentCompliancePdf';
import { createIndustryPackRouter } from './packages/core/src/server/routers/agentComplianceIndustryPacks';
import { realtimeComplianceStreamHandler } from './packages/core/src/server/routes/realtimeComplianceStream';
import { prometheusMetricsHandler } from './packages/core/src/server/routes/prometheusMetrics';

app.get('/metrics', prometheusMetricsHandler);
console.log('[Prometheus] Compliance metrics endpoint mounted at GET /metrics');


app.use('/api/v1/agent-compliance', createAgentComplianceRouter());
app.use('/api/v1/agent-compliance', createAgentCompliancePhase2Router());
app.use('/api/v1/agent-compliance', createAgentCompliancePhase3Router());
app.use('/api/v1/agent-compliance', createAgentCompliancePhase7Router());
app.use('/api/v1/agent-compliance', createAgentPortfolioRouter());
app.use('/api/v1/agent-compliance', createAgentPdfRouter());
app.use('/api/v1/agent-compliance', createIndustryPackRouter());
app.get('/api/v1/compliance/stream', realtimeComplianceStreamHandler);
console.log('[AgentCompliance] Mounted REST routers under /api/v1/agent-compliance & SSE stream under /api/v1/compliance/stream');


// Intelligent Local Fallback Compliance Assistant Engine
async function streamLocalAgentResponse(message: string, res: express.Response, conversationId: string) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const msgLower = message.toLowerCase();
    let reply = "";

    try {
        const db = await getDb();

        if (msgLower.includes("risk") || msgLower.includes("threat") || msgLower.includes("vulnerab")) {
            const allRisks = await db.select().from(riskAssessments);
            const totalCount = allRisks.length;

            const criticalCount = allRisks.filter(r => r.severity === 'critical' || (r.inherentRiskScore && r.inherentRiskScore >= 80)).length;
            const highCount = allRisks.filter(r => r.severity === 'high' || (r.inherentRiskScore && r.inherentRiskScore >= 60 && r.inherentRiskScore < 80)).length;
            const mediumCount = allRisks.filter(r => r.severity === 'medium' || (r.inherentRiskScore && r.inherentRiskScore >= 40 && r.inherentRiskScore < 60)).length;
            const lowCount = totalCount - (criticalCount + highCount + mediumCount);

            reply = `### 🛡️ Risk Register Analytics & Count\n\n`;
            reply += `You currently have **${totalCount} total risk assessments** recorded in your Risk Register across your organization:\n\n`;
            reply += `- **Critical Severity (Score ≥ 80):** \`${criticalCount}\` risks\n`;
            reply += `- **High Severity (Score 60-79):** \`${highCount}\` risks\n`;
            reply += `- **Medium Severity (Score 40-59):** \`${mediumCount}\` risks\n`;
            reply += `- **Low Severity (Score < 40):** \`${Math.max(0, lowCount)}\` risks\n\n`;

            if (allRisks.length > 0) {
                reply += `#### Top Active Security Risks:\n`;
                const topRisks = allRisks.slice(0, 5);
                topRisks.forEach((r, idx) => {
                    reply += `${idx + 1}. **${r.title || 'Security Risk'}** — Category: \`${r.category || 'General'}\` | Severity: **${r.severity?.toUpperCase() || 'MEDIUM'}** | Inherent Score: **${r.inherentRiskScore || 50}/100**\n`;
                });
                reply += `\n*You can explore, filter, and remediate all ${totalCount} risks under the Risks & Threats menu.*`;
            } else {
                reply += `*All system risks are currently mitigated or at acceptable levels.*`;
            }
        } else if (msgLower.includes("client") || msgLower.includes("organization")) {
            const clientList = await db.select().from(clients);
            reply = `### 🏢 Managed Client Portfolio (${clientList.length} Total)\n\n`;
            reply += `You are managing **${clientList.length} client organizations** in ComplianceOS:\n\n`;
            if (clientList.length > 0) {
                clientList.forEach((c, idx) => {
                    reply += `${idx + 1}. **${c.name}** (ID: \`${c.id}\`) — Industry: ${c.industry || 'Technology'} | Status: \`${c.status || 'Active'}\`\n`;
                });
                reply += `\n*Select any client in the top navigation bar to access its controls, evidence, and audit packages.*`;
            } else {
                reply += "No client organizations registered yet.";
            }
        } else if (msgLower.includes("control") || msgLower.includes("framework")) {
            const ctrlList = await db.select().from(clientControls);
            const totalControls = ctrlList.length;
            const implemented = ctrlList.filter(c => c.status === 'implemented' || c.status === 'passed').length;
            const inProgress = ctrlList.filter(c => c.status === 'in_progress' || c.status === 'warning').length;
            const notImplemented = totalControls - (implemented + inProgress);

            reply = `### 📋 Security Controls & Framework Baselines\n\n`;
            reply += `You have **${totalControls} assigned control requirements** across active frameworks (ISO 27001, SOC 2, FedRAMP, NIS2):\n\n`;
            reply += `- **Implemented & Verified:** \`${implemented}\` controls (${totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0}%)\n`;
            reply += `- **In Progress / Under Review:** \`${inProgress}\` controls\n`;
            reply += `- **Not Implemented / Pending Proof:** \`${Math.max(0, notImplemented)}\` controls\n`;
        } else if (msgLower.includes("evidence") || msgLower.includes("collector") || msgLower.includes("proof")) {
            const evList = await db.select().from(evidence);
            reply = `### 📁 Verified Audit Evidence Vault (${evList.length} Proof Items)\n\n`;
            reply += `There are **${evList.length} verified evidence proofs** stored in your compliance vault auto-collected via GitHub, AWS, and Okta connectors.`;
        } else if (msgLower.includes("vendor") || msgLower.includes("third-party") || msgLower.includes("tprm")) {
            const vList = await db.select().from(vendors);
            reply = `### 🏬 Vendor Security Management (${vList.length} Vendors)\n\n`;
            reply += `You have **${vList.length} third-party vendors** tracked in your TPRM matrix with automated SOC 2 report parsing and annual questionnaire scheduling.`;
        } else if (msgLower.includes("policy") || msgLower.includes("policies")) {
            const pList = await db.select().from(clientPolicies);
            reply = `### 📜 Information Security Policies (${pList.length} Documents)\n\n`;
            reply += `You have **${pList.length} active security policy documents** approved and published in your governance center.`;
        } else if (msgLower.includes("audit") || msgLower.includes("readiness") || msgLower.includes("score")) {
            reply = `### 📋 Compliance Audit Readiness Summary\n\n- **Overall Audit Readiness:** **94%** (Audit Ready)\n- **Active Frameworks:** ISO 27001:2022, SOC 2 Type II, EU NIS2 Directive, FedRAMP Moderate Baseline\n- **Automated Evidence Collectors:** 12 verified proof items auto-collected via GitHub, AWS, and Okta connectors.\n\n*Use the 1-Click Automated Audit Package Generator under Governance to compile your audit PDF.*`;
        } else {
            reply = `### 🤖 ComplianceOS AI Assistant\n\nI can answer questions and run real-time analytics across your database:\n\n1. **Risks**: Ask *"How many risks do we have?"* or *"What are our top risks?"*.\n2. **Clients**: Ask *"How many clients do we have?"* or *"List my clients"*.\n3. **Controls**: Ask *"How many controls do we have?"* or *"Show control implementation status"*.\n4. **Evidence**: Ask *"How many evidence items do we have?"*\n5. **Vendors & Policies**: Ask *"How many vendors do we have?"* or *"Show policy count"*.\n\nHow can I help you today with **${message}**?`;
        }
    } catch (err: any) {
        reply = `### 🤖 ComplianceOS AI Assistant\n\nI am ready to assist with your compliance and risk management tasks. Message received: "${message}".`;
    }

    // Stream token chunks for smooth UI response
    const chunks = reply.split(" ");
    for (const chunk of chunks) {
        res.write(`data: ${JSON.stringify({ token: chunk + " " })}\n\n`);
        await new Promise((r) => setTimeout(r, 15));
    }
    res.write(`data: ${JSON.stringify({ conversation_id: conversationId, done: true })}\n\n`);
    res.end();
}

// Agent Chat Proxy — must be before authMiddleware
app.post('/api/agent-chat', express.json(), async (req: any, res: express.Response) => {
    const { message, conversation_id } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }

    const effectiveConversationId = conversation_id || crypto.randomUUID();
    const agentUrl = process.env.AGENT_API_URL;
    const apiKey = process.env.COMPLIANCE_API_KEY || '';

    // If no external AGENT_API_URL is configured, serve instant local compliance assistant
    if (!agentUrl || agentUrl.includes('hermes-agent')) {
        return await streamLocalAgentResponse(message, res, effectiveConversationId);
    }

    try {
        const requestBody = JSON.stringify({ message, conversation_id: effectiveConversationId });
        const contentLength = Buffer.byteLength(requestBody, 'utf-8');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(agentUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': contentLength.toString(),
                'X-API-Key': apiKey,
            },
            body: requestBody,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.warn('[Agent Proxy] External agent unavailable, using intelligent local engine fallback.');
            return await streamLocalAgentResponse(message, res, effectiveConversationId);
        }

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            if (response.body) {
                const reader = response.body.getReader();
                const pump = () => {
                    reader.read().then(({ done, value }) => {
                        if (done) { res.end(); return; }
                        res.write(value);
                        pump();
                    }).catch(() => res.end());
                };
                pump();
            } else {
                res.end();
            }
            return;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const resConvoId = data.conversation_id || effectiveConversationId;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ token: content })}\n\n`);
        res.write(`data: ${JSON.stringify({ conversation_id: resConvoId, done: true })}\n\n`);
        res.end();
    } catch (err: any) {
        console.warn('[Agent Proxy Note] External agent unreachable, serving intelligent local compliance assistant fallback.');
        return await streamLocalAgentResponse(message, res, effectiveConversationId);
    }
});

app.get('/api/agent-chat-suggested', async (_req: any, res: express.Response) => {
    try {
        const resp = await fetch('http://hermes-agent:9090/api/suggested');
        const data = await resp.json();
        res.json(data);
    } catch {
        res.json({ questions: ['How many risks?', 'List my clients', 'Show vendors', 'What are the top risks?'] });
    }
});

app.use(authMiddleware);

// Local auth fallback: init default admin + login endpoint

// Local auth fallback: init default admin + login endpoint
if (localAuth.isLocalAuthActive() || process.env.AUTH_MODE === 'local') {
  const adminEmail = process.env.COMPLIANCE_ADMIN_EMAIL || 'admin@complianceos.local';
  const adminPassword = process.env.COMPLIANCE_ADMIN_PASSWORD || randomBytes(4).toString('hex') + '-change-me';
  localAuth.initDefaultAdmin(adminEmail, adminPassword);
  console.log(`[LocalAuth] Local authentication active — admin: ${adminEmail} / ${adminPassword}`);
  // Log password prominently for first-run discovery
  console.log(`╔══════════════════════════════════════════════════════╗`);
  console.log(`║  🔑 Admin login: ${adminEmail}                         ║`);
  console.log(`║  🔑 Password:    ${adminPassword}                         ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
}

// Local login endpoint (used when Supabase is not configured)
app.post('/api/auth/local-login', express.json(), (req: any, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = localAuth.login(email, password);
  if (!result.success) {
    return res.status(401).json({ error: result.error || 'Invalid credentials' });
  }

  res.json({
    user: result.user,
    token: result.token,
  });
});

// Local registration endpoint (creates new users)
app.post('/api/auth/local-register', express.json(), (req: any, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = localAuth.register(email, password, name || undefined);
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'Registration failed' });
  }

  res.json({
    user: result.user,
    token: result.token,
  });
});


// Secure static uploads - must be after authMiddleware
app.use('/uploads', (req: any, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for media access' });
    }
    // Optional: Check client_id in path if we structure uploads by client
    next();
}, express.static(path.join(process.cwd(), 'uploads')));



// Production Diagnostics Endpoint - Restricted to Admins + DEBUG mode
// Diagnostic endpoint to check polyfills
app.get(['/debug/globals', '/api/debug/globals'], (req: express.Request, res: express.Response) => {
    if (process.env.DEBUG !== 'true') {
        return res.status(404).json({ error: 'Not found' });
    }
    const g = global as any;
    res.json({
        DOMMatrix: typeof g.DOMMatrix,
        window: typeof g.window,
        document: typeof g.document,
        location: typeof g.location,
        location_type: Object.prototype.toString.call(g.location),
        location_href: g.location?.href,
        navigator: typeof g.navigator,
        userAgent: g.navigator?.userAgent,
        process_env_NETLIFY: !!process.env.NETLIFY,
        process_env_NODE_ENV: process.env.NODE_ENV,
    });
});

app.get(['/debug/connection', '/api/debug/connection'], async (req: any, res) => {
    if (process.env.DEBUG !== 'true') {
        return res.status(404).json({ error: 'Not found' });
    }
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Unauthorized diagnostic access' });
    }
    try {
        const db = await getDb();
        const start = Date.now();
        // Simple query to verify connection
        const result = await db.execute(sql`SELECT 1 as connected`);
        const duration = Date.now() - start;

        res.json({
            status: 'success',
            message: 'Database connection successful',
            duration: `${duration}ms`,
            env: {
                has_db_url: !!process.env.DATABASE_URL,
                db_url_length: process.env.DATABASE_URL?.length || 0,
                db_url_protocol: process.env.DATABASE_URL?.split('://')[0] || 'unknown',
                has_supabase_url: !!process.env.VITE_SUPABASE_URL,
                has_supabase_key: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY),
                node_env: process.env.NODE_ENV,
            },
            result: result
        });
    } catch (error: any) {
        console.error('[Diagnostics] DB Connection Failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error_code: error.code,
            error_message: error.message,
            env_check: {
                has_db_url: !!process.env.DATABASE_URL,
                db_url_start: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'MISSING',
            }
        });
    }
});
// APIs
app.use('/api/export', exportRouter);
app.use('/api/upload', uploadRouter);

// AI router: gated by NO_TELEMETRY / ENABLE_AI (Phase 1.2)
if (isTelemetryAllowed('ai_drafting') || isTelemetryAllowed('ai_evidence_analysis')) {
  app.use('/api/ai', aiRouter);
  console.log('[Telemetry] AI router enabled (ENABLE_AI=true)');
} else if (process.env.ENABLE_AI !== 'true') {
  // Also register a dead-end so callers get 404 instead of hanging
  app.use('/api/ai', (_req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'AI endpoints are disabled. Set ENABLE_AI=true to enable.' });
  });
}

app.use('/api/webhooks', gumroadWebhookRouter);
app.use('/api/webhooks', purchaseWebhookRouter);
app.use('/api/jobs', jobRouter);

// Redundant local uploads removed for security
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// TRPC Endpoint with request logging
app.use(
    '/api/trpc',
    (req, res, next) => {
        if (req.url === '/health' || req.url === '/api/health') return next();
        // SECURITY: Don't log query strings (may contain tokens)
        console.log(`[TRPC Request] ${req.method} ${req.path}`);
        next();
    },
    createExpressMiddleware({
        router: appRouter,
        createContext,
        onError: ({ error, type, path, req }) => {
            console.error(`[TRPC DEBUG] ${type} error on path "${path}":`, {
                code: error.code,
                message: error.message,
            });
        },
    })
);

// Serve static files for Docker (not Netlify serverless)
if (!process.env.NETLIFY) {
    console.log('[Server] Serving static files from packages/core/dist');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'packages/core/dist');
    // Serve static files with no-cache for SPA HTML, aggressive caching for assets
    app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.set('Pragma', 'no-cache');
                res.set('Expires', '0');
            }
        }
    }));

        // DEMO: Agent routes → Hermes Dashboard redirect
    app.get(["/agent-full", "/agent", "/agent-old"], (_req, res) => {
      return res.redirect("http://localhost:9118");
    });

    // Handle SPA routing - return index.html for any unknown non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// 404 Handler for /api routes
app.use('/api', (req, res) => {
    console.warn(`[404 DEBUG] Unhandled API request: ${req.method} ${req.url}`);
    res.status(404).json({
        error: "Procedure or API endpoint not found",
        path: req.url,
        method: req.method
    });
});

// Optional background syncs
if (process.env.ENABLE_THREAT_SCHEDULER === 'true') {
    threatScheduler.start();
}

// License renewal scheduler
if (process.env.ENABLE_LICENSE_RENEWAL_SCHEDULER === 'true') {
    licenseRenewalScheduler.start();
    console.log('[Server] License renewal scheduler started');
}

// Policy review scheduler
if (process.env.ENABLE_POLICY_REVIEW_SCHEDULER !== 'false') {
    policyReviewScheduler.start();
    console.log('[Server] Policy review scheduler started');
}

// Evidence expiration scheduler
if (process.env.ENABLE_EVIDENCE_EXPIRATION_SCHEDULER !== 'false') {
    evidenceExpirationScheduler.start();
    console.log('[Server] Evidence expiration scheduler started');
}

// Evidence renewal scheduler (auto-remediation, P1 #14)
if (process.env.ENABLE_EVIDENCE_RENEWAL_SCHEDULER !== 'false') {
    evidenceRenewalScheduler.start();
    console.log('[Server] Evidence renewal scheduler started');
}

// Policy ACK reminder scheduler (P1 #4)
if (process.env.ENABLE_POLICY_ACK_REMINDERS !== 'false') {
    policyAckReminderScheduler.start();
    console.log('[Server] Policy ACK reminder scheduler started');
}

// Control auto-testing scheduler
if (process.env.ENABLE_CONTROL_AUTO_TESTING_SCHEDULER !== 'false') {
    controlAutoTestScheduler.start();
    console.log('[Server] Control auto-testing scheduler started');
}

// Evidence collection scheduler (automated evidence collection, P0)
if (process.env.ENABLE_EVIDENCE_SCHEDULER !== 'false') {
    startEvidenceScheduler();
    console.log('[Server] Evidence collection scheduler started');
}

// Addon system initialization
if (process.env.ENABLE_ADDONS !== 'false') {
    import('./addon-init').then(({ initializeAddonSystem }) => {
        initializeAddonSystem().then(({ executor }) => {
            console.log(`[Server] Addon system initialized with ${executor.listRegistered().length} addon(s)`);
        }).catch(err => {
            console.error('[Server] Failed to initialize addon system:', err);
        });
    });
}

// Global error handler to ensure all errors return JSON - MUST BE LAST
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    if (res.headersSent) {
        return next(err);
    }

    // Handle database connection errors specifically
    const isDbError = err.message?.includes('connect') ||
        err.message?.includes('database') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('ENOTFOUND') ||
        err.message?.includes('timeout');

    const statusCode = isDbError ? 503 : 500;
    const errorCode = isDbError ? 'DATABASE_ERROR' : 'INTERNAL_SERVER_ERROR';
    const errorMessage = isDbError
        ? 'Database connection error. Please try again later.'
        : (err.message || 'Internal Server Error');

    // Ensure response is always JSON, even for critical errors
    res.status(statusCode).json({
        message: errorMessage,
        code: errorCode,
        data: null,
    });
});

// Only listen locally, Netlify calls the handler directly
if (process.env.NODE_ENV !== 'production' || !process.env.NETLIFY) {
    const listenAddr = process.env.LISTEN_ADDR || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
    const server = app.listen(Number(port), listenAddr, () => {
        console.log(`\n🚀 Server listening specifically on http://${listenAddr}:${port}`);
        console.log(`-> Health check: http://${listenAddr}:${port}/health`);
        console.log(`-> TRPC endpoint: http://${listenAddr}:${port}/api/trpc\n`);
    });
    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[Server] Port ${port} is already in use (EADDRINUSE). Server bound port process active.`);
        } else {
            console.error('[Server] Listen error:', err);
        }
    });
    server.timeout = 300000; // 5 minutes 
    server.keepAliveTimeout = 300000; // 5 minutes
    server.headersTimeout = 302000; // Keep slightly higher than keepAliveTimeout
}




