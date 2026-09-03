
import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { getDb, upsertUser, getUserByOpenId } from './db';
import { users, personalAccessTokens } from './schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { localAuth } from './lib/auth/local-auth';
import { resolveProxyUser } from './lib/sso/proxy-auth';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const authMode = (process.env.AUTH_MODE || 'auto').toLowerCase();

// Determine if local auth should be used
const useLocalAuth = authMode === 'local' || (!supabaseUrl || supabaseUrl.includes('placeholder'));

export const supabase = (!useLocalAuth && supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : (null as unknown as ReturnType<typeof createClient>);

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authInfo: any = { hasAuthHeader: false, supabaseUser: false, dbUser: false };
    (req as any).authInfo = authInfo;

    // Skip auth for health and public routes
    const publicPaths = ['/health', '/api/health', '/api/auth/local-login', '/api/auth/local-register',
                         '/api/v1/health', '/api/v1/webhooks/', '/api/webhooks/'];
    if (publicPaths.some(p => req.url.startsWith(p))) {
        return next();
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            // Enterprise SSO (cycle 9, scorecard #13): reverse-proxy header auth.
            // The edge proxy (Traefik/Nginx/Authentik) authenticates the user and
            // forwards the principal via SSO_PROXY_AUTH_HEADER (default X-Forwarded-User).
            const proxyUser = resolveProxyUser(req.headers as any);
            if (proxyUser) {
                try {
                    await upsertUser({
                        openId: proxyUser.openId,
                        email: proxyUser.email,
                        name: proxyUser.name,
                        loginMethod: 'sso_proxy',
                        lastSignedIn: new Date(),
                    });
                    const dbUser = await getUserByOpenId(proxyUser.openId);
                    if (dbUser) {
                        authInfo.dbUser = true;
                        authInfo.proxySso = true;
                        req.user = dbUser;
                    }
                } catch (err) {
                    console.error('[AuthMiddleware] Proxy SSO upsert failed:', err instanceof Error ? err.message : String(err));
                }
            }
            return next();
        }
        authInfo.hasAuthHeader = true;
        const token = authHeader.replace('Bearer ', '');

        // Personal Access Tokens (PATs) — work the same regardless of auth mode
        if (token.startsWith('cos_')) {
            const dbConn = await getDb();
            const [pat] = await dbConn.select()
                .from(personalAccessTokens)
                .where(eq(personalAccessTokens.token, token))
                .limit(1);
            if (!pat) return next();
            const dbUser = await dbConn.query.users.findFirst({
                where: eq(users.id, pat.userId)
            });
            if (!dbUser) return next();
            dbConn.update(personalAccessTokens)
                .set({ lastUsedAt: new Date() })
                .where(eq(personalAccessTokens.id, pat.id))
                .execute().catch(() => {});
            authInfo.dbUser = true;
            authInfo.isPat = true;
            req.user = dbUser;
            return next();
        }

        // LOCAL AUTH — validate JWT locally, set user from token (no DB round-trip)
        if (useLocalAuth) {
            const decoded = localAuth.validateToken(token);
            if (!decoded) {
                console.log('[Auth] Local auth token validation FAILED');
                authInfo.hasAuthHeader = false;
                return next();
            }
            // Look up actual user ID from database
            let userId = 0;
            try {
                const dbConn = await getDb();
                const dbUser = await dbConn.query.users.findFirst({
                    where: eq(users.email, decoded.email)
                });
                if (dbUser) {
                    userId = dbUser.id;
                } else {
                    // Auto-create user in database on first login
                    const [newUser] = await dbConn.insert(users).values({
                        email: decoded.email,
                        name: decoded.email.split('@')[0],
                        role: 'owner',
                        openId: `local-${Date.now()}`,
                        loginMethod: 'local',
                        lastSignedIn: new Date(),
                    }).returning();
                    userId = newUser.id;
                }
            } catch {
                userId = decoded.email === 'admin@complianceos.local' ? 1 : 0;
            }
            req.user = {
                id: userId,
                email: decoded.email,
                role: decoded.role === 'admin' ? 'owner' : (decoded.role as any),
                name: decoded.email?.split('@')[0] || 'User',
            } as any;
            (req as any).authInfo = (req as any).authInfo || {};
            (req as any).authInfo.dbUser = true;
            (req as any).authInfo.hasAuthHeader = true;
            console.log('[Auth] Local auth validated:', decoded.email, 'role:', (req.user as any).role);
            return next();
        }

        // SUPABASE AUTH — fallback when Supabase is configured
        if (!supabase) {
            return next();
        }
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return next();
        }
        authInfo.supabaseUser = true;

        const dbConn = await getDb();
        const dbUser = await dbConn.query.users.findFirst({
            where: eq(users.openId, user.id)
        });
        if (!dbUser) {
            return next();
        }
        authInfo.dbUser = true;
        req.user = dbUser;
        next();

    } catch (error: any) {
        console.error('[AuthMiddleware] Exception:', error.message);
        const logFile = path.resolve(process.cwd(), 'auth_error.log');
        const logEntry = `[${new Date().toISOString()}] Auth Error: ${error.message}\n`;
        fs.appendFile(logFile, logEntry, () => {});

        if (req.url.startsWith('/api/trpc') || req.url.startsWith('/api/v1')) {
            return res.status(503).json({ error: 'Authentication service unavailable' });
        }
        next();
    }
};
