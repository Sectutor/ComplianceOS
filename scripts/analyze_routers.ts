import fs from 'fs';
import path from 'path';

const routerPath = path.join(process.cwd(), 'routers.ts');
const content = fs.readFileSync(routerPath, 'utf-8');
const lines = content.split('\n');

const keys: { key: string, line: number }[] = [];
let inAppRouter = false;
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('export const appRouter = router({')) {
        inAppRouter = true;
        braceDepth = 1; // We assume { is on this line or just processed
        continue;
    }

    if (!inAppRouter) continue;

    // Simple brace counting (not perfect for strings/comments but sufficient for structure)
    // We only care about keys at depth 1

    // Count { and }
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Check for key at START of line (indented)
    // e.g. "  gapAnalysis: router({" or "  gapAnalysis: createGapAnalysisRouter("
    const keyMatch = line.match(/^\s+([a-zA-Z0-9_]+):/);

    if (keyMatch && braceDepth === 1) {
        keys.push({ key: keyMatch[1], line: i + 1 });
    }

    braceDepth += openBraces - closeBraces;

    if (braceDepth === 0) {
        inAppRouter = false;
        break;
    }
}

// Find duplicates
const counts: Record<string, number> = {};
keys.forEach(k => counts[k.key] = (counts[k.key] || 0) + 1);

const duplicates = Object.keys(counts).filter(k => counts[k] > 1);

console.log("Found duplicates:");
duplicates.forEach(d => {
    console.log(`Key: ${d}`);
    const occurrences = keys.filter(k => k.key === d);
    occurrences.forEach(o => console.log(`  Line ${o.line}: ${lines[o.line - 1].trim().substring(0, 50)}...`));
});
