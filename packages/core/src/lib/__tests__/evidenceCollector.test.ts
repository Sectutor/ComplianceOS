/**
 * Automated Evidence Collection — unit tests.
 *
 * Covers the manifest-driven collector engine (normalization, TTL-based
 * expiry, limit, error isolation, runAll aggregation) and the built-in GitHub
 * evidence collector (driven by a fake fetcher — no network required).
 */
import { describe, it, expect, vi } from 'vitest';
import type { IntegrationManifest, IntegrationContext } from '../integrations/types';
import {
  EvidenceCollectorRegistry,
  collectEvidence,
  normalizeEvidence,
  summarizeResults,
} from '../integrations/collector';
import type { EvidenceCollector, CollectedEvidence } from '../integrations/collector';
import {
  githubEvidenceManifest,
  createGithubEvidenceCollector,
} from '../integrations/github/collector';
import type { GithubFetch } from '../integrations/github/collector';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function makeManifest(slug: string): IntegrationManifest {
  return {
    slug,
    name: slug,
    version: '1.0.0',
    description: 'test collector',
    author: { name: 'ComplianceOS' },
    license: 'MIT',
    category: 'utility',
    tags: [],
    capabilities: { read: true },
    authentication: { type: 'none', fields: [] },
    actions: [],
    triggers: [],
  };
}

function makeCollector(slug: string, evidence: CollectedEvidence[]): EvidenceCollector {
  return {
    manifest: makeManifest(slug),
    async collect() {
      return evidence;
    },
  };
}

function makeContext(
  overrides: Partial<IntegrationContext> = {},
): IntegrationContext {
  return {
    connectionId: 'conn-1',
    userId: 'user-1',
    credentials: { accessToken: 'ghp_test_token' },
    settings: {},
    ...overrides,
  };
}

describe('collector engine', () => {
  it('normalizes evidence with the collector slug as source and validates collectedAt', () => {
    const normalized = normalizeEvidence(
      {
        id: 'e1',
        controlId: 'test.control',
        source: 'wrong',
        type: 'branch-protection',
        status: 'pass',
        title: 't',
        description: 'd',
        collectedAt: NOW,
      },
      'my-collector',
      { now: NOW },
    );

    expect(normalized.source).toBe('my-collector');
    expect(normalized.collectedAt).toEqual(NOW);
  });

  it('falls back to the injected clock when collectedAt is missing or invalid', () => {
    const withMissing = normalizeEvidence(
      {
        id: 'e2',
        controlId: 'test.control',
        source: 'x',
        type: 'type-a',
        status: 'pass',
        title: 't',
        description: 'd',
        collectedAt: null as unknown as Date,
      },
      'c1',
      { now: NOW },
    );
    expect(withMissing.collectedAt).toEqual(NOW);

    const withInvalid = normalizeEvidence(
      {
        id: 'e3',
        controlId: 'test.control',
        source: 'x',
        type: 'type-a',
        status: 'pass',
        title: 't',
        description: 'd',
        collectedAt: new Date('not-a-date'),
      },
      'c1',
      { now: NOW },
    );
    expect(withInvalid.collectedAt).toEqual(NOW);
  });

  it('computes expiresAt from the per-type TTL when the collector did not set one', () => {
    const normalized = normalizeEvidence(
      {
        id: 'e4',
        controlId: 'test.control',
        source: 'x',
        type: 'branch-protection',
        status: 'pass',
        title: 't',
        description: 'd',
        collectedAt: NOW,
      },
      'c1',
      { now: NOW, evidenceTtlMs: { 'branch-protection': 24 * 60 * 60 * 1000 } },
    );

    expect(normalized.expiresAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
  });

  it('keeps an explicit expiresAt from the collector', () => {
    const normalized = normalizeEvidence(
      {
        id: 'e5',
        controlId: 'test.control',
        source: 'x',
        type: 'type-b',
        status: 'pass',
        title: 't',
        description: 'd',
        collectedAt: NOW,
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      },
      'c1',
      { now: NOW, evidenceTtlMs: { 'type-b': 1000 } },
    );

    expect(normalized.expiresAt).toEqual(new Date('2099-01-01T00:00:00.000Z'));
  });

  it('collectEvidence converts a throwing collector into a failed result', async () => {
    const boom: EvidenceCollector = {
      manifest: makeManifest('boom'),
      async collect() {
        throw new Error('API down');
      },
    };

    const result = await collectEvidence(boom, makeContext(), { now: NOW });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['API down']);
    expect(result.evidence).toEqual([]);
    expect(result.slug).toBe('boom');
  });

  it('collectEvidence caps evidence at the configured limit', async () => {
    const collector = makeCollector(
      'many',
      Array.from({ length: 7 }, (_, i) => ({
        id: `e${i}`,
        controlId: 'test.control',
        source: 'many',
        type: 'type-c',
        status: 'pass' as const,
        title: `t${i}`,
        description: 'd',
        collectedAt: NOW,
      })),
    );

    const result = await collectEvidence(collector, makeContext(), {
      now: NOW,
      limit: 3,
    });

    expect(result.evidence).toHaveLength(3);
  });

  it('summarizeResults aggregates pass/warning/fail/error counts', () => {
    const summary = summarizeResults([
      {
        slug: 'a',
        success: true,
        evidence: [
          { id: '1', controlId: 'c', source: 'a', type: 't', status: 'pass', title: 't', description: 'd', collectedAt: NOW },
          { id: '2', controlId: 'c', source: 'a', type: 't', status: 'fail', title: 't', description: 'd', collectedAt: NOW },
        ],
        errors: [],
        startedAt: NOW,
        completedAt: NOW,
        durationMs: 0,
      },
      {
        slug: 'b',
        success: true,
        evidence: [
          { id: '3', controlId: 'c', source: 'b', type: 't', status: 'warning', title: 't', description: 'd', collectedAt: NOW },
          { id: '4', controlId: 'c', source: 'b', type: 't', status: 'error', title: 't', description: 'd', collectedAt: NOW },
        ],
        errors: [],
        startedAt: NOW,
        completedAt: NOW,
        durationMs: 0,
      },
    ]);

    expect(summary.totalEvidence).toBe(4);
    expect(summary.passedCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.errorCount).toBe(1);
  });
});

describe('EvidenceCollectorRegistry', () => {
  it('registers, finds, and lists collectors by manifest slug', () => {
    const registry = new EvidenceCollectorRegistry();
    const collector = makeCollector('alpha', []);

    registry.register(collector);

    expect(registry.has('alpha')).toBe(true);
    expect(registry.get('alpha')).toBe(collector);
    expect(registry.list()).toEqual([collector]);
    expect(registry.get('missing')).toBeUndefined();
  });

  it('runAll isolates a failing collector from the rest of the batch', async () => {
    const registry = new EvidenceCollectorRegistry();
    const boom: EvidenceCollector = {
      manifest: makeManifest('boom'),
      async collect() {
        throw new Error('timeout');
      },
    };
    const ok = makeCollector('ok', [
      {
        id: 'e1',
        controlId: 'test.control',
        source: 'ok',
        type: 'type-d',
        status: 'pass',
        title: 't',
        description: 'd',
        collectedAt: NOW,
      },
    ]);

    registry.register(boom);
    registry.register(ok);

    const summary = await registry.runAll(makeContext(), { now: NOW });

    expect(summary.results).toHaveLength(2);
    const boomResult = summary.results.find((r) => r.slug === 'boom');
    const okResult = summary.results.find((r) => r.slug === 'ok');
    expect(boomResult?.success).toBe(false);
    expect(boomResult?.errors).toEqual(['timeout']);
    expect(okResult?.success).toBe(true);
    expect(summary.totalEvidence).toBe(1);
    expect(summary.passedCount).toBe(1);
  });
});

describe('GitHub evidence collector', () => {
  /** Route map: exact URL → { status, body }. Missing routes → 404. */
  function fakeFetcher(
    routes: Record<string, { status: number; body: unknown }>,
  ): GithubFetch {
    return async (input: string) => {
      const route = routes[String(input)];
      if (!route) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: 'Not Found' }),
        };
      }
      return {
        ok: route.status >= 200 && route.status < 300,
        status: route.status,
        json: async () => route.body,
      };
    };
  }

  const BASE = 'https://api.github.com';
  const reposRoute = `${BASE}/user/repos?per_page=100&sort=updated`;

  function buildRoutes(overrides: Record<string, unknown> = {}) {
    return {
      [reposRoute]: {
        status: 200,
        body: [
          { full_name: 'acme/api' },
          { full_name: 'acme/web' },
        ],
      },
      [`${BASE}/repos/acme/api/branches/main/protection`]: {
        status: 200,
        body: { required_status_checks: { contexts: ['ci'] } },
      },
      [`${BASE}/repos/acme/api/dependabot/alerts?state=open`]: {
        status: 200,
        body: [{ number: 1, state: 'open', security_advisory: { severity: 'high' } }],
      },
      [`${BASE}/repos/acme/api/secret-scanning/alerts?state=open`]: {
        status: 200,
        body: [],
      },
      [`${BASE}/repos/acme/web/branches/main/protection`]: {
        status: 404,
        body: { message: 'Branch not protected' },
      },
      [`${BASE}/repos/acme/web/dependabot/alerts?state=open`]: {
        status: 200,
        body: [],
      },
      [`${BASE}/repos/acme/web/secret-scanning/alerts?state=open`]: {
        status: 200,
        body: [{ number: 2, state: 'open' }],
      },
      ...overrides,
    };
  }

  it('collects branch-protection, dependabot, and secret-scanning evidence per repo', async () => {
    const collector = createGithubEvidenceCollector(
      fakeFetcher(buildRoutes()),
    );

    const evidence = await collector.collect(makeContext(), { now: NOW });

    expect(evidence).toHaveLength(6);

    const byId = Object.fromEntries(evidence.map((e) => [e.id, e]));

    expect(byId['github-branch-protection-acme-api']?.status).toBe('pass');
    expect(byId['github-branch-protection-acme-web']?.status).toBe('fail');
    expect(byId['github-dependabot-acme-api']?.status).toBe('warning');
    expect(byId['github-dependabot-acme-web']?.status).toBe('pass');
    expect(byId['github-secret-scanning-acme-api']?.status).toBe('pass');
    expect(byId['github-secret-scanning-acme-web']?.status).toBe('warning');

    // control codes + source normalization
    expect(byId['github-branch-protection-acme-api']?.controlId).toBe(
      'github.branch-protection',
    );
    expect(byId['github-branch-protection-acme-api']?.source).toBe(
      'github-evidence',
    );
    expect(byId['github-branch-protection-acme-api']?.collectedAt).toEqual(NOW);
  });

  it('respects settings.repos to restrict collection to specific repositories', async () => {
    const collector = createGithubEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(
      makeContext({ settings: { repos: ['acme/api'] } }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(3);
    expect(evidence.every((e) => e.id.endsWith('-acme-api'))).toBe(true);
  });

  it('respects settings.maxRepos to cap how many repos are scanned', async () => {
    const collector = createGithubEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(
      makeContext({ settings: { maxRepos: 1 } }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(3);
    // /user/repos returns acme/api first (updated-sorted), so only acme/api is scanned.
    expect(evidence.every((e) => e.id.endsWith('-acme-api'))).toBe(true);
  });

  it('emits a single error evidence when no credentials are configured', async () => {
    const collector = createGithubEvidenceCollector(fakeFetcher(buildRoutes()));

    const evidence = await collector.collect(
      makeContext({ credentials: {} }),
      { now: NOW },
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0].status).toBe('error');
    expect(evidence[0].controlId).toBe('github.authentication');
  });

  it('turns a per-repo API failure into error evidence without aborting the batch', async () => {
    const routes = buildRoutes({
      [`${BASE}/repos/acme/api/branches/main/protection`]: {
        status: 500,
        body: { message: 'Internal Server Error' },
      },
    });
    const collector = createGithubEvidenceCollector(fakeFetcher(routes));

    const evidence = await collector.collect(makeContext(), { now: NOW });

    // acme/api → 1 error evidence (repo aborted), acme/web → 3 evidence items.
    expect(evidence).toHaveLength(4);
    expect(evidence.find((e) => e.id === 'github-repo-error-acme-api')?.status).toBe(
      'error',
    );
  });

  it('runs end-to-end through the registry and aggregates the summary', async () => {
    const registry = new EvidenceCollectorRegistry();
    const collector = createGithubEvidenceCollector(fakeFetcher(buildRoutes()));
    registry.register(collector);

    const summary = await registry.runAll(makeContext(), { now: NOW });

    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].success).toBe(true);
    expect(summary.totalEvidence).toBe(6);
    expect(summary.passedCount).toBe(3);
    expect(summary.warningCount).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.errorCount).toBe(0);
  });

  it('exposes the github evidence manifest for discovery', () => {
    expect(githubEvidenceManifest.slug).toBe('github-evidence');
    expect(githubEvidenceManifest.category).toBe('source-control');
    expect(githubEvidenceManifest.authentication.type).toBe('bearer');
    expect(githubEvidenceManifest.capabilities.sync).toBe(true);
  });
});
