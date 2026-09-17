// This script enables the Risk Game feature for client 3
// Run with: npx tsx scripts/enable-risk-game-client3.ts

import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import { clientSettings } from '../packages/core/src/schema_client_settings';
import { eq } from 'drizzle-orm';

async function enableRiskGameForClient3() {
    console.log('Enabling Risk Game feature for client 3...');

    try {
        const db = await getDb();
        // Check if client settings exist for client 3
        const existing = await db
            .select()
            .from(clientSettings)
            .where(eq(clientSettings.clientId, 3))
            .limit(1);

        if (existing.length > 0) {
            // Update existing settings
            const currentFlags = existing[0].featureFlags as Record<string, boolean> || {};
            await db
                .update(clientSettings)
                .set({
                    featureFlags: {
                        ...currentFlags,
                        riskGame: true,
                    },
                    updatedAt: new Date(),
                })
                .where(eq(clientSettings.clientId, 3));

            console.log('✅ Updated client settings for client 3');
        } else {
            // Create new settings with riskGame enabled
            await db
                .insert(clientSettings)
                .values({
                    clientId: 3,
                    brandingOverrides: {},
                    featureFlags: {
                        riskGame: true,
                    },
                    customSettings: {},
                    version: 1,
                });

            console.log('✅ Created client settings for client 3 with Risk Game enabled');
        }

        console.log('✅ Risk Game feature is now enabled for client 3!');
        console.log('\nTo access the Risk Game:');
        console.log('1. Go to Client Settings for client 3');
        console.log('2. Navigate to the Risk section');
        console.log('3. The Risk Game should now be visible');

    } catch (error) {
        console.error('Error enabling Risk Game:', error);
    }

    process.exit(0);
}

enableRiskGameForClient3();
