import { getDb } from '../db';
import * as schema from '../schema';
import { eq, and, lt, gte, desc, sql } from 'drizzle-orm';

export interface ActionItem {
  id: string;
  type: 'evidence_expiring' | 'evidence_missing' | 'control_overdue' | 'review_due' | 'access_review_pending' | 'vendor_assessment_due' | 'policy_review_due' | 'task_overdue' | 'training_incomplete' | 'exception_expiring' | 'connector_failed';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  module: string;
  entityId: number;
  entityType: string;
  dueDate?: Date;
  daysUntilDue?: number;
  actionUrl?: string;
  createdAt: Date;
}

function daysUntil(d: Date): number {
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function getActionItems(clientId: number, userId: number): Promise<ActionItem[]> {
  const db = await getDb();
  const items: ActionItem[] = [];
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Evidence expiring — items with expirationDate within 30 days
  const expiringEvidence = await db.select()
    .from(schema.evidence)
    .where(
      and(
        eq(schema.evidence.clientId, clientId),
        gte(schema.evidence.expirationDate, now),
        lt(schema.evidence.expirationDate, in30Days)
      )
    );

  for (const ev of expiringEvidence) {
    const due = ev.expirationDate!;
    const d = daysUntil(due);
    let priority: ActionItem['priority'] = 'medium';
    if (d <= 0) priority = 'critical';
    else if (d <= 7) priority = 'high';

    items.push({
      id: `evidence-expiring-${ev.id}`,
      type: 'evidence_expiring',
      title: `Evidence expiring: ${ev.description || ev.evidenceId}`,
      description: `Evidence for control #${ev.clientControlId} expires ${due.toLocaleDateString()}`,
      priority,
      module: 'Evidence',
      entityId: ev.id,
      entityType: 'evidence',
      dueDate: due,
      daysUntilDue: d,
      actionUrl: `/client/${clientId}/evidence`,
      createdAt: ev.createdAt || now,
    });
  }

  // 2. Evidence missing — clientControls with status='implemented' that have no evidence records
  const implementedControls = await db.select()
    .from(schema.clientControls)
    .where(
      and(
        eq(schema.clientControls.clientId, clientId),
        eq(schema.clientControls.status, 'implemented')
      )
    );

  for (const ctrl of implementedControls) {
    const evidenceRecords = await db.select({ id: schema.evidence.id })
      .from(schema.evidence)
      .where(
        and(
          eq(schema.evidence.clientId, clientId),
          eq(schema.evidence.clientControlId, ctrl.id)
        )
      )
      .limit(1);

    if (evidenceRecords.length === 0) {
      items.push({
        id: `evidence-missing-${ctrl.id}`,
        type: 'evidence_missing',
        title: `Missing evidence for implemented control`,
        description: `Control #${ctrl.id} is marked as implemented but has no evidence records`,
        priority: 'high',
        module: 'Evidence',
        entityId: ctrl.id,
        entityType: 'clientControl',
        actionUrl: `/client/${clientId}/evidence`,
        createdAt: ctrl.createdAt || now,
      });
    }
  }

  // 3. Controls overdue — implementationTasks with plannedEndDate in the past and status != 'done'
  const overdueTasks = await db.select({
    task: schema.implementationTasks,
  })
    .from(schema.implementationTasks)
    .innerJoin(
      schema.implementationPlans,
      eq(schema.implementationTasks.implementationPlanId, schema.implementationPlans.id)
    )
    .where(
      and(
        eq(schema.implementationPlans.clientId, clientId),
        lt(schema.implementationTasks.plannedEndDate, now),
        sql`${schema.implementationTasks.status} != 'done'`
      )
    );

  for (const { task } of overdueTasks) {
    const due = task.plannedEndDate!;
    const d = daysUntil(due);
    const priority: ActionItem['priority'] = d <= 0 ? 'critical' : 'high';

    items.push({
      id: `control-overdue-${task.id}`,
      type: 'control_overdue',
      title: `Overdue: ${task.title}`,
      description: task.description || `Implementation task overdue by ${Math.abs(d)} days`,
      priority,
      module: 'Controls',
      entityId: task.id,
      entityType: 'implementationTask',
      dueDate: due,
      daysUntilDue: d,
      actionUrl: `/client/${clientId}/implementation`,
      createdAt: now,
    });
  }

  // 4. Access reviews pending — accessReviewAssignments with status='pending' for the given userId
  const pendingReviews = await db.select({
    assignment: schema.accessReviewAssignments,
    campaign: schema.accessReviewCampaigns,
  })
    .from(schema.accessReviewAssignments)
    .innerJoin(
      schema.accessReviewCampaigns,
      eq(schema.accessReviewAssignments.campaignId, schema.accessReviewCampaigns.id)
    )
    .where(
      and(
        eq(schema.accessReviewAssignments.reviewerId, userId),
        eq(schema.accessReviewCampaigns.clientId, clientId),
        eq(schema.accessReviewAssignments.status, 'pending')
      )
    );

  for (const { assignment, campaign } of pendingReviews) {
    items.push({
      id: `access-review-${assignment.id}`,
      type: 'access_review_pending',
      title: `Access review pending: ${campaign.name}`,
      description: `You have a pending access review for campaign "${campaign.name}"`,
      priority: 'high',
      module: 'Access Reviews',
      entityId: assignment.id,
      entityType: 'accessReviewAssignment',
      dueDate: campaign.dueDate || undefined,
      daysUntilDue: campaign.dueDate ? daysUntil(campaign.dueDate) : undefined,
      actionUrl: `/client/${clientId}/access-reviews`,
      createdAt: assignment.createdAt || now,
    });
  }

  // 5. Vendor assessments due — vendorAssessmentRequests that are open and past due
  const vendorRequests = await db.select()
    .from(schema.vendorAssessmentRequests)
    .where(
      and(
        eq(schema.vendorAssessmentRequests.clientId, clientId),
        sql`${schema.vendorAssessmentRequests.status} IN ('sent', 'in_progress')`,
        lt(schema.vendorAssessmentRequests.expiresAt, now)
      )
    );

  for (const req of vendorRequests) {
    items.push({
      id: `vendor-assessment-${req.id}`,
      type: 'vendor_assessment_due',
      title: `Vendor assessment overdue`,
      description: `Assessment request #${req.id} for vendor #${req.vendorId} is past due`,
      priority: 'medium',
      module: 'Vendors',
      entityId: req.id,
      entityType: 'vendorAssessmentRequest',
      dueDate: req.expiresAt || undefined,
      daysUntilDue: req.expiresAt ? daysUntil(req.expiresAt) : undefined,
      actionUrl: `/client/${clientId}/vendors`,
      createdAt: req.createdAt || now,
    });
  }

  // 6. Policy reviews due — policyReviews with status='analyzing' (pending equivalent)
  const policyReviewItems = await db.select()
    .from(schema.policyReviews)
    .where(
      and(
        eq(schema.policyReviews.clientId, clientId),
        eq(schema.policyReviews.status, 'analyzing')
      )
    );

  for (const pr of policyReviewItems) {
    items.push({
      id: `policy-review-${pr.id}`,
      type: 'policy_review_due',
      title: `Policy review needed: ${pr.policyName}`,
      description: `Policy "${pr.policyName}" requires review`,
      priority: 'medium',
      module: 'Policies',
      entityId: pr.id,
      entityType: 'policyReview',
      actionUrl: `/client/${clientId}/policies`,
      createdAt: pr.createdAt || now,
    });
  }

  // 7. Training incomplete — trainingAssignments with status='pending' for userId
  const employeeRows = await db.select({ id: schema.employees.id })
    .from(schema.employees)
    .where(
      and(
        eq(schema.employees.clientId, clientId),
        eq(schema.employees.userId, userId)
      )
    );

  for (const emp of employeeRows) {
    const incompleteTraining = await db.select()
      .from(schema.trainingAssignments)
      .where(
        and(
          eq(schema.trainingAssignments.clientId, clientId),
          eq(schema.trainingAssignments.employeeId, emp.id),
          eq(schema.trainingAssignments.status, 'pending')
        )
      );

    for (const ta of incompleteTraining) {
      items.push({
        id: `training-${ta.id}`,
        type: 'training_incomplete',
        title: `Training module incomplete`,
        description: `Training assignment #${ta.id} for module #${ta.moduleId} is pending`,
        priority: 'low',
        module: 'Training',
        entityId: ta.id,
        entityType: 'trainingAssignment',
        actionUrl: `/client/${clientId}/training`,
        createdAt: ta.assignedAt || now,
      });
    }
  }

  // 8. Exceptions expiring — policyExceptions with expirationDate within 30 days
  const expiringExceptions = await db.select()
    .from(schema.policyExceptions)
    .where(
      and(
        gte(schema.policyExceptions.expirationDate, now),
        lt(schema.policyExceptions.expirationDate, in30Days)
      )
    );

  for (const ex of expiringExceptions) {
    const due = ex.expirationDate!;
    const d = daysUntil(due);

    items.push({
      id: `exception-expiring-${ex.id}`,
      type: 'exception_expiring',
      title: `Policy exception expiring`,
      description: `Exception #${ex.id} for policy #${ex.policyId} expires ${due.toLocaleDateString()}`,
      priority: 'high',
      module: 'Policies',
      entityId: ex.id,
      entityType: 'policyException',
      dueDate: due,
      daysUntilDue: d,
      actionUrl: `/client/${clientId}/policies/exceptions`,
      createdAt: ex.createdAt || now,
    });
  }

  // 9. Connector failures — cloudConnections with status='error'
  const failedConnectors = await db.select()
    .from(schema.cloudConnections)
    .where(
      and(
        eq(schema.cloudConnections.clientId, clientId),
        eq(schema.cloudConnections.status, 'error')
      )
    );

  for (const conn of failedConnectors) {
    items.push({
      id: `connector-failed-${conn.id}`,
      type: 'connector_failed',
      title: `Connector failed: ${conn.name}`,
      description: conn.errorMessage || `${conn.provider} connector has encountered an error`,
      priority: 'high',
      module: 'Integrations',
      entityId: conn.id,
      entityType: 'cloudConnection',
      actionUrl: `/client/${clientId}/integrations`,
      createdAt: conn.createdAt || now,
    });
  }

  // Sort: critical first, then high, medium, low
  const prioritySort: Record<ActionItem['priority'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  items.sort((a, b) => {
    const pa = prioritySort[a.priority];
    const pb = prioritySort[b.priority];
    if (pa !== pb) return pa - pb;
    if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
      return a.daysUntilDue - b.daysUntilDue;
    }
    return 0;
  });

  return items;
}
