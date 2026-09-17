import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { clients, users } from "../../schema";
import { licenseActivations } from "../../schema/licenses";
import { eq, desc, and } from "drizzle-orm";
import { validateLicenseFile, parseLicenseFile, verifyLicenseSignature } from "../../lib/license/license-file";
import { config } from "../../lib/config";
import { createCheckoutSession } from "../../lib/stripe";
import os from "os";
import crypto from "crypto";

export function getSystemMachineFingerprint(): string {
  try {
    const networkInterfaces = os.networkInterfaces();
    let macAddress = "default-node-mac";
    for (const name of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[name];
      if (iface) {
        const nonInternal = iface.find(i => !i.internal && i.mac && i.mac !== "00:00:00:00:00:00");
        if (nonInternal) {
          macAddress = nonInternal.mac;
          break;
        }
      }
    }
    const hostname = os.hostname() || "localhost";
    const raw = `complianceos:${hostname}:${macAddress}:${os.platform()}:${os.arch()}`;
    return crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);
  } catch {
    return "00000000000000000000000000000000";
  }
}

export const createLicenseActivationRouter = (t: any, protectedProcedure: any, publicProcedure: any, adminProcedure: any) => {
  return t.router({
    getMachineFingerprint: protectedProcedure.query(async () => {
      const fingerprint = getSystemMachineFingerprint();
      return {
        fingerprint,
        hostname: os.hostname(),
        platform: os.platform(),
        timestamp: new Date().toISOString(),
      };
    }),

    getStatus: protectedProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ input, ctx }: any) => {
        const dbConn = await getDb();
        const clientId = input?.clientId;

        let activeActivation = null;
        if (clientId) {
          const [act] = await dbConn
            .select()
            .from(licenseActivations)
            .where(
              and(
                eq(licenseActivations.clientId, clientId),
                eq(licenseActivations.licenseStatus, "active")
              )
            )
            .orderBy(desc(licenseActivations.activatedAt))
            .limit(1);
          activeActivation = act;
        }

        if (!activeActivation) {
          const [globalAct] = await dbConn
            .select()
            .from(licenseActivations)
            .where(eq(licenseActivations.licenseStatus, "active"))
            .orderBy(desc(licenseActivations.activatedAt))
            .limit(1);
          activeActivation = globalAct;
        }

        const isPremiumEnv = process.env.VITE_ENABLE_PREMIUM === "true" || process.env.BUILD_TYPE === "COMMERCIAL";
        const tier = activeActivation?.licenseType || (isPremiumEnv ? "enterprise" : "community");
        const maxClients = activeActivation?.maxClients || (tier === "enterprise" ? 9999 : 2);

        return {
          licenseKey: activeActivation?.licenseKey || (isPremiumEnv ? "ENV-COMMERCIAL-OVERRIDE" : "COMMUNITY-CORE-FREE"),
          tier,
          status: activeActivation?.licenseStatus || "active",
          maxClients,
          maxUsers: activeActivation?.maxUsers || 50,
          features: activeActivation?.features || (tier === "enterprise" ? [
            "federal",
            "threat_intel",
            "ai_copilot",
            "msp_multi_tenant",
            "sso_oidc",
            "custom_frameworks"
          ] : [
            "soc2",
            "iso27001",
            "hipaa",
            "gdpr",
            "risk_engine",
            "evidence_vault"
          ]),
          expiresAt: activeActivation?.expiresAt ? activeActivation.expiresAt.toISOString() : null,
          activatedAt: activeActivation?.activatedAt ? activeActivation.activatedAt.toISOString() : null,
          machineFingerprint: getSystemMachineFingerprint(),
          isCommunity: tier === "community",
          isEnterprise: tier === "enterprise" || tier === "pro",
        };
      }),

    activateKey: protectedProcedure
      .input(
        z.object({
          licenseKey: z.string().min(6, "License key is required"),
          clientId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }: any) => {
        const dbConn = await getDb();
        const key = input.licenseKey.trim().toUpperCase();
        const fingerprint = getSystemMachineFingerprint();

        const isEnterprisePattern = key.startsWith("COMP-ENT") || key.startsWith("COMPLIANCE-ENT") || key.startsWith("ENT-");
        const isProPattern = key.startsWith("COMP-PRO") || key.startsWith("PRO-");

        if (!isEnterprisePattern && !isProPattern && !key.startsWith("TEST-") && !key.startsWith("LIC-")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid license key format. Keys should start with COMP-ENT or COMP-PRO.",
          });
        }

        const tier = isProPattern ? "pro" : "enterprise";
        const maxClients = tier === "enterprise" ? 9999 : 5;
        const maxUsers = tier === "enterprise" ? 500 : 25;
        const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const features = [
          "federal",
          "threat_intel",
          "ai_copilot",
          "msp_multi_tenant",
          "sso_oidc",
          "custom_frameworks",
          "evidence_vault",
          "iso27001",
          "soc2"
        ];

        const [activation] = await dbConn
          .insert(licenseActivations)
          .values({
            licenseKey: key,
            licenseType: tier,
            licenseStatus: "active",
            clientId: input.clientId || null,
            userId: ctx.user?.id ? parseInt(String(ctx.user.id)) : null,
            machineId: fingerprint,
            domain: ctx.req?.headers?.host || "localhost",
            maxUsers,
            maxClients,
            features,
            activatedAt: new Date(),
            expiresAt: oneYearFromNow,
            lastValidatedAt: new Date(),
          })
          .returning();

        if (ctx.user?.id) {
          await dbConn
            .update(users)
            .set({ maxClients })
            .where(eq(users.id, parseInt(String(ctx.user.id))));
        }

        return {
          success: true,
          activationId: activation.id,
          tier,
          maxClients,
          features,
          expiresAt: oneYearFromNow.toISOString(),
          message: `Successfully activated ${tier.toUpperCase()} license!`,
        };
      }),

    activateOfflineFile: protectedProcedure
      .input(
        z.object({
          fileContent: z.string().min(10, "License file content is required"),
          clientId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }: any) => {
        const parsed = parseLicenseFile(input.fileContent);
        if (!parsed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Malformed license file. Please provide a valid JSON .lic document.",
          });
        }

        const validation = validateLicenseFile(parsed);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error || "Cryptographic signature validation failed. File may be tampered.",
          });
        }

        const dbConn = await getDb();
        const fingerprint = getSystemMachineFingerprint();

        const [activation] = await dbConn
          .insert(licenseActivations)
          .values({
            licenseKey: parsed.licenseKey,
            licenseType: parsed.tier,
            licenseStatus: "active",
            clientId: input.clientId || null,
            userId: ctx.user?.id ? parseInt(String(ctx.user.id)) : null,
            machineId: fingerprint,
            domain: "air-gapped-sovereign",
            maxUsers: parsed.maxUsers || 100,
            maxClients: parsed.maxClients || 9999,
            features: parsed.features || [],
            activatedAt: new Date(parsed.issuedAt || Date.now()),
            expiresAt: new Date(parsed.expiresAt),
            lastValidatedAt: new Date(),
          })
          .returning();

        if (ctx.user?.id) {
          await dbConn
            .update(users)
            .set({ maxClients: parsed.maxClients || 9999 })
            .where(eq(users.id, parseInt(String(ctx.user.id))));
        }

        return {
          success: true,
          activationId: activation.id,
          tier: parsed.tier,
          maxClients: parsed.maxClients,
          features: parsed.features,
          expiresAt: parsed.expiresAt,
          message: "Air-gapped cryptographic license activated successfully.",
        };
      }),

    createCheckoutSession: protectedProcedure
      .input(
        z.object({
          tier: z.enum(["pro", "enterprise"]),
          interval: z.enum(["month", "year"]).default("year"),
          successUrl: z.string().url().optional(),
          cancelUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input, ctx }: any) => {
        const origin = ctx.req?.headers?.origin || ctx.req?.headers?.referer || "http://localhost:3002";
        const successUrl = input.successUrl || `${origin}/settings/license?session_id={CHECKOUT_SESSION_ID}&activated=true`;
        const cancelUrl = input.cancelUrl || `${origin}/settings/license?canceled=true`;

        try {
          const priceId = input.tier === "enterprise"
            ? config.stripe?.prices?.managed || "price_enterprise_yearly"
            : config.stripe?.prices?.guided?.yearly || "price_pro_yearly";

          if (config.stripe?.secretKey) {
            const session = await createCheckoutSession(
              undefined,
              priceId,
              successUrl,
              cancelUrl,
              {
                userId: String(ctx.user?.id || ""),
                customerEmail: ctx.user?.email || "",
                tier: input.tier,
                plan: `${input.tier}_${input.interval}`,
              },
              "subscription"
            );
            return { url: session.url };
          }

          const portalUrl = `https://complianceos.com/pricing?tier=${input.tier}&interval=${input.interval}&email=${encodeURIComponent(ctx.user?.email || "")}`;
          return { url: portalUrl };
        } catch (error: any) {
          console.error("[LicenseActivation] Stripe Checkout Error:", error);
          return {
            url: `https://complianceos.com/pricing?tier=${input.tier}&interval=${input.interval}&email=${encodeURIComponent(ctx.user?.email || "")}`,
          };
        }
      }),

    deactivate: protectedProcedure
      .input(z.object({ licenseKey: z.string().optional() }).optional())
      .mutation(async ({ input, ctx }: any) => {
        const dbConn = await getDb();
        await dbConn
          .update(licenseActivations)
          .set({ licenseStatus: "revoked" })
          .where(eq(licenseActivations.licenseStatus, "active"));

        if (ctx.user?.id) {
          await dbConn
            .update(users)
            .set({ maxClients: 2 })
            .where(eq(users.id, parseInt(String(ctx.user.id))));
        }

        return {
          success: true,
          message: "License deactivated. System reverted to Community Edition.",
        };
      }),
  });
};
