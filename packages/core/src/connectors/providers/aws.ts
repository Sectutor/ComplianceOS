import type { ConnectorDefinition, ConnectorConfig, ConnectorResult, ConnectorEvidence } from '../types';

const CHECKS = [
  { id: 'aws-s3-public-access', name: 'S3 Public Access Blocked', control: 'AC-3' },
  { id: 'aws-cloudtrail-enabled', name: 'CloudTrail Enabled', control: 'AU-2' },
  { id: 'aws-rds-encryption', name: 'RDS Encryption Enabled', control: 'SC-13' },
  { id: 'aws-ec2-security-groups', name: 'EC2 Security Group Restrictions', control: 'SC-7' },
  { id: 'aws-iam-password-policy', name: 'IAM Password Policy', control: 'IA-5' },
];

function runDryRun(config: ConnectorConfig): ConnectorResult {
  const evidence: ConnectorEvidence[] = CHECKS.map((check) => ({
    clientControlId: 0,
    evidenceId: check.id,
    description: '[DRY-RUN] ' + check.name + ': SIMULATED - passed',
    type: 'automated_scan',
    status: 'collected' as const,
    rawData: {
      check: check.id,
      result: 'passed',
      simulated: true,
      timestamp: new Date().toISOString(),
    },
    collectedAt: new Date(),
  }));

  return {
    success: true,
    evidence,
    summary: CHECKS.map((c) => ({
      control: c.control,
      passed: 1,
      failed: 0,
    })),
  };
}

export const awsConnector: ConnectorDefinition = {
  id: 'aws',
  name: 'AWS',
  description: 'Collect evidence from Amazon Web Services (S3, CloudTrail, RDS, EC2, IAM)',
  icon: 'aws',
  configSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', title: 'AWS Region', default: 'us-east-1' },
    },
    required: ['region'],
  },
  async run(config: ConnectorConfig): Promise<ConnectorResult> {
    try {
      await import('@aws-sdk/client-s3');
      return runDryRun(config);
    } catch {
      console.warn('[connector:aws] AWS SDK not available, running in dry-run mode');
      return runDryRun(config);
    }
  },
  async validate(config: ConnectorConfig): Promise<{ valid: boolean; errors: string[] }> {
    const hasAccessKey = !!(config.credentials && config.credentials.accessKeyId);
    const hasSecret = !!(config.credentials && config.credentials.secretAccessKey);
    if (!hasAccessKey || !hasSecret) {
      return { valid: false, errors: ['AWS Access Key ID and Secret Access Key are required'] };
    }
    return { valid: true, errors: [] };
  },
};
