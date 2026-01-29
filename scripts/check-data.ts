import dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { assets, threats, vulnerabilities, riskAssessments, clients } from '../schema';
import { eq } from 'drizzle-orm';

async function checkData() {
    const db = await getDb();
    if (!db) {
        console.error('❌ Failed to connect to database');
        process.exit(1);
    }

    console.log('🔍 Checking database for existing data...\n');

    try {
        // Check clients
        const allClients = await db.select().from(clients);
        console.log('📋 Clients in database:');
        allClients.forEach(c => {
            console.log(`  - ID: ${c.id}, Name: ${c.companyName}`);
        });
        console.log('');

        // Find Intellfence client
        const intellfenceClient = allClients.find(c => c.companyName?.toLowerCase().includes('intellfence'));
        const clientId = intellfenceClient?.id || 1;

        console.log(`🎯 Using client ID: ${clientId} (${intellfenceClient?.companyName || 'Default'})\n`);

        // Check assets
        const assetCount = await db.select().from(assets).where(eq(assets.clientId, clientId));
        console.log(`📦 Assets for client ${clientId}: ${assetCount.length}`);
        if (assetCount.length > 0) {
            assetCount.slice(0, 3).forEach(a => console.log(`    - ${a.name}`));
            if (assetCount.length > 3) console.log(`    ... and ${assetCount.length - 3} more`);
        }
        console.log('');

        // Check threats
        const threatCount = await db.select().from(threats).where(eq(threats.clientId, clientId));
        console.log(`⚠️  Threats for client ${clientId}: ${threatCount.length}`);
        if (threatCount.length > 0) {
            threatCount.slice(0, 3).forEach(t => console.log(`    - ${t.name}`));
            if (threatCount.length > 3) console.log(`    ... and ${threatCount.length - 3} more`);
        }
        console.log('');

        // Check vulnerabilities
        const vulnCount = await db.select().from(vulnerabilities).where(eq(vulnerabilities.clientId, clientId));
        console.log(`🔓 Vulnerabilities for client ${clientId}: ${vulnCount.length}`);
        if (vulnCount.length > 0) {
            vulnCount.slice(0, 3).forEach(v => console.log(`    - ${v.name}`));
            if (vulnCount.length > 3) console.log(`    ... and ${vulnCount.length - 3} more`);
        }
        console.log('');

        // Check risk assessments
        const raCount = await db.select().from(riskAssessments).where(eq(riskAssessments.clientId, clientId));
        console.log(`📊 Risk Assessments for client ${clientId}: ${raCount.length}`);
        if (raCount.length > 0) {
            raCount.slice(0, 3).forEach(r => console.log(`    - ${r.assessmentId}: ${r.threatDescription?.substring(0, 50)}...`));
            if (raCount.length > 3) console.log(`    ... and ${raCount.length - 3} more`);
        }
        console.log('');

        console.log('✅ Database check complete!');

    } catch (error) {
        console.error('❌ Error checking data:', error);
        process.exit(1);
    }

    process.exit(0);
}

checkData();
