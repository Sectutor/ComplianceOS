import { getDb } from '../src/db';
import { assetCveMatches, assets } from '../src/schema';
import { eq, inArray } from 'drizzle-orm';

async function debugJoin() {
    const db = await getDb();
    if (!db) return;

    const matches = await db.select({
        id: assetCveMatches.id,
        assetId: assetCveMatches.assetId,
        clientId: assetCveMatches.clientId
    }).from(assetCveMatches).where(eq(assetCveMatches.clientId, 3)).limit(5);

    console.log("Sample Asset Matches for Client 3:", matches);

    if (matches.length > 0) {
        const assetIds = matches.map(m => m.assetId);
        const relatedAssets = await db.select({
            id: assets.id,
            name: assets.name,
            clientId: assets.clientId
        }).from(assets).where(inArray(assets.id, assetIds));

        console.log("Related Assets found in DB:", relatedAssets);
    }
}

debugJoin().catch(console.error);
