import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, Header, Footer, PageNumber, ShadingType, TableOfContents, LevelFormat } from "docx";
import { getDb } from "../../../db";
import { clients, riskAssessments, riskTreatments, treatmentControls } from "../../../schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface RiskReportContent {
  executiveSummary?: string | null;
  introduction?: string | null;
  scope?: string | null;
  methodology?: string | null;
  keyFindings?: string | null;
  recommendations?: string | null;
  conclusion?: string | null;
  assumptions?: string | null;
  references?: string | null;
}

export async function generateRiskManagementDocx(clientId: number, content?: RiskReportContent): Promise<Buffer> {
  let orgName = "Organization";
  let risks: any[] = [];
  let linkedControlsCount = 0;
  let totalTreatments = 0;
  let completedTreatments = 0;
  let treatmentProgress = 0;
  let avgResidualScore = 0;
  let highRiskCount = 0;

  const db = await getDb();
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  orgName = client?.name || orgName;

  risks = await db.select().from(riskAssessments).where(eq(riskAssessments.clientId, clientId)).orderBy(desc(riskAssessments.updatedAt));
  const linkedControlsCountRes = await db.select({ count: sql<number>`count(*)` }).from(treatmentControls).where(eq(treatmentControls.clientId, clientId));
  linkedControlsCount = Number(linkedControlsCountRes[0]?.count || 0);

  // Calculate stats
  highRiskCount = risks.filter(r => Number(r.inherentScore) >= 15).length;

  const residualScores = risks.map(r => {
    const score = Number(r.residualScore);
    return isNaN(score) ? 0 : score;
  });
  avgResidualScore = Math.round(avg(residualScores));

  const totalTreatmentsRes = await db.select({ count: sql<number>`count(*)` })
    .from(riskTreatments)
    .innerJoin(riskAssessments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
    .where(eq(riskAssessments.clientId, clientId));

  const completedTreatmentsRes = await db.select({ count: sql<number>`count(*)` })
    .from(riskTreatments)
    .innerJoin(riskAssessments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
    .where(and(
      eq(riskAssessments.clientId, clientId),
      sql`${riskTreatments.status} IN ('implemented', 'completed')`
    ));

  totalTreatments = Number(totalTreatmentsRes[0]?.count || 0);
  completedTreatments = Number(completedTreatmentsRes[0]?.count || 0);
  treatmentProgress = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 0;


  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Risk Management Report", color: "888888", size: 20 })],
                alignment: AlignmentType.RIGHT
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES] })],
                alignment: AlignmentType.CENTER
              })
            ]
          })
        },
        children: [
          new Paragraph({ text: orgName, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 400 } }),
          new Paragraph({ text: "Risk Management Report", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: new Date().toLocaleDateString(), alignment: AlignmentType.CENTER, spacing: { after: 1800 } }),

          new Paragraph({ text: "Table of Contents", alignment: AlignmentType.CENTER, spacing: { after: 400 }, pageBreakBefore: true }),
          new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),

          // 1. Executive Summary
          new Paragraph({ text: "1. Executive Summary", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          ...(content?.executiveSummary
            ? textToParagraphs(content.executiveSummary)
            : [new Paragraph({
              children: [new TextRun(`Overall risk posture for ${orgName}. High risks: ${highRiskCount}. Avg residual score: ${avgResidualScore}. Linked controls: ${linkedControlsCount}. Treatment progress: ${treatmentProgress}%.`)],
              spacing: { after: 240 }
            })]),

          kpiTable([
            ["High Risk Count", String(highRiskCount)],
            ["Average Residual Score", String(avgResidualScore)],
            ["Linked Controls", String(linkedControlsCount)],
            ["Treatment Progress", `${treatmentProgress}%`]
          ]),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // 2. Governance (renamed to Scope/Context if customized)
          new Paragraph({ text: "2. Introduction & Scope", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          ...(content?.introduction ? [new Paragraph({ text: "Introduction", heading: HeadingLevel.HEADING_2 }), ...textToParagraphs(content.introduction)] : []),
          ...(content?.scope ? [new Paragraph({ text: "Scope", heading: HeadingLevel.HEADING_2 }), ...textToParagraphs(content.scope)] : []),
          ...(content?.methodology ? [new Paragraph({ text: "Methodology", heading: HeadingLevel.HEADING_2 }), ...textToParagraphs(content.methodology)] : []),
          ...(content?.assumptions ? [new Paragraph({ text: "Assumptions", heading: HeadingLevel.HEADING_2 }), ...textToParagraphs(content.assumptions)] : []),

          // 3. Risk Register Overview
          new Paragraph({ text: "3. Assessed Risks", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          riskOverviewTable(risks),

          // 4. Treatments
          new Paragraph({ text: "4. Treatment Plan", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          treatmentsSummaryTable(totalTreatments, completedTreatments, treatmentProgress),

          // 5. Findings & Recommendations
          new Paragraph({ text: "5. Findings & Recommendations", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          ...(content?.keyFindings ? [new Paragraph({ text: "Key Findings", heading: HeadingLevel.HEADING_2 }), ...textToParagraphs(content.keyFindings)] : []),
          ...(content?.recommendations ? [new Paragraph({ text: "Recommendations", heading: HeadingLevel.HEADING_2 }), ...textToParagraphs(content.recommendations)] : []),

          // 6. Conclusion
          ...(content?.conclusion ? [
            new Paragraph({ text: "6. Conclusion", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
            ...textToParagraphs(content.conclusion)
          ] : []),

          // 7. References
          ...(content?.references ? [
            new Paragraph({ text: "7. References", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
            ...textToParagraphs(content.references)
          ] : []),

          // Default Top Risks if no custom content suppressed it (we keep it as an appendix or main section? User asked to customize sections, but keeping data sections is good)
          new Paragraph({ text: "Appendix A: Top Risk Profiles", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          ...topRiskParagraphs(risks.slice(0, 5))
        ]
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

function textToParagraphs(text: string | null | undefined): Paragraph[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.filter(line => line.trim()).map(line => {
    const trimmed = line.trim();
    let content = trimmed;
    const pProps: any = { spacing: { after: 120 } };

    const bulletMatch = trimmed.match(/^(\*|-)\s+(.*)/);
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);

    if (bulletMatch) {
      pProps.bullet = { level: 0 };
      content = bulletMatch[2];
    } else if (numberMatch) {
      pProps.numbering = { reference: "default-numbering", level: 0 };
      content = numberMatch[2];
    }

    const children = parseInlineFormatting(content);

    return new Paragraph({
      ...pProps,
      children: children
    });
  });
}

function parseInlineFormatting(text: string): TextRun[] {
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.filter(p => p).map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    return new TextRun({ text: part });
  });
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function kpiTable(rows: [string, string][]) {
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "KPI", spacing: { after: 120 }, children: [new TextRun({ text: "KPI", bold: true })] })], shading: { fill: "F2F2F2", type: ShadingType.CLEAR } }),
        new TableCell({ children: [new Paragraph({ text: "Value", children: [new TextRun({ text: "Value", bold: true })] })], shading: { fill: "F2F2F2", type: ShadingType.CLEAR } })
      ]
    })
  ];
  for (const [k, v] of rows) {
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(k)] }),
        new TableCell({ children: [new Paragraph(v)] })
      ]
    }));
  }
  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function riskOverviewTable(items: any[]) {
  const header = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Risk", bold: true })] })], shading: { fill: "F5F5F5" } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Inherent", bold: true })] })], shading: { fill: "F5F5F5" } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Residual", bold: true })] })], shading: { fill: "F5F5F5" } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })], shading: { fill: "F5F5F5" } })
    ]
  });
  const rows = [header];
  for (const r of items.slice(0, 25)) {
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(`${r.assessmentId || ""} ${r.title || ""}`)] }),
        new TableCell({ children: [new Paragraph(String(r.inherentScore || "-"))] }),
        new TableCell({ children: [new Paragraph(String(r.residualScore || "-"))] }),
        new TableCell({ children: [new Paragraph(String(r.status || "draft"))] })
      ]
    }));
  }
  if (items.length === 0) {
    rows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph("No risks available")] }), new TableCell({ children: [new Paragraph("")] }), new TableCell({ children: [new Paragraph("")] }), new TableCell({ children: [new Paragraph("")] })] }));
  }
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function treatmentsSummaryTable(total: number, completed: number, progress: number) {
  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Treatments", bold: true })] })], shading: { fill: "F5F5F5" } }),
        new TableCell({ children: [new Paragraph(String(total))] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Completed", bold: true })] })], shading: { fill: "F5F5F5" } }),
        new TableCell({ children: [new Paragraph(String(completed))] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Progress", bold: true })] })], shading: { fill: "F5F5F5" } }),
        new TableCell({ children: [new Paragraph(`${progress}%`)] })
      ]
    })
  ];
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function topRiskParagraphs(items: any[]) {
  if (!items.length) return [new Paragraph("No top risks to display.")];
  const ps: Paragraph[] = [];
  items.forEach((r, idx) => {
    ps.push(new Paragraph({ text: `${idx + 1}. ${r.title || r.assessmentId}`, heading: HeadingLevel.HEADING_2, spacing: { before: 240 } }));
    ps.push(new Paragraph(`Threat: ${r.threatId || '-'}; Vulnerability: ${r.vulnerabilityId || '-'}`));
    ps.push(new Paragraph(`Likelihood: ${r.likelihood}; Impact: ${r.impact}`));
    ps.push(new Paragraph(`Inherent Score: ${r.inherentScore} (${qualitative(Number(r.inherentScore || 0))})`));
    ps.push(new Paragraph(`Residual Score: ${r.residualScore ?? '-'} (${qualitative(Number(r.residualScore || 0))})`));
    ps.push(new Paragraph(`Status: ${r.status}`));
  });
  return ps;
}

function qualitative(score: number) {
  if (score >= 20) return "critical";
  if (score >= 15) return "high";
  if (score >= 10) return "moderate";
  if (score >= 5) return "low";
  return "minimal";
}
