
import { marked } from 'marked';

const markdown = "**Hello** world. \n# Header";
console.log("Input:", JSON.stringify(markdown));

try {
    const html = marked.parse(markdown, { async: false });
    console.log("Output Type:", typeof html);
    console.log("Output:", html);

    if (html instanceof Promise) {
        console.log("Result is a Promise!");
        html.then(h => console.log("Resolved:", h));
    }
} catch (e) {
    console.error("Error:", e);
}
