import fs from 'fs';
import path from 'path';

const routerPath = path.join(process.cwd(), 'routers.ts');
const backupPath = path.join(process.cwd(), 'routers.ts.bak');

if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(routerPath, backupPath);
}

const content = fs.readFileSync(routerPath, 'utf-8');
const lines = content.split('\n');

interface KeyInfo {
    key: string;
    startLine: number;
    endLine: number;
}

const keys: KeyInfo[] = [];
let inAppRouter = false;
let braceDepth = 0;
let parenDepth = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('export const appRouter = router({')) {
        inAppRouter = true;
        braceDepth = 1;
        continue;
    }

    if (!inAppRouter) continue;

    const currentBraces = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    const currentParens = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;

    // Check for key at START of line (depth 1)
    if (braceDepth === 1 && parenDepth === 0) {
        const keyMatch = line.match(/^\s+([a-zA-Z0-9_]+):/);
        if (keyMatch) {
            // Found a key. Determine its range.
            const key = keyMatch[1];
            const startLine = i;

            // Calculate range
            let localBrace = 0;
            let localParen = 0;
            let endLine = i;

            for (let j = i; j < lines.length; j++) {
                const l = lines[j];
                localBrace += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
                localParen += (l.match(/\(/g) || []).length - (l.match(/\)/g) || []).length;

                // If balanced and ends with comma (or is valid end), wrap it up
                // But simple heuristic: if we are back to 0 balance (relative to start) AND we hit a comma, or just 0 balance if next line is a new key?
                // Actually, since we started at Depth 1, we just need to verify we consumed the value.

                // Logic: value is balanced.
                // If line ends with `,`, and we are balanced, that's the end.

                // Note: localBrace starts include the current line.

                if (localBrace === 0 && localParen === 0) {
                    endLine = j;
                    // If this line has a comma at the end (ignoring comments), we are good.
                    // If not, maybe it continues? (e.g. `foo: bar \n + baz`)
                    // But in this file, new keys start on new lines.
                    // So if we are balanced, we are likely done.
                    break;
                }
            }
            keys.push({ key, startLine, endLine });

            // Advance i to endLine to avoid re-parsing inside
            // Actually, we must track global depth.
            // So we shouldn't skip lines in the main loop logic if we rely on global braceDepth.

            // Let's just track global depth correctly and identify keys only when depth is 1.
            // We don't need 'endLine' immediately logic if we just scan linearly?
            // No, to delete, we need ranges.

            // Re-eval approach:
            // Linear scan.
            // When at Depth 1, if we see a key, mark Start.
            // Continue scanning. When we return to Depth 1 (after going deeper) OR stay at Depth 1 and see a comma...
            // Actually, easiest is:
            // Key starts at Line X.
            // Consume until we find the next Key at Depth 1 OR the end of `appRouter` block.
            // The "End" of previous key is Line Y-1? 
            // Yes, assuming no gaps/comments between keys relevant to the structure.

            // Let's try to map keys by their start lines.
            // End line is `nextKey.startLine - 1` (trimmed).

            // But `keys.push` logic above inside the loop is problematic if I mix range finding.
        }
    }

    braceDepth += currentBraces;
    parenDepth += currentParens;

    if (braceDepth === 0) {
        inAppRouter = false;
        break;
    }
}

// Re-process to get EndLines based on next key
// We need to capture the END of the router block too.
// The last key ends before the closing `});` of appRouter.
// We identified 'keys' list.
// Need to add "End of Router" as a virtual stop point?
// The loop finished when braceDepth returned to 0. That line number is the end.

// Refined Logic (2-pass):
// Pass 1: distinct keys and their start lines.
// And capture the 'appRouter' block end line.

const betterKeys: { key: string, startLine: number }[] = [];
let appRouterEndLine = 0;

inAppRouter = false;
braceDepth = 0;
parenDepth = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('export const appRouter = router({')) {
        inAppRouter = true;
        braceDepth = 1;
        continue;
    }
    if (!inAppRouter) continue;

    const currentBraces = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    const currentParens = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;

    // Check for key
    if (braceDepth === 1 && parenDepth === 0) {
        const keyMatch = line.match(/^\s+([a-zA-Z0-9_]+):/);
        if (keyMatch) {
            betterKeys.push({ key: keyMatch[1], startLine: i });
        }
    }

    braceDepth += currentBraces;
    parenDepth += currentParens;

    if (braceDepth === 0) {
        appRouterEndLine = i;
        inAppRouter = false;
        break;
    }
}

// Calculate ranges
const ranges: { key: string, start: number, end: number }[] = [];
for (let k = 0; k < betterKeys.length; k++) {
    const start = betterKeys[k].startLine;
    const nextStart = (k < betterKeys.length - 1) ? betterKeys[k + 1].startLine : appRouterEndLine;

    // The previous block ends just before the next start.
    // We should probably include trailing empty lines in the deletion (or not).
    // Let's say end = nextStart - 1.
    ranges.push({ key: betterKeys[k].key, start, end: nextStart - 1 });
}

// Identify duplicates
const counts: Record<string, number> = {};
betterKeys.forEach(k => counts[k.key] = (counts[k.key] || 0) + 1);
const duplicateKeys = Object.keys(counts).filter(k => counts[k] > 1);

const toDelete: { start: number, end: number, key: string }[] = [];

duplicateKeys.forEach(dupKey => {
    const occs = ranges.filter(r => r.key === dupKey);
    // Keep last one
    const toRemove = occs.slice(0, occs.length - 1);
    toRemove.forEach(r => toDelete.push({ start: r.start, end: r.end, key: dupKey }));
});

// Sort descending by start line to delete safely
toDelete.sort((a, b) => b.start - a.start);

let newLines = [...lines];

console.log(`Deleting ${toDelete.length} duplicate blocks...`);

toDelete.forEach(d => {
    console.log(`Deleting ${d.key} (Lines ${d.start + 1}-${d.end + 1})`);
    // Splice out
    // +1 to count because slice is start->end inclusive range logic (d.end - d.start + 1 lines)
    newLines.splice(d.start, d.end - d.start + 1);
});

fs.writeFileSync(routerPath, newLines.join('\n'));
console.log("Done.");
