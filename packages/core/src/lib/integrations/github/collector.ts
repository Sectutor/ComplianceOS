/**
 * GitHub Evidence Collector (built-in)
 *
 * Manifest-driven evidence collector for GitHub. Pulls control-relevant
 * evidence straight from the GitHub REST API:
 *
 *   - github.branch-protection  → is the default branch protected?
 *   - github.dependabot         → are there open Dependabot alerts?
 *   - github.secret-scanning    → are there open secret-scanning alerts?
 *
 * The HTTP client accepts an injectable fetcher so unit tests can drive it
 * with canned responses — no network required. When no credentials are
 * configured, the collector emits a single 'error' evidence record rather
 * than throwing, so the batch runner treats it as a graceful degradation.
 */

import type {
  IntegrationManifest,
  IntegrationContext,
} from '../types';
import type {
  EvidenceCollector,
  CollectedEvidence,
  CollectOptions,
} from '../collector';

/** Minimal Response shape we rely on — keeps the fetcher trivially fake-able. */
export interface GithubFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type GithubFetch = (
  input: string,
  init?: RequestInit,
) => Promise<GithubFetchResponse>;

const DEFAULT_API_BASE = 'https://api.github.com';

export const githubEvidenceManifest: IntegrationManifest = {
  slug: 'github-evidence',
  name: 'GitHub Evidence',
  version: '1.0.0',
  description:
    'Collects control-mapped evidence from GitHub: branch protection, Dependabot alerts, and secret scanning.',
  author: {
    name: 'ComplianceOS',
    url: 'https://complianceos.com',
  },
  license: 'MIT',
  category: 'source-control',
  tags: ['github', 'evidence', 'security', 'devops'],
  homepage: 'https://github.com',
  capabilities: {
    read: true,
    sync: true,
  },
  authentication: {
    type: 'bearer',
    fields: [
      {
        key: 'accessToken',
        type: 'password',
        label: 'GitHub Personal Access Token',
        description: 'Token with repo + security_events scopes.',
        required: true,
        sensitive: true,
      },
    ],
  },
  actions: [],
  triggers: [],
  rateLimit: {
    requests: 5000,
    window: 3600,
  },
};

export interface GithubApiClient {
  get(path: string, token: string): Promise<{
    notFound: boolean;
    data: any;
  }>;
}

export function createGithubApiClient(
  fetcher?: GithubFetch,
  baseUrl = DEFAULT_API_BASE,
): GithubApiClient {
  const doFetch: GithubFetch = fetcher ?? ((input, init) => globalThis.fetch(input, init));

  return {
    async get(path, token) {
      const response = await doFetch(`${baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      // GitHub uses 404 for "branch has no protection rules".
      if (response.status === 404) {
        return { notFound: true, data: null };
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          `GitHub API error ${response.status} on ${path}: ${body?.message ?? 'unknown'}`,
        );
      }
      return { notFound: false, data: await response.json() };
    },
  };
}

function evidenceForRepo(
  repo: { full_name: string },
  now: Date,
  checks: Array<{
    id: string;
    controlId: string;
    type: string;
    title: string;
    status: CollectedEvidence['status'];
    description: string;
    rawData?: unknown;
  }>,
): CollectedEvidence[] {
  const [owner, name] = repo.full_name.split('/');
  return checks.map((check) => ({
    id: `${check.id}-${owner}-${name}`,
    controlId: check.controlId,
    source: 'github-evidence',
    type: check.type,
    status: check.status,
    title: check.title,
    description: check.description,
    collectedAt: now,
    rawData: check.rawData,
  }));
}

async function collectGithubEvidence(
  api: GithubApiClient,
  context: IntegrationContext,
  options?: CollectOptions,
): Promise<CollectedEvidence[]> {
  const now = options?.now ?? new Date();
  const token = context.credentials.accessToken ?? context.credentials.token;

  if (!token) {
    return [
      {
        id: 'github-credentials-missing',
        controlId: 'github.authentication',
        source: 'github-evidence',
        type: 'authentication',
        status: 'error',
        title: 'GitHub credentials not configured',
        description:
          'No accessToken/token credential is set for the GitHub evidence collector. ' +
          'Add credentials to begin collecting GitHub evidence.',
        collectedAt: now,
      },
    ];
  }

  const maxRepos = Number(context.settings.maxRepos ?? 5);
  const requestedRepos: string[] = Array.isArray(context.settings.repos)
    ? context.settings.repos
    : [];

  const repoResult = await api.get('/user/repos?per_page=100&sort=updated', token);
  const accessibleRepos: Array<{ full_name: string }> = repoResult.notFound
    ? []
    : (repoResult.data ?? []).filter((r: any) => r && typeof r.full_name === 'string');

  const targets = requestedRepos.length
    ? accessibleRepos.filter((r) => requestedRepos.includes(r.full_name))
    : accessibleRepos.slice(0, maxRepos);

  const evidence: CollectedEvidence[] = [];

  for (const repo of targets) {
    const [owner, name] = repo.full_name.split('/');
    const base = `/repos/${owner}/${name}`;

    try {
      const protection = await api.get(`${base}/branches/main/protection`, token);
      evidence.push(
        ...evidenceForRepo(repo, now, [
          {
            id: 'github-branch-protection',
            controlId: 'github.branch-protection',
            type: 'branch-protection',
            title: `Branch protection on ${repo.full_name}`,
            status: protection.notFound ? 'fail' : 'pass',
            description: protection.notFound
              ? 'The default branch (main) is not protected by branch rules.'
              : 'The default branch is protected with branch rules (required reviews/status checks).',
            rawData: protection.notFound ? null : protection.data,
          },
        ]),
      );

      const dependabot = await api.get(`${base}/dependabot/alerts?state=open`, token);
      const dependabotCount = dependabot.notFound
        ? 0
        : Array.isArray(dependabot.data)
          ? dependabot.data.length
          : 0;
      evidence.push(
        ...evidenceForRepo(repo, now, [
          {
            id: 'github-dependabot',
            controlId: 'github.dependabot',
            type: 'dependabot-alerts',
            title: `Dependabot alerts on ${repo.full_name}`,
            status: dependabotCount === 0 ? 'pass' : 'warning',
            description:
              dependabotCount === 0
                ? 'No open Dependabot alerts detected.'
                : `${dependabotCount} open Dependabot alert(s) detected — review and remediate.`,
            rawData: dependabot.data ?? null,
          },
        ]),
      );

      const secretScanning = await api.get(`${base}/secret-scanning/alerts?state=open`, token);
      const secretCount = secretScanning.notFound
        ? 0
        : Array.isArray(secretScanning.data)
          ? secretScanning.data.length
          : 0;
      evidence.push(
        ...evidenceForRepo(repo, now, [
          {
            id: 'github-secret-scanning',
            controlId: 'github.secret-scanning',
            type: 'secret-scanning-alerts',
            title: `Secret scanning alerts on ${repo.full_name}`,
            status: secretCount === 0 ? 'pass' : 'warning',
            description:
              secretCount === 0
                ? 'No open secret scanning alerts detected.'
                : `${secretCount} open secret scanning alert(s) detected — rotate exposed secrets.`,
            rawData: secretScanning.data ?? null,
          },
        ]),
      );
    } catch (err: any) {
      evidence.push(
        ...evidenceForRepo(repo, now, [
          {
            id: 'github-repo-error',
            controlId: 'github.repository-access',
            type: 'repository-error',
            title: `Could not collect evidence from ${repo.full_name}`,
            status: 'error',
            description: err?.message ?? String(err),
          },
        ]),
      );
    }
  }

  return evidence;
}

/**
 * Create a GitHub evidence collector with an optional injectable fetcher
 * (defaults to global fetch). Tests pass a fake fetcher.
 */
export function createGithubEvidenceCollector(
  fetcher?: GithubFetch,
): EvidenceCollector {
  const api = createGithubApiClient(fetcher);
  return {
    manifest: githubEvidenceManifest,
    collect(context: IntegrationContext, options?: CollectOptions) {
      return collectGithubEvidence(api, context, options);
    },
  };
}

/** Shared built-in instance backed by the real GitHub API. */
export const githubEvidenceCollector: EvidenceCollector =
  createGithubEvidenceCollector();
