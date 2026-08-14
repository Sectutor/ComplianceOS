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

// Register the built-in collectors so runAll() picks them up automatically.
evidenceCollectorRegistry.register(githubEvidenceCollector);
evidenceCollectorRegistry.register(httpApiEvidenceCollector);

