
import * as fs from 'fs';
import * as path from 'path';

const filePath = 'd:\\OneDrive - Intellfence\\WebDev\\ComplianceOS\\routers.ts';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const routerKeys = [
    'clients:',
    'clientControls:',
    'clientPolicies:',
    'crm:',
    'readiness:',
    'businessContinuity:',
    'risks:',
    'governance:',
    'ai:',
    'users:',
    'frameworkImports:',
    'autopilot:',
    'roadmap:',
    'checklist:',
    'gapAnalysis:',
    'federal:',
    'controls:',
    'employees:',
    'regulations:',
    'billing:',
    'remediationTasks:',
    'remediationPlaybooks:',
    'policyTemplates:',
    'evidenceSuggestions:',
    'frameworkMappings:',
    'universalTasks:',
    'projectTasks:',
    'advisor:'
];

console.log('--- Router Key Occurrences ---');
routerKeys.forEach(key => {
    const matches = [];
    lines.forEach((line, index) => {
        if (line.trim().startsWith(key + ' router(') || line.trim().startsWith(key + ' create')) {
            matches.push(index + 1);
        } else if (line.trim() === key) {
            // Some might be just key if they use a helper
            matches.push(index + 1);
        }
    });
    if (matches.length > 0) {
        console.log(`${key.padEnd(25)} : ${matches.join(', ')}`);
    }
});

const appRouterStarts = [];
lines.forEach((line, index) => {
    if (line.includes('const appRouter = router({') || line.includes('export const appRouter = router({')) {
        appRouterStarts.push(index + 1);
    }
});
console.log('\nappRouter starts:', appRouterStarts.join(', '));
