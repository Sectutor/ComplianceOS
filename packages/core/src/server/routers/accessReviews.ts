import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db";
import * as schema from "../../schema";
import {
  createCampaign as createCampaignFn,
  getPendingReviews as getPendingReviewsFn,
  submitReview as submitReviewFn,
  getCampaignStatus,
  getOverdueCampaigns as getOverdueCampaignsFn,
  sendReviewReminders as sendReviewRemindersFn,
  scheduleQuarterlyReview as scheduleQuarterlyReviewFn,
  getHistory as getHistoryFn,
  listCampaigns as listCampaignsFn,
  getCampaign as getCampaignFn,
} from "../../lib/access-reviews";

export const createAccessReviewsRouter = (
  t: any,
  clientProcedure: any,
  adminProcedure: any
) =>
  t.router({
    // ── Campaign CRUD ──────────────────────────

    /** List all campaigns for a client */
    listCampaigns: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return listCampaignsFn(input.clientId);
      }),

    /** Get a single campaign with progress */
    getCampaign: clientProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }: any) => {
        const campaign = await getCampaignFn(input.id);
        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }
        const progress = await getCampaignStatus(input.id);
        return { ...campaign, progress };
      }),

    /** Create a new review campaign */
    createCampaign: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1, "Name is required"),
          scope: z.enum(["all", "department", "role"]),
          scopeValue: z.string().optional(),
          dueDate: z.date(),
          reviewerIds: z.array(z.number()).min(1, "At least one reviewer required"),
        })
      )
      .mutation(async ({ input, ctx }: any) => {
        return createCampaignFn({
          ...input,
          createdById: ctx.user.id,
        });
      }),

    // ── Review Workflow ────────────────────────

    /** Get current user's pending reviews */
    getPendingReviews: clientProcedure
      .input(z.object({}).optional())
      .query(async ({ ctx }: any) => {
        return getPendingReviewsFn(ctx.user.id);
      }),

    /** Submit a review decision */
    submitReview: clientProcedure
      .input(
        z.object({
          assignmentId: z.number(),
          status: z.enum(["approved", "revoked", "modified"]),
          justification: z.string().optional(),
        })
      )
      .mutation(async ({ input }: any) => {
        await submitReviewFn(input.assignmentId, input.status, input.justification);
        return { success: true };
      }),

    // ── Overdue & Reminders ────────────────────

    /** Get overdue campaigns */
    getOverdueCampaigns: adminProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return getOverdueCampaignsFn(input.clientId);
      }),

    /** Send reminders for a campaign */
    sendReminders: clientProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }: any) => {
        const count = await sendReviewRemindersFn(input.campaignId);
        return { sent: count };
      }),

    // ── History ────────────────────────────────

    /** Get review history */
    getHistory: clientProcedure
      .input(z.object({ clientId: z.number(), limit: z.number().optional().default(50) }))
      .query(async ({ input }: any) => {
        return getHistoryFn(input.clientId, input.limit);
      }),

    // ── Recurrence ─────────────────────────────

    /** Schedule quarterly recurrences */
    scheduleRecurring: clientProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input, ctx }: any) => {
        // Need clientId from the campaign
        const db = await getDb();
        const [campaign] = await db
          .select()
          .from(schema.accessReviewCampaigns)
          .where(eq(schema.accessReviewCampaigns.id, input.campaignId))
          .limit(1);

        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }

        return scheduleQuarterlyReviewFn(
          (campaign as any).clientId,
          input.campaignId
        );
      }),
  });
