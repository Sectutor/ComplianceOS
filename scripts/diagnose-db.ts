import dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { assets, threats, vulnerabilities, riskAssessments, clients, users, userClients } from '../schema';
import { eq } from 'drizzle-orm';

async function diagnose() {
    const db = await getDb();
    if (!db) {
        console.error('❌ Failed to connect to database');
        process.exit(1);
    }

    console.log('🔍 FULL DATABASE DIAGNOSTIC\n');
    console.log('='.repeat(60));

    try {
        // 1. List ALL clients
        console.log('\n📋 ALL CLIENTS IN DATABASE:');
        const allClients = await db.select().from(clients);
        console.log(`Total clients: ${allClients.length}\n`);

        for (const client of allClients) {
            console.log(`Client ID: ${client.id}`);
            console.log(`  Company Name: ${client.companyName || '(not set)'}`);
            console.log(`  Industry: ${client.industry || '(not set)'}`);
            console.log(`  Created: ${client.createdAt}`);
            console.log('');
        }

        // 2. List ALL users and their client associations
        console.log('\n👥 ALL USERS AND THEIR CLIENTS:');
        const allUsers = await db.select().from(users);
        const allUserClients = await db.select().from(userClients);

        for (const user of allUsers) {
            const userClientRels = allUserClients.filter(uc => uc.userId === user.id);
            console.log(`User: ${user.name || user.email}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Clients: ${userClientRels.map(uc => `#${uc.clientId}`).join(', ') || 'None'}`);
            console.log('');
        }

        // 3. Check data for EACH client
        console.log('\n📊 DATA COUNT PER CLIENT:');
        console.log('='.repeat(60));

        for (const client of allClients) {
            const assetCount = await db.select().from(assets).where(eq(assets.clientId, client.id));
            const threatCount = await db.select().from(threats).where(eq(threats.clientId, client.id));
            const vulnCount = await db.select().from(vulnerabilities).where(eq(vulnerabilities.clientId, client.id));
            const raCount = await db.select().from(riskAssessments).where(eq(riskAssessments.clientId, client.id));

            console.log(`\nClient #${client.id}: ${client.companyName || '(unnamed)'}`);
            console.log(`  📦 Assets: ${assetCount.length}`);
            console.log(`  ⚠️  Threats: ${threatCount.length}`);
            console.log(`  🔓 Vulnerabilities: ${vulnCount.length}`);
            console.log(`  📊 Risk Assessments: ${raCount.length}`);

            if (assetCount.length > 0) {
                console.log(`  Sample assets: ${assetCount.slice(0, 3).map(a => a.name).join(', ')}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n💡 RECOMMENDATION:');
        console.log('Based on the output above, identify which client you are logged in as.');
        console.log('If you need data for a specific client, I can seed it for that client ID.\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

diagnose();
