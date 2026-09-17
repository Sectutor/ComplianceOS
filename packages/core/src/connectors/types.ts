// Connector SDK Types
// Pluggable evidence collection framework for automated compliance evidence

export interface ConnectorConfig {
  id: string; // unique instance ID
  name: string; // display name
  type: 'aws' | 'github' | 'google_workspace' | 'okta' | 'docker' | string;
  clientId: number;
  enabled: boolean;
  schedule: 'hourly' | 'daily' | 'weekly';
  credentials: Record<string, string>; // encrypted at rest
  settings: Record<string, any>;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed';
}

export interface ConnectorEvidence {
  clientControlId: number;
  evidenceId: string;
  description: string;
  type: string;
  status: 'pending' | 'collected';
  fileUrl?: string;
  rawData?: Record<string, any>;
  collectedAt: Date;
}

export interface ConnectorResult {
  success: boolean;
  evidence: ConnectorEvidence[];
  errors?: string[];
  summary: { control: string; passed: number; failed: number }[];
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  configSchema: Record<string, any>; // JSON Schema for settings form
  run(config: ConnectorConfig): Promise<ConnectorResult>;
  validate(config: ConnectorConfig): Promise<{ valid: boolean; errors: string[] }>;
}
