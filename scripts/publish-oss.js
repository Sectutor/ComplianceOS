/**
 * Publish Core (OSS) Script
 * 
 * This script syncs the "Core" portion of the monorepo to a separate folder 
 * (which should be a git repository pointing to your public GitHub).
 * 
 * Usage: node scripts/publish-oss.js <path-to-public-repo>
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ROOT = path.resolve(__dirname, '..');
const IGNORE_LIST = [
    '.git',
    '.env',
    'node_modules',
    'packages/premium',
    'dist',
    'coverage',
    '.trae',
    '.agent',
    '.venv',
    'logs',
    'scripts/publish-oss.js', // Don't copy this script itself
    '.DS_Store'
];

// Folders to explicitly sync (whitelist approach is safer, but mixed is okay)
const SYNC_DIRS = [
    'packages/core',
    'packages/ui',
    'shared'
];

const SYNC_FILES = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'drizzle.config.ts',
    'server_entry.ts',
    '.gitignore'
];

function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(child => {
            const childSrc = path.join(src, child);
            const childDest = path.join(dest, child);
            // Check relative path for ignores
            const relPath = path.relative(SOURCE_ROOT, childSrc).replace(/\\/g, '/');

            if (IGNORE_LIST.some(i => relPath.startsWith(i) || relPath === i)) {
                return; // Skip ignored
            }

            copyRecursive(childSrc, childDest);
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

const targetDir = process.argv[2];

if (!targetDir) {
    console.error('Usage: node scripts/publish-oss.js <path-to-public-repo>');
    process.exit(1);
}

const absTarget = path.resolve(targetDir);

if (!fs.existsSync(absTarget)) {
    console.log(`Creating target directory: ${absTarget}`);
    fs.mkdirSync(absTarget, { recursive: true });
}

console.log(`Syncing Core files to: ${absTarget}`);

// 1. Sync Root Files
SYNC_FILES.forEach(file => {
    const src = path.join(SOURCE_ROOT, file);
    const dest = path.join(absTarget, file);
    if (fs.existsSync(src)) {
        console.log(`Copying ${file}...`);
        fs.copyFileSync(src, dest);
    }
});

// 2. Sync Directories
SYNC_DIRS.forEach(dir => {
    const src = path.join(SOURCE_ROOT, dir);
    const dest = path.join(absTarget, dir);
    if (fs.existsSync(src)) {
        console.log(`Copying ${dir}...`);
        copyRecursive(src, dest);
    }
});

console.log('------------------------------------------------');
console.log('Sync Complete.');
console.log('Next steps:');
console.log(`1. cd ${targetDir}`);
console.log('2. git add .');
console.log('3. git commit -m "Update Core"');
console.log('4. git push origin main');
