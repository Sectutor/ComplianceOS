
import { marked } from 'marked';

// Configure marked globally (mimicking PolicyEditor.tsx)
const renderer = new marked.Renderer();
// @ts-ignore
renderer.code = (code) => {
    return `<p class="whitespace-pre-wrap">${code}</p>`;
};

marked.use({
    gfm: true,
    breaks: true,
    renderer
});

const content = "# Test\n    Code block indent";
const output = marked.parse(content, { async: false });

console.log("Type:", typeof output);
console.log("Value:", output);
console.log("Is Promise?", output instanceof Promise);
