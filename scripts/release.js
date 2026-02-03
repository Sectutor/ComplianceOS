/**
 * Automated Release Script
 * 
 * Pushes to BOTH the Private (Premium) repo and the Public (Core) repo.
 * 
 * Usage: node scripts/release.js <public-repo-path>
 */

import { execSync } from 'child_process';
import path from 'path';
import readline from 'readline';
import fs from 'fs';

const publicRepoPath = process.argv[2];

if (!publicRepoPath) {
    console.error('Usage: node scripts/release.js <path-to-public-repo>');
    process.exit(1);
}

const absPublicPath = path.resolve(publicRepoPath);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter commit message for release: ', (message) => {
    if (!message) {
        console.error('Commit message is required');
        process.exit(1);
    }

    try {
        console.log('\n--- Step 1: Updating Private Repo ---');
        execSync('git add .', { stdio: 'inherit' });
        try {
            execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
        } catch (e) {
            console.log('Nothing to commit or commit failed, continuing...');
        }
        execSync('git push origin main', { stdio: 'inherit' });

        console.log('\n--- Step 2: Syncing to Open Source Core ---');
        // Run the sync script we created
        execSync(`node scripts/publish-oss.js "${absPublicPath}"`, { stdio: 'inherit' });

        console.log('\n--- Step 3: Updating Public Repo ---');
        process.chdir(absPublicPath);
        execSync('git add .', { stdio: 'inherit' });
        try {
            execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
        } catch (e) {
            console.log('Nothing to commit in public repo (maybe only premium changed).');
        }
        execSync('git push origin main', { stdio: 'inherit' });

        console.log('\n✅ Release Complete! Both repositories are in sync.');

    } catch (error) {
        console.error('\n❌ Release Failed:', error.message);
    } finally {
        rl.close();
    }
});
