/**
 * OWASP SAMM v2 Migration Script
 * 
 * This script creates the new SAMM v2 stream-based assessment tables and
 * migrates data from the old sammMaturityAssessments table if it exists.
 * 
 * Run with: npx tsx scripts/migrate-samm-v2.ts
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Create SAMM v2 tables
        console.log('\n📦 Creating SAMM v2 tables...');

        // 1. Create samm_practices table
        await client.query(`
      CREATE TABLE IF NOT EXISTS samm_practices (
        id SERIAL PRIMARY KEY,
        practice_id VARCHAR(10) UNIQUE NOT NULL,
        practice_name VARCHAR(100) NOT NULL,
        description TEXT,
        business_function VARCHAR(50) NOT NULL,
        stream_a_name VARCHAR(100),
        stream_a_description TEXT,
        stream_b_name VARCHAR(100),
        stream_b_description TEXT,
        official_link VARCHAR(500),
        "order" INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('✅ Created samm_practices table');

        // 2. Create samm_stream_questions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS samm_stream_questions (
        id SERIAL PRIMARY KEY,
        practice_id VARCHAR(10) NOT NULL,
        practice_name VARCHAR(100) NOT NULL,
        stream_id VARCHAR(1) NOT NULL,
        stream_name VARCHAR(100) NOT NULL,
        stream_description TEXT,
        level INTEGER NOT NULL,
        level_name VARCHAR(50),
        question TEXT NOT NULL,
        quality_criteria JSONB DEFAULT '[]'::jsonb,
        activities JSONB DEFAULT '[]'::jsonb,
        benefits TEXT,
        maturity_indicators JSONB DEFAULT '[]'::jsonb,
        suggested_evidence JSONB DEFAULT '[]'::jsonb,
        business_function VARCHAR(50) NOT NULL,
        official_link VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        version VARCHAR(20) DEFAULT '2.0',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_samm_practice_stream_level 
        ON samm_stream_questions(practice_id, stream_id, level);
    `);
        console.log('✅ Created samm_stream_questions table');

        // 3. Create samm_stream_assessments table
        await client.query(`
      CREATE TABLE IF NOT EXISTS samm_stream_assessments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        practice_id VARCHAR(10) NOT NULL,
        stream_id VARCHAR(1) NOT NULL,
        maturity_level INTEGER DEFAULT 0 NOT NULL,
        target_level INTEGER DEFAULT 1 NOT NULL,
        assessment_answers JSONB DEFAULT '{}'::jsonb,
        quality_criteria JSONB DEFAULT '{}'::jsonb,
        assessment_date TIMESTAMP,
        assessed_by INTEGER,
        evidence JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        improvement_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_samm_client_practice_stream 
        ON samm_stream_assessments(client_id, practice_id, stream_id);
    `);
        console.log('✅ Created samm_stream_assessments table');

        // 4. Migrate data from old table if it exists
        console.log('\n🔄 Checking for existing data to migrate...');

        const { rows: oldAssessments } = await client.query(`
      SELECT * FROM samm_maturity_assessments 
      WHERE EXISTS (SELECT 1 FROM samm_maturity_assessments LIMIT 1)
    `).catch(() => ({ rows: [] }));

        if (oldAssessments.length > 0) {
            console.log(`Found ${oldAssessments.length} old assessments to migrate`);

            for (const assessment of oldAssessments) {
                // Split into two streams (A and B) with same maturity level
                // This is a simplified migration - users should re-assess properly
                await client.query(`
          INSERT INTO samm_stream_assessments 
            (client_id, practice_id, stream_id, maturity_level, target_level, notes, created_at, updated_at)
          VALUES 
            ($1, $2, 'A', $3, $4, $5, $6, $7),
            ($1, $2, 'B', $3, $4, $5, $6, $7)
          ON CONFLICT (client_id, practice_id, stream_id) DO NOTHING
        `, [
                    assessment.client_id,
                    assessment.practice_id,
                    assessment.maturity_level,
                    assessment.target_level,
                    assessment.notes || 'Migrated from old SAMM assessment',
                    assessment.created_at,
                    assessment.updated_at
                ]);
            }
            console.log('✅ Migrated old assessments to stream-based format');
        } else {
            console.log('No old assessments found to migrate');
        }

        console.log('\n✨ SAMM v2 migration complete!');
        console.log('\nNext steps:');
        console.log('1. Run: npx tsx scripts/seed-samm-questions.ts (to populate questions)');
        console.log('2. Run: npx drizzle-kit push (to sync with Drizzle schema)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
    }
}

migrate();
