
import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { getDb } from './db';
import { users, personalAccessTokens } from './schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { localAuth } from './lib/auth/local-auth';

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

        // LOCAL AUTH — validate JWT locally
        if (useLocalAuth) {
            const decoded = localAuth.validateToken(token);
            if (!decoded) {
                return next();
            }
            // Map local user to the expected req.user shape
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role as any,
                name: decoded.email?.split('@')[0] || 'User',
            } as any;
            authInfo.dbUser = true;
            console.log('[Auth] Local auth validated:', decoded.email);
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
