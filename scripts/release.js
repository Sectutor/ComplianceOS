
/**
 * Release Script for Open Core
 * Usage: node scripts/release.js -- <target-dir>
 * Example: node scripts/release.js -- ../ComplianceOS-Public
 * 
 * This script synchronizes the current repository to a public Open Core repository,
 * enforcing the separation of proprietary/premium code.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Get Target Directory
const args = process.argv.slice(2);
const targetDirArg = args.find(arg => !arg.startsWith('-')); // simplistic arg parsing

if (!targetDirArg) {
    console.error('Error: No target directory specified.');
    console.error('Usage: npm run release -- <target-directory>');
    process.exit(1);
}

const sourceDir = path.resolve(__dirname, '..');
const targetDir = path.resolve(sourceDir, targetDirArg);

console.log(`[Release] Starting release process...`);
console.log(`[Release] Source: ${sourceDir}`);
console.log(`[Release] Target: ${targetDir}`);

if (!fs.existsSync(targetDir)) {
    console.log(`[Release] Target directory does not exist. Creating it...`);
    fs.mkdirSync(targetDir, { recursive: true });
}

// 2. Define Exclusion Rules (What NOT to copy)
const EXCLUDES = [
    '.git',
    '.env',
    '.env.local',
    '.env.production',
    '.DS_Store',
    'node_modules',
    'dist',
    'build',
    'coverage',
    'logs',
    'tmp',
    'packages/premium', // Proprietary Code
    'scripts/release.js', // Don't copy this script itself
    'docker-compose.yml', // We likely want a public version
    'Dockerfile',        // We likely want a public version
];

// 3. Helper Function to Copy Recursive
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    const relativePath = path.relative(sourceDir, src).replace(/\\/g, '/');

    // Check Excludes (Top Level or Nested)
    const pathParts = relativePath.split('/');

    // Specific excludes that should apply anywhere in the path
    const RECURSIVE_EXCLUDES = ['node_modules', '.git', 'dist', 'build', 'coverage', 'tmp', '.DS_Store'];
    if (pathParts.some(part => RECURSIVE_EXCLUDES.includes(part))) {
        return;
    }

    // Specific path excludes (relative to root)
    const PATH_EXCLUDES = [
        '.env',
        '.env.local',
        '.env.production',
        'logs',
        'packages/premium', // Proprietary Code
        'scripts/release.js',
        'docker-compose.yml',
        'Dockerfile'
    ];

    if (PATH_EXCLUDES.some(ex => relativePath === ex || relativePath.startsWith(ex + '/'))) {
        return;
    }

    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        const files = fs.readdirSync(src);
        for (const file of files) {
            copyRecursive(path.join(src, file), path.join(dest, file));
        }
    } else {
        // File Copy
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Check if file is essentially the same (size + mtime check might be overkill, just copy)
        // For simplicity, always overwrite
        try {
            fs.copyFileSync(src, dest);
        } catch (err) {
            console.error(`[Error] Failed to copy ${src}: ${err.message}`);
        }
    }
}

// 4. Execute Copy
console.log(`[Release] Copying files...`);
const items = fs.readdirSync(sourceDir);
for (const item of items) {
    copyRecursive(path.join(sourceDir, item), path.join(targetDir, item));
}

// 5. Post-Processing: Create Public Dockerfile
console.log(`[Release] Generating public Dockerfile...`);
try {
    const dockerfileContent = fs.readFileSync(path.join(sourceDir, 'Dockerfile'), 'utf8');
    const publicDockerfileContent = dockerfileContent
        .replace(/COPY .*packages\/premium.*/g, '# packages/premium skipped in Open Core')
        .replace(/ENV VITE_ENABLE_PREMIUM=true/g, 'ENV VITE_ENABLE_PREMIUM=false');

    fs.writeFileSync(path.join(targetDir, 'Dockerfile'), publicDockerfileContent);
} catch (err) {
    console.warn(`[Warning] Could not process Dockerfile: ${err.message}`);
}


// 6. Post-Processing: Create Public docker-compose.yml (if needed)
// Assuming we perform similar replacements or just copy a template if it exists.

console.log(`[Release] Release sync complete!`);
console.log(`[Release] You can now navigate to ${targetDir} and push to the public repository.`);
