import '../env-loader';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../packages/core/src/db';
import { policyTemplates } from '../packages/core/src/schema';
import { sql } from 'drizzle-orm';

function parseCsvRow(text: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    cur += '"';
                    i += 2;
                    continue;
                } else {
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                cur += ch;
                i++;
                continue;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i++;
                continue;
            } else if (ch === ',') {
                fields.push(cur);
                cur = '';
                i++;
                continue;
            } else {
                cur += ch;
                i++;
                continue;
            }
        }
    }
    fields.push(cur);
    return fields;
}

async function seed() {
    const db = await getDb();
    const content = fs.readFileSync(path.resolve('scripts/seed-demo-full.sql'), 'utf-8');
    const lines = content.split('\n');

    let inPt = false;
    const rawBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('COPY "policy_templates"')) {
            inPt = true;
            continue;
        }
        if (inPt) {
            if (line.trim() === '\\.') {
                inPt = false;
                break;
            }
            rawBlock.push(line);
        }
    }

    const recordStartRegex = /^\d+,/;
    const records: string[] = [];
    let currentRecord = '';

    for (const line of rawBlock) {
        if (recordStartRegex.test(line)) {
            if (currentRecord) records.push(currentRecord);
            currentRecord = line;
        } else {
            currentRecord += '\n' + line;
        }
    }
    if (currentRecord) records.push(currentRecord);

    console.log(`Found ${records.length} records to seed.`);

    const toInsert = [];
    for (const rec of records) {
        const f = parseCsvRow(rec.trim());
        const id = parseInt(f[0]);
        const templateId = f[1];
        const name = f[2];
        const contentVal = f[3] === 'NULL' ? null : f[3];
        let sectionsVal = null;
        if (f[4] && f[4] !== 'NULL') {
            try {
                sectionsVal = JSON.parse(f[4]);
            } catch (e) {
                console.warn('Failed parsing sections for', templateId);
            }
        }
        let frameworksVal: string[] = [];
        if (f[6] && f[6] !== 'NULL') {
            try {
                frameworksVal = JSON.parse(f[6]);
            } catch (e) {
                frameworksVal = [f[6]];
            }
        }
        let tailoringVal = null;
        if (f[11] && f[11] !== 'NULL') {
            try {
                tailoringVal = JSON.parse(f[11]);
            } catch (e) {}
        }

        toInsert.push({
            id,
            templateId,
            name,
            content: contentVal,
            sections: sectionsVal,
            frameworks: frameworksVal,
            isPublic: true,
            ownerId: null,
            clientId: null,
            tailoringQuestions: tailoringVal
        });
    }

    console.log(`Inserting ${toInsert.length} templates...`);
    let inserted = 0;
    for (const item of toInsert) {
        try {
            await db.insert(policyTemplates).values(item).onConflictDoUpdate({
                target: policyTemplates.templateId,
                set: {
                    name: item.name,
                    content: item.content,
                    sections: item.sections,
                    frameworks: item.frameworks,
                    isPublic: true,
                    tailoringQuestions: item.tailoringQuestions
                }
            });
            inserted++;
        } catch (e: any) {
            console.error(`Error inserting template ${item.templateId}:`, e.message);
        }
    }
    console.log(`Successfully seeded/updated ${inserted} templates!`);

    // Reset sequence if needed
    try {
        await db.execute(sql`SELECT setval('policy_templates_id_seq', (SELECT MAX(id) FROM policy_templates));`);
    } catch (e) {
        // ignore if sequence name differs
    }

    const all = await db.select().from(policyTemplates);
    console.log('Total templates now in DB:', all.length);
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
