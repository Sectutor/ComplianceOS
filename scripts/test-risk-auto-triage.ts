
import 'dotenv/config';
import { analyzeRisk } from '../lib/advisor/service';
import { getDb } from '../db';

async function main() {
    console.log('Testing Risk Auto-triage...');

    // Ensure DB connection (implicit in service but good to verify)
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    const request = {
        clientId: 1, // specific client ID
        threat: "Ransomware attack via phishing email",
        vulnerability: "Employees executing unverified attachments",
        assets: ["Workstations", "Email Server", "Customer Data"]
    };

    console.log('Sending request:', request);

    try {
        const result = await analyzeRisk(request);
        console.log('\nResult:');
        console.log(JSON.stringify(result, null, 2));

        if (result.likelihood && result.impact && result.reasoning) {
            console.log('\nSUCCESS: Received structured analysis.');
        } else {
            console.error('\nFAILURE: Missing required fields in response.');
        }

    } catch (error: any) {
        console.error('\nError during analysis:', error);
    }
}

main().catch(console.error);
