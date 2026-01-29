import 'dotenv/config';
import { getDb } from '../db';
import { controls } from '../schema';
import { eq } from 'drizzle-orm';

const ASVS_BASE_URL = "https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/";
const ASVS_FILES = [
    "0x10-V1-Encoding-and-Sanitization.md",
    "0x11-V2-Validation-and-Business-Logic.md",
    "0x12-V3-Web-Frontend-Security.md",
    "0x13-V4-API-and-Web-Service.md",
    "0x14-V5-File-Handling.md",
    "0x15-V6-Authentication.md",
    "0x16-V7-Session-Management.md",
    "0x17-V8-Authorization.md",
    "0x18-V9-Self-contained-Tokens.md",
    "0x19-V10-OAuth-and-OIDC.md",
    "0x20-V11-Cryptography.md",
    "0x21-V12-Secure-Communication.md",
    "0x22-V13-Configuration.md",
    "0x23-V14-Data-Protection.md",
    "0x24-V15-Secure-Coding-and-Architecture.md",
    "0x25-V16-Security-Logging-and-Error-Handling.md",
    "0x26-V17-WebRTC.md"
];

async function fetchAndParseMarkdown() {
    let allControls: any[] = [];
    
    for (const file of ASVS_FILES) {
        const url = ASVS_BASE_URL + file;
        console.log(`Fetching ${url}...`);
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`Failed to fetch ${file}: ${res.status}`);
                continue;
            }
            const text = await res.text();
            
            // DEBUG: Log first file content to check structure
            // if (file.includes("0x10")) {
            //     console.log("--- DEBUG: File Content Start ---");
            //     console.log(text.substring(0, 3000));
            //     console.log("--- DEBUG: File Content End ---");
            // }
            
            // Extract Chapter Title
            // Matches: "# V1: Title" or "# V1 Title"
            const chapterMatch = text.match(/^#\s*(V\d+)[:\s]+(.+)$/m);
            const chapterId = chapterMatch ? chapterMatch[1] : file.split('-')[1];
            const chapterName = chapterMatch ? chapterMatch[2].trim() : file.split('-').slice(2).join(' ').replace('.md', '');
            
            // Extract sections "## 1.1 Section Name" or "## V1.1 Section Name"
            // Split by "## " to get sections
            const sections = text.split(/^##\s+/m).slice(1);
            
            for (const sectionBlock of sections) {
                const lines = sectionBlock.split('\n');
                const titleLine = lines[0].trim(); // "V1.1 Input Validation"
                // Match "1.1 Title" or "V1.1 Title"
                const sectionIdMatch = titleLine.match(/^(V?\d+\.\d+)[:\s]+(.+)$/);
                
                if (!sectionIdMatch) continue;
                
                const sectionId = sectionIdMatch[1];
                const sectionName = sectionIdMatch[2].trim();
                
                // console.log(`Found Section: ${sectionId} ${sectionName}`); // Debug
                
                // Parse table rows
                // Format: | 1.1.1 | Description | L1 | L2 | L3 | ...
                // Regex to match row starting with | digit.digit.digit
                
                for (const line of lines) {
                    if (line.trim().startsWith('|')) {
                        // Clean row
                        const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
                        // Expected: [ID, Description, Level, CWE, NIST] (varies by version, 5.0 seems to be ID, Desc, Level)
                        // Example: | **1.1.1** | Description | 2 |
                        
                        if (cols.length >= 3) {
                            // Strip markdown bold from ID: **1.1.1** -> 1.1.1
                            const idRaw = cols[0].replace(/\*/g, '');
                            
                            // Check if it looks like an ID (1.1.1)
                            if (!/^\d+\.\d+\.\d+$/.test(idRaw)) {
                                continue;
                            }
                            
                            const desc = cols[1];
                            const levelRaw = cols[2]; // "1", "2", "3"
                            
                            const levels = [];
                            if (levelRaw.includes('1')) { levels.push("L1", "L2", "L3"); }
                            else if (levelRaw.includes('2')) { levels.push("L2", "L3"); }
                            else if (levelRaw.includes('3')) { levels.push("L3"); }
                            
                            allControls.push({
                                controlId: idRaw,
                                name: desc.substring(0, 250),
                                description: desc,
                                framework: "OWASP ASVS 5.0",
                                category: `${chapterId}: ${chapterName}`,
                                grouping: `${sectionId}: ${sectionName}`,
                                implementationGuidance: `Applicable Levels: ${levels.join(", ")}`,
                                status: "active",
                                version: 5
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`Error parsing ${file}:`, e);
        }
    }
    return allControls;
}

async function seed() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    const allControls = await fetchAndParseMarkdown();
    const frameworkName = "OWASP ASVS 5.0";
    
    if (allControls.length === 0) {
        console.error("No controls parsed from Markdown files.");
        process.exit(1);
    }

    console.log(`Found ${allControls.length} controls.`);
    console.log("Fetching existing controls for upsert...");
    
    const existingControls = await db.select({
        id: controls.id,
        controlId: controls.controlId
    })
    .from(controls)
    .where(eq(controls.framework, frameworkName));

    const existingMap = new Map(existingControls.map(c => [c.controlId, c.id]));
    
    const toInsert: typeof controls.$inferInsert[] = [];
    const updateTasks: (() => Promise<any>)[] = [];

    for (const control of allControls) {
        if (!control.controlId) continue;
        
        const controlData = control as typeof controls.$inferInsert;

        if (existingMap.has(control.controlId)) {
            const id = existingMap.get(control.controlId)!;
            updateTasks.push(() => 
                db.update(controls)
                    .set({
                        name: control.name,
                        description: control.description,
                        framework: control.framework,
                        category: control.category,
                        implementationGuidance: control.implementationGuidance,
                        status: "active",
                        version: 5,
                        grouping: control.grouping,
                        updatedAt: new Date()
                    })
                    .where(eq(controls.id, id))
            );
        } else {
            toInsert.push(controlData);
        }
    }

    // Process Inserts
    if (toInsert.length > 0) {
        console.log(`Inserting ${toInsert.length} new controls...`);
        const BATCH_SIZE = 50;
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
            const batch = toInsert.slice(i, i + BATCH_SIZE);
            await db.insert(controls).values(batch);
            process.stdout.write(`.`);
        }
        console.log("");
    }

    // Process Updates
    if (updateTasks.length > 0) {
        console.log(`Updating ${updateTasks.length} existing controls...`);
        const BATCH_SIZE = 20;
        for (let i = 0; i < updateTasks.length; i += BATCH_SIZE) {
            const batch = updateTasks.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(task => task()));
            process.stdout.write(`.`);
        }
        console.log("");
    }

    console.log("\n--- OWASP ASVS 5.0 Seed Complete ---");
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
