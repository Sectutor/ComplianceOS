/**
 * Scoping & Readiness Assessment Blueprint DOCX Generator
 * Converts AI-generated scoping reports and discovery summaries into clean, corporate Word documents.
 */
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    Header,
    Footer,
    PageNumber
} from "docx";
import { saveAs } from "file-saver";
import { parseMarkdownToDocx } from "./markdown-parser";
import { getBcpStyles } from "./bcp-styles";

export interface ScopingReportDocxOptions {
    reportMarkdown: string;
    standardId: string;
    clientName?: string;
    organizationName?: string;
    generatedAt?: Date | string;
}

const BRAND_PRIMARY = "1E3A8A"; // Slate / Indigo Deep Blue
const BRAND_SECONDARY = "4F46E5"; // Indigo

export async function generateScopingReportDocx(options: ScopingReportDocxOptions): Promise<void> {
    const {
        reportMarkdown,
        standardId,
        clientName,
        organizationName = clientName || "Organization",
        generatedAt = new Date()
    } = options;

    if (!reportMarkdown || !reportMarkdown.trim()) {
        throw new Error("Cannot generate DOCX: report content is empty");
    }

    const styles = getBcpStyles();
    const formattedDate = typeof generatedAt === 'string' ? generatedAt : generatedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const header = new Header({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: `CONFIDENTIAL | READINESS ASSESSMENT BLUEPRINT (${standardId})`,
                        size: 16,
                        color: "94A3B8"
                    }),
                ],
                alignment: AlignmentType.RIGHT,
            }),
        ],
    });

    const footer = new Footer({
        children: [
            new Paragraph({
                children: [
                    new TextRun({ text: `${organizationName} - ${standardId} Scoping Report | `, size: 18, color: "64748B" }),
                    new TextRun({
                        children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                        size: 18,
                        color: "64748B"
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
        ],
    });

    const docChildren: any[] = [];

    // --- COVER / HEADER SECTION ---
    docChildren.push(new Paragraph({ text: "", spacing: { before: 1800 } }));

    docChildren.push(new Paragraph({
        children: [
            new TextRun({
                text: "EXECUTIVE COMPLIANCE BLUEPRINT",
                size: 20,
                bold: true,
                color: BRAND_SECONDARY,
                allCaps: true,
            })
        ],
        spacing: { after: 180 }
    }));

    docChildren.push(new Paragraph({
        children: [
            new TextRun({
                text: `${standardId} Readiness Assessment & Scoping Report`,
                size: 52,
                bold: true,
                color: BRAND_PRIMARY,
            })
        ],
        spacing: { after: 360 }
    }));

    // Metadata Summary Box / Table
    const metaTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Client / Organization: ", bold: true, size: 20 }),
                                    new TextRun({ text: organizationName, size: 20 }),
                                ]
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Target Framework: ", bold: true, size: 20 }),
                                    new TextRun({ text: standardId, size: 20 }),
                                ]
                            })
                        ],
                        shading: { fill: "F8FAFC" },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                            left: { style: BorderStyle.SINGLE, size: 4, color: BRAND_SECONDARY },
                            right: { style: BorderStyle.NONE }
                        }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Generated Date: ", bold: true, size: 20 }),
                                    new TextRun({ text: formattedDate, size: 20 }),
                                ]
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Assessment Status: ", bold: true, size: 20 }),
                                    new TextRun({ text: "Discovery & Scoping Draft", size: 20, color: "059669", bold: true }),
                                ]
                            })
                        ],
                        shading: { fill: "F8FAFC" },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }
                        }
                    })
                ]
            })
        ]
    });
    docChildren.push(metaTable);

    docChildren.push(new Paragraph({
        children: [new TextRun({ text: "", break: 1 })],
        pageBreakBefore: true
    }));

    // --- CONVERT MARKDOWN CONTENT ---
    const parsedBody = parseMarkdownToDocx(reportMarkdown);
    docChildren.push(...parsedBody);

    // --- CREATE DOCUMENT ---
    const doc = new Document({
        styles: styles,
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                }
            },
            headers: { default: header },
            footers: { default: footer },
            children: docChildren,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const cleanStandard = standardId.replace(/[^a-z0-9]/gi, '_');
    const filename = `${cleanStandard}_Readiness_Blueprint_${new Date().toISOString().slice(0, 10)}.docx`;
    saveAs(blob, filename);
}
