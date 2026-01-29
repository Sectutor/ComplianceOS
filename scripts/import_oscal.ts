
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db';
import { controls, controlBaselines } from '../schema';
import { eq, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.join(__dirname, 'nist_catalog.json');
const LOW_PATH = path.join(__dirname, 'nist_low.json');
const MODERATE_PATH = path.join(__dirname, 'nist_moderate.json');
const HIGH_PATH = path.join(__dirname, 'nist_high.json');

const FRAMEWORK_NAME = "NIST SP 800-53 Rev 5";

interface OscalPart {
    id?: string;
    name: string;
    prose?: string;
    parts?: OscalPart[];
}

interface OscalControl {
    id: string;
    title: string;
    parts?: OscalPart[];
    controls?: OscalControl[];
}

interface OscalGroup {
    id?: string;
    title: string;
    controls?: OscalControl[];
    groups?: OscalGroup[];
}

interface OscalCatalog {
    catalog: {
        groups?: OscalGroup[];
    };
}

function extractStatement(parts?: OscalPart[]): string {
    if (!parts) return "";
    let text = "";
    for (const part of parts) {
        if (part.name === "statement" || part.name === "item") {
            if (part.prose) {
                text += part.prose + " ";
            }
            if (part.parts) {
                text += extractStatement(part.parts);
            }
        }
    }
    return text.trim();
}

async function run() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    console.log("Reading Catalog...");
    const catalogData: OscalCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));

    const allControls: any[] = [];

    function processGroup(group: OscalGroup, category: string) {
        const groupTitle = group.title || category;

        if (group.controls) {
            for (const ctrl of group.controls) {
                allControls.push({
                    controlId: ctrl.id.toUpperCase(),
                    name: ctrl.title,
                    description: extractStatement(ctrl.parts),
                    framework: FRAMEWORK_NAME,
                    category: groupTitle
                });

                // Handle sub-controls (enhancements)
                if (ctrl.controls) {
                    for (const sub of ctrl.controls) {
                        allControls.push({
                            controlId: sub.id.toUpperCase(),
                            name: sub.title,
                            description: extractStatement(sub.parts),
                            framework: FRAMEWORK_NAME,
                            category: groupTitle
                        });
                    }
                }
            }
        }

        if (group.groups) {
            for (const subGroup of group.groups) {
                processGroup(subGroup, groupTitle);
            }
        }
    }

    if (catalogData.catalog.groups) {
        for (const group of catalogData.catalog.groups) {
            processGroup(group, "Security Controls");
        }
    }

    console.log(`Found ${allControls.length} controls in catalog.`);

    // 2. Parse Profiles
    console.log("Parsing Profiles...");
    const getProfilesIds = (filePath: string): string[] => {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const ids: string[] = [];
            // profiles -> imports -> selects -> control-calls
            const imports = data.profile?.imports || [];
            for (const imp of imports) {
                const selects = imp["include-controls"] || [];
                for (const sel of selects) {
                    const calls = sel["with-ids"] || [];
                    for (const id of calls) {
                        ids.push(id.toUpperCase());
                    }
                }
            }
            return ids;
        } catch (e) {
            console.warn(`Could not parse profile at ${filePath}`);
            return [];
        }
    };

    const lowIds = getProfilesIds(LOW_PATH);
    const moderateIds = getProfilesIds(MODERATE_PATH);
    const highIds = getProfilesIds(HIGH_PATH);

    console.log(`Low: ${lowIds.length}, Moderate: ${moderateIds.length}, High: ${highIds.length}`);

    // 3. Database Sync
    console.log("Syncing Controls with Database...");

    // Fetch existing controls for this framework to avoid duplicates and preserve IDs
    const existingControls = await db.select({
        id: controls.id,
        controlId: controls.controlId
    })
        .from(controls)
        .where(eq(controls.framework, FRAMEWORK_NAME));

    const existingMap = new Map<string, number>(existingControls.map((c: any) => [c.controlId, c.id]));
    console.log(`Found ${existingMap.size} existing controls for ${FRAMEWORK_NAME}`);

    let updateCount = 0;
    let insertCount = 0;

    for (const ctrl of allControls) {
        const existingId = existingMap.get(ctrl.controlId);
        if (existingId) {
            await db.update(controls)
                .set({
                    name: ctrl.name,
                    description: ctrl.description,
                    category: ctrl.category
                })
                .where(eq(controls.id, existingId as number));
            updateCount++;
        } else {
            await db.insert(controls).values(ctrl);
            insertCount++;
        }
    }

    console.log(`Controls Sync Complete: ${insertCount} inserted, ${updateCount} updated.`);

    console.log("Syncing Baseline Mappings...");
    // Clear old mappings specifically for this framework
    await db.delete(controlBaselines).where(eq(controlBaselines.framework, FRAMEWORK_NAME));

    const insertBaseline = async (slugs: string[], level: string) => {
        // Fetch current controls to get IDs for mapping slugs
        const currentControls = await db.select({
            id: controls.id,
            controlId: controls.controlId
        })
            .from(controls)
            .where(eq(controls.framework, FRAMEWORK_NAME));

        const idMap = new Map<string, number>(currentControls.map((c: any) => [c.controlId, c.id]));

        const toInsert = slugs.map(slug => {
            const ctrlId = idMap.get(slug);
            if (!ctrlId) {
                // console.warn(`Baseline ${level} references control ${slug} not found in catalog.`);
                return null;
            }
            return {
                controlId: slug, // Keep the string slug for the baseline table as per schema
                framework: FRAMEWORK_NAME,
                baseline: level
            };
        }).filter(Boolean) as any[];

        if (toInsert.length > 0) {
            // Batch insert in groups of 100
            for (let i = 0; i < toInsert.length; i += 100) {
                await db.insert(controlBaselines).values(toInsert.slice(i, i + 100));
            }
            console.log(`Inserted ${toInsert.length} mappings for ${level} baseline.`);
        }
    };

    await insertBaseline(lowIds, "low");
    await insertBaseline(moderateIds, "moderate");
    await insertBaseline(highIds, "high");

    console.log("DONE! NIST OSCAL Import Finished.");
    process.exit(0);
}

run().catch(console.error);
