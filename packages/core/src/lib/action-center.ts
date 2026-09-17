import { getDb } from '../db';
import * as schema from '../schema';
import { eq, and, lt, gte, desc, sql, ne, inArray } from 'drizzle-orm';

export interface ActionItem {
  id: string;
  type:
    | 'evidence_expiring'
    | 'evidence_missing'
    | 'control_overdue'
    | 'review_due'
    | 'access_review_pending'
    | 'vendor_assessment_due'
    | 'policy_review_due'
    | 'task_overdue'
    | 'training_incomplete'
    | 'exception_expiring'
    | 'connector_failed'
    | 'risk_critical'
    | 'incident_active'
    | 'cloud_drift';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  module: string;
  entityId: number;
  entityType: string;
  dueDate?: Date;
  daysUntilDue?: number;
  actionUrl?: string;
  actionLabel?: string;
  frameworks?: string[];
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

  // 1. Evidence expiring — items with expirationDate within 30 days (Scenario 19)
  try {
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
        actionLabel: 'Renew Evidence Artifact',
        frameworks: ['SOC 2 CC6.1', 'ISO 27001 A.9.4'],
        createdAt: ev.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching expiring evidence:', err);
  }

  // 2. Evidence missing — clientControls with status='implemented' that have no evidence records (Scenario 1)
  try {
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
          title: `Missing evidence for implemented control #${ctrl.clientControlId}`,
          description: `Control #${ctrl.clientControlId} is marked as implemented but has no verified evidence records`,
          priority: 'high',
          module: 'Evidence',
          entityId: ctrl.id,
          entityType: 'clientControl',
          actionUrl: `/client/${clientId}/evidence`,
          actionLabel: 'Upload Proof Artifact',
          frameworks: ['SOC 2 CC7.1', 'ISO 27001'],
          createdAt: ctrl.createdAt || now,
        });
      }
    }
  } catch (err) {
    console.error('Error fetching missing evidence:', err);
  }

  // 3. Controls overdue — implementationTasks with plannedEndDate in the past and status != 'done' (Scenario 9)
  try {
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
          ne(schema.implementationTasks.status, 'done')
        )
      );

    for (const { task } of overdueTasks) {
      const due = task.plannedEndDate!;
      const d = daysUntil(due);
      const priority: ActionItem['priority'] = d <= 0 ? 'critical' : 'high';

      items.push({
        id: `control-overdue-${task.id}`,
        type: 'control_overdue',
        title: `Overdue Task: ${task.title}`,
        description: task.description || `Implementation task overdue by ${Math.abs(d)} days`,
        priority,
        module: 'Controls',
        entityId: task.id,
        entityType: 'implementationTask',
        dueDate: due,
        daysUntilDue: d,
        actionUrl: `/client/${clientId}/implementation`,
        actionLabel: 'Complete Task',
        frameworks: ['NIST CSF', 'SOC 2'],
        createdAt: now,
      });
    }
  } catch (err) {
    console.error('Error fetching overdue tasks:', err);
  }

  // 4. Access reviews pending — accessReviewAssignments with status='pending' for user (Scenario 7)
  try {
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
        actionLabel: 'Certify Permissions',
        frameworks: ['SOC 2 CC6.3', 'ISO 27001 A.9.2'],
        createdAt: assignment.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching pending access reviews:', err);
  }

  // 5. Vendor assessments due — vendorAssessmentRequests that are open and past due (Scenario 13)
  try {
    const vendorRequests = await db.select()
      .from(schema.vendorAssessmentRequests)
      .where(
        and(
          eq(schema.vendorAssessmentRequests.clientId, clientId),
          inArray(schema.vendorAssessmentRequests.status, ['sent', 'in_progress']),
          lt(schema.vendorAssessmentRequests.expiresAt, now)
        )
      );

    for (const req of vendorRequests) {
      items.push({
        id: `vendor-assessment-${req.id}`,
        type: 'vendor_assessment_due',
        title: `Vendor Security Assessment Overdue`,
        description: `Assessment request #${req.id} for vendor #${req.vendorId} is past due`,
        priority: 'medium',
        module: 'Vendors',
        entityId: req.id,
        entityType: 'vendorAssessmentRequest',
        dueDate: req.expiresAt || undefined,
        daysUntilDue: req.expiresAt ? daysUntil(req.expiresAt) : undefined,
        actionUrl: `/client/${clientId}/vendors`,
        actionLabel: 'Re-send Assessment',
        frameworks: ['ISO 27001 A.15.1', 'GDPR Art. 28'],
        createdAt: req.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching vendor assessments:', err);
  }

  // 6. Policy reviews due — policyReviews with status='analyzing' (Scenario 15)
  try {
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
        description: `Policy "${pr.policyName}" requires review and signature acknowledgment`,
        priority: 'medium',
        module: 'Policies',
        entityId: pr.id,
        entityType: 'policyReview',
        actionUrl: `/client/${clientId}/policies`,
        actionLabel: 'Review & Publish',
        frameworks: ['SOC 2 CC2.1', 'ISO 27001 A.5.1'],
        createdAt: pr.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching policy reviews:', err);
  }

  // 7. Exceptions expiring — policyExceptions with expirationDate within 30 days (Scenario 2)
  try {
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
        title: `Policy Exception Expiring`,
        description: `Exception #${ex.id} for policy #${ex.policyId} expires ${due.toLocaleDateString()}`,
        priority: 'high',
        module: 'Policies',
        entityId: ex.id,
        entityType: 'policyException',
        dueDate: due,
        daysUntilDue: d,
        actionUrl: `/client/${clientId}/policies/exceptions`,
        actionLabel: 'Re-evaluate Risk',
        frameworks: ['ISO 27001 A.6.1.2', 'SOC 2'],
        createdAt: ex.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching policy exceptions:', err);
  }

  // 8. Connector failures — cloudConnections with status='error' (Scenario 8)
  try {
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
        title: `Cloud Connector Failed: ${conn.name}`,
        description: conn.errorMessage || `${conn.provider} collector has encountered an authentication or permission error`,
        priority: 'critical',
        module: 'Integrations',
        entityId: conn.id,
        entityType: 'cloudConnection',
        actionUrl: `/client/${clientId}/integrations`,
        actionLabel: 'Reconnect Integration',
        frameworks: ['SOC 2 CC6.6', 'NIST AC-4'],
        createdAt: conn.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching cloud connections:', err);
  }

  // 9. Critical Risk Treatments (Scenario 1, 3)
  try {
    const criticalTreatments = await db.select()
      .from(schema.riskTreatments)
      .where(
        and(
          eq(schema.riskTreatments.clientId, clientId),
          eq(schema.riskTreatments.priority, 'critical'),
          inArray(schema.riskTreatments.status, ['planned', 'in_progress'])
        )
      )
      .limit(5);

    for (const rt of criticalTreatments) {
      items.push({
        id: `risk-treatment-${rt.id}`,
        type: 'risk_critical',
        title: `Critical Risk Mitigation Required: #${rt.id}`,
        description: rt.strategy || `Treatment required for high-impact organizational risk`,
        priority: 'critical',
        module: 'Risks',
        entityId: rt.id,
        entityType: 'riskTreatment',
        dueDate: rt.dueDate || undefined,
        daysUntilDue: rt.dueDate ? daysUntil(rt.dueDate) : undefined,
        actionUrl: `/client/${clientId}/risks`,
        actionLabel: 'Execute Treatment',
        frameworks: ['ISO 27005', 'SOC 2 CC3.2', 'NIS2 Art. 21'],
        createdAt: rt.createdAt || now,
      });
    }
  } catch (err) {
    console.error('Error fetching critical risk treatments:', err);
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
