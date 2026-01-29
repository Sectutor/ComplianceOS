
import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const filePath = path.join(process.cwd(), 'data/pci_source.xlsx');
try {
    const workbook = XLSX.readFile(filePath);

    const controls: any[] = [];
    // PCI sheets are named Requirement 1...12 usually
    const sheetNames = workbook.SheetNames.filter(n => n.startsWith('Requirement'));

    console.log(`Processing sheets: ${sheetNames.join(', ')}`);

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (const row of rows) {
            if (!row || row.length === 0) continue;
            const cell0 = row[0] ? String(row[0]).trim() : '';

            // Match ID at start: e.g. "1.1.1 Examine..." or "12.3.1"
            const match = cell0.match(/^(\d+(?:\.\d+)+)\s+([\s\S]*)/);

            if (match) {
                const id = match[1];
                const text = match[2].trim(); // Remaining text is description
                // Index 2 usually contains Guidance/Purpose
                const guidance = row[2] ? String(row[2]).trim() : 'Refer to defined approach testing procedures.';

                // Clean up guidance if it contains "Purpose" prefix or newlines
                const cleanGuidance = guidance.replace(/^Purpose\s*/i, '').trim();

                controls.push({
                    id: id,
                    name: `${id} - ${text.substring(0, 80).replace(/[\r\n]+/g, ' ')}${text.length > 80 ? '...' : ''}`,
                    description: text,
                    category: sheetName, // e.g. "Requirement 1"
                    implementationGuidance: cleanGuidance
                });
            }
        }
    }

    const content = `
export const pciControls = ${JSON.stringify(controls, null, 4)};
`;

    const outPath = path.join(process.cwd(), 'data/frameworks/pci.ts');
    fs.writeFileSync(outPath, content);
    console.log(`Extracted ${controls.length} controls to ${outPath}`);

} catch (e) {
    console.error("Extraction failed:", e);
    process.exit(1);
}
