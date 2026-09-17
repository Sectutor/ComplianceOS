/**
 * Parses the repo's static framework catalogs (TS sources) into plain JS arrays.
 */
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FW_DIR = path.resolve(__dirname, "../../src/data/frameworks");

/** Extract the array literal assigned to `export const NAME = [...]` via bracket matching. */
function extractArray(source, constName) {
  const marker = `export const ${constName}`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`const ${constName} not found`);
  // skip past any TS type annotation (e.g. ": Nis2Control[]") to the assignment "= ["
  const assignIdx = source.indexOf("=", start);
  const bracket = source.indexOf("[", assignIdx);
  if (bracket < 0) throw new Error(`array not found for ${constName}`);
  let depth = 0;
  for (let i = bracket; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") { depth--; if (depth === 0) return source.slice(bracket, i + 1); }
  }
  throw new Error("unbalanced array");
}

/** Convert a TS object-literal array string into JSON by quoting keys and stripping comments. */
function tsArrayToJson(arrStr) {
  let s = arrStr
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  // quote unquoted keys:  { id: "x" -> { "id": "x" ; also handles nested
  s = s.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  // strip TS type annotations like `Nis2Control[] = [` handled by extractArray; also `: SomeType` after const name not present inside array
  // single-quoted strings -> double
  s = s.replace(/'((?:[^'"\\]|\\.)*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`);
  // trailing commas
  s = s.replace(/,(\s*[}\]])/g, "$1");
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(s);
}

export function loadFramework(file, constName) {
  const src = fs.readFileSync(path.join(FW_DIR, file), "utf8");
  const arr = extractArray(src, constName);
  return tsArrayToJson(arr);
}

export const FRAMEWORK_SOURCES = {
  ISO27001: ["iso27001.ts", "iso27001Controls", "ISO 27001"],
  SOC2: ["soc2.ts", "soc2Controls", "SOC 2"],
  NIS2: ["nis2.ts", "NIS2_CONTROLS", "NIS2"],
  FEDRAMP: ["fedramp.ts", "FEDRAMP_CONTROLS", "FedRAMP"],
};

/** NIST 800-171 is already JSON-shaped; extract directly. */
export function loadNist800171() {
  const src = fs.readFileSync(path.join(FW_DIR, "nist-800-171.ts"), "utf8");
  const assignIdx = src.indexOf("=");
  const bracket = src.indexOf("[", assignIdx);
  let depth = 0;
  for (let i = bracket; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) return JSON.parse(src.slice(bracket, i + 1)); }
  }
  throw new Error("unbalanced array in nist-800-171.ts");
}

export function normControl(c) {
  return {
    controlId: c.controlId || c.id,
    name: c.name || c.controlId || c.id,
    description: c.description || "",
    frameworkHint: null,
  };
}
