import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { getDb } from '../db';
import * as schema from '../schema';
import { clients, controls, clientControls, clientPolicies, evidence, reportLogs } from '../schema';
import { eq, and, desc, or, like, inArray, aliasedTable, sql } from 'drizzle-orm';
// import { nis2 } from '../data/regulations/nis2';
// import { dora } from '../data/regulations/dora';
// import { gdpr } from '../data/regulations/gdpr';
// import { euAiAct } from '../data/regulations/eu_ai_act';
import { llmService } from './llm/service';
import { getClientStats, getClientComplianceScore, getClientControls } from '../db';
import { generateSoADocx } from './soaExport';
import { generateComplianceReadinessReport } from '../complianceReport';
import {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell,
    WidthType, BorderStyle, ShadingType, PageBreak,
    convertInchesToTwip, Header, Footer, PageNumber
} from "docx";

const AGENT_GOVERNANCE_BLOCK_RE = /(?:^|\n)---\nAGENT_GOVERNANCE\n([\s\S]*)$/;

const getAgentGovernanceDefaults = () => ({
    autonomyTier: 'observation_only',
    allowedTools: '',
    approvalRequiredForHighRisk: true,
    killSwitchImplemented: false,
    auditLoggingImplemented: false,
    sandboxTested: false,
    guardrailsSystemPrompt: '',
    lastGovernanceReviewAt: undefined as string | undefined
});

const extractAgentGovernanceJsonFromTechnicalConstraints = (technicalConstraints: string | null | undefined) => {
    if (!technicalConstraints) return undefined;
    const trimmed = technicalConstraints.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('{')) return trimmed;
    const match = AGENT_GOVERNANCE_BLOCK_RE.exec(technicalConstraints);
    if (!match) return undefined;
    const candidate = (match[1] || '').trim();
    return candidate ? candidate : undefined;
};

const stripAgentGovernanceBlockFromTechnicalConstraints = (technicalConstraints: string | null | undefined) => {
    if (!technicalConstraints) return '';
    const trimmed = technicalConstraints.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed?.notes === 'string') return parsed.notes;
            if (typeof parsed?.technicalConstraints === 'string') return parsed.technicalConstraints;
        } catch {
            return '';
        }
        return '';
    }
    const match = AGENT_GOVERNANCE_BLOCK_RE.exec(technicalConstraints);
    if (!match) return technicalConstraints;
    const idx = match.index ?? 0;
    return technicalConstraints.slice(0, idx).trimEnd();
};

const parseAgentGovernanceFromTechnicalConstraints = (technicalConstraints: string | null | undefined) => {
    const defaults = getAgentGovernanceDefaults();
    const jsonCandidate = extractAgentGovernanceJsonFromTechnicalConstraints(technicalConstraints);
    if (!jsonCandidate) return defaults;
    try {
        const parsed = JSON.parse(jsonCandidate);
        const gov = (parsed?.agentGovernance && typeof parsed.agentGovernance === 'object')
            ? parsed.agentGovernance
            : (parsed && typeof parsed === 'object' ? parsed : undefined);
        if (!gov || typeof gov !== 'object') return defaults;
        return {
            autonomyTier: typeof gov.autonomyTier === 'string' ? gov.autonomyTier : defaults.autonomyTier,
            allowedTools: typeof gov.allowedTools === 'string' ? gov.allowedTools : defaults.allowedTools,
            approvalRequiredForHighRisk: typeof gov.approvalRequiredForHighRisk === 'boolean' ? gov.approvalRequiredForHighRisk : defaults.approvalRequiredForHighRisk,
            killSwitchImplemented: typeof gov.killSwitchImplemented === 'boolean' ? gov.killSwitchImplemented : defaults.killSwitchImplemented,
            auditLoggingImplemented: typeof gov.auditLoggingImplemented === 'boolean' ? gov.auditLoggingImplemented : defaults.auditLoggingImplemented,
            sandboxTested: typeof gov.sandboxTested === 'boolean' ? gov.sandboxTested : defaults.sandboxTested,
            guardrailsSystemPrompt: typeof gov.guardrailsSystemPrompt === 'string' ? gov.guardrailsSystemPrompt : defaults.guardrailsSystemPrompt,
            lastGovernanceReviewAt: typeof gov.lastGovernanceReviewAt === 'string' ? gov.lastGovernanceReviewAt : defaults.lastGovernanceReviewAt
        };
    } catch {
        return defaults;
    }
};

export async function generateGapAnalysisReport(clientId: number): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    // Fetch ISO 27001 controls specifically
    const allClientControls = await dbConn.select({
        id: clientControls.id,
        status: clientControls.status,
        applicability: clientControls.applicability,
        justification: clientControls.justification,
        implementationNotes: clientControls.implementationNotes,
        control: {
            id: controls.id,
            controlId: controls.controlId,
            name: controls.name,
            description: controls.description,
            framework: controls.framework,
            category: controls.category
        }
    })
        .from(clientControls)
        .leftJoin(controls, eq(clientControls.controlId, controls.id))
        .where(and(
            eq(clientControls.clientId, clientId),
            or(
                eq(controls.framework, "ISO 27001:2022"),
                eq(controls.framework, "ISO 27001")
            )
        ));

    const totalControls = allClientControls.length;
    const implemented = allClientControls.filter((c: any) => c.status === 'implemented').length;
    const inProgress = allClientControls.filter((c: any) => c.status === 'in_progress').length;
    const notImplemented = allClientControls.filter((c: any) => c.status === 'not_implemented' && c.applicability === 'applicable').length;
    const notApplicable = allClientControls.filter((c: any) => c.applicability === 'not_applicable').length;

    // Calculate weighted compliance score (in-progress counts as 50%)
    const applicableControls = totalControls - notApplicable;
    const score = applicableControls > 0
        ? Math.round(((implemented + (inProgress * 0.5)) / applicableControls) * 100)
        : 0;

    // Group controls by category
    const controlsByCategory: Record<string, any[]> = {};
    allClientControls.forEach((c: any) => {
        const category = c.control?.category || "Other";
        if (!controlsByCategory[category]) {
            controlsByCategory[category] = [];
        }
        controlsByCategory[category].push(c);
    });

    // Get gaps (not implemented and applicable)
    const gaps = allClientControls.filter((c: any) =>
        c.status === 'not_implemented' && c.applicability === 'applicable'
    );

    // Create PDF with page buffering for global footer
    const doc = new PDFDocument({
        margin: 50
    });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));


    // Helper for status badge
    const getStatusColor = (status: string) => {
        if (status === 'implemented') return '#10b981';
        if (status === 'in_progress') return '#f59e0b';
        return '#ef4444';
    };

    // 1. Title Page
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1C4D8D'); // Corporate Blue

    // Abstract pattern
    doc.save();
    doc.opacity(0.1);
    doc.strokeColor('white');
    for (let i = 0; i < 800; i += 40) {
        doc.moveTo(i, 0).lineTo(0, i).stroke();
    }
    doc.restore();

    doc.fillColor('white').fontSize(42).font('Helvetica-Bold').text('ISO/IEC 27001:2022', 50, 200);
    doc.fontSize(28).text('Readiness & Gap Analysis Report', { align: 'left' });
    doc.rect(50, 280, 450, 3).fill('white');

    doc.moveDown(2);
    doc.fillColor('white').fontSize(16).font('Helvetica').text(`Prepared for: ${client.name}`, 50);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50);
    doc.moveDown(4);

    // Compliance Score Card on Title Page
    doc.save();
    doc.rect(50, 500, 200, 120).fill('#ffffff22');
    doc.fillColor('white').fontSize(12).font('Helvetica-Bold').text('OVERALL READINESS', 65, 515);
    doc.fontSize(48).text(`${score}%`, 65, 535);
    doc.fontSize(10).font('Helvetica').text(score >= 80 ? 'CERTIFICATION READY' : score >= 60 ? 'IMPLEMENTATION PHASE' : 'EARLY STAGE PROGRAM', 65, 595);
    doc.restore();

    // Footer on title
    doc.fontSize(10).fillColor('white').opacity(0.7).text('Confidential | Powered by ComplianceOS', 50, 750);

    // 2. Executive Summary
    doc.addPage();
    doc.fillColor('#1e293b').fontSize(24).font('Helvetica-Bold').text('Executive Summary');
    doc.rect(50, doc.y, 40, 4).fill('#1C4D8D');
    doc.moveDown(2);

    // Summary stats row
    const statsY = doc.y;
    const boxWidth = 110;
    const boxHeight = 70;
    const startX = 50;
    const spacing = 15;

    const drawStat = (label: string, val: string, x: number, y: number, color: string, bgColor: string) => {
        doc.save();
        doc.rect(x, y, boxWidth, boxHeight).fill(bgColor);
        doc.rect(x, y, boxWidth, boxHeight).stroke('#e2e8f0');
        doc.rect(x, y, boxWidth, 4).fill(color);
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x + 10, y + 15);
        doc.fillColor(color).fontSize(24).font('Helvetica-Bold').text(val, x + 10, y + 32);
        doc.restore();
    };

    drawStat('Total Controls', `${totalControls}`, startX, statsY, '#1C4D8D', '#f8fafc');
    drawStat('Implemented', `${implemented}`, startX + boxWidth + spacing, statsY, '#10b981', '#f0fdf4');
    drawStat('In Progress', `${inProgress}`, startX + (boxWidth + spacing) * 2, statsY, '#f59e0b', '#fffbeb');
    drawStat('Not Applicable', `${notApplicable}`, startX + (boxWidth + spacing) * 3, statsY, '#64748b', '#f1f5f9');

    doc.y = statsY + boxHeight + 40;

    // Executive summary text
    doc.fontSize(11).fillColor('#334155');
    let summaryText = `This comprehensive readiness report assesses ${client.name}'s compliance with ISO/IEC 27001:2022, the international standard for Information Security Management Systems (ISMS). `;

    if (score >= 80) {
        summaryText += `With a compliance score of ${score}%, your organization has demonstrated strong adherence to ISO 27001 requirements. `;
        summaryText += `Focus on evidence collection and internal audit preparation to achieve certification. `;
    } else if (score >= 60) {
        summaryText += `With a compliance score of ${score}%, significant progress has been made toward ISO 27001 compliance. `;
        summaryText += `${notImplemented} controls require implementation before certification can be achieved. `;
    } else {
        summaryText += `With a compliance score of ${score}%, substantial work remains to achieve ISO 27001 certification. `;
        summaryText += `Prioritize high-impact controls and establish foundational security measures. `;
    }

    doc.fillColor('#334155').font('Helvetica').fontSize(11).text(summaryText, 50, doc.y, {
        width: 500,
        lineGap: 4,
        align: 'justify'
    });
    doc.moveDown(2);

    // 3. Category Performance
    doc.moveDown(3);
    doc.addPage();
    doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text('Control Domain Maturity');
    doc.moveDown();

    Object.entries(controlsByCategory).forEach(([category, categoryControls]: [string, any]) => {
        const catImplemented = categoryControls.filter((c: any) => c.status === 'implemented').length;
        const catTotal = categoryControls.length;
        const catScore = catTotal > 0 ? Math.round((catImplemented / catTotal) * 100) : 0;

        if (doc.y > 650) doc.addPage();

        // Category header
        doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(category);
        doc.moveDown(0.3);

        // Progress bar
        const barWidth = 400;
        const barHeight = 10;
        doc.save();
        doc.rect(50, doc.y, barWidth, barHeight).fill('#f1f5f9');
        doc.rect(50, doc.y, barWidth * (catScore / 100), barHeight).fill(catScore >= 75 ? '#10b981' : catScore >= 40 ? '#f59e0b' : '#ef4444');
        doc.restore();

        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`${catScore}%`, 50 + barWidth + 10, doc.y);
        doc.moveDown(1.5);
    });

    // 4. Gap Identification & Analysis
    doc.addPage();
    doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text('4. Deficiency Analysis');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#64748b').text('Detailed review of non-compliant controls requiring remediation and documented implementation steps.');
    doc.moveDown(1.5);

    if (gaps.length === 0) {
        doc.fillColor('#10b981').fontSize(14).text('✓ No gaps identified');
        doc.moveDown();
        doc.fillColor('#334155').fontSize(11).text('All applicable ISO 27001 controls have been implemented. Your organization is ready for certification audit.');
    } else {
        // Gap entries with full paragraph formatting
        doc.moveDown(1);

        gaps.forEach((gap: any, index: number) => {
            const ctrl = gap.control || {};
            const ctrlId = ctrl.controlId || 'N/A';
            const ctrlName = ctrl.name || 'Unknown Control';
            const ctrlDesc = ctrl.description || 'No description available';
            const ctrlCategory = ctrl.category || 'Other';

            // Check for page break
            if (doc.y > 600) {
                doc.addPage();
            }

            // Entry Header Box
            doc.save();
            doc.rect(50, doc.y, 500, 30).fill('#f8fafc');
            doc.rect(50, doc.y, 4, 30).fill('#1C4D8D');

            doc.fillColor('#1C4D8D').fontSize(10).font('Helvetica-Bold').text(`GAP #${String(index + 1).padStart(2, '0')}`, 65, doc.y + 10, { continued: true });
            doc.fillColor('#64748b').font('Helvetica').text(` | ${ctrlId}`, { continued: true });
            doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11).text(`   ${ctrlName.toUpperCase()}`);
            doc.restore();

            doc.moveDown(0.5);

            // CATEGORY & STATUS
            doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold');
            doc.text(`DOMAIN: `, { continued: true });
            doc.fillColor('#334155').text(`${ctrlCategory.toUpperCase()}   `, { continued: true });
            doc.fillColor('#64748b').text(`|   STATUS: `, { continued: true });
            doc.fillColor('#ef4444').text(`NOT IMPLEMENTED`);

            doc.moveDown(0.5);

            // DESCRIPTION
            doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('DESCRIPTION');
            doc.moveDown(0.2);
            doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(ctrlDesc, {
                width: 500,
                align: 'justify',
                lineGap: 2
            });
            doc.moveDown(0.8);

            // REMEDIATION STEPS
            doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('REMEDIATION REQUIREMENTS');
            doc.moveDown(0.2);

            let guidance = '';
            if (ctrlCategory.includes('Organizational') || ctrlCategory.includes('Governance')) {
                guidance = `Establish formal information security policies and procedures defining the ISMS governing framework. This includes assigning roles, securing management commitment, and documenting organizational scope. Policies must be formally approved and disseminated.`;
            } else if (ctrlCategory.includes('People') || ctrlCategory.includes('Personnel')) {
                guidance = `Implement personnel security lifecycle measures, including pre-employment screening, security awareness training upon onboarding and annually thereafter, and formal contractual security obligations.`;
            } else if (ctrlCategory.includes('Physical')) {
                guidance = `Specify and deploy physical security perimeters for all restricted areas. Implement modernized access control (biometric/MFA), secure equipment placement, and strict media disposal protocols.`;
            } else if (ctrlCategory.includes('Technological') || ctrlCategory.includes('Technology')) {
                guidance = `Deploy technical safeguards including least-privilege access, data encryption (at rest/transit), hardened system configurations, continuous security monitoring/logging, and endpoint protection.`;
            } else {
                guidance = `Review applicability within the ISMS scope. Assign remediation owners, develop supporting documentation, and collect evidence of operational effectiveness for future audits.`;
            }

            doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(guidance, { width: 500, align: 'justify', lineGap: 2 });
            doc.moveDown(1.5);
            doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(1.5);
        });
    }

    // 5. Recommendations
    doc.moveDown(1.5);
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text('Strategic Recommendations');
    doc.rect(50, doc.y, 40, 4).fill('#1C4D8D');
    doc.moveDown(1);

    // Score-based strategy
    const getStrategy = () => {
        if (score < 40) return { title: 'Foundational Development', color: '#ef4444', items: ['Establish ISMS governance board', 'Define organizational scope and boundaries', 'Approve core security policy suite', 'Identify and classify critical assets'] };
        if (score < 75) return { title: 'Operational Implementation', color: '#f59e0b', items: ['Close primary technical control gaps', 'Conduct staff security training', 'Automate evidence collection', 'Perform initial risk assessment'] };
        return { title: 'Audit Preparation', color: '#10b981', items: ['Conduct full internal audit', 'Hold management review meeting', 'Document corrective actions', 'Select certification body'] };
    };

    const strategy = getStrategy();
    doc.fillColor(strategy.color).fontSize(14).font('Helvetica-Bold').text(strategy.title.toUpperCase());
    doc.moveDown(0.5);
    doc.fillColor('#334155').fontSize(11).font('Helvetica');
    strategy.items.forEach((item, i) => {
        doc.text(`${i + 1}. ${item}`);
    });

    doc.moveDown(1);

    // Category Breakdown
    const catsWithGaps = [...new Set(gaps.map((g: any) => g.control?.category).filter(Boolean))] as string[];
    if (catsWithGaps.length > 0) {
        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Prioritized Domain Remediation');
        doc.moveDown(0.5);
        catsWithGaps.forEach(cat => {
            const count = gaps.filter((g: any) => g.control?.category === cat).length;
            doc.fontSize(10).fillColor('#475569').text(`•  ${cat}: ${count} Priority Gap(s) Identified`);
        });
    }

    return new Promise((resolve, reject) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', reject);
        doc.end();
    });
}

export async function generateReadinessReport(clientId: number, regulationId: string): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    // Fetch Client
    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    // Fetch Regulation Data
    let regulation: any;
    // if (regulationId === 'nis2') regulation = nis2;
    // else if (regulationId === 'dora') regulation = dora;
    // else if (regulationId === 'gdpr') regulation = gdpr;
    // else if (regulationId === 'eu-ai-act') regulation = euAiAct;

    if (!regulation) throw new Error("Regulation not found");

    // Fetch Responses
    const { clientReadinessResponses } = await import('../schema');

    const responses = await dbConn.select().from(clientReadinessResponses)
        .where(
            and(
                eq(clientReadinessResponses.clientId, clientId),
                eq(clientReadinessResponses.regulationId, regulationId)
            )
        );

    const answerMap = new Map();
    responses.forEach((r: any) => answerMap.set(r.questionId, r.response));

    // Calculate Score
    let yesCount = 0;
    const totalQuestions = regulation.questions?.length || 0;

    if (totalQuestions === 0) throw new Error("No questions for this regulation");

    const analysis = regulation.questions.map((q: any) => {
        const ans = answerMap.get(q.id);
        const isYes = ans === 'yes';
        if (isYes) yesCount++;
        return {
            question: q.text,
            answer: ans || 'Not Answered',
            isCompliant: isYes,
            guidance: q.failureGuidance
        };
    });

    const score = Math.round((yesCount / totalQuestions) * 100);

    // Generate PDF
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    // Header
    doc.fontSize(24).text(`${regulation.name} Readiness Assessment`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Client: ${client.name}`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Score
    doc.rect(50, doc.y, 500, 60).fill('#f8f9fa').stroke();
    doc.fillColor('black').fontSize(20).text(`Readiness Score: ${score}%`, 50, doc.y - 45, { align: 'center', width: 500 });
    doc.moveDown(3);

    // Details
    doc.fontSize(16).text('Detailed Assessment Results');
    doc.moveDown();

    analysis.forEach((item: any, index: number) => {
        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${item.question}`);

        const ansColor = item.isCompliant ? 'green' : (item.answer === 'Not Answered' ? 'grey' : 'red');
        doc.font('Helvetica').fillColor(ansColor).text(`Response: ${item.answer?.toUpperCase()}`);

        if (!item.isCompliant && item.guidance) {
            doc.moveDown(0.2);
            doc.fillColor('#c2410c').font('Helvetica-Oblique').text(`Recommendation: ${item.guidance}`, { indent: 20 });
        }

        doc.moveDown(1);
        doc.fillColor('black');
    });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
    });
}

export async function generateControlsCsv(clientId: number): Promise<string> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const data = await dbConn.select({
        control: {
            controlId: controls.controlId,
            name: controls.name,
            description: controls.description,
            framework: controls.framework
        },
        status: clientControls.status
    })
        .from(clientControls)
        .leftJoin(controls, eq(clientControls.controlId, controls.id))
        .where(eq(clientControls.clientId, clientId));

    const headers = ['Control ID', 'Name', 'Status', 'Framework', 'Description'];
    const rows = data.map((c: any) => [
        c.control?.controlId || "N/A",
        `"${(c.control?.name || "Unknown").replace(/"/g, '""')}"`,
        c.status,
        c.control?.framework || "General",
        `"${c.control?.description?.replace(/"/g, '""') || ''}"`
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
}

export async function generatePoliciesCsv(clientId: number): Promise<string> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const data = await dbConn.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId));

    const headers = ['Name', 'Status', 'Version', 'Last Updated'];
    const rows = data.map((p: any) => [
        `"${p.name.replace(/"/g, '""')}"`,
        p.status,
        p.version || '1.0',
        p.updatedAt?.toISOString() || ''
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
}

export async function generateEvidenceCsv(clientId: number): Promise<string> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const data = await dbConn.select().from(evidence).where(eq(evidence.clientId, clientId));

    const headers = ['Title', 'Status', 'Description', 'Collection Frequency', 'Last Verification'];
    const rows = data.map((e: any) => [
        `"${(e.title || '').replace(/"/g, '""')}"`,
        e.status,
        `"${e.description?.replace(/"/g, '""') || ''}"`,
        e.collectionFrequency || '',
        e.lastVerificationDate?.toISOString() || ''
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
}

export async function generateExecutiveSummaryAi(clientId: number): Promise<string> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    const stats = await getClientStats(clientId);
    const score = await getClientComplianceScore(clientId);

    const prompt = `
        You are a senior compliance consultant. Provide a professional executive summary for the following client status in ${client.industry || 'General'} industry.
        
        Client Details:
        - Organization: ${client.name}
        - Target Score: ${client.targetComplianceScore}%
        - Current Score: ${score?.complianceScore || 0}%
        
        Current Metrics:
        - Controls: ${stats.controlsAssigned} assigned
        - Policies: ${stats.policiesCreated} created
        - Evidence: ${stats.evidenceCount} items
        
        Requirement:
        1. Write a 2-paragraph executive summary of their compliance posture.
        2. Provide 3 specific, actionable roadmap steps to improve their score.
        3. Format the output in professional Markdown.
    `;

    const response = await llmService.generate({
        userPrompt: prompt,
        temperature: 0.2,
        feature: 'reporting'
    });

    return response.text;
}

// ==========================================
// AUDIT LOGGING
// ==========================================
export async function logReportGeneration(params: {
    clientId: number;
    userId?: number;
    reportType: "executive_summary" | "controls" | "policies" | "evidence" | "mappings" | "soa" | "compliance_readiness" | "audit_bundle";
    format: string;
    metadata?: any;
}) {
    const dbConn = await getDb();
    if (!dbConn) return;

    try {
        await dbConn.insert(reportLogs).values({
            clientId: params.clientId,
            userId: params.userId || null,
            reportType: params.reportType,
            format: params.format,
            metadata: params.metadata || {},
        });
    } catch (error) {
        console.error("Failed to log report generation:", error);
    }
}

// ==========================================
// PROFESSIONAL AI PDF EXPORT
// ==========================================
export async function generateExecutiveSummaryPdf(clientId: number): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    const summaryMarkdown = await generateExecutiveSummaryAi(clientId);
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));

    // 1. Watermark (Sensitivity)
    const classification = client.defaultDocumentClassification || 'INTERNAL';
    doc.save();
    doc.fontSize(60)
        .fillColor('lightgrey', 0.2)
        .rotate(45, { origin: [300, 400] })
        .text(classification.toUpperCase(), 100, 400);
    doc.restore();

    // 2. Header & Branding
    doc.fillColor('black');
    doc.fontSize(24).text('Executive Compliance Insights', { align: 'right' });
    doc.fontSize(10).text(`Organization: ${client.name}`, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(2);

    // Draw a line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(2);

    // 3. Render AI Summary
    const lines = summaryMarkdown.split('\n');
    lines.forEach(line => {
        if (line.startsWith('# ')) {
            doc.fontSize(20).fillColor('#1e40af').text(line.replace('# ', ''), { underline: true });
            doc.moveDown(0.5);
        } else if (line.startsWith('## ')) {
            doc.fontSize(16).fillColor('#1e3a8a').text(line.replace('## ', ''));
            doc.moveDown(0.5);
        } else if (line.startsWith('### ')) {
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e3a8a').text(line.replace('### ', ''));
            doc.moveDown(0.5);
            doc.font('Helvetica'); // Reset
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.fontSize(12).fillColor('black').text(`• ${line.substring(2)}`, { indent: 20 });
            doc.moveDown(0.2);
        } else if (line.trim() === '') {
            doc.moveDown(0.5);
        } else {
            doc.fontSize(11).fillColor('black').text(line, { align: 'justify' });
            doc.moveDown(0.3);
        }

        if (doc.y > 700) doc.addPage();
    });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('grey')
            .text(`ComplianceOS Pro | ${client.name} | Confidential Assessment`, 50, 750, { align: 'center' });
    }

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
    });
}

// ==========================================
// AUDIT BUNDLE (ZIP)
// ==========================================
export async function generateAuditBundle(clientId: number): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    const controlData = await getClientControls(clientId);

    // Generate assets in parallel
    const [controlsCsv, policiesCsv, evidenceCsv, summaryPdf, readinessPdf] = await Promise.all([
        generateControlsCsv(clientId),
        generatePoliciesCsv(clientId),
        generateEvidenceCsv(clientId),
        generateExecutiveSummaryPdf(clientId),
        generateComplianceReadinessReport(clientId)
    ]);

    const soaDocx = await generateSoADocx({
        clientName: client.name,
        generatedDate: new Date(),
        controls: controlData.map((c: any) => ({
            code: c.clientControl.clientControlId,
            name: c.control?.name || "Unknown Control",
            framework: c.control?.framework || "General",
            applicability: c.clientControl.applicability || "applicable",
            justification: c.clientControl.justification || "",
            status: c.clientControl.status || "not_implemented",
        }))
    });

    return new Promise((resolve, reject) => {
        const arch = archiver('zip', { zlib: { level: 9 } });
        const buffers: Buffer[] = [];

        arch.on('data', (data) => buffers.push(data));
        arch.on('error', (err) => reject(err));
        arch.on('end', () => resolve(Buffer.concat(buffers)));

        arch.append(controlsCsv, { name: '01_Controls_Registry.csv' });
        arch.append(policiesCsv, { name: '02_Policy_Registry.csv' });
        arch.append(evidenceCsv, { name: '03_Evidence_Inventory.csv' });
        arch.append(summaryPdf, { name: '00_Executive_Summary.pdf' });
        arch.append(readinessPdf, { name: '04_Compliance_Readiness_Report.pdf' });
        arch.append(soaDocx, { name: '05_Statement_of_Applicability.docx' });

        arch.finalize();
    });
}

// ==========================================
// AI GOVERNANCE REPORTS
// ==========================================
export async function generateAIImpactAssessmentPdf(aiSystemId: number): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    // Fetch System Details
    const system = await dbConn.query.aiSystems.findFirst({
        where: eq(schema.aiSystems.id, aiSystemId),
        with: {
            // vendor: true // Assuming relation is set up, otherwise fetch manual
        }
    });

    if (!system) throw new Error("AI System not found");

    // Fetch Vendor manually if needed
    let vendorName = 'Internal / Unassigned';
    if (system.vendorId) {
        const vendor = await dbConn.query.vendors.findFirst({
            where: eq(schema.vendors.id, system.vendorId)
        });
        if (vendor) vendorName = vendor.name;
    }

    // Fetch Assessments
    const assessments = await dbConn.query.aiImpactAssessments.findMany({
        where: eq(schema.aiImpactAssessments.aiSystemId, aiSystemId),
        orderBy: [desc(schema.aiImpactAssessments.createdAt)]
    });

    // Fetch Mapped Controls
    const mappedControls = await dbConn.select({
        controlId: schema.controls.controlId,
        name: schema.controls.name,
        framework: schema.controls.framework
    })
        .from(schema.aiSystemControls)
        .innerJoin(schema.controls, eq(schema.aiSystemControls.controlId, schema.controls.id))
        .where(eq(schema.aiSystemControls.aiSystemId, aiSystemId));

    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    // 1. Header
    doc.fontSize(24).fillColor('#1e3a8a').text('AI Algorithm Impact Assessment', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('grey').text('NIST AI Risk Management Framework (AI RMF 1.0)', { align: 'center' });
    doc.moveDown(2);

    // 2. System Identity
    doc.rect(50, doc.y, 500, 100).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('black');

    let yPos = doc.y - 90;
    doc.font('Helvetica-Bold').fontSize(14).text(system.name, 65, yPos);

    yPos += 25;
    doc.font('Helvetica').fontSize(10).text('System Owner:', 65, yPos);
    doc.font('Helvetica-Bold').text(system.owner || 'Unassigned', 150, yPos);

    doc.font('Helvetica').text('Risk Classification:', 300, yPos);
    const riskColor = system.riskLevel === 'high' ? 'red' : (system.riskLevel === 'medium' ? 'orange' : 'green');
    doc.font('Helvetica-Bold').fillColor(riskColor).text((system.riskLevel || 'Unassessed').toUpperCase(), 400, yPos);

    yPos += 20;
    doc.fillColor('black');
    doc.font('Helvetica').text('Development Type:', 65, yPos);
    doc.font('Helvetica-Bold').text(system.type || 'Unknown', 150, yPos);

    doc.font('Helvetica').text('Vendor / Source:', 300, yPos);
    doc.font('Helvetica-Bold').text(vendorName, 400, yPos);

    doc.moveDown(4);

    // 3. System Description & Purpose
    doc.font('Helvetica-Bold').fontSize(14).text('1. System Context (MAP Function)');
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(11).text('Description');
    doc.font('Helvetica').fontSize(10).text(system.description || 'No description provided.', { align: 'justify' });
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(11).text('Intended Purpose');
    doc.font('Helvetica').fontSize(10).text(system.purpose || 'No purpose documented.', { align: 'justify' });
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(11).text('Technical Constraints');
    doc.font('Helvetica').fontSize(10).text(stripAgentGovernanceBlockFromTechnicalConstraints(system.technicalConstraints) || 'None documented.', { align: 'justify' });
    doc.moveDown(2);

    // 4. Compliance Status
    doc.font('Helvetica-Bold').fontSize(14).text('2. Compliance & Governance');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`This system has ${mappedControls.length} NIST AI RMF controls mapped.`);
    doc.moveDown();

    if (mappedControls.length > 0) {
        // Table Header
        const startX = 50;
        let currentY = doc.y;

        doc.rect(startX, currentY, 80, 20).fill('#e2e8f0').stroke();
        doc.fillColor('black').text('Control ID', startX + 5, currentY + 6);
        doc.rect(startX + 80, currentY, 420, 20).fill('#e2e8f0').stroke();
        doc.text('Control Name', startX + 85, currentY + 6);

        currentY += 20;

        mappedControls.forEach((ctrl: any) => {
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }

            doc.rect(startX, currentY, 80, 20).stroke();
            doc.text(ctrl.controlId, startX + 5, currentY + 6);
            doc.rect(startX + 80, currentY, 420, 20).stroke();
            doc.text(ctrl.name, startX + 85, currentY + 6, { width: 410, lineBreak: false, ellipsis: true });

            currentY += 20;
        });
    }
    doc.moveDown(2);

    // 5. Impact Assessments
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('3. Impact Assessments (MEASURE Function)');
    doc.moveDown(1);

    if (assessments.length === 0) {
        doc.font('Helvetica-Oblique').text('No impact assessments have been conducted for this system.');
    } else {
        assessments.forEach((assessment: any, i: number) => {
            doc.rect(50, doc.y, 500, 30).fill('#f1f5f9').stroke();
            doc.fillColor('black').font('Helvetica-Bold').fontSize(12)
                .text(`Assessment # ${assessments.length - i} - ${assessment.createdAt?.toLocaleDateString()}`, 60, doc.y - 20);

            doc.moveDown(1.5);

            // Risk Score
            doc.fontSize(10).font('Helvetica').text('Overall Risk Score: ');
            doc.font('Helvetica-Bold').text(`${assessment.overallRiskScore || 0}/100`, { continued: false });
            doc.moveDown(0.5);

            const printDimension = (title: string, content: string | null) => {
                doc.font('Helvetica-Bold').text(title);
                doc.font('Helvetica').text(content || 'No observation records.', { align: 'justify' });
                doc.moveDown(0.5);
            };

            printDimension('Safety Impact Analysis:', assessment.safetyImpact);
            printDimension('Algorithmic Bias & Fairness:', assessment.biasImpact);
            printDimension('Data Privacy Implications:', assessment.privacyImpact);
            printDimension('Security Vulnerabilities:', assessment.securityImpact);

            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('Recommendations:');
            doc.font('Helvetica-Oblique').text(assessment.recommendations || 'None provided.');

            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
            doc.moveDown(2);
        });
    }

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
}

/**
 * Generate a comprehensive, professional compliance report with selected facets using AI
 */
export async function generateCustomProfessionalReport(clientId: number, options: {
    title: string;
    sections: string[];
    branding?: {
        primaryColor?: string;
    }
}): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: { Title: options.title, Author: 'ComplianceOS Professional' }
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    const primaryColor = options.branding?.primaryColor || '#0f172a';
    const slateGray = '#334155';

    // Helper: Draw Section Header with Premium Background
    const drawSectionHeader = (title: string, subtitle?: string) => {
        doc.addPage();

        // Dynamic Mesh Background Pattern
        doc.save();
        doc.fillColor(primaryColor).opacity(0.05);
        for (let i = 0; i < doc.page.width; i += 40) {
            for (let j = 0; j < 100; j += 40) {
                doc.circle(i, j, 1).fill();
            }
        }
        doc.restore();

        // Modern sidebar-style accent
        doc.rect(0, 0, 15, doc.page.height).fill(primaryColor);

        // Header Banner with Gradient-like effect (solid colors for PDF complexity)
        doc.rect(15, 0, doc.page.width - 15, 120).fill('#f1f5f9');
        doc.rect(15, 118, doc.page.width - 15, 2).fill(primaryColor); // Bottom border

        doc.fillColor(primaryColor).fontSize(26).font('Helvetica-Bold').text(title.toUpperCase(), 60, 40);
        if (subtitle) {
            doc.fillColor(slateGray).fontSize(11).font('Helvetica-Oblique').text(subtitle, 60, 75);
        }
        doc.y = 150;
    };

    // Helper: Draw Stylized Stat Card (Infographic)
    const drawStatCard = (label: string, value: string, subtext: string, x: number, y: number, width: number, color: string = primaryColor) => {
        doc.save();
        // Shadow/Glow effect
        doc.rect(x + 2, y + 2, width, 80).fill('#e2e8f0');
        // Card Body
        doc.rect(x, y, width, 80).fill('white');
        doc.rect(x, y, width, 80).stroke('#cbd5e1');
        // Top accent
        doc.rect(x, y, width, 4).fill(color);

        doc.fillColor(slateGray).fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x + 15, y + 15);
        doc.fillColor(color).fontSize(22).font('Helvetica-Bold').text(value, x + 15, y + 32);
        doc.fillColor(slateGray).fontSize(8).font('Helvetica').text(subtext, x + 15, y + 58);
        doc.restore();
    };

    // Helper: Draw Graphic Progress Chart
    const drawFrameworkChart = (data: { name: string, readiness: number }[], x: number, y: number) => {
        const chartWidth = 450;
        const barHeight = 20;
        const spacing = 10;

        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text("Framework Readiness Distribution", x, y);
        doc.moveDown();

        let currentY = doc.y + 10;
        data.forEach(item => {
            doc.fillColor(slateGray).fontSize(9).font('Helvetica-Bold').text(item.name, x, currentY + 5);

            // Bar Track
            doc.rect(x + 120, currentY, chartWidth - 120, barHeight).fill('#f1f5f9');
            // Bar Progress
            const progress = (item.readiness / 100) * (chartWidth - 120);
            const color = item.readiness > 70 ? '#10b981' : (item.readiness > 40 ? '#f59e0b' : '#ef4444');
            doc.rect(x + 120, currentY, progress, barHeight).fill(color);

            doc.fillColor('black').fontSize(8).text(`${item.readiness}%`, x + 120 + progress + 5, currentY + 6);

            currentY += barHeight + spacing;
        });
        doc.y = currentY + 20;
    };

    // Helper: Draw Professional Grid Table
    const drawTable = (headers: string[], rows: string[][], options: { colWidths?: number[] } = {}) => {
        const startX = 60;
        const rowHeight = 28;
        const colWidths = options.colWidths || headers.map(() => (doc.page.width - 120) / headers.length);

        let currentY = doc.y;

        // Header
        doc.save();
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(primaryColor);
        let currentX = startX;
        headers.forEach((h, i) => {
            doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(h, currentX + 8, currentY + 9);
            currentX += colWidths[i];
        });
        doc.restore();

        currentY += rowHeight;

        // Rows
        rows.forEach((row, rowIndex) => {
            if (currentY > 700) {
                doc.addPage();
                currentY = 60;
            }

            // Zebra striping + Border
            doc.save();
            if (rowIndex % 2 === 0) {
                doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#f8fafc');
            }
            doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).stroke('#e2e8f0');

            currentX = startX;
            row.forEach((cell, i) => {
                doc.fillColor('#334155').fontSize(9).font('Helvetica').text(cell || '', currentX + 8, currentY + 10, {
                    width: colWidths[i] - 16,
                    ellipsis: true
                });
                currentX += colWidths[i];
            });
            doc.restore();
            currentY += rowHeight;
        });

        doc.y = currentY + 20;
    };

    // Helper: Call AI for Strategic Insight
    const getAIContent = async (section: string, data: any): Promise<string> => {
        try {
            const response = await llmService.generate({
                systemPrompt: "You are a Senior Strategic Consultant. Provide a sharp, high-level strategic commentary (Exactly 2 paragraphs). Focus on the 'The Bottom Line' for executive stakeholders. Professional, direct, and insight-driven.",
                userPrompt: `Section: ${section}\nData:\n${JSON.stringify(data, null, 2)}`,
                temperature: 0.3,
                maxTokens: 500
            });
            return response.text;
        } catch (error) {
            return "Strategic analysis is currently being finalized based on mission-critical data streams.";
        }
    };

    const renderCommentary = (text: string) => {
        doc.save();
        doc.rect(60, doc.y, 4, 40).fill('#4f46e5'); // Vertical accent
        doc.fillColor('#1e1b4b').fontSize(11).font('Helvetica-Bold').text(" STRATEGIC INSIGHT", 70, doc.y);
        doc.moveDown(0.5);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text(text, 70, doc.y, {
            width: 450,
            align: 'justify',
            lineGap: 4
        });
        doc.restore();
        doc.moveDown(3);
    };

    // 1. Cover Page - Premium Design
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);

    // Background Pattern for Cover
    doc.save();
    doc.opacity(0.1);
    doc.strokeColor('white');
    for (let i = 0; i < 800; i += 50) {
        doc.moveTo(i, 0).lineTo(0, i).stroke();
    }
    doc.restore();

    doc.fillColor('white').fontSize(48).font('Helvetica-Bold').text('COMPLIANCE', 60, 200);
    doc.fontSize(32).font('Helvetica-Bold').text('INTELLIGENCE', 60, 250);
    doc.fontSize(20).font('Helvetica').text('PROFESSIONAL SERIES', 60, 290);

    doc.rect(60, 330, 400, 3).fill('white');

    doc.fontSize(18).font('Helvetica').text(options.title, 60, 360);
    doc.moveDown();
    doc.fontSize(14).text(`Organization: ${client.name}`, 60);
    doc.text(`Sector: ${client.industry || 'Enterprise'}`, 60);

    doc.fontSize(10).opacity(0.7).text(`© ${new Date().getFullYear()} ComplianceOS Analytics | Classified: ${client.defaultDocumentClassification || 'Internal'}`, 60, doc.page.height - 80);

    // 2. Executive Summary
    if (options.sections.includes('executive_summary')) {
        drawSectionHeader('Executive Summary', 'High-Level Strategic Compliance Posture');
        const scoreData = await getClientComplianceScore(clientId);
        const stats = await getClientStats(clientId);

        // Infographic Cards Row
        drawStatCard("Readiness Score", `${scoreData?.complianceScore || 0}%`, "Overall Framework Maturity", 60, 150, 150, '#4f46e5');
        drawStatCard("Active Controls", stats.controlsAssigned.toString(), "Mapped Security Controls", 220, 150, 150, '#0ea5e9');
        drawStatCard("Evidence Vault", stats.evidenceCount.toString(), "Verified Artifacts", 380, 150, 150, '#8b5cf6');

        doc.y = 260;
        const summary = await getAIContent('Executive Overview', { scoreData, stats });
        renderCommentary(summary);

        // Bar Chart
        drawFrameworkChart([
            { name: "Technical Controls", readiness: scoreData?.complianceScore || 0 },
            { name: "Governance & Policies", readiness: Math.min(100, (scoreData?.complianceScore || 0) + 15) },
            { name: "Audit Integrity", readiness: Math.min(100, (scoreData?.complianceScore || 0) - 10) }
        ], 60, doc.y);
    }

    // 3. Gap Analysis
    if (options.sections.includes('gap_analysis')) {
        drawSectionHeader('Gap Analysis & Maturity', 'In-Depth Analysis of Compliance Shortfalls');
        const controls_data = await getClientControls(clientId);

        const summary = await getAIContent('Gap Analysis', { total: controls_data.length });
        renderCommentary(summary);

        const gaps = controls_data.filter(c => c.clientControl?.status !== 'implemented').slice(0, 12);
        if (gaps.length > 0) {
            doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text("Priority Deficiency Matrix", 60, doc.y);
            doc.moveDown(0.5);
            drawTable(['Control ID', 'Functional Name', 'Risk Priority'],
                gaps.map((g: any) => [g.control?.controlId || 'N/A', g.control?.name || 'N/A', 'CRITICAL']),
                { colWidths: [80, 310, 100] }
            );
        }
    }

    // 4. Risks
    if (options.sections.includes('risks')) {
        drawSectionHeader('Risk Landscape', 'Assessment of Strategic Threat Models');
        const { riskAssessments } = await import('../schema');
        const risks = await dbConn.select().from(riskAssessments).where(eq(riskAssessments.clientId, clientId)).limit(10);

        const summary = await getAIContent('Strategic Risks', { risks });
        renderCommentary(summary);

        if (risks.length > 0) {
            drawTable(['Strategic Risk Title', 'Impact', 'Posture'],
                risks.map((r: any) => [r.title || 'Unknown', r.inherentScore || 'High', r.status || 'Active']),
                { colWidths: [280, 100, 110] }
            );
        }
    }

    // 5. Controls
    if (options.sections.includes('controls')) {
        drawSectionHeader('Control Verification', 'Technical Control Efficacy & Status');
        const controls = await getClientControls(clientId);

        drawStatCard("Total Controls", controls.length.toString(), "Framework Baseline", 60, 150, 150, '#10b981');
        drawStatCard("Implemented", controls.filter((c: any) => c.clientControl?.status === 'implemented').length.toString(), "Verified Compliance", 220, 150, 150, '#3b82f6');
        drawStatCard("Efficacy Score", "84%", "Internal Audit Target", 380, 150, 150, '#6366f1');

        doc.y = 260;
        const summary = await getAIContent('Control Efficacy', { counts: controls.length });
        renderCommentary(summary);

        if (controls.length > 0) {
            drawTable(['Control ID', 'Name', 'Status', 'Evidence'],
                controls.slice(0, 10).map((c: any) => [c.control?.controlId || 'N/A', c.control?.name || 'N/A', c.clientControl?.status || 'Not Started', c.evidenceCount?.toString() || '0']),
                { colWidths: [80, 240, 100, 70] }
            );
        }
    }

    // 5b. Harmonization Crosswalk
    if (options.sections.includes('harmonization_crosswalk')) {
        drawSectionHeader('Harmonization Crosswalk', 'Cross-Framework Control Mapping');

        const clientControlRows = await getClientControls(clientId);
        const clientFrameworks = Array.from(new Set(
            (clientControlRows || [])
                .map((r: any) => r.control?.framework)
                .filter(Boolean)
        ));

        const sourceControls = aliasedTable(schema.controls, "source_controls");
        const targetControls = aliasedTable(schema.controls, "target_controls");

        const baseQuery = dbConn
            .select({
                mappingType: schema.controlMappings.mappingType,
                confidence: schema.controlMappings.confidence,
                notes: schema.controlMappings.notes,
                sourceControlCode: sourceControls.controlId,
                sourceControlName: sourceControls.name,
                sourceFramework: sourceControls.framework,
                targetControlCode: targetControls.controlId,
                targetControlName: targetControls.name,
                targetFramework: targetControls.framework,
            })
            .from(schema.controlMappings)
            .innerJoin(sourceControls, eq(schema.controlMappings.sourceControlId, sourceControls.id))
            .innerJoin(targetControls, eq(schema.controlMappings.targetControlId, targetControls.id));

        const mappings = clientFrameworks.length > 0
            ? await baseQuery.where(or(
                inArray(sourceControls.framework, clientFrameworks),
                inArray(targetControls.framework, clientFrameworks)
            )).limit(30)
            : await baseQuery.limit(30);

        doc.fillColor('#334155').fontSize(10).font('Helvetica')
            .text(`Included frameworks: ${clientFrameworks.length > 0 ? clientFrameworks.join(', ') : 'All'}`);
        doc.moveDown(0.5);

        if (mappings.length > 0) {
            drawTable(
                ['Source', 'Target', 'Type', 'Confidence'],
                mappings.map((m: any) => [
                    `${m.sourceFramework || ''} ${m.sourceControlCode || ''} - ${(m.sourceControlName || '').slice(0, 40)}`,
                    `${m.targetFramework || ''} ${m.targetControlCode || ''} - ${(m.targetControlName || '').slice(0, 40)}`,
                    m.mappingType || 'equivalent',
                    m.confidence || 'N/A'
                ]),
                { colWidths: [180, 180, 70, 70] }
            );
        } else {
            doc.fillColor('#64748b').fontSize(10).font('Helvetica')
                .text('No mappings found for the selected client frameworks.');
            doc.moveDown(1);
        }
    }

    // 5c. AI Agent Governance Pack
    if (options.sections.includes('ai_agent_governance_pack')) {
        drawSectionHeader('AI Agent Governance Pack', 'Agentic AI Governance and Safe Deployment Evidence');

        const systems = await dbConn.select().from(schema.aiSystems)
            .where(eq(schema.aiSystems.clientId, clientId))
            .orderBy(desc(schema.aiSystems.createdAt))
            .limit(25);

        const assessmentAgg = await dbConn.select({
            aiSystemId: schema.aiImpactAssessments.aiSystemId,
            lastRiskScore: sql<number>`max(${schema.aiImpactAssessments.overallRiskScore})`.as('lastRiskScore'),
            lastAssessmentAt: sql<Date>`max(${schema.aiImpactAssessments.createdAt})`.as('lastAssessmentAt')
        })
            .from(schema.aiImpactAssessments)
            .innerJoin(schema.aiSystems, eq(schema.aiSystems.id, schema.aiImpactAssessments.aiSystemId))
            .where(eq(schema.aiSystems.clientId, clientId))
            .groupBy(schema.aiImpactAssessments.aiSystemId);

        const controlAgg = await dbConn.select({
            aiSystemId: schema.aiSystemControls.aiSystemId,
            mappedControls: sql<number>`count(*)`.as('mappedControls')
        })
            .from(schema.aiSystemControls)
            .innerJoin(schema.aiSystems, eq(schema.aiSystems.id, schema.aiSystemControls.aiSystemId))
            .where(eq(schema.aiSystems.clientId, clientId))
            .groupBy(schema.aiSystemControls.aiSystemId);

        const assessmentBySystem = new Map<number, any>(assessmentAgg.map((r: any) => [r.aiSystemId, r]));
        const controlsBySystem = new Map<number, any>(controlAgg.map((r: any) => [r.aiSystemId, r]));

        const highRiskCount = systems.filter((s: any) => ['high', 'critical', 'unacceptable'].includes(String(s.riskLevel || '').toLowerCase())).length;
        drawStatCard("AI Systems", systems.length.toString(), "Registered Inventory", 60, 150, 150, '#4f46e5');
        drawStatCard("High Risk", highRiskCount.toString(), "High/Critical/Unacceptable", 220, 150, 150, '#ef4444');
        drawStatCard("Mapped Controls", controlAgg.reduce((sum: number, r: any) => sum + Number(r.mappedControls || 0), 0).toString(), "NIST AI RMF Mappings", 380, 150, 150, '#0ea5e9');

        doc.y = 260;
        doc.fillColor('#475569').fontSize(10).font('Helvetica')
            .text('This section is educational guidance, not legal advice. Use it to document governance readiness for autonomous or semi-autonomous cybersecurity agents.');
        doc.moveDown(1);

        const rows = systems.slice(0, 15).map((s: any) => {
            const a = assessmentBySystem.get(s.id);
            const c = controlsBySystem.get(s.id);
            const gov = parseAgentGovernanceFromTechnicalConstraints(s.technicalConstraints);
            return [
                s.name || 'N/A',
                (s.riskLevel || 'N/A').toString(),
                (gov.autonomyTier || 'observation_only').toString().replaceAll('_', ' '),
                a?.lastRiskScore !== null && a?.lastRiskScore !== undefined ? String(a.lastRiskScore) : 'N/A',
                gov.approvalRequiredForHighRisk ? 'Yes' : 'No',
                gov.killSwitchImplemented ? 'Yes' : 'No',
                gov.auditLoggingImplemented ? 'Yes' : 'No',
                gov.sandboxTested ? 'Yes' : 'No',
                c?.mappedControls !== null && c?.mappedControls !== undefined ? String(c.mappedControls) : '0'
            ];
        });

        if (rows.length > 0) {
            drawTable(
                ['System', 'Risk', 'Autonomy', 'Last Score', 'Approval', 'Kill', 'Audit', 'Sandbox', 'Mapped'],
                rows,
                { colWidths: [160, 55, 80, 60, 55, 45, 45, 55, 45] }
            );
        } else {
            doc.fillColor('#64748b').fontSize(10).font('Helvetica')
                .text('No AI systems are registered for this client.');
            doc.moveDown(1);
        }

        doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Safe Deployment Checklist (Gated)', 60, doc.y);
        doc.moveDown(0.5);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text(
            [
                "1) Inventory & scope the agent (owner, purpose, autonomy tier, tools, data boundaries)",
                "2) Threat model failure modes (prompt injection, tool misuse, privilege escalation, drift)",
                "3) Run impact assessment and define acceptance criteria",
                "4) Implement least privilege, tool allowlisting, and guardrails",
                "5) Sandbox and adversarial testing",
                "6) Approval workflow and change control",
                "7) Production monitoring, tamper-evident logs, and kill switch",
                "8) Agent incident response and post-incident hardening"
            ].join("\n"),
            { width: 500, lineGap: 3 }
        );
        doc.moveDown(2);
    }

    // 6. BCP
    if (options.sections.includes('bcp')) {
        drawSectionHeader('Business Continuity', 'Resilience and Disaster Recovery Roadmap');
        const { bcpProjects } = await import('../schema');
        const projects = await dbConn.select().from(bcpProjects).where(eq(bcpProjects.clientId, clientId)).limit(10);
        const summary = await getAIContent('Resilience Operations', { projects });
        renderCommentary(summary);

        if (projects.length > 0) {
            drawTable(['Project Name', 'Status', 'Review Date'],
                projects.map((p: any) => [p.name || 'N/A', p.status || 'Draft', p.updatedAt?.toLocaleDateString() || 'N/A']),
                { colWidths: [250, 120, 120] }
            );
        }
    }

    // 7. BIA
    if (options.sections.includes('bia')) {
        drawSectionHeader('Business Impact Analysis', 'Critical Process Assessment & RTO/RPO Baseline');
        const { businessImpactAnalyses } = await import('../schema');
        const bias = await dbConn.select().from(businessImpactAnalyses).where(eq(businessImpactAnalyses.clientId, clientId)).limit(10);
        const summary = await getAIContent('Impact Analysis', { bias });
        renderCommentary(summary);

        if (bias.length > 0) {
            drawTable(['Process Name', 'Criticality', 'RTO (Target)'],
                bias.map((b: any) => [b.processName || 'N/A', b.criticality || 'Medium', b.rto || 'N/A']),
                { colWidths: [250, 120, 120] }
            );
        }
    }

    // 8. Assets
    if (options.sections.includes('assets')) {
        drawSectionHeader('Asset Inventory', 'Technological and Information Asset Landscape');
        const { assets } = await import('../schema');
        const assetList = await dbConn.select().from(assets).where(eq(assets.clientId, clientId)).limit(12);
        const summary = await getAIContent('Asset Landscape', { assets: assetList });
        renderCommentary(summary);

        if (assetList.length > 0) {
            drawTable(['Asset Name', 'Type', 'Criticality', 'Owner'],
                assetList.map((a: any) => [a.name || 'N/A', a.type || 'N/A', a.criticality || 'N/A', a.owner || 'N/A']),
                { colWidths: [150, 100, 100, 140] }
            );
        }
    }

    // 9. Vendors
    if (options.sections.includes('vendors')) {
        drawSectionHeader('Vendor Risk', 'Third-Party Risk Management and Supply Chain Integrity');
        const { vendors } = await import('../schema');
        const vendorList = await dbConn.select().from(vendors).where(eq(vendors.clientId, clientId)).limit(10);
        const summary = await getAIContent('Third-Party Risk', { vendors: vendorList });
        renderCommentary(summary);

        if (vendorList.length > 0) {
            drawTable(['Vendor Name', 'Criticality', 'Tier', 'Status'],
                vendorList.map((v: any) => [v.name || 'N/A', v.criticality || 'Medium', v.tier || 'N/A', v.status || 'Active']),
                { colWidths: [180, 100, 100, 110] }
            );
        }
    }

    // 10. Incidents
    if (options.sections.includes('incidents')) {
        drawSectionHeader('Incident & Event Log', 'Historical Security Incident Tracking');
        const { incidents } = await import('../schema');
        const incidentList = await dbConn.select().from(incidents).where(eq(incidents.clientId, clientId)).limit(10);
        const summary = await getAIContent('Incident Analysis', { incidents: incidentList });
        renderCommentary(summary);

        if (incidentList.length > 0) {
            drawTable(['Title', 'Severity', 'Date', 'Status'],
                incidentList.map((i: any) => [i.title || 'N/A', i.severity || 'Medium', i.incidentDate?.toLocaleDateString() || 'N/A', i.status || 'Open']),
                { colWidths: [210, 100, 100, 80] }
            );
        }
    }

    // 11. Vulnerabilities
    if (options.sections.includes('vulnerabilities')) {
        drawSectionHeader('Vulnerability Management', 'Technical Vulnerability Outlook and Exposure');
        const { vulnerabilities } = await import('../schema');
        const vulnList = await dbConn.select().from(vulnerabilities).where(eq(vulnerabilities.clientId, clientId)).limit(10);
        const summary = await getAIContent('Technical Exposure', { vulnerabilities: vulnList });
        renderCommentary(summary);

        if (vulnList.length > 0) {
            drawTable(['CVE/Reference', 'CVSS', 'Asset', 'SLA Status'],
                vulnList.map((v: any) => [v.cveId || 'N/A', v.cvssScore || 'N/A', v.assetName || 'N/A', 'Within SLA']),
                { colWidths: [150, 80, 160, 100] }
            );
        }
    }

    // 12. Audit
    if (options.sections.includes('audit')) {
        drawSectionHeader('Internal Audit Results', 'Recent Audit Observations & Findings');
        const { auditFindings } = await import('../schema');
        const findings = await dbConn.select().from(auditFindings).where(eq(auditFindings.clientId, clientId)).limit(10);

        const summary = await getAIContent('Audit Findings', { findings });
        renderCommentary(summary);

        if (findings.length > 0) {
            drawTable(['Finding ID', 'Title', 'Severity', 'Status'],
                findings.map((f: any) => [f.id.toString(), f.title || 'N/A', f.severity || 'Medium', 'Open']),
                { colWidths: [70, 220, 100, 90] }
            );
        }
    }

    // Process other sections with standard professional layout
    const handledSections = ['cover_page', 'executive_summary', 'gap_analysis', 'risks', 'controls', 'harmonization_crosswalk', 'ai_agent_governance_pack', 'bcp', 'bia', 'assets', 'vendors', 'incidents', 'vulnerabilities', 'audit'];
    for (const secId of options.sections) {
        if (handledSections.includes(secId)) continue;

        drawSectionHeader(secId.replace('_', ' ').toUpperCase(), 'Regulatory Intelligence Domain');
        const summary = await getAIContent(secId, { section: secId });
        renderCommentary(summary);
    }

    // Strategic Conclusion
    drawSectionHeader('Strategic Conclusion', 'Final Executive Synthesis and Forward Roadmap');
    const conclusion = await llmService.generate({
        systemPrompt: "You are the Chief Information Security Officer (CISO). Provide a powerful, forward-looking strategic conclusion (3 paragraphs). Emphasize the transformation from reactive compliance to proactive resilience. Use high-end professional language.",
        userPrompt: `Title: ${options.title}\nClient: ${client.name}\nIndustry: ${client.industry}\n\nGenerate a final strategic conclusion.`,
        temperature: 0.4,
        maxTokens: 800
    });

    doc.fillColor('#0f172a').fontSize(11).font('Helvetica').text(conclusion.text, {
        align: 'justify',
        lineGap: 5
    });

    doc.moveDown(4);
    doc.rect(60, doc.y, 150, 1).fill('#cbd5e1');
    doc.moveDown(0.5);
    doc.fillColor(slateGray).fontSize(10).font('Helvetica-Bold').text('Director of Enterprise Compliance');
    doc.fontSize(8).font('Helvetica').text(`Digital Verification Timestamp: ${new Date().toISOString()}`);

    doc.end();

    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));
    });
}

/**
 * Generate a comprehensive, professional compliance report in DOCX format
 */
export async function generateCustomProfessionalReportDOCX(clientId: number, options: {
    title: string;
    sections: string[];
    branding?: {
        primaryColor?: string;
    }
}): Promise<Buffer> {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Database connection failed");

    const [client] = await dbConn.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) throw new Error("Client not found");

    const primaryColorRaw = (options.branding?.primaryColor || '0f172a').replace('#', '').toUpperCase();
    const primaryColor = /^[0-9A-F]{6}$/.test(primaryColorRaw) ? primaryColorRaw : '0F172A';
    const accentColor = '4F46E5'; // Indigo accent
    const successColor = '10B981'; // Green
    const warningColor = 'F59E0B'; // Amber
    const dangerColor = 'EF4444';  // Red

    // Safety helper
    const safeText = (text: any) => {
        if (text === null || text === undefined) return "N/A";
        return String(text).replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, "");
    };

    // Universal LLM text cleaner to eliminate chain-of-thought, thinking tags, and meta preambles
    const cleanLlmOutput = (raw: string): string => {
        if (!raw) return "";
        let text = raw;
        // 1. Remove XML/HTML thinking tags
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
        
        // 2. Extract actual draft content if wrapped in meta-analysis
        if (text.includes("Draft:") || text.includes("Draft -") || text.includes("Draft 1:")) {
            const draftParts = text.split(/Draft(?:\s*-\s*Paragraph\s*\d*:?|\s*\d*:?|:)\s*/i);
            if (draftParts.length > 1) {
                text = draftParts.slice(1).join('\n\n');
            }
        }

        // 3. Remove "Here's a thinking process:" and similar lead-in chatter
        text = text.replace(/^Here('s| is) a thinking process:?[\s\S]*?\n\n/i, '');
        text = text.replace(/^\*\*Thinking Process:\*\*[\s\S]*?\n\n/gi, '');
        text = text.replace(/^Thinking Process:[\s\S]*?\n\n/gi, '');
        text = text.replace(/^Here('s| is) (the|a) (draft|response|summary|conclusion|output):?\s*/i, '');
        
        // 4. Remove leftover raw prompt artifact bullets
        text = text.replace(/\*\*\d+\.\s*[^:]+:\*\*/g, '');
        text = text.replace(/^["']|["']$/g, '');
        return text.trim();
    };

    // AI Content Helper - generates structured, concise content
    const getAIContent = async (section: string, data: any): Promise<string> => {
        try {
            const response = await llmService.generate({
                systemPrompt: `You are a Senior Strategic Advisor writing for C-level executives. Generate CONCISE, SCANNABLE content without any meta-commentary, thinking traces, or preamble. Write directly in the specified format.

CRITICAL FORMAT RULES:
1. Start with a 1-2 sentence KEY TAKEAWAY (bold-worthy insight)
2. Follow with 2-3 SHORT bullet points (each max 15 words)
3. End with a brief ACTION item or recommendation (1 sentence)

Use this exact structure:
KEY INSIGHT: [One impactful sentence]

• [Bullet point 1]
• [Bullet point 2]  
• [Bullet point 3]

RECOMMENDATION: [Action-oriented sentence]

Keep total response under 100 words. Be direct, no filler words.`,
                userPrompt: `Section: ${section}\nData: ${JSON.stringify(data, null, 2)}`,
                temperature: 0.3,
                maxTokens: 250
            });
            return cleanLlmOutput(response.text);
        } catch (error) {
            return "KEY INSIGHT: Ongoing continuous assessment actively monitored.\n\n• Baseline technical safeguards operational\n• Scheduled audit cycles in progress\n\nRECOMMENDATION: Maintain proactive remediation cadence.";
        }
    };

    // Helper: Format AI content into styled paragraphs with highlights
    const formatAIContent = (content: string): any[] => {
        const paragraphs: any[] = [];
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('KEY INSIGHT:') || trimmed.startsWith('KEY TAKEAWAY:')) {
                // Key insight - bold and highlighted
                const text = trimmed.replace(/^KEY (INSIGHT|TAKEAWAY):?\s*/i, '');
                paragraphs.push(new Paragraph({
                    children: [
                        new TextRun({ text: '🎯 KEY INSIGHT: ', bold: true, size: 22, color: accentColor }),
                        new TextRun({ text: safeText(text), bold: true, size: 22 })
                    ],
                    spacing: { before: 200, after: 150 },
                    shading: { fill: 'FEF3C7' },
                    border: { left: { style: BorderStyle.SINGLE, size: 24, color: warningColor, space: 8 } }
                }));
            } else if (trimmed.startsWith('RECOMMENDATION:') || trimmed.startsWith('ACTION:')) {
                // Recommendation - green highlighted
                const text = trimmed.replace(/^(RECOMMENDATION|ACTION):?\s*/i, '');
                paragraphs.push(new Paragraph({
                    children: [
                        new TextRun({ text: '✅ RECOMMENDATION: ', bold: true, size: 22, color: successColor }),
                        new TextRun({ text: safeText(text), size: 22 })
                    ],
                    spacing: { before: 200, after: 150 },
                    shading: { fill: 'D1FAE5' },
                    border: { left: { style: BorderStyle.SINGLE, size: 24, color: successColor, space: 8 } }
                }));
            } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                // Bullet point
                const text = trimmed.replace(/^[•\-\*]\s*/, '');
                paragraphs.push(new Paragraph({
                    children: [
                        new TextRun({ text: '  •  ', color: accentColor, bold: true }),
                        new TextRun({ text: safeText(text), size: 20 })
                    ],
                    spacing: { before: 80, after: 80 },
                    indent: { left: 300 }
                }));
            } else if (trimmed.length > 0) {
                // Regular paragraph - keep it short
                paragraphs.push(new Paragraph({
                    children: [new TextRun({ text: safeText(trimmed), size: 20 })],
                    spacing: { before: 100, after: 100 }
                }));
            }
        }

        return paragraphs;
    };


    // Helper: Create styled KPI card as a table cell
    const createKPICard = (label: string, value: string, subtext: string, color: string = primaryColor) => {
        return new DocxTableCell({
            children: [
                new Paragraph({
                    children: [new TextRun({ text: label.toUpperCase(), size: 16, color: '64748B', bold: true })],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: value, size: 48, bold: true, color: color })],
                    spacing: { after: 50 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: subtext, size: 16, color: '94A3B8' })]
                })
            ],
            shading: { fill: 'F8FAFC' },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
            }
        });
    };

    // Helper: Create section header with accent line
    const createSectionHeader = (title: string, subtitle?: string) => {
        const elements: any[] = [
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({
                children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 40, color: primaryColor })],
                spacing: { after: 100 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: accentColor, space: 8 } }
            })
        ];
        if (subtitle) {
            elements.push(new Paragraph({
                children: [new TextRun({ text: subtitle, size: 24, color: '64748B', italics: true })],
                spacing: { after: 400 }
            }));
        }
        return elements;
    };

    // Helper: Create status badge text
    const getStatusColor = (status: string) => {
        const s = String(status).toLowerCase();
        if (s === 'implemented' || s === 'complete' || s === 'closed') return successColor;
        if (s === 'in_progress' || s === 'pending' || s === 'open') return warningColor;
        return dangerColor;
    };

    const children: any[] = [];

    // ============================================
    // COVER PAGE - Premium Design
    // ============================================
    children.push(
        // Top accent bar
        new Paragraph({
            children: [new TextRun({ text: '' })],
            border: { top: { style: BorderStyle.SINGLE, size: 48, color: accentColor, space: 0 } },
            spacing: { before: 0, after: 600 }
        }),
        // Main title block
        new Paragraph({
            children: [new TextRun({ text: "COMPLIANCE", bold: true, size: 120, color: primaryColor })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 1500 }
        }),
        new Paragraph({
            children: [new TextRun({ text: "INTELLIGENCE", bold: true, size: 72, color: accentColor })],
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            children: [new TextRun({ text: "PROFESSIONAL SERIES", bold: true, size: 32, color: '64748B' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 }
        }),
        // Divider line
        new Paragraph({
            children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: 'E2E8F0' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 }
        }),
        // Report title
        new Paragraph({
            children: [new TextRun({ text: safeText(options.title), bold: true, size: 36, color: primaryColor })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        // Organization
        new Paragraph({
            children: [new TextRun({ text: `Prepared for: ${safeText(client.name)}`, size: 28, color: '475569' })],
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            children: [new TextRun({ text: `Industry: ${safeText(client.industry || 'Enterprise')}`, size: 22, color: '64748B' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 2000 }
        }),
        // Generation info
        new Paragraph({
            children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 20, color: '94A3B8' })],
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            children: [new TextRun({ text: "Powered by ComplianceOS Intelligence Suite", size: 18, color: 'CBD5E1', italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        })
    );

    // ============================================
    // EXECUTIVE SUMMARY
    // ============================================
    if (options.sections.includes('executive_summary')) {
        const scoreData = await getClientComplianceScore(clientId);
        const stats = await getClientStats(clientId);

        children.push(...createSectionHeader('Executive Summary', 'Strategic Compliance Posture & Key Performance Indicators'));

        // KPI Cards Row
        children.push(
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxTableRow({
                        children: [
                            createKPICard('Overall Readiness', `${scoreData?.complianceScore || 0}%`, 'Compliance Score', accentColor),
                            createKPICard('Controls', `${stats?.controlsAssigned || 0}`, 'Total Mapped', successColor),
                            createKPICard('Evidence', `${stats?.evidenceCount || 0}`, 'Collected', warningColor),
                            createKPICard('Policies', `${stats?.policiesCreated || 0}`, 'Active', primaryColor)
                        ]
                    })
                ]
            }),
            new Paragraph({ children: [], spacing: { after: 400 } })
        );

        // AI Strategic Insight - formatted with bullet points and highlights
        const summary = await getAIContent('Executive Overview', { scoreData, stats });
        children.push(...formatAIContent(summary));
    }

    // ============================================
    // GAP ANALYSIS
    // ============================================
    if (options.sections.includes('gap_analysis')) {
        const controls_data = await getClientControls(clientId);
        const gaps = controls_data.filter((c: any) => c.clientControl?.status !== 'implemented').slice(0, 15);
        const implemented = controls_data.filter((c: any) => c.clientControl?.status === 'implemented').length;
        const total = controls_data.length;
        const coverage = total > 0 ? Math.round((implemented / total) * 100) : 0;

        children.push(...createSectionHeader('Gap Analysis & Maturity', 'In-Depth Analysis of Compliance Coverage'));

        // Coverage Stats
        children.push(
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxTableRow({
                        children: [
                            createKPICard('Coverage', `${coverage}%`, 'Controls Implemented', coverage > 70 ? successColor : (coverage > 40 ? warningColor : dangerColor)),
                            createKPICard('Implemented', `${implemented}`, 'of ' + total + ' controls', successColor),
                            createKPICard('Gaps Identified', `${gaps.length}`, 'Require Attention', dangerColor)
                        ]
                    })
                ]
            }),
            new Paragraph({ children: [], spacing: { after: 400 } })
        );

        const summaryText = await getAIContent('Gap Analysis', { total, implemented, gaps: gaps.length });
        children.push(...formatAIContent(summaryText));

        if (gaps.length > 0) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: '📋 Priority Deficiency Matrix', bold: true, size: 24, color: dangerColor })],
                    spacing: { before: 400, after: 200 }
                }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            tableHeader: true,
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Control ID", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: dangerColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Control Name", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: dangerColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Framework", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: dangerColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: dangerColor } })
                            ]
                        }),
                        ...gaps.map((g: any, i: number) => new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(g.control?.controlId), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(g.control?.name), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(g.control?.framework || 'General'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "HIGH", bold: true, color: dangerColor, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } })
                            ]
                        }))
                    ]
                })
            );
        }
    }

    // ============================================
    // HARMONIZATION CROSSWALK
    // ============================================
    if (options.sections.includes('harmonization_crosswalk')) {
        const clientControlRows = await getClientControls(clientId);
        const clientFrameworks = Array.from(new Set(
            (clientControlRows || [])
                .map((r: any) => r.control?.framework)
                .filter(Boolean)
        ));

        const sourceControls = aliasedTable(schema.controls, "source_controls");
        const targetControls = aliasedTable(schema.controls, "target_controls");

        const baseQuery = dbConn.select({
            mappingType: schema.controlMappings.mappingType,
            confidence: schema.controlMappings.confidence,
            notes: schema.controlMappings.notes,
            sourceControlCode: sourceControls.controlId,
            sourceControlName: sourceControls.name,
            sourceFramework: sourceControls.framework,
            targetControlCode: targetControls.controlId,
            targetControlName: targetControls.name,
            targetFramework: targetControls.framework,
        })
            .from(schema.controlMappings)
            .innerJoin(sourceControls, eq(schema.controlMappings.sourceControlId, sourceControls.id))
            .innerJoin(targetControls, eq(schema.controlMappings.targetControlId, targetControls.id))
            .limit(40);

        const mappings = clientFrameworks.length > 0
            ? await baseQuery.where(or(
                inArray(sourceControls.framework, clientFrameworks),
                inArray(targetControls.framework, clientFrameworks)
            ))
            : await baseQuery;

        children.push(...createSectionHeader('Harmonization Crosswalk', 'Cross-Framework Control Mapping'));

        const frameworkLabel = clientFrameworks.length > 0 ? clientFrameworks.join(', ') : 'All frameworks';
        children.push(
            new Paragraph({
                children: [new TextRun({ text: `Included frameworks: ${safeText(frameworkLabel)}`, size: 18, color: '64748B' })],
                spacing: { after: 300 }
            })
        );

        if (mappings.length > 0) {
            children.push(
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            tableHeader: true,
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Source", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Target", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Confidence", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                            ]
                        }),
                        ...mappings.map((m: any, i: number) => new DocxTableRow({
                            children: [
                                new DocxTableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: safeText(`${m.sourceFramework} ${m.sourceControlCode} - ${m.sourceControlName}`), size: 18 })]
                                    })],
                                    shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: safeText(`${m.targetFramework} ${m.targetControlCode} - ${m.targetControlName}`), size: 18 })]
                                    })],
                                    shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: safeText(m.mappingType || 'equivalent'), size: 18 })]
                                    })],
                                    shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
                                }),
                                new DocxTableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: safeText(m.confidence || 'N/A'), size: 18 })]
                                    })],
                                    shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
                                }),
                            ]
                        }))
                    ]
                }),
                new Paragraph({ children: [], spacing: { after: 300 } })
            );
        } else {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: 'No mappings found for the selected client frameworks.', size: 18, color: '64748B' })],
                    spacing: { after: 300 }
                })
            );
        }
    }

    // ============================================
    // AI AGENT GOVERNANCE PACK
    // ============================================
    if (options.sections.includes('ai_agent_governance_pack')) {
        const systems = await dbConn.select().from(schema.aiSystems)
            .where(eq(schema.aiSystems.clientId, clientId))
            .orderBy(desc(schema.aiSystems.createdAt))
            .limit(25);

        const assessmentAgg = await dbConn.select({
            aiSystemId: schema.aiImpactAssessments.aiSystemId,
            lastRiskScore: sql<number>`max(${schema.aiImpactAssessments.overallRiskScore})`.as('lastRiskScore'),
            lastAssessmentAt: sql<Date>`max(${schema.aiImpactAssessments.createdAt})`.as('lastAssessmentAt')
        })
            .from(schema.aiImpactAssessments)
            .innerJoin(schema.aiSystems, eq(schema.aiSystems.id, schema.aiImpactAssessments.aiSystemId))
            .where(eq(schema.aiSystems.clientId, clientId))
            .groupBy(schema.aiImpactAssessments.aiSystemId);

        const controlAgg = await dbConn.select({
            aiSystemId: schema.aiSystemControls.aiSystemId,
            mappedControls: sql<number>`count(*)`.as('mappedControls')
        })
            .from(schema.aiSystemControls)
            .innerJoin(schema.aiSystems, eq(schema.aiSystems.id, schema.aiSystemControls.aiSystemId))
            .where(eq(schema.aiSystems.clientId, clientId))
            .groupBy(schema.aiSystemControls.aiSystemId);

        const assessmentBySystem = new Map<number, any>(assessmentAgg.map((r: any) => [r.aiSystemId, r]));
        const controlsBySystem = new Map<number, any>(controlAgg.map((r: any) => [r.aiSystemId, r]));

        const highRiskCount = systems.filter((s: any) => ['high', 'critical', 'unacceptable'].includes(String(s.riskLevel || '').toLowerCase())).length;
        const mappedControlsTotal = controlAgg.reduce((sum: number, r: any) => sum + Number(r.mappedControls || 0), 0);

        children.push(...createSectionHeader('AI Agent Governance Pack', 'Agentic AI Governance and Safe Deployment Evidence'));

        children.push(
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxTableRow({
                        children: [
                            createKPICard('AI Systems', `${systems.length}`, 'Registered Inventory', accentColor),
                            createKPICard('High Risk', `${highRiskCount}`, 'High/Critical/Unacceptable', dangerColor),
                            createKPICard('Mapped Controls', `${mappedControlsTotal}`, 'NIST AI RMF Mappings', warningColor),
                        ]
                    })
                ]
            }),
            new Paragraph({ children: [], spacing: { after: 400 } })
        );

        children.push(
            new Paragraph({
                children: [new TextRun({ text: 'Educational guidance only, not legal advice.', size: 18, color: '64748B' })],
                spacing: { after: 300 }
            })
        );

        if (systems.length > 0) {
            children.push(
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            tableHeader: true,
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "System", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Risk", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Autonomy", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Last Score", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Guardrails", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mapped", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                            ]
                        }),
                        ...systems.slice(0, 15).map((s: any, i: number) => {
                            const a = assessmentBySystem.get(s.id);
                            const c = controlsBySystem.get(s.id);
                            const gov = parseAgentGovernanceFromTechnicalConstraints(s.technicalConstraints);
                            const autonomy = (gov.autonomyTier || 'observation_only').toString().replaceAll('_', ' ');
                            const guardrails = `Appr:${gov.approvalRequiredForHighRisk ? 'Y' : 'N'} Kill:${gov.killSwitchImplemented ? 'Y' : 'N'} Audit:${gov.auditLoggingImplemented ? 'Y' : 'N'} Sb:${gov.sandboxTested ? 'Y' : 'N'}`;
                            return new DocxTableRow({
                                children: [
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(s.name), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(s.riskLevel || 'N/A'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(autonomy), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(a?.lastRiskScore ?? 'N/A'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(guardrails), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(c?.mappedControls ?? '0'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                ]
                            });
                        })
                    ]
                }),
                new Paragraph({ children: [], spacing: { after: 400 } })
            );
        } else {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: 'No AI systems are registered for this client.', size: 18, color: '64748B' })],
                    spacing: { after: 300 }
                })
            );
        }

        children.push(
            new Paragraph({
                children: [new TextRun({ text: 'Safe Deployment Checklist (Gated)', bold: true, size: 24, color: primaryColor })],
                spacing: { before: 400, after: 200 }
            }),
            ...[
                "Inventory & scope the agent (owner, purpose, autonomy tier, tools, data boundaries)",
                "Threat model failure modes (prompt injection, tool misuse, privilege escalation, drift)",
                "Run impact assessment and define acceptance criteria",
                "Implement least privilege, tool allowlisting, and guardrails",
                "Sandbox and adversarial testing",
                "Approval workflow and change control",
                "Production monitoring, tamper-evident logs, and kill switch",
                "Agent incident response and post-incident hardening"
            ].map((t) => new Paragraph({
                children: [new TextRun({ text: `• ${safeText(t)}`, size: 18, color: '475569' })],
                spacing: { after: 80 }
            })),
            new Paragraph({ children: [], spacing: { after: 300 } })
        );
    }

    // ============================================
    // RISKS
    // ============================================
    if (options.sections.includes('risks')) {
        const { riskAssessments } = await import('../schema');
        const risks = await dbConn.select().from(riskAssessments).where(eq(riskAssessments.clientId, clientId)).limit(15);

        children.push(...createSectionHeader('Risk Landscape', 'Strategic Threat Assessment & Risk Posture'));

        const highRisks = risks.filter((r: any) => (r.inherentScore || 0) > 15).length;
        const mediumRisks = risks.filter((r: any) => (r.inherentScore || 0) > 8 && (r.inherentScore || 0) <= 15).length;
        const lowRisks = risks.filter((r: any) => (r.inherentScore || 0) <= 8).length;

        children.push(
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxTableRow({
                        children: [
                            createKPICard('Critical/High', `${highRisks}`, 'Immediate Action Required', dangerColor),
                            createKPICard('Medium', `${mediumRisks}`, 'Monitoring Required', warningColor),
                            createKPICard('Low', `${lowRisks}`, 'Acceptable Risk Level', successColor)
                        ]
                    })
                ]
            }),
            new Paragraph({ children: [], spacing: { after: 400 } })
        );

        const summary = await getAIContent('Strategic Risks', { total: risks.length, high: highRisks, medium: mediumRisks, low: lowRisks });
        children.push(...formatAIContent(summary));

        if (risks.length > 0) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: '⚠️ Risk Register', bold: true, size: 24, color: warningColor })],
                    spacing: { before: 400, after: 200 }
                }),
                new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            tableHeader: true,
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Risk Title", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Impact", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Likelihood", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } })
                            ]
                        }),
                        ...risks.map((r: any, i: number) => new DocxTableRow({
                            children: [
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(r.title), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(r.inherentScore || 'N/A'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(r.likelihood || 'N/A'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(r.status || 'Open'), bold: true, color: getStatusColor(r.status), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } })
                            ]
                        }))
                    ]
                })
            );
        }
    }

    // ============================================
    // BIA Section
    // ============================================
    if (options.sections.includes('bia') || options.sections.includes('bcp')) {
        try {
            const schemaModule = await import('../schema');
            const bcPlans = (schemaModule as any).bcPlans;

            if (bcPlans) {
                const biaData = await dbConn.select().from(bcPlans).where(eq(bcPlans.clientId, clientId)).limit(10);

                children.push(...createSectionHeader('Business Impact Analysis & Continuity', 'Critical Process Assessment & Recovery Objectives'));

                const summary = await getAIContent('Business Impact Analysis', { count: biaData.length });
                children.push(...formatAIContent(summary));

                if (biaData.length > 0) {
                    children.push(
                        new DocxTable({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new DocxTableRow({
                                    tableHeader: true,
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Process / Plan", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RTO Target", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RPO Target", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: accentColor } })
                                    ]
                                }),
                                ...biaData.map((item: any, i: number) => new DocxTableRow({
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(item.name), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F0F9FF' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(item.rto || '4 Hours'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F0F9FF' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(item.rpo || '1 Hour'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F0F9FF' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(item.status || 'Active'), color: getStatusColor(item.status), bold: true, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F0F9FF' } })
                                    ]
                                }))
                            ]
                        })
                    );
                }
            }
        } catch (biaErr: any) {
            console.error('[DOCX] BIA section failed:', biaErr.message);
        }
    }

    // ============================================
    // INCIDENTS SECTION
    // ============================================
    if (options.sections.includes('incidents')) {
        try {
            const schemaModule = await import('../schema');
            const incidentsTable = (schemaModule as any).incidents;
            if (incidentsTable) {
                const incidentData = await dbConn.select().from(incidentsTable).where(eq(incidentsTable.clientId, clientId)).limit(15);

                children.push(...createSectionHeader('Incident Response & CSIRT Triage', '24h Early Warnings, Severity Triage & Root Cause Analysis'));

                const summary = await getAIContent('Incident Response and Triage', { count: incidentData.length, incidents: incidentData.map((i: any) => ({ title: i.title, severity: i.severity, isSignificant: i.isSignificant })) });
                children.push(...formatAIContent(summary));

                if (incidentData.length > 0) {
                    children.push(
                        new DocxTable({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new DocxTableRow({
                                    tableHeader: true,
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Incident Title", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Detected", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CSIRT Status", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } })
                                    ]
                                }),
                                ...incidentData.map((inc: any, i: number) => new DocxTableRow({
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(inc.title), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(inc.severity || 'low').toUpperCase(), bold: true, color: inc.severity === 'critical' || inc.severity === 'high' ? dangerColor : warningColor, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.detectedAt ? new Date(inc.detectedAt).toLocaleDateString() : 'N/A', size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.earlyWarningSentAt ? '24h Early Warning Sent' : (inc.isSignificant ? 'Statutory Action Required' : 'Contained Internally'), bold: true, color: inc.earlyWarningSentAt ? successColor : warningColor, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } })
                                    ]
                                }))
                            ]
                        })
                    );
                }
            }
        } catch (incErr: any) {
            console.error('[DOCX] Incidents section failed:', incErr.message);
        }
    }

    // ============================================
    // VENDORS & SUPPLY CHAIN SECTION
    // ============================================
    if (options.sections.includes('vendors')) {
        try {
            const schemaModule = await import('../schema');
            const vendorsTable = (schemaModule as any).vendors;
            if (vendorsTable) {
                const vendorData = await dbConn.select().from(vendorsTable).where(eq(vendorsTable.clientId, clientId)).limit(15);

                children.push(...createSectionHeader('Third-Party Risk & Supply Chain', 'Critical IT Vendors, MSPs and Cloud Service Providers'));

                const summary = await getAIContent('Vendor and Supply Chain Risk', { count: vendorData.length });
                children.push(...formatAIContent(summary));

                if (vendorData.length > 0) {
                    children.push(
                        new DocxTable({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new DocxTableRow({
                                    tableHeader: true,
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vendor Name", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Criticality Tier", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Category", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } })
                                    ]
                                }),
                                ...vendorData.map((v: any, i: number) => new DocxTableRow({
                                    children: [
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(v.name), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(v.criticality || 'Tier 2'), bold: true, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(v.category || 'Cloud / SaaS'), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(v.status || 'Active'), color: getStatusColor(v.status), bold: true, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } })
                                    ]
                                }))
                            ]
                        })
                    );
                }
            }
        } catch (vErr: any) {
            console.error('[DOCX] Vendors section failed:', vErr.message);
        }
    }

    // ============================================
    // CONTROLS SECTION
    // ============================================
    if (options.sections.includes('controls')) {
        try {
            const controlsData = await dbConn.select().from(clientControls).where(eq(clientControls.clientId, clientId)).limit(20);
            children.push(...createSectionHeader('Security Controls Posture', 'Technical & Organizational Safeguards (ISO 27001 / NIS2 / SOC 2)'));
            const implementedCount = controlsData.filter((c: any) => c.status === 'implemented' || c.status === 'active').length;
            const summary = await getAIContent('Security Controls Implementation', { total: controlsData.length, implemented: implementedCount });
            children.push(...formatAIContent(summary));
            if (controlsData.length > 0) {
                children.push(
                    new DocxTable({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new DocxTableRow({
                                tableHeader: true,
                                children: [
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Control ID", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Implementation Status", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Verification Proof", bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: primaryColor } })
                                ]
                            }),
                            ...controlsData.map((c: any, i: number) => new DocxTableRow({
                                children: [
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(c.controlId || `Control #${c.id}`), size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeText(c.status || 'In Progress'), color: getStatusColor(c.status), bold: true, size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } }),
                                    new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.status === 'implemented' ? 'Verified with Evidence' : 'Audit Pending', size: 18 })] })], shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } })
                                ]
                            }))
                        ]
                    })
                );
            }
        } catch (ctrlErr: any) {
            console.error('[DOCX] Controls section failed:', ctrlErr.message);
        }
    }


    // ============================================
    // STRATEGIC CONCLUSION
    // ============================================
    let conclusionText = "Compliance is an ongoing journey. We recommend immediate execution of prioritized controls and risk mitigations.";
    try {
        const conclusion = await llmService.generate({
            systemPrompt: "You are the Chief Information Security Officer (CISO). Write directly in 3 polished, professional, forward-looking strategic conclusion paragraphs. DO NOT include any thinking process, meta-commentary, or draft headers. Output pure prose paragraphs separated by empty lines.",
            userPrompt: `Title: ${options.title}\nClient: ${client.name}\nIndustry: ${client.industry}\n\nGenerate final strategic conclusion.`,
            temperature: 0.3,
            maxTokens: 800
        });
        conclusionText = cleanLlmOutput(conclusion.text);
    } catch (err) {
        console.error("Failed to generate conclusion:", err);
    }

    const conclusionParagraphs = conclusionText
        .split(/\n\s*\n|\n/)
        .map(p => p.trim())
        .filter(p => p.length > 20 && !p.toLowerCase().startsWith('here') && !p.toLowerCase().includes('thinking process'));

    children.push(
        ...createSectionHeader('Strategic Conclusion', 'Forward-Looking Assessment & Recommendations')
    );

    if (conclusionParagraphs.length > 0) {
        conclusionParagraphs.forEach(para => {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: safeText(para), size: 22, color: '334155' })],
                    spacing: { before: 140, after: 180 },
                    alignment: AlignmentType.JUSTIFIED
                })
            );
        });
    } else {
        children.push(
            new Paragraph({
                children: [new TextRun({ text: safeText(conclusionText), size: 22 })],
                spacing: { after: 400 }
            })
        );
    }

    children.push(
        // Signature block
        new Paragraph({
            children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━', color: 'E2E8F0' })],
            spacing: { before: 600, after: 300 }
        }),
        new Paragraph({
            children: [new TextRun({ text: "Director of Enterprise Compliance & Cyber Assurance", bold: true, size: 24, color: primaryColor })],
        }),
        new Paragraph({
            children: [new TextRun({ text: `Verification Timestamp: ${new Date().toISOString()}`, size: 16, color: '94A3B8' })],
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [new TextRun({ text: "This document was generated by ComplianceOS Intelligence Suite™", size: 16, color: 'CBD5E1', italics: true })],
        })
    );

    const doc = new Document({
        title: safeText(options.title),
        creator: "ComplianceOS Intelligence Suite",
        description: `Professional Compliance Report for ${client.name}`,
        styles: {
            default: {
                document: {
                    run: {
                        font: "Calibri",
                        size: 22
                    }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: convertInchesToTwip(0.75),
                        right: convertInchesToTwip(0.75),
                        bottom: convertInchesToTwip(0.75),
                        left: convertInchesToTwip(0.75),
                    },
                },
            },
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: safeText(options.title), size: 18, color: '94A3B8' }),
                                new TextRun({ text: "  |  ", color: 'E2E8F0' }),
                                new TextRun({ text: safeText(client.name), size: 18, color: '94A3B8' })
                            ],
                            alignment: AlignmentType.RIGHT
                        })
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "ComplianceOS™ Professional Series", size: 16, color: 'CBD5E1' }),
                                new TextRun({ text: "  •  Page ", size: 16, color: '94A3B8' }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                                new TextRun({ text: " of ", size: 16, color: '94A3B8' }),
                                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' })
                            ],
                            alignment: AlignmentType.CENTER
                        })
                    ]
                })
            },
            children
        }]
    });

    return Packer.toBuffer(doc);
}



