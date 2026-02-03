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

const IGNORE_PATHS = [
    'packages/premium',
    'dist',
    'coverage',
    '.trae',
    '.agent',
    '.venv',
    'logs',
    'scripts/publish-oss.js',
    'scripts/release.js'
];

const IGNORE_NAMES = [
    '.git',
    '.env',
    'node_modules',
    '.DS_Store'
];

// Folders to explicitly sync
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
        const dirName = path.basename(src);
        if (IGNORE_NAMES.includes(dirName)) return;

        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

        fs.readdirSync(src).forEach(child => {
            const childSrc = path.join(src, child);
            const childDest = path.join(dest, child);

            // Check relative path for specific ignores
            const relPath = path.relative(SOURCE_ROOT, childSrc).replace(/\\/g, '/');

            // 1. Check strict path ignores (prefix match)
            if (IGNORE_PATHS.some(i => relPath.startsWith(i) || relPath === i)) {
                return;
            }

            // 2. Check name ignores (node_modules, etc)
            if (IGNORE_NAMES.includes(child)) return;

            copyRecursive(childSrc, childDest);
        });
    } else {
        if (IGNORE_NAMES.includes(path.basename(src))) return;
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
