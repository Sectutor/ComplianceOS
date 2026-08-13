/**
 * PHASE 5.1: End-to-End Integration Test
 * Validates the full agent compliance cycle.
 * 
 * Run with: npx tsx scripts/test/agent_e2e_test.ts
 * 
 * Prerequisites:
 * - PostgreSQL database with schema applied
 * - COMPLIANCE_API_KEY set (or run in dev mode without auth)
 * - Server running on localhost:3002 (npm run server)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3002/api/v1/agent-compliance';
const API_KEY = process.env.COMPLIANCE_API_KEY || '';

interface TestResult {
  step: string;
  passed: boolean;
  detail?: string;
  data?: any;
}

const results: TestResult[] = [];

function log(step: string, passed: boolean, detail?: string, data?: any) {
  results.push({ step, passed, detail, data });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${step}${detail ? ': ' + detail : ''}`);
}

async function apiCall(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `API ${res.status}`);
  return json.data;
}

async function runE2ETest() {
  console.log('\n=== Agent Compliance E2E Test ===\n');

  let agentId: number;
  let clientId = 9999; // test client
  let mappingCount = 0;

  // ── Step 1: Create Agent Profile ──────────────────────────────────
  try {
    const profile = await apiCall('/agents', {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        name: 'E2E Test Agent',
        description: 'Automated test agent',
        type: 'hermes',
        hosting: 'docker_local',
        sandbox: 'docker',
        approvalMode: 'manual',
        memoryEncryption: true,
        networkIsolation: true,
        owner: 'E2E Test',
      }),
    });
    agentId = profile.id;
    log('Create agent profile', true, `id=${agentId}`);
  } catch (err: any) {
    log('Create agent profile', false, err.message);
    return;
  }

  // ── Step 2: Add Tools ─────────────────────────────────────────────
  try {
    const tools = ['web_search', 'file_read', 'terminal'];
    for (const tool of tools) {
      await apiCall(`/agents/${agentId}/tools`, {
        method: 'POST',
        body: JSON.stringify({ name: tool, category: 'network', requiresApproval: tool === 'terminal' }),
      });
    }
    log('Add tools', true, `${tools.length} tools added`);
  } catch (err: any) {
    log('Add tools', false, err.message);
  }

  // ── Step 3: Create Policy Card ────────────────────────────────────
  try {
    const card = await apiCall(`/agents/${agentId}/policy-cards`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Test Policy Card',
        description: 'Test governance',
        aiActRiskLevel: 'limited',
        intendedUses: ['testing', 'validation'],
        geography: ['EU'],
        status: 'active',
      }),
    });
    log('Create policy card', true, `id=${card.id}`);
  } catch (err: any) {
    log('Create policy card', false, err.message);
  }

  // ── Step 4: Auto-Map ──────────────────────────────────────────────
  try {
    const mapResult = await apiCall(`/agents/${agentId}/auto-map`, { method: 'POST' });
    mappingCount = mapResult.totalMapped;
    log('Auto-map controls', true, `${mappingCount} controls mapped, OWASP ${mapResult.owaspCoverage}%`);
  } catch (err: any) {
    log('Auto-map controls', false, err.message);
  }

  // ── Step 5: Check Initial Score ───────────────────────────────────
  try {
    const score = await apiCall(`/agents/${agentId}/score`);
    log('Initial score', true, `overall=${score.overallScore}%, gaps=${score.gaps.length}`);
  } catch (err: any) {
    log('Initial score', false, err.message);
  }

  // ── Step 6: Upload Evidence ───────────────────────────────────────
  try {
    const evidence = await apiCall(`/agents/${agentId}/evidence/upload`, {
      method: 'POST',
      body: JSON.stringify({
        evidenceType: 'test_result',
        title: 'Prompt Injection Test',
        description: 'Verified prompt injection resistance',
        content: 'Test results: 50 adversarial prompts tested, 0 successful injections',
        framework: 'OWASP_LLM',
        controlId: 'LLM01',
        mimeType: 'text/plain',
      }),
    });
    log('Upload evidence', true, `id=${evidence.id}, hash=${evidence.fileHash?.substring(0, 16)}...`);

    // Link evidence to control
    await apiCall(`/evidence/${evidence.id}/link`, {
      method: 'POST',
      body: JSON.stringify({
        links: [{ agentId, framework: 'OWASP_LLM', controlId: 'LLM01', contributionType: 'proof', weight: 100 }],
      }),
    });
    log('Link evidence to control', true, 'LLM01 linked');
  } catch (err: any) {
    log('Upload evidence', false, err.message);
  }

  // ── Step 7: Submit Red Team Result ────────────────────────────────
  try {
    await apiCall(`/agents/${agentId}/redteam`, {
      method: 'POST',
      body: JSON.stringify({
        testName: 'Prompt Injection Attempt',
        testCategory: 'prompt_injection',
        severity: 'high',
        passed: true,
        details: 'All 50 injection attempts were blocked',
        relatedFramework: 'OWASP_LLM',
        relatedControlId: 'LLM01',
      }),
    });
    log('Submit red team result', true, 'LLM01 passed');
  } catch (err: any) {
    log('Submit red team result', false, err.message);
  }

  // ── Step 8: Check Updated Score ───────────────────────────────────
  try {
    const score = await apiCall(`/agents/${agentId}/score`);
    const llm01 = score.perControl.find((p: any) => p.controlId === 'LLM01');
    log('Updated score', llm01?.confidence >= 70, `LLM01 confidence=${llm01?.confidence}% (should be high)`);
  } catch (err: any) {
    log('Updated score', false, err.message);
  }

  // ── Step 9: Create Remediation Tasks ──────────────────────────────
  try {
    const tasks = await apiCall(`/internal/agents/${agentId}/remediate`, { method: 'POST' });
    log('Create remediation tasks', true, `${tasks.count} tasks created for gaps`);
  } catch (err: any) {
    log('Create remediation tasks', false, err.message);
  }

  // ── Step 10: Engagement Tracking ──────────────────────────────────
  try {
    await apiCall(`/agents/${agentId}/engagement`, {
      method: 'POST',
      body: JSON.stringify({ stage: 'discovery' }),
    });
    log('Create engagement', true, 'discovery stage');

    const evalResult = await apiCall(`/internal/agents/${agentId}/evaluate-engagement`, { method: 'POST' });
    log('Evaluate engagement', true, evalResult.advanced ? `advanced to ${evalResult.to}` : 'no advance (expected)');
  } catch (err: any) {
    log('Engagement tracking', false, err.message);
  }

  // ── Step 11: Trends ──────────────────────────────────────────────
  try {
    const trends = await apiCall(`/internal/agents/${agentId}/trends`);
    log('Get trends', true, `data points: ${trends.history?.length || 0}, delta: ${trends.delta}`);
  } catch (err: any) {
    log('Get trends', false, err.message);
  }

  // ── Step 12: Portal Token ─────────────────────────────────────────
  try {
    const tokenRes = await apiCall(`/internal/agents/${agentId}/portal-token`, {
      method: 'POST',
      body: JSON.stringify({ expiresInDays: 30 }),
    });
    log('Generate portal token', true, `url=${tokenRes.url}`);

    // Access portal
    const portalData = await fetch(`${API_BASE}/portal/${tokenRes.token}/readiness`, {
      headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
    }).then(r => r.json());
    log('Access portal', !!portalData.data, `score=${portalData.data?.score?.overallScore}`);
  } catch (err: any) {
    log('Portal access', false, err.message);
  }

  // ── Step 13: Report Card HTML ─────────────────────────────────────
  try {
    const res = await fetch(`${API_BASE}/agents/${agentId}/report-card/pdf`, {
      headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
    });
    const html = await res.text();
    log('Generate report card', html.length > 1000, `size=${html.length} bytes`);
  } catch (err: any) {
    log('Generate report card', false, err.message);
  }

  // ── Summary ───────────────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n=== Results: ${passed}/${results.length} passed, ${failed} failed ===`);

  if (failed > 0) {
    console.log('\nFailed steps:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ✗ ${r.step}: ${r.detail}`));
    process.exit(1);
  } else {
    console.log('\n✓ Full cycle verified');
    process.exit(0);
  }
}

runE2ETest().catch(err => {
  console.error('E2E test crashed:', err);
  process.exit(1);
});
