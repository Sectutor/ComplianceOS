
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Manually import schema and content since script is outside package context
import * as schema from "../packages/core/src/schema";
import { ASVS_CATEGORIES, ASVS_REQUIREMENTS_SAMPLE } from "../packages/core/src/pages/assurance/ASVS_CONTENT";
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle(queryClient, { schema });

async function main() {
    console.log('Seeding ASVS Categories...');

    for (const cat of ASVS_CATEGORIES) {
        await db.insert(schema.asvsCategories)
            .values(cat as any)
            .onConflictDoUpdate({
                target: schema.asvsCategories.code,
                set: cat
            });
    }

    console.log('Seeding ASVS Requirements...');
    for (const req of ASVS_REQUIREMENTS_SAMPLE) {
        await db.insert(schema.asvsRequirements)
            .values(req as any)
            .onConflictDoUpdate({
                target: schema.asvsRequirements.requirementId,
                set: req
            });
    }

    console.log('Done');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
