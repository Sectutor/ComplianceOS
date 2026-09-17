// Debug: why does nis2 parse to 0 items?
import fs from "fs";
const src = fs.readFileSync("src/data/frameworks/nis2.ts", "utf8");
const i = src.indexOf("export const NIS2_CONTROLS");
const bracket = src.indexOf("[", i);
let depth = 0, end = -1;
for (let j = bracket; j < src.length; j++) {
  if (src[j] === "[") depth++;
  else if (src[j] === "]") { depth--; if (!depth) { end = j; break; } }
}
let s = src.slice(bracket, end + 1)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n\r]*/g, "");
s = s.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
console.log("sample after key-quoting:\n", s.slice(0, 300));
try {
  const parsed = JSON.parse(s.replace(/,(\s*[}\]])/g, "$1"));
  console.log("parsed", parsed.length);
} catch (e) {
  console.log("parse err:", e.message.slice(0, 300));
}
