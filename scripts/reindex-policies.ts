import * as dotenv from 'dotenv';
dotenv.config();

import { reindexKnowledgeBase } from '../lib/advisor/service';

async function main() {
    console.log('Re-indexing ONLY POLICIES for Client 3...\n');

    try {
        const stats = await reindexKnowledgeBase(3, 'policies');
        console.log('\nPOLICY REINDEX COMPLETE:');
        console.log(JSON.stringify(stats, null, 2));
    } catch (error: any) {
        console.error('Reindex failed:', error.message);
        console.error(error.stack);
    }
}

main().catch(console.error);
