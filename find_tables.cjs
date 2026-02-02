
const fs = require('fs');
const content = fs.readFileSync('packages/core/src/schema.ts', 'utf8');
const regex = /export\s+const\s+(\w+)\s*=/g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(match[1]);
}
