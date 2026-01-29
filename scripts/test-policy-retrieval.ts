import * as dotenv from 'dotenv';
dotenv.config();

import { retrievePolicies } from '../lib/advisor/retrieval';

async function testPolicyRetrieval() {
    console.log('=== TESTING POLICY RETRIEVAL ===\n');

    const queries = [
        "change management policy",
        "scope applicability change management",
        "physical security",
        "policy"
    ];

    for (const query of queries) {
        console.log(`\nQuery: "${query}"`);
        console.log('-'.repeat(40));

        try {
            const results = await retrievePolicies(query, 3, 5);
            console.log(`Results: ${results.length}`);
            results.forEach((r, i) => {
                console.log(`  ${i + 1}. [${r.docType}] Score: ${r.similarity?.toFixed(3) || 'N/A'}`);
                console.log(`     Content: ${r.content?.substring(0, 100)}...`);
            });
        } catch (error: any) {
            console.error('Error:', error.message);
        }
    }
}

testPolicyRetrieval().catch(console.error);
