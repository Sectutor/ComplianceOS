import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import * as schema from "../../schema";
import { PLATFORM_ADMIN_ROLES } from "../trpc";

/**
 * Tenant guard for tRPC procedures addressed by a row id rather than a
 * clientId in the input. Resolves the owning client and requires either a
 * platform admin role or an explicit membership row — the same policy the
 * checkClientAccess middleware enforces for clientId-scoped procedures.
 *
 * Usage: load the owning clientId from the DB, then call this before any
 * read/write. Throws UNAUTHORIZED / FORBIDDEN on failure.
 */
export const assertClientAccess = async (
    dbConn: any,
    ctx: any,
    clientId: number | null | undefined
) => {
    if (!ctx?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (PLATFORM_ADMIN_ROLES.includes(ctx.user.role || '')) return;
    if (!clientId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Record has no client association' });
    }
    const membership = await dbConn
        .select({ id: schema.userClients.id })
        .from(schema.userClients)
        .where(and(
            eq(schema.userClients.userId, ctx.user.id),
            eq(schema.userClients.clientId, clientId)
        ))
        .limit(1);
    if (membership.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this client' });
    }
};
