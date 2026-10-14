import { LLMService } from "../llm/service";

export interface Soc2ReportAnalysis {
  vendorName: string;
  reportType: "SOC 2 Type II" | "SOC 2 Type I" | "SOC 3" | "ISO 27001" | "Other";
  auditorFirm: string;
  auditPeriod: string;
  opinion: "Unqualified (Clean)" | "Qualified" | "Adverse" | "Disclaimer" | "Undetermined";
  trustServicesCriteria?: string[];
  riskScore: number; // 0-100 (100 = cleanest/lowest risk)
  exceptionsIdentified: string[];
  cuecsRequired: string[]; // Complementary User Entity Controls
  structuredExceptions?: Array<{
    controlId?: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    remediationNotes?: string;
  }>;
  structuredCuecs?: Array<{
    cuecId?: string;
    requirement: string;
    suggestedControlCategory?: string;
  }>;
  summary: string;
  recommendedAction?: string;
}

type Soc2Opinion = Soc2ReportAnalysis["opinion"];
type Soc2ReportType = Soc2ReportAnalysis["reportType"];
type Soc2StructuredException = NonNullable<Soc2ReportAnalysis["structuredExceptions"]>[number];
type Soc2StructuredCuec = NonNullable<Soc2ReportAnalysis["structuredCuecs"]>[number];

const VALID_OPINIONS: readonly Soc2Opinion[] = ["Unqualified (Clean)", "Qualified", "Adverse", "Disclaimer", "Undetermined"];
const VALID_REPORT_TYPES: readonly Soc2ReportType[] = ["SOC 2 Type II", "SOC 2 Type I", "SOC 3", "ISO 27001", "Other"];

/** Fallback text used when the report signals exceptions but no specific sentence could be extracted. */
export const EXCEPTIONS_MANUAL_REVIEW = "Exceptions indicated in report; manual review required";

const EXCEPTION_PATTERN_SOURCE = String.raw`\bexceptions?\s+(?:were\s+|was\s+)?noted\b|\bdeviations?\s+(?:were\s+|was\s+)?noted\b|\bexceptions?\s*:|\btest\s+results?\s*:\s*exception`;
/** True if a non-negated exception phrase occurs in the text ("No exceptions noted" does not count). */
function hasNonNegatedException(text: string): boolean {
  const re = new RegExp(EXCEPTION_PATTERN_SOURCE, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (!/\b(?:no|without|zero|not)\s+(?:\w+\s+){0,3}$/i.test(before)) return true;
  }
  return false;
}
const CONTROL_ID_PATTERN = /\b(CC\d{1,2}\.\d{1,2}|A\d{1,2}\.\d{1,2}|PI\d{1,2}\.\d{1,2}|C\d{1,2}\.\d{1,2}|P\d{1,2}\.\d{1,2})\b/;

function detectAuditorFirm(textLower: string): string {
  if (textLower.includes("a-lign")) return "A-LIGN CPAs";
  if (textLower.includes("schellman")) return "Schellman & Company, LLC";
  if (textLower.includes("pricewaterhousecoopers") || /\bpwc\b/.test(textLower)) return "PwC (PricewaterhouseCoopers)";
  if (textLower.includes("ernst & young") || textLower.includes("ernst and young") || /\bey\b/.test(textLower)) return "Ernst & Young (EY)";
  if (textLower.includes("deloitte")) return "Deloitte & Touche LLP";
  if (/\bkpmg\b/.test(textLower)) return "KPMG LLP";
  if (/\bbdo\b/.test(textLower)) return "BDO USA";
  if (textLower.includes("grant thornton")) return "Grant Thornton";
  if (textLower.includes("moss adams")) return "Moss Adams LLP";
  return "Auditor not identified (manual review required)";
}

function detectOpinion(textLower: string): Soc2Opinion {
  if (textLower.includes("disclaimer of opinion") || textLower.includes("do not express an opinion")) return "Disclaimer";
  if (textLower.includes("adverse opinion") || textLower.includes("do not present fairly") || textLower.includes("does not present fairly")) return "Adverse";
  if (/(?<!un)qualified opinion/.test(textLower) || /except for the (?:matter|matters|effects?)\b/.test(textLower)) return "Qualified";
  if (textLower.includes("unqualified opinion")) return "Unqualified (Clean)";
  if (textLower.includes("in our opinion") && /presents? fairly|operated effectively|suitably designed/.test(textLower)) return "Unqualified (Clean)";
  return "Undetermined";
}

function detectReportType(textLower: string): Soc2ReportType {
  if (/\bsoc\s*3\b/.test(textLower)) return "SOC 3";
  if (/\btype\s*(?:ii|2)\b/.test(textLower)) return "SOC 2 Type II";
  if (/\btype\s*(?:i|1)\b/.test(textLower)) return "SOC 2 Type I";
  if (/\biso(?:\/iec)?\s*27001\b/.test(textLower) && !/\bsoc\s*2\b/.test(textLower)) return "ISO 27001";
  return "Other";
}

function detectTrustServicesCriteria(reportText: string): string[] {
  // Only look at lines that talk about criteria, so a stray "security" or "privacy" elsewhere doesn't count.
  const criteriaLines = reportText
    .split(/\r?\n/)
    .filter((line) => /trust services criteria|\bcriteria\b|common criteria/i.test(line))
    .join(" ")
    .toLowerCase();
  const found: string[] = [];
  if (/\bsecurity\b|common criteria/.test(criteriaLines)) found.push("Security (Common Criteria)");
  if (/\bavailability\b/.test(criteriaLines)) found.push("Availability");
  if (/\bconfidentiality\b/.test(criteriaLines)) found.push("Confidentiality");
  if (/processing integrity/.test(criteriaLines)) found.push("Processing Integrity");
  if (/\bprivacy\b/.test(criteriaLines)) found.push("Privacy");
  return found;
}

function splitSentences(reportText: string): string[] {
  return reportText
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z(])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function extractExceptions(reportText: string): Soc2StructuredException[] {
  const results: Soc2StructuredException[] = [];
  const seen = new Set<string>();
  const sentences = splitSentences(reportText);
  sentences.forEach((sentence, i) => {
    if (!hasNonNegatedException(sentence)) return;
    // A bare "Exception noted." carries no detail, so include the following sentence.
    const full = sentence.length < 60 && i + 1 < sentences.length ? `${sentence} ${sentences[i + 1]}` : sentence;
    const description = full.length > 400 ? `${full.slice(0, 397)}...` : full;
    if (seen.has(description)) return;
    seen.add(description);
    const idMatch = sentence.match(CONTROL_ID_PATTERN) || (i > 0 ? sentences[i - 1].match(CONTROL_ID_PATTERN) : null);
    results.push({
      ...(idMatch ? { controlId: idMatch[1] } : {}),
      description,
      severity: "medium",
    });
  });
  return results;
}

function extractCuecs(reportText: string): string[] {
  const lines = reportText.split(/\r?\n/);
  const headingIdx = lines.findIndex((l) => /complementary\s+user\s+entity\s+controls?/i.test(l));
  if (headingIdx === -1) return [];
  const cuecs: string[] = [];
  const headingRest = lines[headingIdx].split(/complementary\s+user\s+entity\s+controls?\s*(?:\(cuecs?\))?\s*:?/i)[1]?.trim();
  if (headingRest && headingRest.length > 10) cuecs.push(headingRest);
  for (let i = headingIdx + 1; i < lines.length && cuecs.length < 50; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (cuecs.length > 0) break;
      continue;
    }
    // Stop at the next section heading.
    if (/^section\s+[ivx\d]+\b/i.test(line) || /^[A-Z][A-Z0-9 &'\-]{6,}:?$/.test(line) || (/:$/.test(line) && !/^[-*\u2022\d]/.test(line))) break;
    const cleaned = line.replace(/^(?:[-*\u2022]|\d+[.)])\s*/, "").trim();
    if (cleaned.length > 0) cuecs.push(cleaned);
  }
  return cuecs;
}

/**
 * Heuristic fallback parser when LLM is unavailable or offline.
 * Only reports what it can find in the text; it never invents findings.
 */
function parseHeuristically(reportText: string, vendorName: string): Soc2ReportAnalysis {
  const textLower = reportText.toLowerCase();

  const auditorFirm = detectAuditorFirm(textLower);
  const opinion = detectOpinion(textLower);
  const reportType = detectReportType(textLower);

  const periodMatch = reportText.match(/(?:for the period|period from)\s+([A-Za-z]+ \d{1,2},? \d{4})\s+(?:to|through)\s+([A-Za-z]+ \d{1,2},? \d{4})/i);
  const auditPeriod = periodMatch ? `${periodMatch[1]} \u2013 ${periodMatch[2]}` : "Audit period not identified (manual review required)";

  const trustServicesCriteria = detectTrustServicesCriteria(reportText);

  const structuredExceptions = extractExceptions(reportText);
  // Exceptions signalled in the text (e.g. a phrase split across lines) but no sentence could be extracted
  const exceptionsSignalled = structuredExceptions.length === 0 && hasNonNegatedException(reportText.replace(/\s+/g, " "));
  const exceptionsIdentified: string[] = structuredExceptions.length > 0
    ? structuredExceptions.map((e) => (e.controlId ? `${e.controlId}: ${e.description}` : e.description))
    : exceptionsSignalled
      ? [EXCEPTIONS_MANUAL_REVIEW]
      : [];

  const cuecsRequired = extractCuecs(reportText);
  const structuredCuecs: Soc2StructuredCuec[] = cuecsRequired.map((requirement, i) => ({
    cuecId: `CUEC-${String(i + 1).padStart(2, "0")}`,
    requirement,
  }));

  let riskScore = opinion === "Unqualified (Clean)" ? 95 : 50;
  if (opinion === "Qualified") riskScore = 70;
  if (opinion === "Adverse") riskScore = 45;
  if (opinion === "Disclaimer") riskScore = 35;
  riskScore -= Math.min(structuredExceptions.length, 4) * 10;
  if (exceptionsSignalled) riskScore -= 10;
  riskScore = Math.max(10, Math.min(100, riskScore));

  const notes: string[] = [];
  if (opinion === "Undetermined") notes.push("the auditor's opinion could not be determined");
  if (reportType === "Other") notes.push("the report type (Type I/II) could not be determined");
  if (trustServicesCriteria.length === 0) notes.push("the Trust Services Criteria in scope could not be identified");
  if (cuecsRequired.length === 0) notes.push("no Complementary User Entity Controls (CUECs) section was found, so the CUECs need manual review");
  if (exceptionsSignalled) notes.push("exceptions are indicated but could not be extracted");

  const exceptionText = structuredExceptions.length > 0
    ? `${structuredExceptions.length} exception statement(s) extracted from the text`
    : exceptionsSignalled ? "exceptions indicated but not extracted" : "no exception statements found in the text";

  const summary = `Heuristic, low-confidence assessment of ${vendorName} (automated keyword extraction; AI analysis was unavailable). ` +
    `Opinion: ${opinion}. Report type: ${reportType}. Auditor: ${auditorFirm}. ${exceptionText[0].toUpperCase()}${exceptionText.slice(1)}; ${cuecsRequired.length} CUEC(s) extracted. ` +
    `Indicative score: ${riskScore}/100.` +
    (notes.length ? ` Manual review required: ${notes.join("; ")}.` : " Verify all findings against the full report.");

  const needsManualReview = opinion === "Undetermined" || exceptionsSignalled || cuecsRequired.length === 0;
  const recommendedAction = needsManualReview
    ? "Manual review of the full audit report is required before approving this vendor."
    : riskScore >= 70
      ? "Provisionally acceptable based on a heuristic review. Confirm the findings and your CUEC obligations against the full report before approval."
      : "Elevate vendor to high-scrutiny review: the report indicates a modified opinion or exceptions.";

  return {
    vendorName,
    reportType,
    auditorFirm,
    auditPeriod,
    opinion,
    trustServicesCriteria,
    riskScore,
    exceptionsIdentified,
    cuecsRequired,
    structuredExceptions,
    structuredCuecs,
    summary,
    recommendedAction,
  };
}

/**
 * AI Vendor SOC 2 PDF Report Parser & Risk Evaluator Service
 * Leverages LLMService for deep audit extraction with heuristic fallback
 */
export async function evaluateVendorSoc2Report(
  reportText: string,
  vendorName: string
): Promise<Soc2ReportAnalysis> {
  if (!reportText || reportText.trim().length < 50) {
    return parseHeuristically(reportText || "", vendorName);
  }

  try {
    const llm = new LLMService();

    const systemPrompt = `You are an expert Third-Party Risk Management (TPRM) auditor and CPA specializing in AICPA SOC 2 (Type I & Type II) and ISO 27001 audit examinations.
Your task is to analyze the provided text of a vendor's security audit report and extract structured, verified compliance findings.
Respond ONLY with a valid JSON object matching the following TypeScript interface (no markdown fences, no explanatory text):

{
  "vendorName": string,
  "reportType": "SOC 2 Type II" | "SOC 2 Type I" | "SOC 3" | "ISO 27001" | "Other",
  "auditorFirm": string,
  "auditPeriod": string,
  "opinion": "Unqualified (Clean)" | "Qualified" | "Adverse" | "Disclaimer" | "Undetermined", // use "Undetermined" if the opinion is not stated in the text
  "trustServicesCriteria": string[],
  "riskScore": number, // 0 to 100 where 100 is cleanest/safest, 0 is critical risk
  "exceptionsIdentified": string[], // Human-readable descriptions of exceptions
  "cuecsRequired": string[], // Complementary User Entity Controls expected of the customer
  "structuredExceptions": [
    {
      "controlId": string,
      "description": string,
      "severity": "low" | "medium" | "high" | "critical",
      "remediationNotes": string
    }
  ],
  "structuredCuecs": [
    {
      "cuecId": string,
      "requirement": string,
      "suggestedControlCategory": string
    }
  ],
  "summary": string, // Executive summary of the audit findings (2-3 sentences)
  "recommendedAction": string // Clear actionable guidance for the CISO / Vendor Risk Manager
}`;

    // Feed up to 20,000 characters to capture Auditor's Report, Opinion, Exceptions, and CUEC sections
    const trimmedText = reportText.slice(0, 20000);
    const userPrompt = `Vendor Name: ${vendorName}\n\nExamine the following audit report text and extract the audit details:\n\n${trimmedText}`;

    const response = await llm.generate(
      {
        systemPrompt,
        userPrompt,
        feature: "vendor_soc2_review",
        maxTokens: 3500,
        temperature: 0.1,
      },
      { endpoint: "evaluate_vendor_soc2" }
    );

    const cleanText = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    // Validate and normalize fields
    return {
      vendorName: parsed.vendorName || vendorName,
      reportType: VALID_REPORT_TYPES.includes(parsed.reportType) ? parsed.reportType : "Other",
      auditorFirm: parsed.auditorFirm || "Auditor not identified (manual review required)",
      auditPeriod: parsed.auditPeriod || "Audit period not identified (manual review required)",
      opinion: VALID_OPINIONS.includes(parsed.opinion) ? parsed.opinion : "Undetermined",
      trustServicesCriteria: Array.isArray(parsed.trustServicesCriteria) ? parsed.trustServicesCriteria : [],
      // Missing score -> conservative midpoint, not an optimistic default
      riskScore: typeof parsed.riskScore === "number" && Number.isFinite(parsed.riskScore) ? Math.max(10, Math.min(100, parsed.riskScore)) : 50,
      exceptionsIdentified: Array.isArray(parsed.exceptionsIdentified) ? parsed.exceptionsIdentified : [],
      cuecsRequired: Array.isArray(parsed.cuecsRequired) ? parsed.cuecsRequired : [],
      structuredExceptions: Array.isArray(parsed.structuredExceptions) ? parsed.structuredExceptions : [],
      structuredCuecs: Array.isArray(parsed.structuredCuecs) ? parsed.structuredCuecs : [],
      summary: parsed.summary || `AI review of the ${vendorName} audit report returned no summary; manual review required.`,
      recommendedAction: parsed.recommendedAction || "Manual review of the full audit report is required before approving this vendor.",
    };
  } catch (err) {
    console.warn(`[soc2PdfParser] LLM extraction encountered an error; falling back to heuristic engine:`, err);
    return parseHeuristically(reportText, vendorName);
  }
}
