import { middleware } from "./trpc-base";
import { logger } from "../lib/logger";

/**
 * Performance Tracking Middleware
 * Logs slow requests and collects metrics
 */
export const performanceTracker = middleware(async ({ path, type, next }) => {
    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;

    if (duration > (Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500)) {
        logger.warn({
            message: 'Slow TRPC Request',
            path,
            type,
            duration: `${duration}ms`,
            clientId: (result as any)?.ctx?.clientId
        });
    }

    return result;
});

/**
 * Enterprise Audit Logging
 * Logs all mutation requests for compliance audit trails
 */
export const auditLogger = middleware(async ({ path, type, next, ctx }) => {
    const result = await next();

    if (type === 'mutation') {
        logger.info({
            message: 'Audit Log: Mutation',
            path,
            user: (ctx as any).user?.email,
            clientId: (ctx as any)?.clientId,
            status: result.ok ? 'success' : 'failed'
        });
    }

    return result;
});
