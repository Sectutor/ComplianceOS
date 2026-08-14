/**
 * ComplianceOS Integrations
 * 
 * Main entry point for the integration marketplace system.
 * Exports all integration types and utilities.
 */

// Types
export * from './types';

// Registry
export { integrationRegistry, getIntegrations, getIntegration, getBuiltInIntegrations, executeIntegration } from './registry';

// Marketplace
export { githubMarketplace, GitHubMarketplaceClient, createMarketplaceClient } from './github-marketplace';

// Built-in integrations
export { githubManifest, GitHubClient, executeGitHubAction } from './github';
export { slackManifest, SlackClient, executeSlackAction } from './slack';
export { googleDriveManifest, GoogleDriveClient, executeGoogleDriveAction } from './google-drive';
export { vulnerabilityScannerManifest, executeVulnerabilityScannerAction } from './vulnerability-scanner';
export { siemManifest, executeSIEMAction } from './siem';
export { soarManifest, executeSOARAction } from './soar';
export { threatIntelManifest, executeThreatIntelAction } from './threat-intel';

// ---------------------------------------------------------------------------
// Automated Evidence Collection (manifest-driven collector engine)
// ---------------------------------------------------------------------------
import { evidenceCollectorRegistry } from './collector';
import { githubEvidenceCollector } from './github/collector';
import { httpApiEvidenceCollector } from './http-api/collector';
import { awsEvidenceCollector } from './aws/collector';
import { azureEvidenceCollector } from './azure/collector';
import { gcpEvidenceCollector } from './gcp/collector';

export {
  normalizeEvidence,
  collectEvidence,
  summarizeResults,
  EvidenceCollectorRegistry,
  evidenceCollectorRegistry,
} from './collector';
export type {
  EvidenceStatus,
  CollectedEvidence,
  CollectOptions,
  EvidenceCollector,
  CollectorRunResult,
  CollectorRunSummary,
} from './collector';

// Built-in evidence collectors
export {
  githubEvidenceManifest,
  createGithubApiClient,
  createGithubEvidenceCollector,
  githubEvidenceCollector,
} from './github/collector';
export type {
  GithubFetch,
  GithubFetchResponse,
  GithubApiClient,
} from './github/collector';

// HTTP/API evidence collector (generic scanner/GRC JSON endpoint)
export {
  httpApiEvidenceManifest,
  mapHttpApiStatus,
  stableHttpApiItemId,
  createHttpApiEvidenceCollector,
  httpApiEvidenceCollector,
} from './http-api/collector';
export type {
  HttpApiFetch,
  HttpApiFetchResponse,
} from './http-api/collector';

// AWS evidence collector (IAM access key age, S3 encryption, EC2 ports, CloudTrail)
export {
  awsEvidenceManifest,
  createAwsEvidenceCollector,
  awsEvidenceCollector,
} from './aws/collector';
export type {
  AwsFetch,
  AwsFetchResponse,
} from './aws/collector';

// Azure evidence collector (MFA, Defender, storage encryption, SQL auditing)
export {
  azureEvidenceManifest,
  createAzureEvidenceCollector,
  azureEvidenceCollector,
} from './azure/collector';
export type {
  AzureFetch,
  AzureFetchResponse,
} from './azure/collector';

// GCP evidence collector (bucket public access, SA key rotation, disk encryption, Cloud SQL SSL)
export {
  gcpEvidenceManifest,
  createGcpEvidenceCollector,
  gcpEvidenceCollector,
} from './gcp/collector';
export type {
  GcpFetch,
  GcpFetchResponse,
} from './gcp/collector';

// Register the built-in collectors so runAll() picks them up automatically.
evidenceCollectorRegistry.register(githubEvidenceCollector);
evidenceCollectorRegistry.register(httpApiEvidenceCollector);
evidenceCollectorRegistry.register(awsEvidenceCollector);
evidenceCollectorRegistry.register(azureEvidenceCollector);
evidenceCollectorRegistry.register(gcpEvidenceCollector);

