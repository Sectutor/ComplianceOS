
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq, and } from 'drizzle-orm';

async function cleanup() {
    console.log('🧹 Cleaning up draft roadmaps for Client 3...');
    const db = await getDb();
    const clientId = 3;

    // 1. List existing roadmaps
    const roadmaps = await db.select().from(schema.roadmaps).where(eq(schema.roadmaps.clientId, clientId));
    console.log(`Found ${roadmaps.length} roadmaps for Client 3:`);
    roadmaps.forEach(r => console.log(` - [${r.id}] "${r.title}" (Status: ${r.status})`));

    // 2. Delete drafts
    const drafts = roadmaps.filter(r => r.status === 'draft');

    if (drafts.length > 0) {
        console.log(`\n🗑️ Deleting ${drafts.length} draft key(s)...`);
        for (const draft of drafts) {
            await db.delete(schema.roadmaps).where(eq(schema.roadmaps.id, draft.id));
            console.log(`   Deleted roadmap ID ${draft.id}`);
        }
        console.log('✅ Cleanup complete.');
    } else {
        console.log('\n✨ No draft roadmaps found to delete.');
    }

    process.exit(0);
}

cleanup().catch(console.error);
