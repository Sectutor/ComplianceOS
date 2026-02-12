const fs = require("fs")

function parseFindings(text) {
  const lines = text.split(/\r?\n/)
  const findings = []
  for (const l of lines) {
    const m = l.match(/^(High|Medium|Low)\s*:\s*(.+)$/i)
    if (m) {
      findings.push({
        severity: m[1],
        title: m[2],
        cvss: m[1] === "High" ? 7.5 : m[1] === "Medium" ? 5.0 : 3.0
      })
    }
  }
  const tasks = findings.map((f) => ({
    title: `Remediate: ${f.title}`,
    priority: f.severity
  }))
  const citations = [{ source: "sample", snippet: lines.slice(0, 3).join("\n") }]
  return { findings, tasks, citations }
}

const file = process.argv[2]
const sample = file && fs.existsSync(file)
  ? fs.readFileSync(file, "utf-8")
  : `High: Exposed admin panel without auth
Medium: Verbose server banner reveals version
Low: Missing security headers on static site`

const result = parseFindings(sample)
console.log(JSON.stringify(result, null, 2))
