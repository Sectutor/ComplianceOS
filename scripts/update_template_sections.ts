
import 'dotenv/config';
import { getDb } from '../db';
import { policyTemplates } from '../schema';
import { eq } from 'drizzle-orm';

const REQUIRED_SECTIONS = [
    { name: "Terms and Definitions", position: "after_scope" },
    { name: "Policy Requirements/Statements", position: "core" }, // Replaces "Policy Statement"
    { name: "Enforcement/Violations", position: "end" }, // Replaces "Enforcement"
    { name: "Review/Approval", position: "last" }
];

async function run() {
    const db = await getDb();
    const templates = await db.select().from(policyTemplates);

    let updatedCount = 0;

    for (const t of templates) {
        try {
            let sections: string[] = Array.isArray(t.sections) ? (t.sections as string[]) : [];
            if (!sections) sections = [];
            // Ensure all elements are strings
            sections = sections.map(s => String(s || ""));

            let modified = false;

            // 1. Terms and Definitions - After Scope
            if (!sections.some(s => s.toLowerCase().includes("terms") || s.toLowerCase().includes("definitions"))) {
                const scopeIndex = sections.findIndex(s => s.toLowerCase() === "scope");
                if (scopeIndex !== -1) {
                    sections.splice(scopeIndex + 1, 0, "Terms and Definitions");
                } else {
                    // If no scope, put it at index 2 (usually after Purpose)
                    sections.splice(1, 0, "Terms and Definitions");
                }
                modified = true;
            }

            // 2. Policy Requirements/Statements - Replaces "Policy Statement" or adds it
            const stmtIndex = sections.findIndex(s => s.toLowerCase().includes("policy statement") || s.toLowerCase().includes("requirements"));
            if (stmtIndex !== -1) {
                // Rename if it's strict "Policy Statement" or slightly different, to match user request?
                // User said "Insert... where they do not appear". 
                // If "Policy Statement" appears, does it count?
                // "Policy Requirements/Statements" is a specific title.
                // I will rename "Policy Statement" to "Policy Requirements/Statements" for consistency.
                if (sections[stmtIndex] !== "Policy Requirements/Statements") {
                    sections[stmtIndex] = "Policy Requirements/Statements";
                    modified = true;
                }
            } else {
                // Add after Terms (which we just looked at) or after Scope
                // Usually index 3 or 4.
                const termsIndex = sections.findIndex(s => s === "Terms and Definitions");
                if (termsIndex !== -1) {
                    sections.splice(termsIndex + 1, 0, "Policy Requirements/Statements");
                } else {
                    sections.push("Policy Requirements/Statements");
                }
                modified = true;
            }

            // 3. Enforcement/Violations
            const enfIndex = sections.findIndex(s => s.toLowerCase().includes("enforcement") || s.toLowerCase().includes("violations"));
            if (enfIndex !== -1) {
                if (sections[enfIndex] !== "Enforcement/Violations") {
                    sections[enfIndex] = "Enforcement/Violations";
                    modified = true;
                }
            } else {
                // Add near end
                sections.push("Enforcement/Violations");
                modified = true;
            }

            // 4. Review/Approval
            if (!sections.some(s => s.toLowerCase().includes("review") && s.toLowerCase().includes("approval"))) {
                // "Review" might exist (I saw "Review" in some fallbacks).
                // Let's normalize to "Review/Approval"
                const reviewIndex = sections.findIndex(s => s.toLowerCase() === "review");
                if (reviewIndex !== -1) {
                    sections[reviewIndex] = "Review/Approval";
                } else {
                    sections.push("Review/Approval");
                }
                modified = true;
            }

            if (modified) {
                await db.update(policyTemplates)
                    .set({ sections: sections })
                    .where(eq(policyTemplates.id, t.id));
                updatedCount++;
                console.log(`Updated: ${t.name}`);
            }
        } catch (e) {
            console.error(`Error processing template ${t.name}:`, e);
        }
    }
}

run().catch(console.error);
