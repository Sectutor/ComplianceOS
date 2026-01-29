import 'dotenv/config';
import { getDb } from '../db';
import { scanVendorForCves, getVendorCveSuggestions } from '../lib/threatIntelligence';
import { vendors } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.error('Database connection failed');
        process.exit(1);
    }

    console.log('--- Testing Vendor Threat Intel Scan ---');

    // 1. Find or create a test vendor
    let vendor = await db.query.vendors.findFirst({
        where: eq(vendors.name, 'Microsoft')
    });

    if (!vendor) {
        console.log('Creating test vendor: Microsoft');
        const [newVendor] = await db.insert(vendors).values({
            clientId: 1, // Assuming client 1 exists
            name: 'Microsoft',
            description: 'Test Vendor',
            status: 'Active',
            criticality: 'High',
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        vendor = newVendor;
    } else {
        console.log(`Using existing vendor: ${vendor.name} (ID: ${vendor.id})`);
    }

    // 2. Run Scan
    console.log('\nRunning scanVendorForCves...');
    const scanResults = await scanVendorForCves(vendor.id);
    console.log(`Scan completed. Found ${scanResults.length} suggestions.`);

    if (scanResults.length > 0) {
        console.log('Top 3 Suggestions:');
        scanResults.slice(0, 3).forEach(s => {
            console.log(`- [${s.cveId}] CVSS: ${s.cvssScore} (Match Score: ${s.matchScore}) - ${s.description.substring(0, 100)}...`);
        });
    }

    // 3. Verify Retrieval
    console.log('\nRetrieving stored suggestions...');
    const storedSuggestions = await getVendorCveSuggestions(vendor.id);
    console.log(`Retrieved ${storedSuggestions.length} stored suggestions.`);

    if (storedSuggestions.length === 0 && scanResults.length > 0) {
        console.error('ERROR: Scanned suggestions were not retrieved/saved correctly.');
    } else {
        console.log('SUCCESS: Retrieval matches scan (or both empty).');
    }

    process.exit(0);
}

main().catch(console.error);
