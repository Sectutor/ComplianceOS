
import { marked } from 'marked';

const indented = `    **This is indented**
    and this line too.
`;

console.log("Input:", JSON.stringify(indented));
const html = marked.parse(indented, { async: false });
console.log("Output:", html);
