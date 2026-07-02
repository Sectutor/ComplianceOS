const fs = require('fs');
const path = 'd:/OneDrive - Intellfence/WebDev/ComplianceOS/routers.ts';
try {
    const content = fs.readFileSync(path, 'utf8');
    // Handle CRLF or LF
    let lines = content.split(/\r?\n/);

    // Verify contents before deleting
    const startLine = 7300;
    const endLine = 7606;

    const startContent = lines[startLine - 1]; // 0-indexed
    const endContent = lines[endLine - 1];

    if (!startContent.includes('controls: router({')) {
        console.error(`Line ${startLine} does not match expected content. Found: ${startContent}`);
        process.exit(1);
    }

    if (!endContent.includes('governance: createGovernanceRouter(),')) {
        console.error(`Line ${endLine} does not match expected content. Found: ${endContent}`);
        process.exit(1);
    }

    console.log(`Deleting lines ${startLine} to ${endLine}...`);

    // Remove lines
    // splice(start, deleteCount)
    lines.splice(startLine - 1, endLine - startLine + 1);

    fs.writeFileSync(path, lines.join('\n')); // Join with LF (or could detect original)
    console.log('Successfully updated routers.ts');

} catch (e) {
    console.error("Error:", e);
    process.exit(1);
}
