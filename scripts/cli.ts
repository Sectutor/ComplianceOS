import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { spawn } from 'child_process';

const SCRIPTS_DIR = path.resolve(__dirname, './');
const CATEGORIES = ['seed', 'debug', 'migrations', 'test', 'setup'];

async function main() {
    console.log('ComplianceOS Dev CLI\n');

    const { category } = await inquirer.prompt([
        {
            type: 'list',
            name: 'category',
            message: 'Select a category:',
            choices: CATEGORIES,
        },
    ]);

    const categoryDir = path.join(SCRIPTS_DIR, category);

    if (!fs.existsSync(categoryDir)) {
        console.error(`Directory not found: ${categoryDir}`);
        return;
    }

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.sh') || f.endsWith('.ps1'));

    if (files.length === 0) {
        console.log('No scripts found in this category.');
        return;
    }

    const { script } = await inquirer.prompt([
        {
            type: 'list',
            name: 'script',
            message: 'Select a script to run:',
            choices: files,
        },
    ]);

    const scriptPath = path.join(categoryDir, script);
    console.log(`\n> Running: ${script}\n`);

    let cmd = 'tsx';
    let args = [scriptPath];

    if (script.endsWith('.sh')) {
        cmd = 'bash';
    } else if (script.endsWith('.ps1')) {
        cmd = 'powershell';
        args = ['-File', scriptPath];
    }

    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

    proc.on('close', (code) => {
        console.log(`\nScript exited with code ${code}`);
    });
}

main().catch(console.error);
