
import XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db.ts';
import { controls } from '../schema.ts';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
    const db = await getDb();
    const filePath = path.resolve('data/nist-800-171a.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'SP800-171A';
    const worksheet = workbook.Sheets[sheetName];

    // header: 1 means we get an array of arrays
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Row 0 is header: [Family, Identifier, Sort-As, Security Requirement, Assessment Objective, ...]
    const rows = rawData.slice(1);

    console.log(`Processing ${rows.length} rows...`);

    let count = 0;
    for (const row of rows) {
        const [family, id, sortAs, requirement, objective] = row;

        if (!id || !requirement) continue;

        const controlData = {
            controlId: String(id).trim(),
            name: `${id} - ${String(requirement).substring(0, 100)}...`,
            description: String(requirement),
            framework: "NIST 800-171",
            category: String(family),
            implementationGuidance: String(objective || ""),
            status: "active" as const,
            version: 1
        };

        try {
            await db.insert(controls).values(controlData).onConflictDoUpdate({
                target: controls.controlId,
                set: {
                    description: controlData.description,
                    implementationGuidance: controlData.implementationGuidance,
                    category: controlData.category,
                    name: controlData.name,
                    status: "active"
                }
            });
            count++;
        } catch (err) {
            console.error(`Failed to insert ${id}:`, err);
        }
    }

    console.log(`Successfully seeded/updated ${count} NIST 800-171 controls.`);
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
