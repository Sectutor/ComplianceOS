
import { nistAiRmfControls } from "../packages/core/src/data/frameworks/nist_ai_rmf";

console.log("NIST AI RMF Controls count:", nistAiRmfControls.length);

const categories = [...new Set(nistAiRmfControls.map(c => c.category))];
console.log("Categories found:", categories);

nistAiRmfControls.forEach(c => {
    if (!c.id || !c.name || !c.description || !c.category) {
        console.error("Invalid control:", c);
    }
});

console.log("Validation complete.");
