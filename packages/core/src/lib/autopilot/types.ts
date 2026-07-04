/** Configuration for which autopilot modules are active */
export interface AutopilotConfig {
  clientId: number;
  enabled: boolean;
  schedule: 'hourly' | 'daily' | 'weekly' | 'manual';
  modules: {
    collectEvidence: boolean;       // Run connector SDK
    runHealthChecks: boolean;       // Run compliance monitor
    detectGaps: boolean;            // Run evidence gap detector
    createRemediationTasks: boolean; // Auto-create tasks for gaps
    generateReport: boolean;         // Generate compliance report
    sendNotifications: boolean;      // Send summary
  };
  approvalMode: 'auto' | 'review';  // Auto-execute or require human approval
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Result of a single autopilot run */
export interface AutopilotRun {
  id: number;
  clientId: number;
  startedAt: Date;
  completedAt: Date | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  modulesExecuted: string[];
  results: {
    evidenceCollected: number;
    healthIssuesFound: number;
    gapsDetected: number;
    tasksCreated: number;
    reportGenerated: boolean;
    notificationsSent: number;
  };
  errorMessage?: string;
  duration: number; // seconds
}

/** An action proposed by autopilot, pending human approval */
export interface AutopilotAction {
  id: number;
  runId: number;
  clientId: number;
  type: 'create_task' | 'create_evidence_request' | 'update_control_status' | 'send_notification' | 'generate_report';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  targetEntity?: { type: string; id: number };
  metadata: Record<string, any>;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
}
