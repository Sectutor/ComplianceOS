import * as dotenv from 'dotenv';
dotenv.config();

import { askQuestion } from '../lib/advisor/service';

async function testScopeQuestion() {
    console.log('='.repeat(60));
    console.log('TESTING: Scope & Applicability of Change Management Policy');
    console.log('='.repeat(60));

    try {
        const result = await askQuestion({
            clientId: 3, // Intellfence
            question: "What is the Scope & Applicability of the change management policy?"
        });

        console.log('\n=== FULL ANSWER ===');
        console.log(result.answer);
        console.log('\n=== SOURCES ===');
        console.log('Total sources:', result.sources.length);
        result.sources.forEach((s, i) => {
            console.log(`  ${i + 1}. [${s.type}] ${s.title}`);
        });
    } catch (error: any) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
    }
}

testScopeQuestion().catch(console.error);
