
import 'dotenv/config';
import { fetchSecurityFeeds, fetchMitreAttackData } from '../packages/core/src/lib/adversaryService';

async function testAdversaryService() {
    console.log("Testing Adversary Service...");
    try {
        console.log("Fetching Security Feeds...");
        const feeds = await fetchSecurityFeeds(5);
        console.log(`Feeds fetched: ${feeds.length}`);
        if (feeds.length > 0) {
            console.log("Sample Feed Item:", JSON.stringify(feeds[0], null, 2));
        } else {
            console.log("WARNING: No feeds returned.");
        }

        console.log("\nFetching MITRE Data...");
        const mitre = await fetchMitreAttackData();
        console.log(`Tactics: ${mitre.tactics.length}`);
        console.log(`Techniques: ${mitre.techniques.length}`);

    } catch (e) {
        console.error("Adversary Service Error:", e);
    }
}

testAdversaryService();
