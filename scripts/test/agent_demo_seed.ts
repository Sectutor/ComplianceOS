/**
 * DEMO SEED SCRIPT — Populate realistic test data for Phase 8
 * 
 * Run with: npx tsx scripts/test/agent_demo_seed.ts
 * 
 * Creates:
 * - 1 demo client
 * - 3 agents with varied security postures
 * - Evidence items with realistic content
 * - Red team test results
 * - Policy cards
 * - Score history
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

const API_BASE = process.env.API_BASE || 'http://localhost:3002/api/v1/agent-compliance';
const COMPLIANCE_API_KEY = process.env.COMPLIANCE_API_KEY || '';

async function apiCall(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 
      'Content-Type': 'application/json', 
      ...(COMPLIANCE_API_KEY ? { 'X-API-Key': COMPLIANCE_API_KEY } : {}),
      ...options.headers 
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `API ${res.status}`);
  return json.data;
}

async function seedDemo() {
  console.log('\n=== Demo Data Seed ===\n');

  const clientId = parseInt(process.env.CLIENT_ID || '1', 10); // Configurable client ID

  // ── Agent 1: Well-secured Hermes agent ──
  console.log('Creating Agent 1: Hermes Research Agent (well-secured)...');
  const agent1 = await apiCall('/agents', {
    method: 'POST',
    body: JSON.stringify({
      clientId,
      name: 'Hermes Research Agent',
      description: 'AI research assistant for internal team',
      type: 'hermes',
      hosting: 'docker_local',
      sandbox: 'docker',
      approvalMode: 'manual',
      memoryEncryption: true,
      networkIsolation: true,
      owner: 'Emmanuel',
    }),
  });
  console.log(`  Created: id=${agent1.id}`);

  // Add tools
  const tools1 = ['web_search', 'file_read', 'terminal', 'browser'];
  for (const tool of tools1) {
    await apiCall(`/agents/${agent1.id}/tools`, {
      method: 'POST',
      body: JSON.stringify({ name: tool, category: 'api', requiresApproval: tool === 'terminal' }),
    });
  }

  // Create policy
  await apiCall(`/agents/${agent1.id}/policy-cards`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Hermes Research Governance',
      aiActRiskLevel: 'limited',
      intendedUses: ['research', 'summarization'],
      geography: ['EU', 'EEA'],
      status: 'active',
    }),
  });

  // Auto-map
  await apiCall(`/agents/${agent1.id}/auto-map`, { method: 'POST' });

  // Upload evidence for LLM01
  const ev1 = await apiCall(`/agents/${agent1.id}/evidence/upload`, {
    method: 'POST',
    body: JSON.stringify({
      evidenceType: 'redteam_report',
      title: 'Prompt Injection Resistance Test',
      description: '50 adversarial prompts tested via PyRIT. 0 successful injections.',
      content: 'Test Date: 2026-01-10\nPrompts: 50\nSuccessful Injections: 0\nBlocked by: Input validation + content safety filter',
      framework: 'OWASP_LLM',
      controlId: 'LLM01',
      mimeType: 'text/plain',
    }),
  });
  await apiCall(`/evidence/${ev1.id}/link`, {
    method: 'POST',
    body: JSON.stringify({ links: [{ agentId: agent1.id, framework: 'OWASP_LLM', controlId: 'LLM01', contributionType: 'proof' }] }),
  });

  // Upload evidence for LLM06
  const ev2 = await apiCall(`/agents/${agent1.id}/evidence/upload`, {
    method: 'POST',
    body: JSON.stringify({
      evidenceType: 'config_audit',
      title: 'Memory Encryption Verification',
      description: 'Verified memory encryption enabled in production config',
      content: 'security:\n  memory_encryption: true\n  enable_defense_in_depth: true',
      framework: 'OWASP_LLM',
      controlId: 'LLM06',
      mimeType: 'text/plain',
    }),
  });
  await apiCall(`/evidence/${ev2.id}/link`, {
    method: 'POST',
    body: JSON.stringify({ links: [{ agentId: agent1.id, framework: 'OWASP_LLM', controlId: 'LLM06', contributionType: 'config' }] }),
  });

  // Red team test
  await apiCall(`/agents/${agent1.id}/redteam`, {
    method: 'POST',
    body: JSON.stringify({
      testName: 'Prompt Injection Suite',
      testCategory: 'prompt_injection',
      severity: 'high',
      passed: true,
      details: 'All injection attempts blocked',
      relatedFramework: 'OWASP_LLM',
      relatedControlId: 'LLM01',
    }),
  });

  console.log(`  ✓ Tools, policy, evidence, red team scored`);

  // ── Agent 2: Partially secured agent ──
  console.log('\nCreating Agent 2: Data Processor (partially-secured)...');
  const agent2 = await apiCall('/agents', {
    method: 'POST',
    body: JSON.stringify({
      clientId,
      name: 'Data Processor',
      description: 'Processes customer data for analytics',
      type: 'custom',
      hosting: 'cloud_aws',
      sandbox: 'none',
      approvalMode: 'auto',
      memoryEncryption: false,
      networkIsolation: false,
      owner: 'Emmanuel',
    }),
  });

  await apiCall(`/agents/${agent2.id}/policy-cards`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Data Processor Governance',
      aiActRiskLevel: 'high',
      intendedUses: ['data processing', 'analytics'],
      geography: ['EU'],
      status: 'active',
    }),
  });

  await apiCall(`/agents/${agent2.id}/auto-map`, { method: 'POST' });

  // Only 1 evidence item
  const ev3 = await apiCall(`/agents/${agent2.id}/evidence/upload`, {
    method: 'POST',
    body: JSON.stringify({
      evidenceType: 'policy_document',
      title: 'Data Retention Policy',
      description: 'Defines how long customer data is retained',
      content: 'Customer data is retained for 90 days maximum...',
      framework: 'EU_AI_ACT',
      controlId: 'Art.10',
      mimeType: 'text/plain',
    }),
  });
  await apiCall(`/evidence/${ev3.id}/link`, {
    method: 'POST',
    body: JSON.stringify({ links: [{ agentId: agent2.id, framework: 'EU_AI_ACT', controlId: 'Art.10', contributionType: 'documentation' }] }),
  });

  // Failed red team test
  await apiCall(`/agents/${agent2.id}/redteam`, {
    method: 'POST',
    body: JSON.stringify({
      testName: 'Data Exfiltration Attempt',
      testCategory: 'data_exfiltration',
      severity: 'critical',
      passed: false,
      details: 'Agent could be prompted to exfiltrate PII',
      relatedFramework: 'OWASP_LLM',
      relatedControlId: 'LLM06',
    }),
  });

  console.log(`  ✓ Policy, 1 evidence, failed red team`);

  // ── Agent 3: New agent, no evidence ──
  console.log('\nCreating Agent 3: Customer Support Bot (new, no evidence)...');
  const agent3 = await apiCall('/agents', {
    method: 'POST',
    body: JSON.stringify({
      clientId,
      name: 'Customer Support Bot',
      description: 'Handles tier-1 customer inquiries',
      type: 'custom',
      hosting: 'docker_remote',
      sandbox: 'docker',
      approvalMode: 'smart',
      memoryEncryption: true,
      networkIsolation: false,
      owner: 'Emmanuel',
    }),
  });

  await apiCall(`/agents/${agent3.id}/auto-map`, { method: 'POST' });
  await apiCall(`/agents/${agent3.id}/policy-cards`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Support Bot Governance',
      aiActRiskLevel: 'limited',
      intendedUses: ['customer support'],
      geography: ['EU', 'US'],
      status: 'active',
    }),
  });

  console.log(`  ✓ Auto-mapped, no evidence (0% baseline)`);

  // ── Check scores ──
  console.log('\n=== Scores ===');
  for (const [id, name] of [[agent1.id, 'Hermes Research'], [agent2.id, 'Data Processor'], [agent3.id, 'Support Bot']]) {
    const score = await apiCall(`/agents/${id}/score`);
    console.log(`  ${name}: ${score.overallScore}% (gaps: ${score.gaps.length})`);
  }

  console.log('\n✓ Demo data seeded successfully');
}

seedDemo().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
