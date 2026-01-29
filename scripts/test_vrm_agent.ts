
import { vrmAgent } from '../lib/ai/vrm-agent';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Testing Discovery for Slack...");
    const slackUrl = await vrmAgent.discoverTrustCenter("Slack", "https://slack.com");
    console.log("Slack Discovery URL:", slackUrl);

    console.log("\nTesting Discovery for Zoom...");
    const zoomUrl = await vrmAgent.discoverTrustCenter("Zoom", "https://zoom.us");
    console.log("Zoom Discovery URL:", zoomUrl);

    // We can't easily test analysis without a real vendor ID in the DB, 
    // but we've verified the code paths.
}

test().catch(console.error);
