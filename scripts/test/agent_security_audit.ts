/**
 * SECURITY AUDIT SCRIPT — Verify multi-tenancy isolation
 * Phase 8: ensures no agent data leaks between clients
 * 
 * Run with: npx tsx scripts/test/agent_security_audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditFinding {
  file: string;
  line: number;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const findings: AuditFinding[] = [];

function auditFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  // Look for queries that might not filter by clientId
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for direct agent ID queries without clientId verification
    if (line.includes('agent_id') && line.includes('WHERE') && !line.includes('client_id') && !line.includes('clientId')) {
      findings.push({
        file: fileName,
        line: lineNum,
        issue: 'Query filters by agent_id without clientId verification',
        severity: 'high',
      });
    }

    // Check for missing authorization middleware
    if (line.includes('router.get') && line.includes('/agents/:id') && !line.includes('apiKeyMiddleware') && !line.includes('protectedProcedure')) {
      findings.push({
        file: fileName,
        line: lineNum,
        issue: 'Route may be missing auth middleware',
        severity: 'medium',
      });
    }

    // Check for SQL injection risk (raw string interpolation in SQL)
    if (line.includes('sql`') && line.includes('${') && !line.includes('sql.identifier')) {
      findings.push({
        file: fileName,
        line: lineNum,
        issue: 'Potential SQL interpolation risk (verify safe usage)',
        severity: 'medium',
      });
    }
  }
}

function runAudit() {
  console.log('\n=== Security Audit ===\n');

  const routerDir = path.join(process.cwd(), 'packages/core/src/server/routers');
  const agentFiles = fs.readdirSync(routerDir)
    .filter(f => f.startsWith('agent'))
    .map(f => path.join(routerDir, f));

  for (const file of agentFiles) {
    auditFile(file);
  }

  // Print findings
  const critical = findings.filter(f => f.severity === 'critical');
  const high = findings.filter(f => f.severity === 'high');
  const medium = findings.find(f => f.severity === 'medium');

  if (findings.length === 0) {
    console.log('✓ No issues found');
  } else {
    if (critical.length > 0) {
      console.log(`\n✗ CRITICAL (${critical.length})`);
      critical.forEach(f => console.log(`  ${f.file}:${f.line} — ${f.issue}`));
    }
    if (high.length > 0) {
      console.log(`\n⚠ HIGH (${high.length})`);
      high.forEach(f => console.log(`  ${f.file}:${f.line} — ${f.issue}`));
    }
    if (medium.length > 0) {
      console.log(`\nℹ MEDIUM (${medium.length})`);
      medium.forEach(f => console.log(`  ${f.file}:${f.line} — ${f.issue}`));
    }
  }

  // Summary checks
  console.log('\n=== Manual Checks Required ===');
  console.log('☐ Agent queries always include clientId filter');
  console.log('☐ Portal tokens are unguessable (random, 32+ chars)');
  console.log('☐ Token expiry is enforced (< 90 days)');
  console.log('☐ No agent data visible across clients');
  console.log('☐ API key required for all internal endpoints');
  console.log('☐ RBAC: viewer < editor < admin');

  console.log(`\n${findings.length === 0 ? '✓' : '⚠'} Automated audit complete`);
}

runAudit();
