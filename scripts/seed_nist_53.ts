
import 'dotenv/config';
import { getDb } from '../db';
import { controls } from '../schema';
import { eq } from 'drizzle-orm';

// NIST SP 800-53 Rev 5 OSCAL JSON
const NIST_OSCAL_URL = "https://raw.githubusercontent.com/usnistgov/oscal-content/master/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json";

async function fetchNistData() {
    console.log(`Fetching NIST 800-53 Rev 5 from ${NIST_OSCAL_URL}...`);
    try {
        const response = await fetch(NIST_OSCAL_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch NIST data: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        process.exit(1);
    }
}

// Recursive function to extract controls from groups
function extractControls(groups: any[], collected: any[] = []) {
    for (const group of groups) {
        if (group.controls) {
            for (const control of group.controls) {
                processControl(control, collected, group.title);
                if (control.controls) {
                    // Recurse for enhancements or sub-controls
                    extractControls([{ controls: control.controls, title: group.title }], collected);
                }
            }
        }
        // Sub-groups not common in NIST 800-53 catalog groups structure, usually it's flattened groups, but good to be safe
        if (group.groups) {
            extractControls(group.groups, collected);
        }
    }
    return collected;
}

function processControl(control: any, collected: any[], category: string) {
    if (!control.id) return;

    // Find the statement (description)
    // In OSCAL, 'parts' contain the statement. name='statement' is key.
    const statementPart = control.parts?.find((p: any) => p.name === 'statement');
    let description = "";

    if (statementPart && statementPart.prose) {
        description = statementPart.prose;
    } else if (statementPart && statementPart.parts) {
        // Sometimes statement has sub-parts (itemized list)
        description = statementPart.parts.map((p: any) => p.prose).join("\n");
    }

    // Find guidance
    const guidancePart = control.parts?.find((p: any) => p.name === 'guidance');
    let guidance = "";
    if (guidancePart && guidancePart.prose) {
        guidance = guidancePart.prose;
    }

    // Fallback for nulls
    const name = control.title || control.id;

    collected.push({
        controlId: control.id.toUpperCase(),
        name: name,
        description: description || name, // Fallback
        framework: "NIST SP 800-53 Rev 5",
        category: category || "General",
        implementationGuidance: guidance,
        status: "active",
        version: 5,
        grouping: category
    });
}

async function seed() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    const data = await fetchNistData();
    if (!data.catalog || !data.catalog.groups) {
        console.error("Invalid OSCAL format: missing catalog.groups");
        process.exit(1);
    }

    console.log("Parsing NIST controls...");
    const allControls = extractControls(data.catalog.groups);
    console.log(`Found ${allControls.length} controls.`);

    console.log("Seeding database (this may take a moment)...");

    console.log("Fetching existing controls for upsert...");
    const existingControls = await db.select({
        id: controls.id,
        controlId: controls.controlId
    })
    .from(controls)
    .where(eq(controls.framework, "NIST SP 800-53 Rev 5"));

    const existingMap = new Map(existingControls.map(c => [c.controlId, c.id]));
    
    const toInsert: typeof controls.$inferInsert[] = [];
    const updateTasks: (() => Promise<any>)[] = [];

    for (const control of allControls) {
        // Force type compatibility if needed, though structure matches
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
        const BATCH_SIZE = 20; // Smaller batch for updates as they might be heavier?
        for (let i = 0; i < updateTasks.length; i += BATCH_SIZE) {
            const batch = updateTasks.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(task => task()));
            process.stdout.write(`.`);
        }
        console.log("");
    }

    console.log("\n--- NIST SP 800-53 Rev 5 Seed Complete ---");
    process.exit(0);
}

// Helper for SQL exclusion
import { sql } from 'drizzle-orm';

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
