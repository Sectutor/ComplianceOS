import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function checkClientControls() {
    console.log('Checking client_controls table for clientId 679...');
    try {
        const controls = await db.select().from(schema.clientControls).where(eq(schema.clientControls.clientId, 679));
        console.log(`Found ${controls.length} client controls for client 679:`);
        
        if (controls.length > 0) {
            controls.slice(0, 5).forEach((c, i) => {
                console.log(`\nControl ${i + 1}:`);
                console.log(`  ID: ${c.id}`);
                console.log(`  Control ID: ${c.controlId}`);
                console.log(`  Client Control ID: ${c.clientControlId}`);
                console.log(`  Custom Description: ${c.customDescription?.substring(0, 50) || 'N/A'}`);
                console.log(`  Status: ${c.status}`);
            });
        } else {
            console.log('No client controls found for client 679.');
        }
        
        // Also check if there are any controls in the master controls table
        const masterControls = await db.select().from(schema.controls).limit(5);
        console.log(`\nSample of master controls (first 5):`);
        masterControls.forEach((c, i) => {
            console.log(`\nMaster Control ${i + 1}:`);
            console.log(`  ID: ${c.id}`);
            console.log(`  Control ID: ${c.controlId}`);
            console.log(`  Name: ${c.name?.substring(0, 50) || 'N/A'}`);
            console.log(`  Framework: ${c.framework}`);
        });
        
        // Check for NIST 800-172 controls specifically
        const nist172Controls = await db.select().from(schema.controls).where(eq(schema.controls.framework, 'NIST 800-172')).limit(5);
        console.log(`\nNIST 800-172 controls (first 5):`);
        nist172Controls.forEach((c, i) => {
            console.log(`\nNIST Control ${i + 1}:`);
            console.log(`  Control ID: ${c.controlId}`);
            console.log(`  Name: ${c.name?.substring(0, 50) || 'N/A'}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkClientControls();