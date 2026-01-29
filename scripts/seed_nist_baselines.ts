
import 'dotenv/config';
import { getDb } from '../db';
import { controls, controlBaselines } from '../schema';
import { eq, and } from 'drizzle-orm';

// Mock Data for "Sample" Baselines
// In a real scenario, this would come from the NIST 800-53B CSV/OSCAL
const NIST_FRAMEWORK = "NIST SP 800-53 Rev 5";

const BASELINE_LOW = [
    "AC-1", "AC-2", "AC-3", "AT-1", "AT-2", "AU-1", "CA-1", "CM-1", "CP-1",
    "IA-1", "IA-2", "IR-1", "MA-1", "MP-1", "PE-1", "PL-1", "PS-1", "RA-1",
    "SA-1", "SC-1", "SI-1", "SI-2"
];

const BASELINE_MODERATE = [
    ...BASELINE_LOW,
    "AC-4", "AC-5", "AC-6", "AT-3", "AU-2", "AU-3", "AU-4", "CA-2", "CA-3",
    "CM-2", "CM-3", "CP-2", "IA-4", "IR-2", "IR-4", "MA-2", "MP-2", "PE-2",
    "PL-2", "PS-2", "RA-2", "RA-3", "SA-2", "SC-2", "SI-3"
];

const BASELINE_HIGH = [
    ...BASELINE_MODERATE,
    "AC-12", "AC-17", "AT-4", "AU-6", "CA-7", "CM-6", "CP-9", "IA-5", "IR-6",
    "MA-4", "MP-4", "PE-3", "PL-4", "PS-4", "RA-5", "SA-4", "SC-7", "SI-4"
];

async function seed() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    console.log("Seeding NIST 800-53 Baselines (Mock Data)...");

    // Clear existing for this framework
    console.log("Clearing existing baselines...");
    await db.delete(controlBaselines).where(eq(controlBaselines.framework, NIST_FRAMEWORK));

    const baselines = [
        { name: "low", controls: BASELINE_LOW },
        { name: "moderate", controls: BASELINE_MODERATE },
        { name: "high", controls: BASELINE_HIGH }
    ];

    let insertedCount = 0;

    for (const b of baselines) {
        console.log(`Processing ${b.name} baseline...`);
        const toInsert: typeof controlBaselines.$inferInsert[] = [];

        for (const code of b.controls) {
            toInsert.push({
                controlId: code,
                framework: NIST_FRAMEWORK,
                baseline: b.name
            });
        }

        if (toInsert.length > 0) {
            await db.insert(controlBaselines).values(toInsert);
            insertedCount += toInsert.length;
        }
    }

    console.log(`Seeding Complete. Inserted ${insertedCount} baseline mappings.`);
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
