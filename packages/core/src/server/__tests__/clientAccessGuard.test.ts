import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database to control membership records
const mockMemberships: Record<string, { role: string; accessExpiresAt?: Date | null }> = {};
const mockUsers: Record<number, { id: number; role: string }> = {};

vi.mock("../../db", () => {
  return {
    getDb: async () => ({
      select: (fields?: any) => ({
        from: (table?: any) => ({
          where: (clause?: any) => ({
            limit: (num?: number) => {
              // Return membership based on last check context or mock state
              return (globalThis as any).__mockDbSelectResult || [];
            },
            orderBy: () => (globalThis as any).__mockDbSelectResult || []
          }),
          orderBy: () => ({
            limit: () => (globalThis as any).__mockDbSelectResult || []
          })
        })
      }),
      getUserById: async (id: number) => mockUsers[id] || { id, maxClients: 5 }
    }),
    getUserById: async (id: number) => mockUsers[id] || { id, maxClients: 5 },
    isUserAllowedForClient: async (userId: number, clientId: number, minRole?: string) => {
      const user = mockUsers[userId];
      if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'enterprise_admin')) {
        return true;
      }
      const key = `${userId}:${clientId}`;
      return !!mockMemberships[key];
    }
  };
});

import { checkClientAccess, PLATFORM_ADMIN_ROLES } from "../trpc";

describe("checkClientAccess and IDOR Remediation", () => {
  const getMiddlewareFn = (mw: any) => mw._middlewares?.[0] ?? mw;

  beforeEach(() => {
    (globalThis as any).__mockDbSelectResult = [];
    for (const k in mockMemberships) delete mockMemberships[k];
    for (const k in mockUsers) delete mockUsers[k];
  });

  it("ensures PLATFORM_ADMIN_ROLES does not include 'owner'", () => {
    expect(PLATFORM_ADMIN_ROLES).not.toContain("owner");
    expect(PLATFORM_ADMIN_ROLES).toContain("admin");
    expect(PLATFORM_ADMIN_ROLES).toContain("super_admin");
  });

  it("blocks cross-tenant access when user switches clientId in input payload, even if header is their own client", async () => {
    // User 10 belongs to client 1, but NOT client 2
    // User sends header x-client-id: 1, but calls with input { clientId: 2 }
    (globalThis as any).__mockDbSelectResult = []; // No membership for client 2

    const mw = getMiddlewareFn(checkClientAccess);
    let error: any = null;

    try {
      await mw({
        ctx: {
          user: { id: 10, role: "user" },
          clientId: 1 // Header client ID (spoofed or stale localStorage)
        },
        path: "risks.list",
        getRawInput: async () => ({ clientId: 2 }), // User requests Client 2 via URL/input
        next: ({ ctx }: any) => ({ ctx })
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toContain("No access to this client workspace");
  });

  it("allows access when user is a valid member of the target clientId in input", async () => {
    // User 10 belongs to client 2
    (globalThis as any).__mockDbSelectResult = [
      { id: 1, userId: 10, clientId: 2, role: "editor" }
    ];

    const mw = getMiddlewareFn(checkClientAccess);
    const result = await mw({
      ctx: {
        user: { id: 10, role: "user" },
        clientId: 1 // Old header
      },
      path: "risks.list",
      getRawInput: async () => ({ clientId: 2 }),
      next: ({ ctx }: any) => ({ ctx })
    });

    expect(result.ctx.clientId).toBe(2);
    expect(result.ctx.clientRole).toBe("editor");
  });

  it("extracts id as clientId when calling clients.* procedures (e.g. clients.get)", async () => {
    // In clients.get({ id: 99 }), target client is 99
    (globalThis as any).__mockDbSelectResult = []; // Not member of 99

    const mw = getMiddlewareFn(checkClientAccess);
    let error: any = null;

    try {
      await mw({
        ctx: {
          user: { id: 10, role: "user" },
          clientId: 1
        },
        path: "clients.get",
        getRawInput: async () => ({ id: 99 }),
        next: ({ ctx }: any) => ({ ctx })
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe("FORBIDDEN");
  });

  it("unwraps superjson { json: { clientId: 2 } } payload correctly", async () => {
    (globalThis as any).__mockDbSelectResult = [];

    const mw = getMiddlewareFn(checkClientAccess);
    let error: any = null;

    try {
      await mw({
        ctx: {
          user: { id: 10, role: "user" },
          clientId: 1
        },
        path: "compliance.getScore",
        getRawInput: async () => ({ json: { clientId: 2 }, meta: {} }),
        next: ({ ctx }: any) => ({ ctx })
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe("FORBIDDEN");
  });

  it("does NOT grant global cross-tenant bypass to users with global role === 'owner'", async () => {
    // User has role: 'owner' on their user record, but is NOT a member of client 5
    (globalThis as any).__mockDbSelectResult = [];

    const mw = getMiddlewareFn(checkClientAccess);
    let error: any = null;

    try {
      await mw({
        ctx: {
          user: { id: 25, role: "owner" }, // Organization owner, NOT platform admin
          clientId: 1
        },
        path: "vendors.list",
        getRawInput: async () => ({ clientId: 5 }),
        next: ({ ctx }: any) => ({ ctx })
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe("FORBIDDEN");
  });

  it("grants access to super_admin or admin across any client workspace", async () => {
    const mw = getMiddlewareFn(checkClientAccess);

    const result = await mw({
      ctx: {
        user: { id: 1, role: "super_admin" },
        clientId: null
      },
      path: "evidence.list",
      getRawInput: async () => ({ clientId: 42 }),
      next: ({ ctx }: any) => ({ ctx })
    });

    expect(result.ctx.clientId).toBe(42);
    expect(result.ctx.clientRole).toBe("owner");
  });
});
