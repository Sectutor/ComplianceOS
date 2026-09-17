import '../../env-loader';
import { getDb } from '../../packages/core/src/db';
import * as schema from '../../packages/core/src/schema';
import { sendEvidenceExpiryWarnings } from '../../packages/core/src/emailNotification';
import { eq, inArray } from 'drizzle-orm';

async function runTest() {
    console.log('=== Evidence Expiry Alert Test ===');
    const db = await getDb();
    
    // 1. Setup client to test with
    const clients = await db.select().from(schema.clients).limit(1);
    if (clients.length === 0) {
        console.error('No clients found in database to run tests.');
        process.exit(1);
    }
    const client = clients[0];
    const clientId = client.id;
    console.log(`Using client: ID=${clientId}, Name=${client.name}`);

    // Create a mock user associated with this client if needed, to satisfy notificationLog FKs
    const userClientsList = await db.select().from(schema.userClients).where(eq(schema.userClients.clientId, clientId)).limit(1);
    if (userClientsList.length === 0) {
        console.error('No users associated with this client. Please run seeding first.');
        process.exit(1);
    }
    console.log(`Found active client user mapping: userId=${userClientsList[0].userId}`);

    // Retrieve or create a valid clientControl
    let clientControlId: number;
    let tempClientControlId: number | null = null;

    const existingControls = await db.select().from(schema.clientControls).where(eq(schema.clientControls.clientId, clientId)).limit(1);
    if (existingControls.length > 0) {
        clientControlId = existingControls[0].id;
        console.log(`Using existing client control ID: ${clientControlId}`);
    } else {
        const masterControls = await db.select().from(schema.controls).limit(1);
        if (masterControls.length === 0) {
            console.error('No master controls found in database. Run seeding first.');
            process.exit(1);
        }
        console.log(`No client controls found. Creating temporary client control using master control ID ${masterControls[0].id}...`);
        const tempCC = await db.insert(schema.clientControls).values({
            clientId,
            controlId: masterControls[0].id,
            status: 'not_applicable',
            applicability: 'not_applicable'
        }).returning();
        clientControlId = tempCC[0].id;
        tempClientControlId = tempCC[0].id;
        console.log(`Created temporary client control ID: ${clientControlId}`);
    }

    // Calculate dates
    const now = new Date();
    
    const date30 = new Date();
    date30.setDate(now.getDate() + 30);

    const date14 = new Date();
    date14.setDate(now.getDate() + 14);

    const date7 = new Date();
    date7.setDate(now.getDate() + 7);

    const date5 = new Date();
    date5.setDate(now.getDate() + 5);

    const datePast = new Date();
    datePast.setDate(now.getDate() - 1);

    // 2. Insert mock evidence items (Arrange)
    console.log('Inserting test evidence items...');
    const inserted = await db.insert(schema.evidence).values([
        {
            clientId,
            clientControlId,
            evidenceId: 'TEST-EXP-30',
            description: 'Expiring in 30 days',
            status: 'verified',
            expirationDate: date30,
            owner: 'Test Owner'
        },
        {
            clientId,
            clientControlId,
            evidenceId: 'TEST-EXP-14',
            description: 'Expiring in 14 days',
            status: 'verified',
            expirationDate: date14,
            owner: 'Test Owner'
        },
        {
            clientId,
            clientControlId,
            evidenceId: 'TEST-EXP-7',
            description: 'Expiring in 7 days',
            status: 'verified',
            expirationDate: date7,
            owner: 'Test Owner'
        },
        {
            clientId,
            clientControlId,
            evidenceId: 'TEST-EXP-5',
            description: 'Expiring in 5 days (should not alert)',
            status: 'verified',
            expirationDate: date5,
            owner: 'Test Owner'
        },
        {
            clientId,
            clientControlId,
            evidenceId: 'TEST-EXP-PAST',
            description: 'Already expired (should not alert)',
            status: 'verified',
            expirationDate: datePast,
            owner: 'Test Owner'
        }
    ]).returning();

    const ids = inserted.map(e => e.id);
    console.log(`Inserted evidence IDs: ${ids.join(', ')}`);

    try {
        // 3. Trigger alert engine run 1 (Act)
        console.log('\nRunning alert check 1 (First Run)...');
        const res1 = await sendEvidenceExpiryWarnings();
        console.log(`Run 1 Result: success=${res1.success}, warningsSent=${res1.warningsSent}`);

        // Assert 1 (3 alerts should have been sent: 30, 14, 7 days)
        if (res1.warningsSent !== 3) {
            throw new Error(`Expected exactly 3 warnings to be sent, got ${res1.warningsSent}`);
        }
        console.log('✅ Success: Exactly 3 warnings sent on first run.');

        // 4. Trigger alert engine run 2 (Act - Duplicate Prevention check)
        console.log('\nRunning alert check 2 (Second Run - Duplicate Prevention)...');
        const res2 = await sendEvidenceExpiryWarnings();
        console.log(`Run 2 Result: success=${res2.success}, warningsSent=${res2.warningsSent}`);

        // Assert 2 (0 alerts should be sent on second run)
        if (res2.warningsSent !== 0) {
            throw new Error(`Expected 0 warnings to be sent on second run (duplicate prevention), got ${res2.warningsSent}`);
        }
        console.log('✅ Success: Duplicate warnings prevented (0 warnings sent).');

        // Check database notifications log
        const logs = await db.select()
            .from(schema.notificationLog)
            .where(inArray(schema.notificationLog.relatedEntityId, ids));
        
        console.log(`\nVerified database notification logs created: ${logs.length} entries.`);
        for (const log of logs) {
            console.log(`- Title: "${log.title}", Related ID: ${log.relatedEntityId}, Meta: ${JSON.stringify(log.metadata)}`);
        }

        if (logs.length !== 3) {
            throw new Error(`Expected exactly 3 notification log entries, found ${logs.length}`);
        }
        console.log('✅ Success: Correct database notification logs verified.');

    } finally {
        // 5. Cleanup database (Teardown)
        console.log('\nCleaning up database...');
        await db.delete(schema.notificationLog).where(inArray(schema.notificationLog.relatedEntityId, ids));
        await db.delete(schema.evidence).where(inArray(schema.evidence.id, ids));
        if (tempClientControlId) {
            await db.delete(schema.clientControls).where(eq(schema.clientControls.id, tempClientControlId));
            console.log(`Deleted temporary client control ID: ${tempClientControlId}`);
        }
        console.log('Cleanup finished.');
    }
}

runTest().then(() => {
    console.log('\nAll tests passed successfully! 🚀');
    process.exit(0);
}).catch(err => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
});
