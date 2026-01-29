
import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function applyMigration() {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    const db = await getDb();

    try {
        console.log('📦 Creating table: integrations');

        await db.execute(sql.raw(`
            CREATE TABLE IF NOT EXISTS "integrations" (
                "id" serial PRIMARY KEY NOT NULL,
                "client_id" integer NOT NULL,
                "provider" varchar(50) NOT NULL,
                "access_token" text,
                "refresh_token" text,
                "expires_at" timestamp,
                "external_account_id" varchar(255),
                "scopes" json,
                "metadata" json,
                "created_by" integer,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now()
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "idx_integrations_client_provider" ON "integrations" ("client_id", "provider");
        `));

        console.log('✅ Table "integrations" created successfully!');

    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

applyMigration();
