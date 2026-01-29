const dotenv = require('dotenv');
dotenv.config();
const { getDb } = require('./db');
const { controls } = require('./schema');
const { like } = require('drizzle-orm');

async function checkControls() {
    const db = await getDb();
    if (!db) {
        console.error('No DB connection');
        return;
    }
    
    // Check for NIST 800-172 controls
    const nist172Controls = await db.select().from(controls).where(like(controls.framework, '%172%'));
    console.log('NIST 800-172 controls found:', nist172Controls.length);
    
    // Check for NIST 800-171 controls
    const nist171Controls = await db.select().from(controls).where(like(controls.framework, '%171%'));
    console.log('NIST 800-171 controls found:', nist171Controls.length);
    
    // Check all frameworks
    const allFrameworks = await db.select({ framework: controls.framework }).from(controls).groupBy(controls.framework);
    console.log('\nAll frameworks in database:');
    allFrameworks.forEach(f => console.log('  -', f.framework));
    
    // Show sample controls
    if (nist172Controls.length > 0) {
        console.log('\nSample NIST 800-172 controls:');
        nist172Controls.slice(0, 3).forEach(c => console.log(`  - ${c.controlId}: ${c.name}`));
    } else if (nist171Controls.length > 0) {
        console.log('\nSample NIST 800-171 controls:');
        nist171Controls.slice(0, 3).forEach(c => console.log(`  - ${c.controlId}: ${c.name}`));
    }
}

checkControls().catch(console.error);