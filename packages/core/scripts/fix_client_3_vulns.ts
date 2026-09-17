import { getDb } from '../src/db';
import { assetCveMatches } from '../src/schema';
import { eq } from 'drizzle-orm';
import * as threatIntel from '../src/lib/threatIntelligence';

async function fixClient3Vulnerabilities() {
    const db = await getDb();
    if (!db) return;

    console.log("Cleaning up stale matches for Client 3...");
    await db.delete(assetCveMatches).where(eq(assetCveMatches.clientId, 3));

    console.log("Running fresh scan for all assets of Client 3...");
    const results = await threatIntel.scanAllAssetsForClient(3);

    const totalFound = results.reduce((sum, r) => sum + r.count, 0);
    console.log(`Scan complete. Found ${totalFound} new vulnerability matches across ${results.length} assets.`);
}

fixClient3Vulnerabilities().catch(console.error);
