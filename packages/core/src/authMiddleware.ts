import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
import { getDb } from './db';
import { users, clients, userClients } from './schema';
import { eq, sql, isNull, and } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import { logger } from './lib/logger';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client for server-side validation
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[AuthMiddleware Init] Supabase Config:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    url: supabaseUrl?.substring(0, 30)
});

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
    logger.warn('Missing Supabase environment variables on server.');
}

export const supabaseServer = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    (supabaseServiceKey || supabaseAnonKey) || 'placeholder'
);

// Cache for user profiles
// Key: Supabase OpenID, Value: DB User Record
// TTL: 5 minutes (300000ms)
const userCache = new LRUCache<string, any>({
    max: 500,
    ttl: 1000 * 60 * 5,
});

// Extend Express Request type to include user information
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;       // The ID in our MySQL database
                openId: string;   // The Supabase User ID
                email?: string;
                role?: string;
            };
        }
    }
}

// Helper to append to error log
const logErrorToFile = (message: string, error: any) => {
    try {
        const logPath = path.join(process.cwd(), 'auth_error.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\nError: ${error?.message}\nStack: ${error?.stack}\n\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (e) {
        console.error('Failed to write to error log', e);
    }
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        const token = authHeader.replace('Bearer ', '');

        // Check Cache first using the TOKEN as the key
        const cachedUser = userCache.get(token);
        if (cachedUser) {
            req.user = {
                id: cachedUser.id,
                openId: cachedUser.openId,
                email: cachedUser.email || undefined,
                role: cachedUser.role || 'user',
            };
            return next();
        }

        const { data: { user: supabaseUser }, error } = await supabaseServer.auth.getUser(token);

        if (error || !supabaseUser) {
            logger.warn({
                message: 'Supabase token validation failed',
                error,
                tokenSnippet: token.substring(0, 20)
            });
            return next();
        }

        // User is valid in Supabase. Check if they exist in our DB.
        const openId = supabaseUser.id;
        const email = supabaseUser.email;

        // Get DB connection
        const db = await getDb();
        
        // Ensure we don't match deleted users
        const existingUsers = await db.select().from(users)
            .where(and(
                eq(users.openId, openId),
                isNull(users.deletedAt)
            ))
            .limit(1);

        let dbUser;

        if (existingUsers.length === 0) {
            // Check if user was soft-deleted
            const deletedUser = await db.select().from(users)
                .where(eq(users.openId, openId))
                .limit(1);

            if (deletedUser.length > 0) {
                logger.warn({ message: `Blocked login attempt for soft-deleted user: ${email}` });
                return next();
            }

            // Create new user
            const inserted = await db.insert(users).values({
                openId: openId,
                email: email,
                name: email?.split('@')[0] || 'User',
                loginMethod: 'email',
            }).returning();

            dbUser = inserted[0];
            logger.info(`Created new synced user: ${email} (ID: ${dbUser.id})`);
        } else {
            dbUser = existingUsers[0];
            console.log(`[AuthDebug] Found local user: ${dbUser.id} (${dbUser.email})`);
        }

        // Elevate first user to admin
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
        // Only count if we need to check for "first user" elevation, but optimization: skip count if admin email matches
        // For simplicity, keep original logic but wrap safely
        if ((dbUser.email && adminEmails.includes(dbUser.email)) && dbUser.role !== 'admin') {
             await db.update(users).set({ role: 'admin' }).where(eq(users.id, dbUser.id));
             dbUser.role = 'admin';
        } else if (dbUser.role !== 'admin') {
             // Only check count if not already admin and not in allowlist
             const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
             if (Number(userCount?.count || 0) === 1) {
                await db.update(users).set({ role: 'admin' }).where(eq(users.id, dbUser.id));
                dbUser.role = 'admin';
             }
        }

        // Cache the user record
        userCache.set(token, dbUser);

        req.user = {
            id: dbUser.id,
            openId: dbUser.openId,
            email: dbUser.email || undefined,
            role: dbUser.role || 'user',
        };

        // Bootstrap default client if needed
        try {
            const memberships = await db.select().from(userClients).where(eq(userClients.userId, dbUser.id)).limit(1);
            if (memberships.length === 0) {
                const existingClients = await db.select().from(clients).orderBy(sql`updated_at DESC`).limit(1);
                let targetClientId: number | undefined = existingClients[0]?.id;
                if (!targetClientId) {
                    const [created] = await db.insert(clients).values({
                        name: `${dbUser.name || 'Demo'} Workspace`,
                        status: 'active',
                        planTier: 'free',
                    }).returning();
                    targetClientId = created.id;
                    logger.info(`[Bootstrap] Created default client (ID: ${targetClientId}) for user ${dbUser.email}`);
                }
                await db.insert(userClients).values({
                    userId: dbUser.id,
                    clientId: targetClientId!,
                    role: 'owner',
                }).returning();
                logger.info(`[Bootstrap] Linked user ${dbUser.id} to client ${targetClientId} as owner`);
            }
        } catch (e) {
            logger.warn({ message: '[Bootstrap] Client bootstrap skipped', error: e });
        }

        next();

    } catch (err: any) {
        logger.error({ message: 'Auth middleware error', error: err, stack: err.stack });
        logErrorToFile('Auth middleware fatal error', err);
        return res.status(500).json({ 
            message: 'Internal Authentication Error', 
            code: 'AUTH_MIDDLEWARE_ERROR',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
