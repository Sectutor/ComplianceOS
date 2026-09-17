import { Router, Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { getDb } from '../../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  agentProfiles,
  agentFrameworkMappings,
  agentRedteamResults,
  agentEvidence,
  agentScoreHistory,
  agentEngagements,
  agentPolicyCards,
} from '../../schema_agent_compliance';
import { computeScore } from '../../lib/agent/scoring';

export function createAgentPdfRouter() {
  const router = Router();

  router.get('/agents/:id/report-card.pdf', async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) return res.status(400).json({ error: 'Invalid agent id', code: 'BAD_REQUEST' });

      const db = await getDb();
      const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.id, agentId)).limit(1);
      if (!profile) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });

      const mappings = await db.select().from(agentFrameworkMappings).where(eq(agentFrameworkMappings.agentId, agentId));
      const evidenceList = await db.select().from(agentEvidence).where(eq(agentEvidence.agentId, agentId));
      const redteamList = await db.select().from(agentRedteamResults).where(eq(agentRedteamResults.agentId, agentId));
      const policyCards = await db.select().from(agentPolicyCards).where(eq(agentPolicyCards.agentId, agentId));
      const history = await db.select().from(agentScoreHistory)
        .where(eq(agentScoreHistory.agentId, agentId))
        .orderBy(desc(agentScoreHistory.createdAt))
        .limit(30);

      const redteamPass = redteamList.filter(r => r.passed).length;
      const redteamFail = redteamList.filter(r => !r.passed).length;

      const score = computeScore({
        agentId,
        mappings: mappings.map(m => ({
          framework: m.framework, controlId: m.controlId, autoMapped: m.autoMapped,
          confidence: m.confidence, evidenceCount: m.evidenceCount,
          lastEvidenceAt: m.lastEvidenceAt, lastRedteamAt: m.lastRedteamAt, redteamPassed: m.redteamPassed,
        })),
        evidenceTotal: evidenceList.length,
        redteamPass,
        redteamFail,
        profile: { sandbox: profile.sandbox, approvalMode: profile.approvalMode, memoryEncryption: profile.memoryEncryption, networkIsolation: profile.networkIsolation },
      });

      const html = generatePdfHtml(profile, score, mappings, evidenceList, redteamList, policyCards, history);

      // Generate PDF with Puppeteer
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="agent-compliance-${profile.name?.replace(/\s+/g, '-').toLowerCase() || 'report'}.pdf"`);
      res.send(pdf);
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}

function generatePdfHtml(profile: any, score: any, mappings: any[], evidence: any[], redteam: any[], policyCards: any[], history: any[]) {
  const esc = (s: any) => (s != null ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
  const scoreColor = (s: number) => s >= 80 ? '#16a34a' : s >= 50 ? '#ca8a04' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Agent Compliance Report - ${esc(profile.name)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; font-size: 12px; }
  .page-break { page-break-before: always; }

  /* Cover */
  .cover { display: flex; flex-direction: column; justify-content: space-between; height: 100vh; padding: 40px 0; }
  .cover h1 { font-size: 36px; color: #111827; margin-bottom: 10px; }
  .cover .meta { font-size: 14px; color: #6b7280; }
  .cover .score-box { align-self: center; text-align: center; padding: 40px; border: 3px solid ${scoreColor(score.overallScore)}; border-radius: 50%; }
  .cover .score-box .score { font-size: 72px; font-weight: 700; color: ${scoreColor(score.overallScore)}; }
  .cover .score-box .label { font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; }
  .cover .footer { text-align: center; font-size: 10px; color: #9ca3af; }

  /* Section */
  .section { margin-bottom: 30px; }
  .section h2 { font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
  .section h3 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #4b5563; }

  /* Grid */
  .grid { display: grid; gap: 12px; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .stat { text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; }
  .stat .value { font-size: 24px; font-weight: 700; color: #111827; }
  .stat .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Bar */
  .bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 4px; }
  .bar-fill { height: 100%; border-radius: 4px; }

  /* Narrative */
  .narrative { font-size: 12px; line-height: 1.8; color: #4b5563; background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; }
  .narrative strong { color: #111827; }

  /* Signature */
  .signature-line { border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 40px; }
</style>
</head>
<body>
  <!-- COVER -->
  <div class="cover">
    <div>
      <h1>${esc(profile.name)}</h1>
      <p class="meta">Agent Compliance Report Card • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="meta" style="margin-top: 8px;">${esc(profile.description || 'No description provided')}</p>
    </div>
    <div class="score-box">
      <div class="score">${score.overallScore}%</div>
      <div class="label">Overall Score</div>
    </div>
    <div class="footer">
      <p>Generated by GRCompliance • Agent Compliance Engine</p>
      <p>Agent ID: ${profile.id} • Type: ${esc(profile.type)} • Version: ${esc(profile.version || '1.0')}</p>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="section page-break">
    <h2>Executive Summary</h2>
    <div class="narrative">
      <p style="margin-bottom: 12px;">
        This report covers the compliance posture of <strong>${esc(profile.name)}</strong> across
        <strong>${Object.keys(score.frameworkScores).length} frameworks</strong> and
        <strong>${mappings.length} controls</strong>.
      </p>
      <p style="margin-bottom: 12px;">
        The agent achieved an overall score of <strong>${score.overallScore}%</strong>
        ${score.gaps.length === 0
          ? 'with all controls meeting the confidence threshold — no gaps detected.'
          : `with <strong>${score.gaps.length} gap(s)</strong> requiring remediation.`}
      </p>
      <p>
        ${redteamList.length > 0
          ? `${redteamPass} of ${redteamPass + redteamFail} red team tests passed.`
          : 'No red team tests have been recorded yet.'}
        ${evidence.length > 0
          ? ` ${evidence.length} evidence item(s) are attached.`
          : ' No evidence has been uploaded yet.'}
      </p>
    </div>
  </div>

  <!-- FRAMEWORK SCOVERAGE -->
  <div class="section">
    <h2>Framework Coverage</h2>
    <div class="grid grid-4">
      ${Object.entries(score.frameworkScores).map(([fw, d]: [string, any]) => `
        <div class="stat">
          <div class="value" style="color: ${scoreColor(d.score)}">${d.score}%</div>
          <div class="label">${fw.replace(/_/g, ' ')}</div>
          <div class="bar"><div class="bar-fill" style="width: ${d.score}%; background: ${scoreColor(d.score)}"></div></div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${d.covered}/${d.total} controls</div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- OWASP LLM TOP 10 -->
  <div class="section">
    <h2>OWASP LLM Top 10</h2>
    <table>
      <thead><tr><th>Control</th><th>Confidence</th><th>Source</th><th>Status</th><th>Explanation</th></tr></thead>
      <tbody>
        ${score.perControl.filter((p: any) => p.framework === 'OWASP_LLM').map((p: any) => `
          <tr>
            <td><strong>${esc(p.controlId)}</strong></td>
            <td style="font-weight: 700; color: ${scoreColor(p.confidence)}">${p.confidence}%</td>
            <td><span class="badge badge-blue">${p.source}</span></td>
            <td><span class="badge ${p.confidence >= 70 ? 'badge-green' : p.confidence >= 40 ? 'badge-yellow' : 'badge-red'}">${p.confidence >= 70 ? 'PASS' : p.confidence >= 40 ? 'PARTIAL' : 'FAIL'}</span></td>
            <td>${esc(p.explanation)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- GAP ANALYSIS -->
  <div class="section page-break">
    <h2>Gap Analysis</h2>
    ${score.gaps.length === 0
      ? '<p style="color: #6b7280; font-style: italic;">No gaps detected. All controls meet the 70% confidence threshold.</p>'
      : `<table>
          <thead><tr><th>Framework</th><th>Control</th><th>Confidence</th><th>Priority</th><th>Remediation</th></tr></thead>
          <tbody>
            ${score.gaps.sort((a: any, b: any) => a.confidence - b.confidence).map((g: any) => `
              <tr>
                <td><span class="badge badge-blue">${esc(g.framework).replace(/_/g, ' ')}</span></td>
                <td><strong>${esc(g.controlId)}</strong></td>
                <td style="color: ${scoreColor(g.confidence)}">${g.confidence}%</td>
                <td><span class="badge ${g.confidence < 30 ? 'badge-red' : g.confidence < 50 ? 'badge-yellow' : 'badge-green'}">${g.confidence < 30 ? 'CRITICAL' : g.confidence < 50 ? 'MEDIUM' : 'LOW'}</span></td>
                <td>Upload evidence or pass red team test to raise confidence.</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
    }
  </div>

  <!-- POLICY CARD -->
  ${policyCards.length > 0 ? `
  <div class="section">
    <h2>AI Policy Card</h2>
    <div class="grid grid-2">
      ${policyCards.map((c: any) => `
        <div class="stat">
          <div class="value" style="font-size: 14px;">${esc(c.name)}</div>
          <div class="label">${esc(c.aiActRiskLevel)} Risk • ${esc(c.status)}</div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">
            <strong>Uses:</strong> ${(c.intendedUses || []).join(', ') || 'None'}<br>
            <strong>Geography:</strong> ${(c.geography || []).join(', ') || 'Not restricted'}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- EVIDENCE & RED TEAM -->
  <div class="section">
    <h2>Evidence & Testing</h2>
    <h3>Evidence (${evidence.length})</h3>
    ${evidence.length === 0
      ? '<p style="color: #6b7280; font-style: italic;">No evidence uploaded.</p>'
      : `<table>
          <thead><tr><th>Title</th><th>Type</th><th>Framework:Control</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${evidence.map((e: any) => `
              <tr>
                <td>${esc(e.title)}</td>
                <td><span class="badge badge-gray">${esc(e.evidenceType)}</span></td>
                <td>${esc(e.framework || '-')}${e.controlId ? ':' + esc(e.controlId) : ''}</td>
                <td><span class="badge badge-green">${esc(e.status)}</span></td>
                <td>${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
    }

    <h3>Red Team Tests (${redteam.length})</h3>
    ${redteam.length === 0
      ? '<p style="color: #6b7280; font-style: italic;">No red team tests recorded.</p>'
      : `<table>
          <thead><tr><th>Test</th><th>Category</th><th>Severity</th><th>Result</th><th>Date</th></tr></thead>
          <tbody>
            ${redteam.map((r: any) => `
              <tr>
                <td>${esc(r.testName)}</td>
                <td><span class="badge badge-blue">${esc(r.testCategory)}</span></td>
                <td><span class="badge ${r.severity === 'critical' ? 'badge-red' : r.severity === 'high' ? 'badge-yellow' : 'badge-gray'}">${esc(r.severity)}</span></td>
                <td><span class="badge ${r.passed ? 'badge-green' : 'badge-red'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
                <td>${r.testedAt ? new Date(r.testedAt).toLocaleDateString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
    }
  </div>

  <!-- SCORE TREND -->
  <div class="section page-break">
    <h2>Score History</h2>
    ${history.length === 0
      ? '<p style="color: #6b7280; font-style: italic;">No score history available yet.</p>'
      : `<div style="display: flex; gap: 2px; align-items: flex-end; height: 100px; margin: 16px 0;">
          ${history.slice(-10).map((h: any) => `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
              <div style="width: 100%; height: ${h.overall_score}px; background: ${scoreColor(h.overall_score)}; border-radius: 4px 4px 0 0;" title="${h.overall_score}%"></div>
              <div style="font-size: 8px; color: #9ca3af; margin-top: 4px;">${new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          `).join('')}
        </div>
        <p style="font-size: 10px; color: #6b7280;">Latest: ${history[0]?.overall_score || 0}% • Trend: ${history.length > 1 ? (history[0]?.overall_score > history[history.length - 1]?.overall_score ? '↑ Improving' : history[0]?.overall_score < history[history.length - 1]?.overall_score ? '↓ Declining' : '→ Stable') : 'N/A'}</p>`
    }
  </div>

  <!-- ASSURANCE MAPPING -->
  <div class="section">
    <h2>Assurance Mapping Summary</h2>
    <table>
      <thead><tr><th>Framework</th><th>Total Controls</th><th>Mapped</th><th>Verified</th><th>Failed</th><th>Waived</th><th>Coverage</th></tr></thead>
      <tbody>
        ${Object.entries(score.frameworkScores).map(([fw, d]: [string, any]) => {
          const fwMappings = mappings.filter(m => m.framework === fw);
          const verified = fwMappings.filter(m => m.status === 'verified').length;
          const failed = fwMappings.filter(m => m.status === 'failed').length;
          const waived = fwMappings.filter(m => m.status === 'waived').length;
          return `
            <tr>
              <td><strong>${fw.replace(/_/g, ' ')}</strong></td>
              <td>${d.total}</td>
              <td>${d.total - verified - failed - waived}</td>
              <td>${verified}</td>
              <td>${failed}</td>
              <td>${waived}</td>
              <td style="font-weight: 700; color: ${scoreColor(d.score)}">${d.score}%</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- SIGN-OFF -->
  <div class="section page-break">
    <h2>Sign-Off</h2>
    <p style="font-size: 12px; color: #4b5563; margin-bottom: 24px;">
      This report was generated automatically by the GRCompliance Agent Compliance Engine.
      The scores reflect the evidence and test results on file as of ${new Date().toLocaleDateString()}.
      Next scheduled review: ${profile.nextAuditDate ? new Date(profile.nextAuditDate).toLocaleDateString() : 'Not scheduled'}.
    </p>
    <div class="grid grid-2">
      <div class="signature-line">
        <p style="font-size: 10px; color: #9ca3af;">Prepared by</p>
        <p style="font-size: 12px;">GRCompliance Agent Compliance Engine</p>
      </div>
      <div class="signature-line">
        <p style="font-size: 10px; color: #9ca3af;">Reviewed by</p>
        <p style="font-size: 12px;">${esc(profile.owner || 'Not assigned')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
