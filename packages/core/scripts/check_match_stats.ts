import { getDb } from '../src/db';
import { assetCveMatches } from '../src/schema';
import { eq, sql } from 'drizzle-orm';

async function checkMatches() {
    const db = await getDb();
    if (!db) return;

    const stats = await db.select({
        status: assetCveMatches.status,
        count: sql<number>`count(*)`
    })
        .from(assetCveMatches)
        .where(eq(assetCveMatches.clientId, 3))
        .groupBy(assetCveMatches.status);

    console.log("Match Stats for Client 3:", stats);
}

checkMatches().catch(console.error);
