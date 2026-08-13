const https = require('https');

const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY || 'api-2A18E593715A4BA082E2D07DB76B4EC3';
const FROM_EMAIL = process.env.FROM_EMAIL || 'ComplianceOS <reports@grcompliance.com>';
const SITE_URL = process.env.URL || 'https://assess.grcompliance.com';

function generateReportHtml(agentName, score, gapsCount, geo) {
  const scoreColor = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'Compliant' : score >= 50 ? 'Moderate Risk' : 'High Risk';

  const docUrl = `${SITE_URL}/generate-doc?agent_name=${encodeURIComponent(agentName)}&score=${score}&gaps=${gapsCount}&geo=${encodeURIComponent(geo)}`;

  return `<!-- Preheader (visible in inbox preview) -->
<div style="display:none;font-size:1px;color:#f8f9fa;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
Your ${agentName}: ${score}% Score, ${gapsCount} gaps identified. Download your compliance report.
</div>

<!-- Main Table Layout -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f9fc;padding:0;">
<tr>
  <td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;-webkit-box-shadow:0 2px 12px rgba(0,0,0,0.08);box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="padding:36px 40px 28px;background:#1e40af;text-align:center;">
          <h1 style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;color:#ffffff;letter-spacing:-0.5px;line-height:1.3;">AI Agent Compliance Assessment</h1>
          <h2 style="margin:8px 0 0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(255,255,255,0.85);font-weight:400;line-height:1.4;">${agentName} • ${geo}</h2>
        </td>
      </tr>

      <!-- Score Section -->
      <tr>
        <td style="padding:40px 40px 24px;text-align:center;">
          <!-- Score Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding:0;">
                <!-- Score Card -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="background:#f8fafc;border-radius:12px;padding:32px 48px;">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:48px;font-weight:900;color:${scoreColor};line-height:1;">${score}%</div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${scoreColor};margin-top:8px;letter-spacing:1px;">${scoreLabel.toUpperCase()}</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;line-height:1.4;">${gapsCount} gap${gapsCount !== 1 ? 's' : ''} requiring remediation</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding:0 40px;">
          <div style="height:1px;background:#e2e8f0;"></div>
        </td>
      </tr>

      <!-- CTA Section -->
      <tr>
        <td style="padding:32px 40px 40px;text-align:center;">
          <!-- Primary CTA: Download -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;">
            <tr>
              <td align="center" style="background:#2563eb;border-radius:8px;">
                <a href="${docUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">📝 Download Editable Report (.doc)</a>
              </td>
            </tr>
          </table>
          
          <p style="margin:24px 0 8px;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#334155;font-weight:700;line-height:1.4;">Ready for continuous compliance?</p>
          <p style="margin:0 0 16px;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748b;line-height:1.5;">Deploy GRCompliance on your infrastructure.</p>
          
          <!-- Secondary CTA: Try GRCompliance -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td align="center" style="background:#ffffff;border:2px solid #2563eb;border-radius:8px;">
                <a href="https://grcompliance.com" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#2563eb;text-decoration:none;border-radius:8px;">Try GRCompliance</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 40px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center;">
          <p style="margin:0 0 4px;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#334155;font-weight:700;line-height:1.4;">ComplianceOS Advisory</p>
          <p style="margin:0 0 8px;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:1.4;">AI Agent &amp; LLM Compliance Assessments</p>
          <p style="margin:0;padding:0;">
            <a href="https://grcompliance.com" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#2563eb;text-decoration:none;">grcompliance.com</a>
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#cbd5e1;"> &middot; </span>
            <a href="mailto:reports@grcompliance.com" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#2563eb;text-decoration:none;">Reply for support</a>
          </p>
        </td>
      </tr>

    </table>
  </td>
</tr>
</table>`;
}

function generateDocHtml(agentName, score, gapsCount, geo) {
  const scoreColor = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'Compliant' : score >= 50 ? 'Moderate Risk' : 'High Risk';
  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>ComplianceOS Report — ${agentName}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
body { font-family:Calibri,'Segoe UI',Arial,sans-serif; max-width:720px; margin:0 auto; padding:40px; color:#1e293b; line-height:1.5; }
h1 { font-size:24pt; color:#0f172a; margin:0 0 8px; }
h2 { font-size:16pt; color:#0f172a; margin:24px 0 12px; padding-bottom:8px; border-bottom:2px solid #e2e8f0; }
.meta { color:#64748b; font-size:11pt; margin-bottom:24px; }
.score-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:24px; text-align:center; margin-bottom:24px; }
.score-num { font-size:42pt; font-weight:900; color:${scoreColor}; }
.score-label { font-size:14pt; color:${scoreColor}; font-weight:600; }
.gap-count { color:#64748b; font-size:12pt; }
table { width:100%; border-collapse:collapse; margin:16px 0; }
th { background:#0f172a; color:#fff; padding:10px; text-align:left; font-size:10pt; }
td { padding:10px; border-bottom:1px solid #e2e8f0; font-size:10pt; }
.footer { margin-top:32px; padding:16px; background:#f1f5f9; border-radius:8px; font-size:10pt; color:#64748b; text-align:center; }
</style>
</head>
<body>
<h1>AI Agent Compliance Assessment Report</h1>
<p class="meta">${agentName} &mdash; ${geo} &mdash; Generated ${reportDate}</p>

<div class="score-box">
  <div class="score-num">${score}%</div>
  <div class="score-label">${scoreLabel}</div>
  <div class="gap-count">${gapsCount} gap${gapsCount !== 1 ? 's' : ''} identified</div>
</div>

<h2>Executive Summary</h2>
<p>This report provides a comprehensive compliance assessment for <strong>${agentName}</strong> against EU AI Act, NIST AI RMF, and OWASP Top 10 for LLM Applications. The assessment identified ${gapsCount} compliance gap${gapsCount !== 1 ? 's' : ''} requiring remediation.</p>

<h2>Compliance Framework Scores</h2>
<table>
<tr><th>Framework</th><th>Status</th></tr>
<tr><td>EU AI Act</td><td>${score >= 80 ? 'Compliant' : score >= 50 ? 'Partial' : 'Non-Compliant'}</td></tr>
<tr><td>NIST AI RMF</td><td>${score >= 80 ? 'Compliant' : score >= 50 ? 'Partial' : 'Non-Compliant'}</td></tr>
<tr><td>OWASP Top 10 LLM</td><td>${score >= 80 ? 'Compliant' : score >= 50 ? 'Partial' : 'Non-Compliant'}</td></tr>
</table>

<h2>Next Steps</h2>
<ol>
<li>Review identified gaps in the full assessment</li>
<li>Deploy the hardened configuration to improve your score</li>
<li>Run the audit checklist with your security team</li>
<li>Deploy GRCompliance for continuous monitoring</li>
</ol>

<div class="footer">
ComplianceOS Advisory &mdash; AI Agent &amp; LLM Compliance Assessments<br>
<a href="https://grcompliance.com">grcompliance.com</a>
</div>
</body></html>`;
}

function sendEmail(toEmail, subject, textBody, htmlBody) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      api_key: SMTP2GO_API_KEY,
      to: [toEmail],
      sender: FROM_EMAIL,
      subject: subject,
      text_body: textBody,
      html_body: htmlBody,
    });

    const req = https.request({
      hostname: 'api.smtp2go.com',
      port: 443,
      path: '/v3/email/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result?.data?.succeeded > 0) {
            resolve(result);
          } else {
            reject(new Error(JSON.stringify(result)));
          }
        } catch (e) {
          reject(new Error('Invalid response from SMTP2GO'));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── EMAIL SEND ENDPOINT ───
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // ─── GENERATE .DOC DOWNLOAD ───
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const { agent_name = 'AI Agent', score = 0, gaps = 0, geo = 'European Union' } = params;
    const docHtml = generateDocHtml(agent_name, Number(score), Number(gaps), geo);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-word;charset=utf-8',
        'Content-Disposition': `attachment; filename="ComplianceOS_Report_${agent_name.replace(/\s+/g, '_')}.doc"`,
        'Cache-Control': 'no-cache',
      },
      body: docHtml,
      isBase64Encoded: false,
    };
  }

  // ─── SEND EMAIL ───
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const { email, score = 0, gaps = 0, agent_name = 'AI Agent', geo = 'European Union' } = body;

  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Valid email required' }) };
  }

  const subject = `ComplianceOS Report — ${agent_name}: ${score}% Score, ${gaps} Gaps Identified`;
  const docUrl = `${SITE_URL}/generate-doc?agent_name=${encodeURIComponent(agent_name)}&score=${score}&gaps=${gaps}&geo=${encodeURIComponent(geo)}`;
  const reportHtml = generateReportHtml(agent_name, score, gaps, geo);

  const textBody = `Hi there,

Your AI Agent Compliance Assessment for ${agent_name} (${geo}) is complete.

Score: ${score}% | Gaps: ${gaps}

DOWNLOAD YOUR FULL ASSESSMENT REPORT:
  ${docUrl}

READY FOR CONTINUOUS COMPLIANCE?
Deploy GRCompliance on your infrastructure:
  https://grcompliance.com

Need help? Reply to this email.

ComplianceOS Advisory
AI Agent & LLM Compliance Assessments`;

  try {
    await sendEmail(email, subject, textBody, reportHtml);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true, message: `Report sent to ${email}` }),
    };
  } catch (err) {
    console.error('SMTP2GO error:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: false, error: 'Email service temporarily unavailable' }),
    };
  }
};
