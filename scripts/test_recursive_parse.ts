
import { marked } from 'marked';

const renderer = new marked.Renderer();

// Recursive renderer strategy
// @ts-ignore
renderer.code = (token) => {
    const text = (typeof token === 'object' && 'text' in token) ? token.text : token;
    // Recursively parse the content of the "code block" as if it were normal markdown
    // We trim it to ensure we don't trigger another indented code block (infinite loop prevention)
    return marked.parse(text.trim(), { async: false });
};

marked.use({
    renderer,
    gfm: true,
    breaks: true
});

const input = `
# Normal Header
    # Indented Header (Code Block)
    - Indented List
`;

console.log("Input:", JSON.stringify(input));
const output = marked.parse(input, { async: false });
console.log("Output:");
console.log(output);
