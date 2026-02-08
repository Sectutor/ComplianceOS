
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import { asvsCategories, asvsRequirements } from '../packages/core/src/schema'; // Updated path
import { eq, sql } from 'drizzle-orm';

const ASVS_BASE_URL = "https://raw.githubusercontent.com/OWASP/ASVS/v4.0.3/4.0/en/";
const ASVS_FILES = [
    "0x10-V1-Architecture.md",
    "0x11-V2-Authentication.md",
    "0x12-V3-Session-management.md",
    "0x12-V4-Access-Control.md",
    "0x13-V5-Validation-Sanitization-Encoding.md",
    "0x14-V6-Cryptography.md",
    "0x15-V7-Error-Logging.md",
    "0x16-V8-Data-Protection.md",
    "0x17-V9-Communications.md",
    "0x18-V10-Malicious.md",
    "0x19-V11-BusLogic.md",
    "0x20-V12-Files-Resources.md",
    "0x21-V13-API.md",
    "0x22-V14-Config.md"
];

async function fetchAndParse() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    let totalReqs = 0;

    console.log("Starting ASVS v4.0.3 Seeding...");

    for (const file of ASVS_FILES) {
        const url = ASVS_BASE_URL + file;
        console.log(`Processing ${file}...`);

        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`Failed to fetch ${file}: ${res.status}`);
                continue;
            }
            const text = await res.text();

            // Extract Category Info
            // # V1: Architecture...
            const catMatch = text.match(/^#\s*(V\d+)[:\s]+(.+)$/m);
            if (!catMatch) {
                console.warn(`Could not parse category header in ${file}`);
                continue;
            }

            const catCode = catMatch[1];
            const catName = catMatch[2].trim();
            const catOrder = parseInt(catCode.replace('V', ''));

            // Insert Category
            await db.insert(asvsCategories).values({
                code: catCode,
                name: catName,
                description: `ASVS v4.0.3 ${catName}`,
                order: catOrder,
                updatedAt: new Date()
            }).onConflictDoUpdate({
                target: asvsCategories.code,
                set: { name: catName, updatedAt: new Date() }
            });

            console.log(`  Upserted Category: ${catCode}`);

            // Extract Requirements
            // | **1.1.1** | Description | ...
            const lines = text.split('\n');
            let currentSection = "";
            let currentChapterId = "";

            for (const line of lines) {
                // Section Header: ## V1.1 Secure SDK
                const sectionMatch = line.match(/^##\s*(V?\d+\.\d+)[:\s]+(.+)$/);
                if (sectionMatch) {
                    currentChapterId = sectionMatch[1].replace('V', ''); // 1.1
                    currentSection = sectionMatch[2].trim();
                    continue;
                }

                if (line.trim().startsWith('|')) {
                    const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
                    // Expected: [ID, Desc, L1, L2, L3, CWE, NIST] (7 cols) or close
                    // 4.0.3 format: | # | Description | L1 | L2 | L3 | CWE | NIST |

                    if (cols.length >= 5) {
                        let idRaw = cols[0].replace(/\*/g, ''); // **1.1.1** -> 1.1.1
                        // Sometimes ID is linked like [1.1.1](...)
                        idRaw = idRaw.replace(/\[|\]|\(.*\)/g, '');

                        if (!/^\d+\.\d+\.\d+$/.test(idRaw)) continue;

                        const desc = cols[1];
                        const l1 = cols[2];
                        const l2 = cols[3];
                        const l3 = cols[4];
                        const cwe = cols[5] || "";
                        const nist = cols[6] || "";

                        // Parse Checkmarks (✓ or similar)
                        // Sometimes it's empty string if not required.
                        // Check for non-empty string as "Required"
                        const isL1 = !!l1;
                        const isL2 = !!l2;
                        const isL3 = !!l3;

                        await db.insert(asvsRequirements).values({
                            requirementId: idRaw,
                            description: desc,
                            categoryCode: catCode,
                            chapterId: currentChapterId,
                            chapterName: currentSection,
                            level1: isL1,
                            level2: isL2,
                            level3: isL3,
                            cwe: cwe,
                            nist: nist,
                            updatedAt: new Date()
                        }).onConflictDoUpdate({
                            target: asvsRequirements.requirementId,
                            set: {
                                description: desc,
                                level1: isL1,
                                level2: isL2,
                                level3: isL3,
                                cwe: cwe,
                                nist: nist,
                                updatedAt: new Date()
                            }
                        });
                        totalReqs++;
                    }
                }
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }

    console.log(`Seeding Complete. Total Requirements: ${totalReqs}`);
    process.exit(0);
}

fetchAndParse().catch(e => {
    console.error(e);
    process.exit(1);
});
