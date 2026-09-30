/**
 * Answer library — reuse approved answers across questionnaires.
 *
 * When a questionnaire is marked `completed`, its non-empty answers become the
 * client's answer library. New questionnaires are matched against it (exact
 * normalized-text match first, then token-overlap similarity) so recurring
 * questions are answered consistently without re-drafting or re-paying LLM
 * spend. No extra tables: completed questionnaires ARE the library.
 *
 * The DB-reading wrapper is async + failure-tolerant; `pickBestMatch` and
 * `normalizeQuestionText` are pure and unit-tested.
 */
import { getDb } from "../../db";
import { questionnaires, questionnaireQuestions } from "../../schema";
import { and, eq, inArray, ne } from "drizzle-orm";

export interface LibraryEntry {
    questionText: string;
    answer: string;
    comment?: string | null;
    focusArea?: string | null;
    sourceQuestionnaireId: number;
    sourceQuestionnaireName: string;
}

export interface LibraryMatch {
    question: string;
    answer: string;
    similarity: number; // 1 for exact normalized match, else token-overlap ratio
    sourceQuestionnaireId: number;
    sourceQuestionnaireName: string;
    focusArea?: string | null;
}

/** Lowercase, collapse whitespace, strip trailing punctuation/question marks. */
export function normalizeQuestionText(text: string): string {
    return (text || "")
        .toLowerCase()
        .trim()
        .replace(/[?.,;:!]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Content tokens shared with stopwords removed (for overlap scoring). */
function tokenize(text: string): Set<string> {
    const STOP = new Set([
        "do", "does", "is", "are", "the", "you", "your", "a", "an", "of", "and",
        "or", "to", "for", "in", "on", "with", "have", "has", "what", "how",
        "all", "any", "at", "by", "it", "its", "be", "been", "was", "were",
    ]);
    return new Set(
        normalizeQuestionText(text)
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length > 1 && !STOP.has(t))
    );
}

/**
 * Jaccard-style token overlap between two questions (0..1). Pure.
 */
export function questionSimilarity(a: string, b: string): number {
    const ta = tokenize(a);
    const tb = tokenize(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    let shared = 0;
    for (const t of ta) if (tb.has(t)) shared++;
    return shared / (ta.size + tb.size - shared);
}

/** Minimum similarity for a fuzzy (non-exact) library hit. */
export const LIBRARY_MATCH_THRESHOLD = 0.62;

/**
 * Name of the per-client system questionnaire that stores hand-curated
 * Master Answer Profile entries (created lazily by the questionnaire
 * router's library.* procedures). Curated entries always outrank derived
 * ones on equal match quality.
 */
export const MASTER_LIBRARY_QUESTIONNAIRE_NAME = "__master_answer_library__";

/**
 * Pick the best library entry for a question. Pure.
 * Exact normalized-text match wins; otherwise the highest-similarity entry
 * at or above LIBRARY_MATCH_THRESHOLD. Returns null when nothing matches.
 */
export function pickBestMatch(questionText: string, library: LibraryEntry[]): LibraryMatch | null {
    if (!questionText || !Array.isArray(library) || library.length === 0) return null;

    const needle = normalizeQuestionText(questionText);
    if (!needle) return null;

    let best: LibraryMatch | null = null;
    let bestScore = 0;

    for (const entry of library) {
        if (!entry?.answer || !entry.answer.trim()) continue;
        const normalizedEntry = normalizeQuestionText(entry.questionText);
        let score = 0;
        if (normalizedEntry === needle) {
            score = 1;
        } else {
            const sim = questionSimilarity(needle, normalizedEntry);
            score = sim >= LIBRARY_MATCH_THRESHOLD ? sim : 0;
        }
        if (score > bestScore) {
            bestScore = score;
            best = {
                question: entry.questionText,
                answer: entry.answer,
                similarity: score,
                sourceQuestionnaireId: entry.sourceQuestionnaireId,
                sourceQuestionnaireName: entry.sourceQuestionnaireName,
                focusArea: entry.focusArea ?? null,
            };
        }
        if (bestScore === 1) break; // exact match can't be beaten
    }

    return best;
}

/**
 * Load the client's answer library (answers from completed questionnaires)
 * and match each incoming question against it. Never throws: on DB failure
 * an empty match set is returned and callers fall through to LLM/human.
 *
 * Only INBOUND questionnaires feed the library: their answers describe the
 * client organization itself. Outbound (vendor assessment) answers describe
 * a third party — reusing those as the client's own answers would leak
 * vendor data into the client's responses.
 */
export async function findLibraryMatches(
    clientId: number,
    questions: { questionId: string; questionText: string }[],
    excludeQuestionnaireId?: number
): Promise<Map<string, LibraryMatch>> {
    const matches = new Map<string, LibraryMatch>();
    if (!clientId || !Array.isArray(questions) || questions.length === 0) return matches;

    try {
        const db = await getDb();
        if (!db) return matches;

        const completed = await db
            .select({ id: questionnaires.id, name: questionnaires.name })
            .from(questionnaires)
            .where(
                excludeQuestionnaireId
                    ? and(
                          eq(questionnaires.clientId, clientId),
                          eq(questionnaires.direction, "inbound"),
                          eq(questionnaires.status, "completed"),
                          ne(questionnaires.id, excludeQuestionnaireId)
                      )
                    : and(
                          eq(questionnaires.clientId, clientId),
                          eq(questionnaires.direction, "inbound"),
                          eq(questionnaires.status, "completed")
                      )
            )
            .limit(50);

        if (completed.length === 0) return matches;

        // Curated Master Answer Profile entries come first in the corpus —
        // pickBestMatch keeps the first-seen entry on equal similarity, so
        // hand-curated answers outrank questionnaire-derived ones.
        const [libraryQuestionnaire] = await db
            .select({ id: questionnaires.id })
            .from(questionnaires)
            .where(
                and(
                    eq(questionnaires.clientId, clientId),
                    eq(questionnaires.name, MASTER_LIBRARY_QUESTIONNAIRE_NAME)
                )
            )
            .limit(1);

        const rows = await db
            .select({
                questionnaireId: questionnaireQuestions.questionnaireId,
                questionId: questionnaireQuestions.questionId,
                question: questionnaireQuestions.question,
                answer: questionnaireQuestions.answer,
                comment: questionnaireQuestions.comment,
                focusArea: questionnaireQuestions.focusArea,
            })
            .from(questionnaireQuestions)
            .where(
                inArray(
                    questionnaireQuestions.questionnaireId,
                    completed.map((c) => c.id)
                )
            )
            .limit(5000);

        const nameById = new Map<number, string>(
            completed.map((c) => [Number(c.id), String(c.name ?? "") ] as const)
        );
        const toEntry = (r: (typeof rows)[number], sourceName: string): LibraryEntry => ({
            questionText: r.question,
            answer: r.answer as string,
            comment: r.comment,
            focusArea: r.focusArea,
            sourceQuestionnaireId: r.questionnaireId,
            sourceQuestionnaireName: sourceName,
        });

        const library: LibraryEntry[] = [];
        if (libraryQuestionnaire) {
            for (const r of rows.filter(
                (x) => x.questionnaireId === libraryQuestionnaire.id && (x.answer || "").trim().length > 0
            )) {
                library.push(toEntry(r, "Master Answer Profile"));
            }
        }
        for (const r of rows) {
            if (libraryQuestionnaire && r.questionnaireId === libraryQuestionnaire.id) continue;
            if ((r.answer || "").trim().length === 0) continue;
            library.push(toEntry(r, nameById.get(r.questionnaireId) || `Questionnaire #${r.questionnaireId}`));
        }

        for (const q of questions) {
            if (!q?.questionText) continue;
            const match = pickBestMatch(q.questionText, library);
            if (match) matches.set(q.questionId, match);
        }
    } catch {
        // Library is best-effort; answering proceeds without it.
    }

    return matches;
}
