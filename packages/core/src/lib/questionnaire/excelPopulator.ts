import * as XLSX from 'xlsx';
import { generateQuestionAnswer, ClientSecurityContext, AnsweredQuestion } from '../ai/questionnaireAutoResponder';

export interface ParsedQuestionItem {
  questionId: string;
  question: string;
  focusArea?: string;
  subFocusArea?: string;
  rowIndex?: number;
}

export interface WorkbookPopulationResult {
  success: boolean;
  populatedBase64: string;
  filename: string;
  sheetName: string;
  totalQuestions: number;
  populatedCount: number;
  preview: AnsweredQuestion[];
  detectedColumns: {
    questionCol: string;
    responseCol: string;
    detailsCol?: string;
  };
}

/**
 * Parse lines of text (from copy-pasted spreadsheet or plaintext) into questions.
 */
export function parseTextQuestions(text: string): ParsedQuestionItem[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const results: ParsedQuestionItem[] = [];

  let idx = 1;
  for (const line of lines) {
    // If it is a TSV/CSV row pasted from Excel
    if (line.includes('\t') || line.includes(',')) {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const cleanParts = parts.map(p => p.trim().replace(/^[\"']|[\"']$/g, ''));
      
      // Find the longest column as the question text
      const longestPart = cleanParts.reduce((a, b) => (b.length > a.length ? b : a), '');
      if (longestPart.length > 5 && !/^(id|question|#|no|item)$/i.test(longestPart)) {
        const idCol = cleanParts.find(p => /^(Q[0-9]+|[0-9]+|[A-Z]+-[0-9]+)/i.test(p)) || `Q${idx}`;
        results.push({
          questionId: idCol,
          question: longestPart,
          focusArea: cleanParts.length > 2 ? cleanParts[0] : 'General',
          rowIndex: idx,
        });
        idx++;
        continue;
      }
    }

    // Match standard numbered questions like "1. Does your organization..." or "Q1: Are all..."
    const match = line.match(/^(?:Q?\s*(\d+|[A-Z]+-[0-9]+)[.:)]?\s*)?(.*)$/i);
    const questionText = match && match[2] ? match[2].trim() : line;
    const qId = match && match[1] ? `Q${match[1]}` : `Q${idx}`;

    if (questionText.length > 5 && !/^(questions?|requirements?|control)$/i.test(questionText)) {
      results.push({
        questionId: qId,
        question: questionText,
        focusArea: 'General',
        rowIndex: idx,
      });
      idx++;
    }
  }

  return results;
}

/**
 * Parse an uploaded document buffer (XLSX, XLS, CSV, TXT) into a list of questions.
 */
export function parseDocumentBuffer(
  fileBuffer: Buffer,
  filename: string = 'questionnaire.xlsx'
): { questions: ParsedQuestionItem[]; sheetName?: string } {
  const isTxt = /\.txt$/i.test(filename);
  const isCsv = /\.csv$/i.test(filename);

  if (isTxt) {
    return { questions: parseTextQuestions(fileBuffer.toString('utf-8')) };
  }

  if (isCsv) {
    const text = fileBuffer.toString('utf-8');
    return { questions: parseTextQuestions(text) };
  }

  // Parse as Excel Workbook
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return { questions: [] };
    }

    // Find the best sheet (e.g. named 'CAIQ', 'Questions', 'Assessment', or the first non-empty sheet)
    let selectedSheetName = sheetNames[0];
    for (const name of sheetNames) {
      if (/caiq|question|assessment|vsa|sig|controls/i.test(name)) {
        selectedSheetName = name;
        break;
      }
    }

    const worksheet = workbook.Sheets[selectedSheetName];
    if (!worksheet) return { questions: [] };

    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) return { questions: [] };

    // Detect header row (first row with keywords)
    let headerRowIdx = 0;
    let questionColIdx = -1;
    let categoryColIdx = -1;
    let idColIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toLowerCase().trim();
        if (/^(question|question text|requirement|control specification|control description|inquiry|item description)$/i.test(val)) {
          questionColIdx = c;
          headerRowIdx = r;
        } else if (/^(category|domain|focus area|section|control domain)$/i.test(val)) {
          categoryColIdx = c;
        } else if (/^(id|question id|control id|ref|item #|item no)$/i.test(val)) {
          idColIdx = c;
        }
      }
      if (questionColIdx !== -1) break;
    }

    // Fallback: If no explicit header matched, find the column with the highest average text length
    if (questionColIdx === -1) {
      let maxAvgLen = 0;
      const colLengths: number[] = [];
      const colCounts: number[] = [];

      for (let r = 0; r < Math.min(rows.length, 20); r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const len = String(row[c] || '').length;
          colLengths[c] = (colLengths[c] || 0) + len;
          colCounts[c] = (colCounts[c] || 0) + 1;
        }
      }

      for (let c = 0; c < colLengths.length; c++) {
        const avg = (colLengths[c] || 0) / (colCounts[c] || 1);
        if (avg > maxAvgLen && avg > 15) {
          maxAvgLen = avg;
          questionColIdx = c;
        }
      }
    }

    if (questionColIdx === -1) {
      return { questions: [], sheetName: selectedSheetName };
    }

    const questions: ParsedQuestionItem[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const qText = String(row[questionColIdx] || '').trim();
      if (qText && qText.length > 5 && !/^(n\/a|none|header)$/i.test(qText)) {
        const qId = idColIdx !== -1 && row[idColIdx] ? String(row[idColIdx]).trim() : `Q${questions.length + 1}`;
        const category = categoryColIdx !== -1 && row[categoryColIdx] ? String(row[categoryColIdx]).trim() : undefined;
        questions.push({
          questionId: qId,
          question: qText,
          focusArea: category,
          rowIndex: r,
        });
      }
    }

    return { questions, sheetName: selectedSheetName };
  } catch (err) {
    console.error('Error parsing Excel workbook buffer:', err);
    return { questions: [] };
  }
}

/**
 * In-Place Excel Populator:
 * Reads a base64 Excel workbook, detects questions, populates answers directly into
 * the original cells while preserving all formatting, formulas, and sheet structures,
 * and exports the modified workbook back to base64.
 */
export function populateWorkbookInPlace(
  fileBase64: string,
  context: ClientSecurityContext = {},
  options: { maxQuestions?: number; sheetName?: string } = {}
): WorkbookPopulationResult {
  const fileBuffer = Buffer.from(fileBase64, 'base64');
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellStyles: true, cellFormula: true });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Invalid Excel file: No sheets found in workbook.');
  }

  // Determine target worksheet
  let selectedSheetName = options.sheetName || sheetNames[0];
  if (!options.sheetName) {
    for (const name of sheetNames) {
      if (/caiq|question|assessment|vsa|sig|controls/i.test(name)) {
        selectedSheetName = name;
        break;
      }
    }
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    throw new Error(`Sheet '${selectedSheetName}' not found in workbook.`);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rows || rows.length === 0) {
    throw new Error(`Sheet '${selectedSheetName}' is empty.`);
  }

  // Detect header row and column mappings
  let headerRowIdx = 0;
  let questionColIdx = -1;
  let responseColIdx = -1;
  let detailsColIdx = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase().trim();
      if (/question|requirement|specification|inquiry/i.test(val) && !/category|domain/i.test(val)) {
        questionColIdx = c;
        headerRowIdx = r;
      } else if (/response|answer|status|compliance|yes[\s/_-]?no|implemented/i.test(val)) {
        responseColIdx = c;
      } else if (/comments?|details?|explanation|clarification|evidence|notes/i.test(val)) {
        detailsColIdx = c;
      }
    }
    if (questionColIdx !== -1 && (responseColIdx !== -1 || detailsColIdx !== -1)) break;
  }

  // Fallback: If no explicit question column header, find the column with the longest average length
  if (questionColIdx === -1) {
    let maxAvgLen = 0;
    const colLengths: number[] = [];
    const colCounts: number[] = [];

    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const len = String(row[c] || '').length;
        colLengths[c] = (colLengths[c] || 0) + len;
        colCounts[c] = (colCounts[c] || 0) + 1;
      }
    }

    for (let c = 0; c < colLengths.length; c++) {
      const avg = (colLengths[c] || 0) / (colCounts[c] || 1);
      if (avg > maxAvgLen && avg > 15) {
        maxAvgLen = avg;
        questionColIdx = c;
      }
    }

    if (questionColIdx === -1) {
      questionColIdx = 1; // Default column B
    }
  }

  // Fallback for response column: adjacent to question
  if (responseColIdx === -1) {
    responseColIdx = questionColIdx + 1;
    const headerCellAddress = XLSX.utils.encode_cell({ r: headerRowIdx, c: responseColIdx });
    if (!worksheet[headerCellAddress]) {
      worksheet[headerCellAddress] = { t: 's', v: 'Compliance Response' };
    }
  }

  // Fallback for details column: adjacent to response
  if (detailsColIdx === -1 || detailsColIdx === responseColIdx) {
    detailsColIdx = responseColIdx + 1;
    const detailsCellAddress = XLSX.utils.encode_cell({ r: headerRowIdx, c: detailsColIdx });
    if (!worksheet[detailsCellAddress]) {
      worksheet[detailsCellAddress] = { t: 's', v: 'Implementation Details / Evidence' };
    }
  }

  const maxQ = options.maxQuestions ?? 9999;
  let populatedCount = 0;
  const previewList: AnsweredQuestion[] = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    if (populatedCount >= maxQ) break;

    const row = rows[r] || [];
    const questionText = String(row[questionColIdx] || '').trim();

    if (questionText && questionText.length > 5) {
      const generated = generateQuestionAnswer(questionText, context);

      // Write Short Answer into Response cell
      const respCellAddr = XLSX.utils.encode_cell({ r, c: responseColIdx });
      worksheet[respCellAddr] = { t: 's', v: generated.shortAnswer };

      // Write Detailed Implementation + Evidence into Details cell
      const detailsCellAddr = XLSX.utils.encode_cell({ r, c: detailsColIdx });
      const fullDetail = `${generated.answer} [Evidence: ${generated.supportingEvidence}] [Policy: ${generated.policyCitation}]`;
      worksheet[detailsCellAddr] = { t: 's', v: fullDetail };

      previewList.push({
        questionId: `Q${populatedCount + 1}`,
        questionText,
        shortAnswer: generated.shortAnswer,
        answer: generated.answer,
        confidenceScore: generated.confidenceScore,
        supportingEvidence: generated.supportingEvidence,
        policyCitation: generated.policyCitation,
        focusArea: generated.focusArea,
      });

      populatedCount++;
    }
  }

  // Recalculate sheet range in case new columns were added
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
  range.e.c = Math.max(range.e.c, responseColIdx, detailsColIdx);
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // Write modified workbook to buffer
  const populatedBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return {
    success: true,
    populatedBase64: populatedBuffer.toString('base64'),
    filename: `Populated_${selectedSheetName}_Assessment.xlsx`,
    sheetName: selectedSheetName,
    totalQuestions: rows.length - (headerRowIdx + 1),
    populatedCount,
    preview: previewList,
    detectedColumns: {
      questionCol: XLSX.utils.encode_col(questionColIdx),
      responseCol: XLSX.utils.encode_col(responseColIdx),
      detailsCol: XLSX.utils.encode_col(detailsColIdx),
    },
  };
}
