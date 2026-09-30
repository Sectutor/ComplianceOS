import { z } from "zod";
import * as db from "../../db";
import { waitingList, magicLinks, users } from "../../schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { notifyOwner } from "../../notification";
import { sendInternalSystemEmail } from "../../lib/email/internalSender";
import {
    checkDemoIpThrottle,
    isDisposableDemoEmail,
    normalizeDemoEmail,
    type DemoIpThrottleStore,
} from "../../lib/demoSignupGuard";
import { TRPCError } from "@trpc/server";
import * as crypto from "crypto";

/**
 * In-memory per-IP throttle store for demo signups. Single-instance
 * self-host only — multi-instance deployments should front this endpoint
 * with a shared limiter.
 */
const demoIpThrottleStore: DemoIpThrottleStore = {};

/** True when landing-page signups should instantly mint a demo account. */
function isAutoInviteEnabled(): boolean {
    return process.env.AUTO_INVITE_WAITLIST === 'true';
}

/**
 * Create + email a single-use demo-invite magic link for a waitlist lead.
 * The link is bound to the lead's email, single-use, and expires; the
 * visitor sets their own password at redemption (no credentials by email).
 */
async function sendDemoInvite(lead: { id: number; email: string; firstName?: string | null; lastName?: string | null }): Promise<void> {
    const d = await db.getDb();
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // magic_links.createdById is NOT NULL — attribute auto-invites to the
    // first platform admin (the demo operator account).
    const [creator] = await d.select({ id: users.id })
        .from(users)
        .where(sql`role in ('owner', 'admin', 'super_admin')`)
        .orderBy(users.id)
        .limit(1);
    if (!creator) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No operator account exists to own demo invites' });
    }

    const [link] = await d.insert(magicLinks).values({
        token,
        label: `Demo Invite: ${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        email: lead.email,
        role: 'viewer',
        planTier: 'pro',
        maxClients: 2,
        accessDurationType: 'lifetime',
        waitlistId: lead.id,
        createdById: creator.id,
        expiresAt,
        usageLimit: 1,
    }).returning();

    await d.update(waitingList).set({ status: 'invited' }).where(eq(waitingList.id, lead.id));

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
    const inviteUrl = `${baseUrl}/auth/redeem-link?token=${link.token}`;
    const { generateMagicLinkEmail } = await import("../../components/email/templates/MagicLinkInvite");
    const { sendEmail } = await import("../../lib/email/transporter");
    const { subject, html, text } = generateMagicLinkEmail({
        inviteUrl,
        recipientEmail: lead.email,
        planTier: 'pro',
        role: 'viewer',
        expiresInDays: 30,
    });
    await sendEmail({ to: lead.email, subject, html });
}

/** Re-send the invite email for an existing active demo link (idempotent). */
async function resendActiveDemoInvite(email: string): Promise<boolean> {
    const d = await db.getDb();
    const [link] = await d.select().from(magicLinks)
        .where(and(
            eq(magicLinks.email, email),
            eq(magicLinks.status, 'active'),
            gt(magicLinks.expiresAt, new Date())
        ))
        .limit(1);
    if (!link) return false;

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
    const inviteUrl = `${baseUrl}/auth/redeem-link?token=${link.token}`;
    const { generateMagicLinkEmail } = await import("../../components/email/templates/MagicLinkInvite");
    const { sendEmail } = await import("../../lib/email/transporter");
    const { subject, html, text } = generateMagicLinkEmail({
        inviteUrl,
        recipientEmail: email,
        planTier: (link as any).planTier || 'pro',
        role: (link as any).role || 'viewer',
        expiresInDays: 30,
    });
    await sendEmail({ to: email, subject, html });
    return true;
}

export const createWaitlistRouter = (t: any, publicProcedure: any, adminProcedure: any) => {
    return t.router({
        join: publicProcedure
            .input(z.object({
                email: z.string().email(),
                firstName: z.string().optional(),
                lastName: z.string().optional(),
                company: z.string().optional(),
                role: z.string().optional(),
                certification: z.string().optional(),
                orgSize: z.string().optional(),
                industry: z.string().optional(),
                interestedPlay: z.string().optional(),
                track: z.string().optional(),
                source: z.string().optional().default("web"),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();

                // Abuse controls for the public signup endpoint.
                const normalizedEmail = normalizeDemoEmail(input.email);
                if (isDisposableDemoEmail(normalizedEmail)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This email provider cannot be used for signup. Please use a permanent email address.',
                    });
                }
                const throttle = checkDemoIpThrottle(demoIpThrottleStore, ctx?.ip);
                if (!throttle.allowed) {
                    throw new TRPCError({
                        code: 'TOO_MANY_REQUESTS',
                        message: 'Too many signup attempts. Please try again later.',
                    });
                }
                input.email = normalizedEmail;

                // Check if email already exists
                const existing = await d.select().from(waitingList).where(eq(waitingList.email, input.email));

                if (existing.length > 0) {
                    // Demo mode: if an active invite already exists for this
                    // email, re-send it so a failed first delivery isn't a
                    // dead end for the lead.
                    if (isAutoInviteEnabled()) {
                        try {
                            const resent = await resendActiveDemoInvite(input.email);
                            if (resent) {
                                return { success: true, invited: true, message: "Your demo access link has been re-sent — please check your inbox." };
                            }
                        } catch (e) {
                            console.warn("[Waitlist] Demo invite re-send failed:", e);
                        }
                    }
                    return { success: true, message: "Already on the list!" };
                }

                await d.insert(waitingList).values({
                    email: input.email,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    company: input.company,
                    role: input.role,
                    certification: input.certification,
                    orgSize: input.orgSize,
                    industry: input.industry,
                    interestedPlay: input.interestedPlay,
                    source: input.source,
                    status: "pending",
                });

                // 1. External Notification (FORGE_API_URL / Project Owner)
                try {
                    await notifyOwner({
                        title: `🚀 New Waitlist Lead: ${input.firstName} ${input.lastName}`,
                        content: `A new user has joined the waitlist!\n\n` +
                            `- Name: ${input.firstName} ${input.lastName}\n` +
                            `- Email: ${input.email}\n` +
                            `- Company: ${input.company || 'N/A'}\n` +
                            `- Certification: ${input.certification || 'N/A'}\n` +
                            `- Org Size: ${input.orgSize || 'N/A'}\n` +
                            `- Industry: ${input.industry || 'N/A'}\n` +
                            `- Interested In: ${input.interestedPlay || 'N/A'}\n` +
                            `- Source: ${input.source}\n\n` +
                            `Please follow up with them as soon as possible.`
                    });
                } catch (e) {
                    console.warn("[Waitlist] notifyOwner failed:", e);
                }

                // 2. Internal CRM Inbox Notification
                try {
                    // We notify Client 1 (the platform owner account)
                    await sendInternalSystemEmail({
                        clientId: 1,
                        subject: `New Prospect: ${input.firstName} ${input.lastName} (${input.company || 'Individual'})`,
                        body: `
                            <div style="font-family: sans-serif;">
                                <h2>New Waitlist Sign-up</h2>
                                <p>A new potential customer has joined the GRCompliance waitlist.</p>
                                <table border="0" cellpadding="5" cellspacing="0">
                                    <tr><td><strong>Name:</strong></td><td>${input.firstName} ${input.lastName}</td></tr>
                                    <tr><td><strong>Email:</strong></td><td>${input.email}</td></tr>
                                    <tr><td><strong>Company:</strong></td><td>${input.company || 'N/A'}</td></tr>
                                    <tr><td><strong>Target Cert:</strong></td><td>${input.certification || 'N/A'}</td></tr>
                                    <tr><td><strong>Org Size:</strong></td><td>${input.orgSize || 'N/A'}</td></tr>
                                    <tr><td><strong>Industry:</strong></td><td>${input.industry || 'N/A'}</td></tr>
                                    <tr><td><strong>Interested In:</strong></td><td>${input.interestedPlay || 'N/A'}</td></tr>
                                </table>
                                <p>This lead has been logged in the waiting_list table. Please reach out to them to schedule a demo.</p>
                                <p><a href="/sales/waitlist">View Waitlist Dashboard</a></p>
                            </div>
                        `,
                        snippet: `New lead from ${input.email} for ${input.certification || 'GRCompliance'}`
                    });
                } catch (e) {
                    console.warn("[Waitlist] Internal CRM notification failed:", e);
                }

                // Instant demo signup: mint + email a single-use invite when
                // AUTO_INVITE_WAITLIST is enabled. A failed email must not
                // fail the signup silently — surface it in the response.
                let invited = false;
                let inviteError: string | null = null;
                if (isAutoInviteEnabled()) {
                    try {
                        const [lead] = await d.select().from(waitingList).where(eq(waitingList.email, input.email)).limit(1);
                        if (lead) {
                            await sendDemoInvite(lead);
                            invited = true;
                            console.log(`[Waitlist] Demo invite sent to ${input.email}`);
                        }
                    } catch (e) {
                        console.warn("[Waitlist] Auto invite failed:", e);
                        inviteError = e instanceof Error ? e.message : String(e);
                    }
                }

                if (invited) {
                    return {
                        success: true,
                        invited: true,
                        message: "You're in! Check your inbox for your demo access link to set your password and sign in.",
                    };
                }
                if (inviteError && process.env.NODE_ENV !== 'production') {
                    return { success: true, invited: false, message: `Added to waiting list! (invite email failed: ${inviteError})` };
                }
                return { success: true, invited: false, message: "Added to waiting list! A member of our team will reach out to you shortly." };
            }),

        list: adminProcedure
            .query(async () => {
                const d = await db.getDb();
                return d.select().from(waitingList).orderBy(sql`${waitingList.createdAt} DESC`);
            }),

        remove: adminProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                console.log("[Waitlist] Attempting to remove ID:", input.id);
                try {
                    const d = await db.getDb();
                    const res = await d.delete(waitingList).where(eq(waitingList.id, input.id)).returning();
                    console.log("[Waitlist] Remove result:", res);
                    return { success: true };
                } catch (e) {
                    console.error("[Waitlist] Remove failed:", e);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Failed to remove: ${(e as Error).message}`
                    });
                }
            }),

        updateStatus: adminProcedure
            .input(z.object({
                id: z.number(),
                status: z.string(),
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                await d.update(waitingList)
                    .set({ status: input.status, updatedAt: new Date() })
                    .where(eq(waitingList.id, input.id));
                return { success: true };
            }),
        
        invite: adminProcedure
            .input(z.object({
                id: z.number(),
                role: z.enum(['viewer', 'editor', 'admin']).optional().default('viewer'),
                planTier: z.enum(['free', 'pro', 'enterprise']).optional().default('pro'),
                expiresInDays: z.number().optional().default(30),
                usageLimit: z.number().int().min(1).nullable().optional().default(1),
            }))
            .mutation(async ({ input, ctx }: any) => {
                try {
                    console.log("[Waitlist] Invite called by:", ctx.user?.id, "for lead:", input.id);
                    const d = await db.getDb();
                    const [lead] = await d.select().from(waitingList).where(eq(waitingList.id, input.id)).limit(1);
                    if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Waitlist lead not found' });
                    if (!lead.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lead email missing' });

                    const token = crypto.randomUUID();
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 30));

                    const [newLink] = await d.insert(magicLinks).values({
                        token,
                        label: `Waitlist Invite: ${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
                        email: lead.email,
                        role: input.role || 'viewer',
                        planTier: input.planTier || 'pro',
                        maxClients: 2,
                        accessDurationType: 'lifetime',
                        waitlistId: lead.id,
                        createdById: ctx.user.id,
                        expiresAt,
                        usageLimit: input.usageLimit ?? 1,
                    }).returning();

                    await d.update(waitingList).set({ status: 'invited', updatedAt: new Date() }).where(eq(waitingList.id, lead.id));

                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
                    const inviteUrl = `${baseUrl}/auth/redeem-link?token=${token}`;
                    try {
                        const { generateMagicLinkEmail } = await import("../../components/email/templates/MagicLinkInvite");
                        const { sendEmail } = await import("../../lib/email/transporter");
                        const { subject, html, text } = generateMagicLinkEmail({
                            inviteUrl,
                            recipientEmail: lead.email,
                            planTier: input.planTier || 'pro',
                            role: input.role || 'viewer',
                            expiresInDays: input.expiresInDays || 30
                        });
                        await sendEmail({ to: lead.email, subject, html });
                    } catch (e) {
                        console.warn("[Waitlist] Invite email failed:", e);
                    }

                    console.log("[Waitlist] Invite success:", newLink?.id);
                    return newLink;
                } catch (err: any) {
                    console.error("[Waitlist] Invite failed:", err);
                    if (err instanceof TRPCError) throw err;
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Failed to send invite: ${err?.message || 'Unknown error'}`
                    });
                }
            }),
    });
};
