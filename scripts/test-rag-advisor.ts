import * as dotenv from 'dotenv';
dotenv.config();

import { askQuestion } from '../lib/advisor/service';

const TEST_QUESTIONS = [
    "What is the Scope & Applicability of the change management policy?",
    "List our vendors",
    "How many policies do we have?",
    "What controls are we implementing?",
    "Tell me about our physical security policy"
];

async function runTests() {
    console.log('='.repeat(60));
    console.log('RAG ADVISOR TEST SUITE - Client 3 (Intellfence)');
    console.log('='.repeat(60));

    for (const question of TEST_QUESTIONS) {
        console.log('\n' + '-'.repeat(60));
        console.log(`QUESTION: "${question}"`);
        console.log('-'.repeat(60));

        try {
            const result = await askQuestion({
                clientId: 3, // Intellfence
                question: question
            });

            console.log('\nANSWER:');
            console.log(result.answer.substring(0, 500) + (result.answer.length > 500 ? '...' : ''));
            console.log('\nSOURCES FOUND:', result.sources.length);
            result.sources.forEach((s, i) => {
                console.log(`  ${i + 1}. [${s.type}] ${s.title}`);
            });
        } catch (error: any) {
            console.error('ERROR:', error.message);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUITE COMPLETE');
    console.log('='.repeat(60));
}

runTests().catch(console.error);
