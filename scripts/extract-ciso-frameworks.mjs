import fs from 'node:fs';
import path from 'node:path';

function stripEmojis(str) {
  return str.replace(
    /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF]/g,
    ''
  );
}

function parseFrameworksFromReadme(text) {
  const lower = text.toLowerCase();
  const marker = 'supported frameworks';
  let start = lower.indexOf(marker);
  if (start === -1) return [];
  // Move to the end of header line
  start = text.indexOf('\n', start);
  if (start === -1) return [];
  const rest = text.slice(start + 1);
  const lines = rest.split('\n');
  const items = [];
  const keywords = [
    'ISO 27001',
    'NIST',
    'NIS2',
    'SOC',
    'PCI DSS',
    'CMMC',
    'PSPF',
    'GDPR',
    'Essential Eight',
    'NYDFS',
    'DORA',
    'AI Risk',
    'SP 800-53',
    'LPM',
    'OIV',
    'CCB',
    'HIPAA',
    'HDS',
    'ASVS',
    'RGS',
    'AirCyber',
    'Cyber Resilience Act',
    'CRA',
    'TIBER',
    'Privacy Framework',
    'TISAX',
    'ANSSI',
  ];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#')) break; // next section
    if (line.length === 0) continue;
    // Accept bullet lines or plain lines likely part of the list
    const bulletMatch = /^[-*]\s*(.+)$/.exec(line);
    const plain = stripEmojis(line).replace(/\s+/g, ' ').trim();
    const hasKeyword = keywords.some((k) => plain.includes(k));
    if (bulletMatch) {
      const name = stripEmojis(bulletMatch[1]).replace(/\s+/g, ' ').trim();
      items.push(name);
    } else if (hasKeyword && !/upcoming features/i.test(plain)) {
      items.push(plain);
    }
    // Heuristic: stop after a long non-list block
    if (items.length > 0 && !/^[-*]/.test(line) && line.endsWith(':')) break;
  }
  // De-duplicate while preserving order
  const seen = new Set();
  return items.filter((it) => {
    const key = it.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const url =
    'https://raw.githubusercontent.com/intuitem/ciso-assistant-community/main/README.md';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch README: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const frameworks = parseFrameworksFromReadme(text);
  if (frameworks.length === 0) {
    throw new Error('No frameworks parsed from README');
  }
  const outDir = path.join('scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'frameworks-ciso.json');
  const csvPath = path.join(outDir, 'frameworks-ciso.csv');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        source: 'ciso-assistant-community README',
        count: frameworks.length,
        frameworks: frameworks.map((name) => ({ name })),
      },
      null,
      2
    )
  );
  const csv = ['name', ...frameworks.map((name) => `"${name.replace(/"/g, '""')}"`)].join('\n');
  fs.writeFileSync(csvPath, csv);
  console.log(`Wrote ${frameworks.length} frameworks to:`);
  console.log(`- ${jsonPath}`);
  console.log(`- ${csvPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
