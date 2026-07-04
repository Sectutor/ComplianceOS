import { readFileSync, writeFileSync } from 'fs';

const path = 'D:/OneDrive - Intellfence/WebDev/ComplianceOS/packages/addons/src/prowler/runner.ts';
let content = readFileSync(path, 'utf-8');

// Replace the whole broken line
const brokenLine = `    args.push('-e', 'GOOGLE_APPLICATION_CREDENTIALS=/opt/g...');`;
const fixedLine = `    args.push('-e', 'GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-key.json');`;

if (content.includes(brokenLine)) {
  content = content.replace(brokenLine, fixedLine);
  writeFileSync(path, content);
  console.log('REPLACED broken GOOGLE line');
} else {
  console.log('EXACT LINE NOT FOUND. Showing line 195:');
  console.log(JSON.stringify(content.split('\n')[194]));
}
