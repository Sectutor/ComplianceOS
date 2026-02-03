
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel, ImageRun, Header, Footer, PageNumber, PageOrientation, ShadingType, TableOfContents } from "docx";


import { getDb } from "../../../db";
import { clients, gapAssessments, gapResponses, controls } from "../../../schema";
import { eq, inArray, and } from "drizzle-orm";

export async function generateGapAnalysisDocx(assessmentId: number): Promise<Buffer> {
    const db = await getDb();

    // 1. Fetch Assessment & Client
    const [assessment] = await db.select().from(gapAssessments).where(eq(gapAssessments.id, assessmentId));
    if (!assessment) throw new Error("Assessment not found");

    const [client] = await db.select().from(clients).where(eq(clients.id, assessment.clientId));

    // 2. Fetch Responses & Controls
    const responses = await db.select().from(gapResponses).where(eq(gapResponses.assessmentId, assessmentId));

    // Get all controls related to framework (or all if we want to be safe, but filtering is better)
    // For Gap Analysis, we usually want ALL controls in the framework to show gaps.
    // But usually `responses` contains all relevant controls if the assessment was initialized correctly.
    // If we rely on responses, we might miss controls that haven't been "answered" yet if the init didn't seed them.
    // However, usually we seed 0-state responses. Let's rely on responses + join controls.

    const controlIds = responses.map(r => r.controlId);

    let controlsData: any[] = [];
    if (controlIds.length > 0) {
        // controlId in gapResponses is a string (e.g. "5.1", "A.8.2"). 
        // schema.controls.controlId is the matching string.
        // We need to fetch controls where controlId IN ...
        // But verify if `controlId` is numeric ID or string code. 
        // Schema says: controlId: varchar("control_id", { length: 100 }).notNull() -> String code.
        // And GapResponse: controlId: varchar("control_id", { length: 100 }) -> String code.
        // So allow referencing by string.

        controlsData = await db.select().from(controls).where(inArray(controls.controlId, controlIds));
    }

    // Merge Data
    const reportItems = responses.map(r => {
        const def = controlsData.find(c => c.controlId === r.controlId);
        return {
            code: r.controlId,
            name: def?.name || "Unknown Control",
            description: def?.description || "",
            status: r.currentStatus || "not_implemented",
            target: r.targetStatus || "required",
            notes: r.notes || "",
            plan: r.remediationPlan || "",
            severity: r.gapSeverity || "low",
            framework: def?.framework || assessment.framework,
            category: def?.category || "General" // Grouping
        };
    });

    // Sort by code (simple alphanumeric sort)
    reportItems.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    // Stats Calculation
    const totalControls = reportItems.length;
    const implementedCount = reportItems.filter(i => i.status === 'implemented').length;
    const partialCount = reportItems.filter(i => i.status === 'in_progress' || i.status === 'partial').length;
    const notImplementedCount = reportItems.filter(i => i.status === 'not_implemented' || !i.status).length;
    const notApplicableCount = reportItems.filter(i => i.status === 'not_applicable').length;
    const score = totalControls > 0 ? Math.round((implementedCount / (totalControls - notApplicableCount)) * 100) : 0;


    // 3. Calculate Statistics
    const total = reportItems.length;
    const implemented = reportItems.filter(i => i.status === 'implemented').length;
    const partial = reportItems.filter(i => i.status === 'in_progress' || i.status === 'partial').length;
    const notImplemented = reportItems.filter(i => i.status === 'not_implemented').length;
    const notApplicable = reportItems.filter(i => i.status === 'not_applicable').length;
    const compliantScore = total > 0 ? Math.round(((implemented + notApplicable) / total) * 100) : 0;

    // 4. Generate DOCX
    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Gap Analysis Report: ${assessment.framework}`,
                                        size: 20,
                                        color: "888888",
                                    }),
                                ],
                                alignment: AlignmentType.RIGHT,
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                    }),
                },
                children: [
                    // --- Title Page ---
                    new Paragraph({
                        text: client.name,
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 3000, after: 400 },
                    }),
                    new Paragraph({
                        text: `Gap Analysis Report`,
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        text: `${assessment.framework}`,
                        heading: HeadingLevel.HEADING_3,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 1000 },
                    }),
                    new Paragraph({
                        text: `Assessment: ${assessment.name}`,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        text: `Date: ${new Date().toLocaleDateString()}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 2000 }, // Page break roughly
                        pageBreakBefore: false,
                    }),

                    // --- Table of Contents ---
                    new Paragraph({
                        text: "Table of Contents",
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        pageBreakBefore: true,
                        run: { bold: true, size: 32 },
                    }),
                    new TableOfContents("Table of Contents", {
                        hyperlink: true,
                        headingStyleRange: "1-3",
                    }),

                    // --- 1. Executive Summary (Moved to Top) ---
                    new Paragraph({
                        text: "1. Executive Summary",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    ...parseMarkdownToDocx(assessment.executiveSummary || "No executive summary available."),

                    // Visual Dashboard
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: "Compliance Dashboard", alignment: AlignmentType.CENTER, run: { bold: true, color: "FFFFFF" } })],
                                        columnSpan: 2,
                                        shading: { fill: "2E75B6", type: ShadingType.CLEAR }, // Header Blue
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph("Total Controls")] }),
                                    new TableCell({ children: [new Paragraph({ text: totalControls.toString(), alignment: AlignmentType.RIGHT })] }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph("Implemented")] }),
                                    new TableCell({
                                        children: [new Paragraph({ text: `${implementedCount} (${Math.round(implementedCount / totalControls * 100)}%)`, alignment: AlignmentType.RIGHT, run: { color: "00B050", bold: true } })],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph("Partial / In Progress")] }),
                                    new TableCell({
                                        children: [new Paragraph({ text: `${partialCount}`, alignment: AlignmentType.RIGHT, run: { color: "ED7D31", bold: true } })],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph("Not Implemented (Gaps)")] }),
                                    new TableCell({
                                        children: [new Paragraph({ text: `${notImplementedCount}`, alignment: AlignmentType.RIGHT, run: { color: "C00000", bold: true } })],
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ text: "OVERALL COMPLIANCE SCORE", run: { bold: true } })] }),
                                    new TableCell({
                                        children: [new Paragraph({ text: `${score}%`, alignment: AlignmentType.RIGHT, run: { size: 28, bold: true } })],
                                        shading: { fill: "F2F2F2", type: ShadingType.CLEAR }
                                    }),
                                ],
                            }),
                        ],
                    }),
                    new Paragraph({ text: "", spacing: { after: 400 } }),


                    // --- 2. Introduction ---
                    new Paragraph({
                        text: "2. Introduction",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    ...parseMarkdownToDocx(assessment.introduction || `This report details the findings of the Gap Analysis.`),

                    // 2.1 Standard Overview
                    new Paragraph({ text: "2.1 Standard Overview", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                    new Paragraph({ text: `${assessment.framework} provides a comprehensive framework for Information Security Management Systems (ISMS), ensuring confidentiality, integrity, and availability of information assets.` }),

                    // 2.2 Scope
                    new Paragraph({ text: "2.2 Scope", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                    ...parseMarkdownToDocx(assessment.scope || "No scope definition provided."),

                    // 2.3 Methodology
                    new Paragraph({ text: "2.3 Methodology", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                    ...parseMarkdownToDocx(assessment.methodology || "Data collected via document review and interviews."),

                    // 2.4 Assumptions
                    new Paragraph({ text: "2.4 Assumptions & Limitations", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                    ...parseMarkdownToDocx(assessment.assumptions || "Assessment based on provided evidence."),

                    // 2.5 References
                    new Paragraph({ text: "2.5 References", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                    ...parseMarkdownToDocx(assessment.references || `${assessment.framework}, ISO 27002, Internal Policies.`),


                    // --- 3. Mandatory Clauses (4-10) ---
                    new Paragraph({
                        text: "3. Current ISMS Assessment: Mandatory Clauses (4-10)",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    ...generateControlTables(reportItems.filter(i => !i.code.startsWith('A') && !i.code.startsWith('A.') && !i.code.match(/^5\.|^6\.|^7\.|^8\./))),
                    // Note: If no items, generateControlTables returns []
                    ...(reportItems.filter(i => !i.code.startsWith('A')).length === 0 ? [new Paragraph({ text: "No assessment data available for Mandatory Clauses (4-10) in this report.", italics: true })] : []),


                    // --- 4. Annex A Controls ---
                    new Paragraph({
                        text: "4. Current ISMS Assessment: Annex A Controls",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    ...generateControlTables(reportItems.filter(i => i.code.startsWith('A') || i.code.startsWith('A.') || i.code.match(/^5\.|^6\.|^7\.|^8\./))),


                    // --- 5. Remediation Plan ---
                    new Paragraph({
                        text: "5. Remediation Action Plan",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    new Paragraph({
                        text: "The following controls require remediation to meet compliance requirements. Priority is assigned based on gap severity and risk.",
                        spacing: { after: 400 },
                    }),
                    createRemediationTable(reportItems.filter(i => i.status === 'not_implemented' || i.status === 'in_progress' || i.status === 'partial')),


                    // --- 6. Recommendations and Next Steps ---
                    new Paragraph({
                        text: "6. Recommendations and Next Steps",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    ...(assessment.keyRecommendations && Array.isArray(assessment.keyRecommendations) ?
                        (assessment.keyRecommendations as string[]).map(rec => new Paragraph({
                            children: [new TextRun({ text: "• ", bold: true }), new TextRun(rec)],
                            spacing: { after: 200 },
                            indent: { left: 720, hanging: 360 }
                        })) : [new Paragraph({ text: "No recommendations provided." })]
                    ),


                    // --- 7. Appendices ---
                    new Paragraph({
                        text: "7. Appendices",
                        heading: HeadingLevel.HEADING_1,
                        pageBreakBefore: true,
                    }),
                    new Paragraph({ text: "Appendix A: List of Documents Reviewed", bullet: { level: 0 } }),
                    new Paragraph({ text: "Appendix B: Interview Log", bullet: { level: 0 } }),
                ],
},
        ],
    });

return await Packer.toBuffer(doc);
}

function generateControlTables(items: any[]): any[] {
    const elements: any[] = [];

    // Group by Category
    const categories = new Set(items.map(i => i.category || "General"));
    const sortedCategories = Array.from(categories).sort();

    for (const cat of sortedCategories) {
        // Category Header
        elements.push(new Paragraph({
            text: cat,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
        }));

        const catItems = items.filter(i => (i.category || "General") === cat);

        // Table
        const rows = [
            new TableRow({
                tableHeader: true,
                children: [
                    new TableCell({ children: [new Paragraph({ text: "Control", run: { bold: true } })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: "F5F5F5" } }),
                    new TableCell({ children: [new Paragraph({ text: "Requirement & Status", run: { bold: true } })], width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: "F5F5F5" } }),
                    new TableCell({ children: [new Paragraph({ text: "Notes / Evidence", run: { bold: true } })], width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: "F5F5F5" } }),
                ]
            })
        ];

        for (const item of catItems) {
            rows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({ text: item.code, run: { bold: true } }),
                            new Paragraph({ text: item.status.replace('_', ' '), run: { color: getStatusColor(item.status), size: 16 } })
                        ]
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({ text: item.name, run: { bold: true } }),
                            new Paragraph({ text: item.description, run: { size: 18 } }) // desc
                        ]
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({ text: item.notes || "-" })
                        ]
                    }),
                ]
            }));
        }

        elements.push(new Table({
            rows: rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
        }));
    }

    return elements;
}

function createRemediationTable(items: any[]): Table {
    const rows = [
        new TableRow({
            tableHeader: true,
            children: [
                new TableCell({ children: [new Paragraph({ text: "ID", run: { bold: true } })], width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
                new TableCell({ children: [new Paragraph({ text: "Gap Description", run: { bold: true } })], width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
                new TableCell({ children: [new Paragraph({ text: "Remediation Plan", run: { bold: true } })], width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
                new TableCell({ children: [new Paragraph({ text: "Priority", run: { bold: true } })], width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "E0E0E0" } }),
            ]
        })
    ];

    for (const item of items) {
        rows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: item.code })] }),
                new TableCell({ children: [new Paragraph({ text: `${item.name}: ${item.notes || "No notes provided."}` })] }),
                new TableCell({ children: [new Paragraph({ text: item.plan || "To be defined." })] }),
                new TableCell({ children: [new Paragraph({ text: (item.severity || "Low").toUpperCase() })] }),
            ]
        }));
    }

    if (items.length === 0) {
        rows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph("All controls implemented.")], columnSpan: 4 }),
            ]
        }));
    }

    return new Table({
        rows: rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'implemented': return "2E7D32"; // Green
        case 'not_applicable': return "616161"; // Grey
        case 'in_progress': return "F9A825"; // Yellow
        case 'partial': return "EF6C00"; // Orange
        case 'not_implemented': return "C62828"; // Red
        default: return "000000";
    }
}

function parseMarkdownToDocx(text: string): Paragraph[] {
    if (!text) return [new Paragraph({ text: "No content provided." })];

    // Split by newlines but keep paragraphs together if possible? 
    // LLM usually outputs distinct lines. 
    // We treat each line as a paragraph for simplicity which works for lists and headers.
    const lines = text.split('\n');

    return lines
        .filter(line => !line.toLowerCase().includes('gap analysis executive summary'))
        .map(line => {
            let cleaned = line.trim();
            if (!cleaned) return new Paragraph({ text: " " });


            let heading: any = undefined;
            let bullet: any = undefined;

            if (cleaned.startsWith('### ')) {
                heading = HeadingLevel.HEADING_3;
                cleaned = cleaned.substring(4);
            } else if (cleaned.startsWith('## ')) {
                heading = HeadingLevel.HEADING_2;
                cleaned = cleaned.substring(3);
            } else if (cleaned.startsWith('# ')) {
                heading = HeadingLevel.HEADING_1;
                cleaned = cleaned.substring(2);
            }

            // Check for Bold Header "Title:" pattern which LLM sometimes does instead of real headers
            // e.g. "**Maturity:**" at start

            if (!heading) {
                if (cleaned.startsWith('- ') || cleaned.startsWith('* ')) {
                    bullet = { level: 0 };
                    cleaned = cleaned.substring(2);
                } else if (cleaned.match(/^\d+\.\s/)) {
                    // Heuristic: Short numbered items "1. Overview" are likely headers
                    // Long numbered items are likely list content
                    if (cleaned.length < 60) {
                        heading = HeadingLevel.HEADING_3;
                    } else {
                        bullet = { level: 0 };
                    }
                }
            }


            // Bold parsing
            const parts = cleaned.split('**');
            const children = parts.map((part, i) => new TextRun({
                text: part,
                bold: i % 2 !== 0
            }));

            return new Paragraph({
                children: children,
                heading: heading,
                bullet: bullet,
                spacing: { after: 120 }
            });
        });
}

