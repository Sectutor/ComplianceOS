import { getDb } from '../src/db';
import { assets, assetCveMatches } from '../src/schema';
import { eq } from 'drizzle-orm';

async function checkClient3() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        return;
    }

    const clientAssets = await db.select().from(assets).where(eq(assets.clientId, 3));
    console.log(`Assets for Client 3: ${clientAssets.length}`);
    clientAssets.forEach(a => console.log(` - [${a.id}] ${a.name} (${a.type})`));

    const matches = await db.select().from(assetCveMatches).where(eq(assetCveMatches.clientId, 3));
    console.log(`Matches for Client 3: ${matches.length}`);
}

checkClient3().catch(console.error);
