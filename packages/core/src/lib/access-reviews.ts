import { and, eq, desc, lte, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  accessReviewCampaigns,
  accessReviewAssignments,
  accessReviewHistory,
  employees,
  users,
  notificationLog,
} from "../schema";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface AccessReviewCampaign {
  id: number;
  clientId: number;
  name: string;
  scope: "all" | "department" | "role";
  scopeValue?: string;
  dueDate: Date;
  status: "draft" | "active" | "completed" | "cancelled";
  createdById: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AccessReviewAssignment {
  id: number;
  campaignId: number;
  reviewerId: number;
  revieweeId: number;
  status: "pending" | "approved" | "revoked" | "modified";
  justification?: string;
  reviewedAt?: Date;
}

export interface AccessReviewHistory {
  id: number;
  clientId: number;
  campaignId: number;
  userId: number;
  action: "approved" | "revoked" | "modified" | "added";
  details: Record<string, any>;
  reviewedBy: number;
  reviewedAt: Date;
}

// ──────────────────────────────────────────
// Functions
// ──────────────────────────────────────────

/**
 * Creates an access review campaign and generates assignments.
 * For scope='all', all active employees in the client are included.
 * For scope='department', filters by department name.
 * For scope='role', filters by employee role.
 * Each reviewer is assigned all users in the scope.
 */
export async function createCampaign(input: {
  clientId: number;
  name: string;
  scope: "all" | "department" | "role";
  scopeValue?: string;
  dueDate: Date;
  reviewerIds: number[];
  createdById: number;
}): Promise<AccessReviewCampaign> {
  const db = await getDb();

  // Create the campaign
  const [campaign] = await db
    .insert(accessReviewCampaigns)
    .values({
      clientId: input.clientId,
      name: input.name,
      scope: input.scope,
      scopeValue: input.scopeValue || null,
      dueDate: input.dueDate,
      status: "active",
      createdById: input.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Determine which employees to review
  let employeeQuery = db
    .select()
    .from(employees)
    .where(
      and(
        eq((employees as any).clientId, input.clientId),
        eq((employees as any).active, true)
      )
    );

  if (input.scope === "department" && input.scopeValue) {
    employeeQuery = employeeQuery.where(
      eq((employees as any).department, input.scopeValue)
    );
  } else if (input.scope === "role" && input.scopeValue) {
    employeeQuery = employeeQuery.where(
      eq((employees as any).role, input.scopeValue)
    );
  }

  const targetEmployees = await employeeQuery;

  // Create assignments for each reviewer x reviewee combination
  if (targetEmployees.length > 0 && input.reviewerIds.length > 0) {
    const assignments: Array<{
      campaignId: number;
      reviewerId: number;
      revieweeId: number;
      status: string;
    }> = [];

    for (const reviewerId of input.reviewerIds) {
      for (const emp of targetEmployees) {
        assignments.push({
          campaignId: campaign.id,
          reviewerId,
          revieweeId: (emp as any).id,
          status: "pending",
        });
      }
    }

    if (assignments.length > 0) {
      await db.insert(accessReviewAssignments).values(assignments as any);
    }
  }

  return campaign as unknown as AccessReviewCampaign;
}

/**
 * Gets all pending review assignments for a specific user (reviewer).
 */
export async function getPendingReviews(
  userId: number
): Promise<(AccessReviewAssignment & { revieweeName?: string; revieweeDepartment?: string; revieweeRole?: string; campaignName?: string })[]> {
  const db = await getDb();

  const results = await db
    .select({
      assignment: accessReviewAssignments,
      revieweeFirstName: (employees as any).firstName,
      revieweeLastName: (employees as any).lastName,
      revieweeDepartment: (employees as any).department,
      revieweeRole: (employees as any).role,
      campaignName: accessReviewCampaigns.name,
    })
    .from(accessReviewAssignments)
    .innerJoin(
      accessReviewCampaigns,
      eq(accessReviewAssignments.campaignId, accessReviewCampaigns.id)
    )
    .leftJoin(
      employees,
      eq(accessReviewAssignments.revieweeId, (employees as any).id)
    )
    .where(
      and(
        eq(accessReviewAssignments.reviewerId, userId),
        eq(accessReviewAssignments.status, "pending"),
        eq(accessReviewCampaigns.status, "active")
      )
    );

  return results.map((r: any) => ({
    ...r.assignment,
    revieweeName: r.revieweeFirstName
      ? `${r.revieweeFirstName} ${r.revieweeLastName}`
      : undefined,
    revieweeDepartment: r.revieweeDepartment,
    revieweeRole: r.revieweeRole,
    campaignName: r.campaignName,
  }));
}

/**
 * Submits a review decision for an assignment.
 * If all assignments are complete, marks the campaign as completed.
 */
export async function submitReview(
  assignmentId: number,
  status: string,
  justification?: string
): Promise<void> {
  const db = await getDb();

  const [assignment] = await db
    .select()
    .from(accessReviewAssignments)
    .where(eq(accessReviewAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    throw new Error(`Assignment ${assignmentId} not found`);
  }

  // Update the assignment
  await db
    .update(accessReviewAssignments)
    .set({
      status: status as any,
      justification: justification || null,
      reviewedAt: new Date(),
    })
    .where(eq(accessReviewAssignments.id, assignmentId));

  // Record to review history
  await db.insert(accessReviewHistory).values({
    clientId: 0, // Will be resolved from campaign
    campaignId: (assignment as any).campaignId,
    userId: (assignment as any).revieweeId,
    action: status as any,
    details: { justification },
    reviewedBy: (assignment as any).reviewerId,
    reviewedAt: new Date(),
  });

  // Check if all assignments for this campaign are done
  const campaignId = (assignment as any).campaignId;
  const pendingCount = await db
    .select({ count: count() })
    .from(accessReviewAssignments)
    .where(
      and(
        eq(accessReviewAssignments.campaignId, campaignId),
        eq(accessReviewAssignments.status, "pending")
      )
    );

  if (pendingCount[0]?.count === 0) {
    await db
      .update(accessReviewCampaigns)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accessReviewCampaigns.id, campaignId));
  }
}

/**
 * Gets aggregated campaign status with progress percentages.
 */
export async function getCampaignStatus(campaignId: number): Promise<{
  total: number;
  pending: number;
  approved: number;
  revoked: number;
  modified: number;
  progressPercent: number;
}> {
  const db = await getDb();

  const results = await db
    .select({
      status: accessReviewAssignments.status,
      count: count(),
    })
    .from(accessReviewAssignments)
    .where(eq(accessReviewAssignments.campaignId, campaignId))
    .groupBy(accessReviewAssignments.status);

  let total = 0;
  let pending = 0;
  let approved = 0;
  let revoked = 0;
  let modified = 0;

  for (const row of results) {
    const c = Number(row.count);
    total += c;
    switch (row.status) {
      case "pending":
        pending += c;
        break;
      case "approved":
        approved += c;
        break;
      case "revoked":
        revoked += c;
        break;
      case "modified":
        modified += c;
        break;
    }
  }

  const progressPercent = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;

  return { total, pending, approved, revoked, modified, progressPercent };
}

/**
 * Finds active campaigns that are past their due date.
 */
export async function getOverdueCampaigns(
  clientId: number
): Promise<AccessReviewCampaign[]> {
  const db = await getDb();

  const results = await db
    .select()
    .from(accessReviewCampaigns)
    .where(
      and(
        eq(accessReviewCampaigns.clientId, clientId),
        eq(accessReviewCampaigns.status, "active"),
        lte(accessReviewCampaigns.dueDate, new Date())
      )
    );

  return results as unknown as AccessReviewCampaign[];
}

/**
 * Sends review reminders to reviewers with pending assignments.
 * Creates notificationLog entries for each reviewer.
 * Returns the count of reminders sent.
 */
export async function sendReviewReminders(
  campaignId: number
): Promise<number> {
  const db = await getDb();

  // Find all reviewers with pending assignments for this campaign
  const pendingReviewers = await db
    .select({
      reviewerId: accessReviewAssignments.reviewerId,
    })
    .from(accessReviewAssignments)
    .where(
      and(
        eq(accessReviewAssignments.campaignId, campaignId),
        eq(accessReviewAssignments.status, "pending")
      )
    )
    .groupBy(accessReviewAssignments.reviewerId);

  if (pendingReviewers.length === 0) return 0;

  const [campaign] = await db
    .select()
    .from(accessReviewCampaigns)
    .where(eq(accessReviewCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) return 0;

  let sentCount = 0;

  for (const row of pendingReviewers) {
    const reviewerId = (row as any).reviewerId;

    // Find reviewer user details
    const [reviewer] = await db
      .select()
      .from(users)
      .where(eq(users.id, reviewerId))
      .limit(1);

    if (!reviewer) continue;

    // Count their pending items
    const pendingCount = await db
      .select({ count: count() })
    .from(accessReviewAssignments)
    .where(
        and(
          eq(accessReviewAssignments.campaignId, campaignId),
          eq(accessReviewAssignments.reviewerId, reviewerId),
          eq(accessReviewAssignments.status, "pending")
        )
      );

    // Create notification log entry
    await db.insert(notificationLog).values({
      userId: reviewerId,
      type: "access_review_reminder",
      title: `Access Review Reminder: ${(campaign as any).name}`,
      message: `You have ${Number(pendingCount[0]?.count || 0)} pending access review(s) for campaign "${(campaign as any).name}". Due date: ${(campaign as any).dueDate}. Please complete your reviews.`,
      metadata: {
        campaignId,
        campaignName: (campaign as any).name,
        dueDate: (campaign as any).dueDate,
        pendingCount: Number(pendingCount[0]?.count || 0),
      },
      read: false,
      createdAt: new Date(),
    } as any);

    sentCount++;
  }

  return sentCount;
}

/**
 * Schedules a quarterly recurring review.
 * Creates a new campaign based on the previous one, updating the due date by +3 months.
 */
export async function scheduleQuarterlyReview(
  clientId: number,
  campaignId: number
): Promise<AccessReviewCampaign> {
  const db = await getDb();

  const [original] = await db
    .select()
    .from(accessReviewCampaigns)
    .where(eq(accessReviewCampaigns.id, campaignId))
    .limit(1);

  if (!original) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Calculate next due date (+3 months)
  const nextDueDate = new Date((original as any).dueDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 3);

  // Find previous reviewers from assignments
  const reviewerRows = await db
    .select({
      reviewerId: accessReviewAssignments.reviewerId,
    })
    .from(accessReviewAssignments)
    .where(eq(accessReviewAssignments.campaignId, campaignId))
    .groupBy(accessReviewAssignments.reviewerId);

  const reviewerIds = reviewerRows.map((r: any) => r.reviewerId);

  return createCampaign({
    clientId,
    name: `${(original as any).name} (Q${Math.ceil((nextDueDate.getMonth() + 1) / 3)})`,
    scope: (original as any).scope as "all" | "department" | "role",
    scopeValue: (original as any).scopeValue || undefined,
    dueDate: nextDueDate,
    reviewerIds,
    createdById: (original as any).createdById,
  });
}

/**
 * Gets review history for a client with optional limit.
 */
export async function getHistory(
  clientId: number,
  limitNum: number = 50
): Promise<AccessReviewHistory[]> {
  const db = await getDb();

  const results = await db
    .select()
    .from(accessReviewHistory)
    .where(eq(accessReviewHistory.clientId, clientId))
    .orderBy(desc(accessReviewHistory.reviewedAt))
    .limit(limitNum);

  return results as unknown as AccessReviewHistory[];
}

/**
 * Gets all campaigns for a client.
 */
export async function listCampaigns(
  clientId: number
): Promise<AccessReviewCampaign[]> {
  const db = await getDb();

  const results = await db
    .select()
    .from(accessReviewCampaigns)
    .where(eq(accessReviewCampaigns.clientId, clientId))
    .orderBy(desc(accessReviewCampaigns.createdAt));

  return results as unknown as AccessReviewCampaign[];
}

/**
 * Gets a single campaign by ID.
 */
export async function getCampaign(
  id: number
): Promise<AccessReviewCampaign | null> {
  const db = await getDb();

  const [result] = await db
    .select()
    .from(accessReviewCampaigns)
    .where(eq(accessReviewCampaigns.id, id))
    .limit(1);

  return (result as unknown as AccessReviewCampaign) || null;
}
