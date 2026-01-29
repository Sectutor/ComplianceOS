
import { marked } from 'marked';

const mixedIndent = `# Header
    This paragraph is indented by 4 spaces.
    It should be a paragraph, not a code block.
    
    - List item
`;

// Standard behavior
console.log("--- Standard ---");
console.log(marked.parse(mixedIndent, { async: false }));

// Disabled indented code blocks
const renderer = new marked.Renderer();
// @ts-ignore
marked.use({
    tokenizer: {
        // @ts-ignore
        code(src: string) {
            // Returning false or undefined keeps default.
            // We want to skip it?
            // Actually, simply overriding it and returning nothing (or failing to match)
            // might move to the next tokenizer.
            return undefined;
        }
    }
});

// Wait, returning undefined runs the default tokenizer.
// To DISABLE it, we might need a dummy tokenizer that returns a text token?
// Or better, let's just preprocess.

// REGEX approach for sanity check:
// If we replace ^\s{4} with nothing? No, breaks lists.
// If we look at tokenizer docs, 'code' block is ^ {4,}.
