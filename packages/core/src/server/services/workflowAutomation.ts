// Workflow Automation Service for Evidence Collection
// Handles Slack notifications, email reminders, and automated evidence requests

import { getDb } from '../../db';
import * as schema from '../../schema';
import { eq, and, lt, gt, inArray } from 'drizzle-orm';
import { FRAMEWORK_SEEDS } from '../routers/evidence';

interface NotificationTemplate {
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface EvidenceRequest {
  clientId: number;
  evidenceId: string;
  title: string;
  description: string;
  framework: string;
  owner: string;
  dueDate: Date;
  status: 'pending' | 'overdue' | 'completed';
}

export class WorkflowAutomationService {
  private static instance: WorkflowAutomationService;

  static getInstance(): WorkflowAutomationService {
    if (!WorkflowAutomationService.instance) {
      WorkflowAutomationService.instance = new WorkflowAutomationService();
    }
    return WorkflowAutomationService.instance;
  }

  // Send Slack notification for evidence requests
  async sendSlackNotification(request: EvidenceRequest): Promise<boolean> {
    try {
      // Mock implementation - would integrate with Slack API
      console.log(`[SLACK] Evidence request for ${request.title} sent to ${request.owner}`);
      
      const message = this.buildSlackMessage(request);
      // Actual Slack API integration would go here
      // await slackClient.chat.postMessage(message);
      
      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  // Send email notification for evidence requests
  async sendEmailNotification(request: EvidenceRequest): Promise<boolean> {
    try {
      // Mock implementation - would integrate with email service
      console.log(`[EMAIL] Evidence request for ${request.title} sent to ${request.owner}`);
      
      const template = this.buildEmailTemplate(request);
      // Actual email service integration would go here
      // await emailService.send(template);
      
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  // Check for overdue evidence and send reminders
  async checkOverdueEvidence(): Promise<void> {
    try {
      const db = await getDb();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Find evidence requests that are overdue
      const overdueEvidence = await db.select()
        .from(schema.evidence)
        .where(and(
          eq(schema.evidence.status, 'pending'),
          lt(schema.evidence.createdAt, sevenDaysAgo)
        ));

      for (const evidence of overdueEvidence) {
        const request = await this.buildEvidenceRequest(evidence);
        if (request.owner) {
          await this.sendReminder(request);
        }
      }
    } catch (error) {
      console.error('Failed to check overdue evidence:', error);
    }
  }

  // Send reminder for overdue evidence
  async sendReminder(request: EvidenceRequest): Promise<void> {
    const reminderRequest = {
      ...request,
      status: 'overdue' as const,
      dueDate: new Date() // Immediate attention needed
    };

    // Send both Slack and email reminders
    await Promise.all([
      this.sendSlackNotification(reminderRequest),
      this.sendEmailNotification(reminderRequest)
    ]);

    // Update evidence status to overdue
    const db = await getDb();
    await db.update(schema.evidence)
      .set({ status: 'overdue', updatedAt: new Date() })
      .where(eq(schema.evidence.id, parseInt(request.evidenceId)));
  }

  // Automatically create evidence requests based on framework requirements
  async autoCreateEvidenceRequests(clientId: number, framework: string): Promise<void> {
    try {
      const db = await getDb();
      const frameworkRequirements = FRAMEWORK_SEEDS[framework] || [];

      for (const requirement of frameworkRequirements) {
        // Check if evidence already exists
        const existingEvidence = await db.select()
          .from(schema.evidence)
          .where(and(
            eq(schema.evidence.clientId, clientId),
            eq(schema.evidence.evidenceId, requirement.id)
          ));

        if (existingEvidence.length === 0) {
          // Create new evidence request
          await db.insert(schema.evidence).values({
            clientId,
            evidenceId: requirement.id,
            description: requirement.title,
            framework,
            status: 'pending',
            owner: requirement.location,
            location: requirement.location,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any);

          // Send initial notification
          const request: EvidenceRequest = {
            clientId,
            evidenceId: requirement.id,
            title: requirement.title,
            description: requirement.description,
            framework,
            owner: requirement.location,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            status: 'pending'
          };

          await Promise.all([
            this.sendSlackNotification(request),
            this.sendEmailNotification(request)
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to auto-create evidence requests:', error);
    }
  }

  // Build evidence request from database record
  private async buildEvidenceRequest(evidence: any): Promise<EvidenceRequest> {
    return {
      clientId: evidence.clientId,
      evidenceId: evidence.id.toString(),
      title: evidence.description || evidence.evidenceId,
      description: evidence.description || '',
      framework: evidence.framework || 'Unknown',
      owner: evidence.owner || 'Unassigned',
      dueDate: evidence.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: evidence.status as 'pending' | 'overdue' | 'completed'
    };
  }

  // Build Slack message template
  private buildSlackMessage(request: EvidenceRequest): any {
    const urgency = request.status === 'overdue' ? '🚨 URGENT: ' : '📋 ';
    const statusEmoji = request.status === 'overdue' ? '⏰' : '📝';
    
    return {
      channel: '#compliance-requests',
      text: `${urgency}Evidence Request ${statusEmoji}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${urgency}${request.title}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Framework:*\n${request.framework}`
            },
            {
              type: 'mrkdwn',
              text: `*Due Date:*\n${request.dueDate.toLocaleDateString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${request.description}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Assigned to:* ${request.owner}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Mark as Complete'
              },
              value: `complete_${request.evidenceId}`,
              action_id: 'evidence_complete'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details'
              },
              url: `https://app.complianceos.com/evidence/${request.evidenceId}`,
              action_id: 'view_details'
            }
          ]
        }
      ]
    };
  }

  // Build email template
  private buildEmailTemplate(request: EvidenceRequest): NotificationTemplate {
    const urgency = request.status === 'overdue' ? 'URGENT: ' : '';
    
    return {
      subject: `${urgency}Evidence Request: ${request.title} (${request.framework})`,
      message: `
        <h2>${urgency}Evidence Collection Request</h2>
        
        <p><strong>Framework:</strong> ${request.framework}</p>
        <p><strong>Evidence ID:</strong> ${request.evidenceId}</p>
        <p><strong>Title:</strong> ${request.title}</p>
        <p><strong>Due Date:</strong> ${request.dueDate.toLocaleDateString()}</p>
        
        <h3>Description:</h3>
        <p>${request.description}</p>
        
        <h3>Action Required:</h3>
        <p>Please provide the requested evidence by the due date. You can upload the evidence through the ComplianceOS platform.</p>
        
        <p><a href="https://app.complianceos.com/evidence/${request.evidenceId}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Evidence</a></p>
        
        <p>Best regards,<br>ComplianceOS Team</p>
      `,
      priority: request.status === 'overdue' ? 'high' : 'medium'
    };
  }

  // Process Slack interactions (button clicks)
  async processSlackInteraction(payload: any): Promise<void> {
    try {
      const { actions, callback_id } = payload;
      const action = actions[0];
      
      if (action.action_id === 'evidence_complete') {
        const evidenceId = action.value.replace('complete_', '');
        await this.markEvidenceAsComplete(parseInt(evidenceId));
      }
    } catch (error) {
      console.error('Failed to process Slack interaction:', error);
    }
  }

  // Mark evidence as complete
  private async markEvidenceAsComplete(evidenceId: number): Promise<void> {
    const db = await getDb();
    await db.update(schema.evidence)
      .set({ 
        status: 'collected', 
        updatedAt: new Date(),
        lastVerified: new Date()
      })
      .where(eq(schema.evidence.id, evidenceId));
  }

  // Start background worker for automated checks
  startBackgroundWorker(): void {
    // Check for overdue evidence every hour
    setInterval(() => {
      this.checkOverdueEvidence();
    }, 60 * 60 * 1000);

    // Initial check
    this.checkOverdueEvidence();
  }
}

// Export singleton instance
export const workflowAutomation = WorkflowAutomationService.getInstance();