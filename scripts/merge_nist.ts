import fs from 'fs';
import { nistCsf2Data } from './nist_2_0_data';

const examplesRaw = fs.readFileSync('scripts/nist_examples.json', 'utf-8');
const examplesData = JSON.parse(examplesRaw) as { id: string, examples: string }[];

// Map examples by ID
const examplesMap = new Map(examplesData.map(e => [e.id, e.examples]));

const fullData = nistCsf2Data.map(item => {
    let examples = examplesMap.get(item.id) || "";
    return {
        ...item,
        implementation_examples: examples
    };
});

// Generate file content
const fileContent = `export const nistCsf2FullData = ${JSON.stringify(fullData, null, 2)};`;

fs.writeFileSync('scripts/nist_2_0_full_data.ts', fileContent);
console.log(`Merged data. Total items: ${fullData.length}. Controls with examples: ${fullData.filter(d => d.implementation_examples).length}`);
