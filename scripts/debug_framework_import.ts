
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Mock Input
const FILE_PATH = 'D:\\Downloads\\cis_controls_version_8.1.xlsx';
const CLIENT_ID = 1;

// Copy of helper functions from router
const findSheet = (workbook: XLSX.WorkBook, keywords: string[]): XLSX.WorkSheet | null => {
    const sheetName = workbook.SheetNames.find(name =>
        keywords.some(k => name.toLowerCase().includes(k.toLowerCase()))
    );
    return sheetName ? workbook.Sheets[sheetName] : null;
};

const findHeaderRow = (sheet: XLSX.WorkSheet, keyColumns: string[], maxSearchRows = 20): { row: number, data: any[] } | null => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:Z100");
    range.e.r = Math.min(range.e.r, maxSearchRows);

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: range, defval: '' }) as any[][];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i].map(c => String(c).trim());
        const allFound = keyColumns.every(key =>
            row.some(cell => cell.toLowerCase() === key.toLowerCase() || cell.toLowerCase().includes(key.toLowerCase()))
        );
        if (allFound) {
            return { row: i, data: rows[i] };
        }
    }
    return null;
};

const log = (msg: any) => {
    fs.appendFileSync('debug_output.txt', (typeof msg === 'string' ? msg : JSON.stringify(msg, Object.getOwnPropertyNames(msg))) + '\n');
    console.log(msg);
};

async function main() {
    fs.writeFileSync('debug_output.txt', 'Starting Debug Script...\n');

    try {
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File not found at ${FILE_PATH}`);
        }
        log(`File found. Reading.`);

        const fileBuffer = fs.readFileSync(FILE_PATH);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        log(`Workbook read. Sheets: ${workbook.SheetNames.join(', ')}`);

        // CIS Logic
        const sheet = findSheet(workbook, ['control', 'v8', 'cis']);
        if (!sheet) throw new Error("Sheet not found");
        log("Sheet found.");

        const headerInfo = findHeaderRow(sheet, ['CIS Safeguard', 'Title', 'Description', 'Security Function']);
        if (!headerInfo) {
            // scan first 20 rows to show what we found
            const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:Z50");
            range.e.r = Math.min(range.e.r, 20);
            const preview = XLSX.utils.sheet_to_json(sheet, { header: 1, range: range });
            log("Header not found. Preview of first 20 rows:");
            log(JSON.stringify(preview, null, 2));
            throw new Error("Header not found");
        }
        log(`Headers at row ${headerInfo.row}`);

        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { range: headerInfo.row });
        log(`Parsed ${rows.length} rows.`);

        const controlsToInsert = rows.map((row) => ({
            controlCode: row['CIS Safeguard']?.toString(),
            title: row['Title'],
            description: row['Description'],
            grouping: `${row['CIS Control'] || ''} - ${row['Security Function'] || ''}`,
            originalData: {
                assetType: row['Asset Type'],
                securityFunction: row['Security Function'],
                cisControl: row['CIS Control']
            }
        })).filter(c => c.controlCode && c.title);

        log(`Mapped ${controlsToInsert.length} valid controls.`);

        if (controlsToInsert.length === 0) throw new Error("No controls to insert");

        log("Attempting DB connection...");
        const db = await getDb();
        log("DB Connected.");

        log("Inserting Framework...");
        const [framework] = await db.insert(schema.clientFrameworks).values({
            clientId: CLIENT_ID,
            name: "CIS Critical Security Controls (DEBUG)",
            version: "8.1",
            sourceFileName: 'cis_debug.xlsx',
            status: 'active'
        }).returning();
        log(`Framework inserted with ID: ${framework.id}`);

        log("Inserting Controls...");
        const controlsWithFrameworkId = controlsToInsert.map(c => ({
            ...c,
            frameworkId: framework.id
        }));

        await db.insert(schema.clientFrameworkControls).values(controlsWithFrameworkId);
        log("SUCCESS! Controls inserted.");

    } catch (e) {
        log("DEBUG SCRIPT FAILED:");
        log(e);
    }
}

main();
