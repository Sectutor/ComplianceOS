
import './env-loader';
import { getDb } from './packages/core/src/db';
import { nis2Mappings } from './packages/core/src/schema';
import { sql } from 'drizzle-orm';

const MAPPINGS = [
  {
    nis2Article: '21(2)(a)',
    enisaMeasureId: '1.1',
    enisaMeasureTitle: 'Information Systems Security Policy',
    iso27001ControlIds: ['5.2', 'A.5.1', 'A.5.36', 'A.5.4'],
    description: 'Establishment and approval of information security policies.'
  },
  {
    nis2Article: '21(2)(a)',
    enisaMeasureId: '2.1',
    enisaMeasureTitle: 'Risk Management Framework',
    iso27001ControlIds: ['6.1.2', '6.1.3', 'A.5.7', 'A.5.19'],
    description: 'A comprehensive framework for cybersecurity risk management.'
  },
  {
    nis2Article: '21(2)(b)',
    enisaMeasureId: '3.1',
    enisaMeasureTitle: 'Incident Handling Policy',
    iso27001ControlIds: ['A.5.24', 'A.5.25', 'A.5.26'],
    description: 'Policies and procedures for monitoring and managing incidents.'
  },
  {
    nis2Article: '21(2)(c)',
    enisaMeasureId: '4.1',
    enisaMeasureTitle: 'Business Continuity & Disaster Recovery Plan',
    iso27001ControlIds: ['A.5.29', 'A.5.30'],
    description: 'Ensuring resilience and recovery from disruptive incidents.'
  },
  {
    nis2Article: '21(2)(d)',
    enisaMeasureId: '5.1',
    enisaMeasureTitle: 'Supply Chain Security Policy',
    iso27001ControlIds: ['A.5.19', 'A.5.20', 'A.5.21', 'A.8.30'],
    description: 'Managing risks associated with third-party providers.'
  },
  {
    nis2Article: '21(2)(e)',
    enisaMeasureId: '6.7',
    enisaMeasureTitle: 'Network Security',
    iso27001ControlIds: ['A.8.16', 'A.8.20', 'A.8.22'],
    description: 'Security of network infrastructure and services.'
  },
  {
    nis2Article: '21(2)(e)',
    enisaMeasureId: '6.2',
    enisaMeasureTitle: 'Secure Development (SDLC)',
    iso27001ControlIds: ['A.8.25', 'A.8.26', 'A.8.31'],
    description: 'Acquisition, development, and maintenance of network and information systems.'
  },
  {
    nis2Article: '21(2)(f)',
    enisaMeasureId: '7.1',
    enisaMeasureTitle: 'Assessment of Effectiveness',
    iso27001ControlIds: ['9.1', '9.2', '9.3'],
    description: 'Policies and procedures for assessing security effectiveness.'
  },
  {
    nis2Article: '21(2)(g)',
    enisaMeasureId: '8.1',
    enisaMeasureTitle: 'Awareness and Cyber Hygiene',
    iso27001ControlIds: ['7.3', 'A.6.3'],
    description: 'Basic cyber hygiene practices and cybersecurity training.'
  },
  {
    nis2Article: '21(2)(h)',
    enisaMeasureId: '9.1',
    enisaMeasureTitle: 'Cryptography & Encryption',
    iso27001ControlIds: ['A.5.31', 'A.8.24'],
    description: 'Policies and procedures regarding the use of cryptography.'
  },
  {
    nis2Article: '21(2)(i)',
    enisaMeasureId: '10.1',
    enisaMeasureTitle: 'Human Resources Security',
    iso27001ControlIds: ['7.1', '7.2', 'A.6.2', 'A.6.3'],
    description: 'Security protocols during recruitment, employment, and termination.'
  },
  {
    nis2Article: '21(2)(j)',
    enisaMeasureId: '11.1',
    enisaMeasureTitle: 'Access Control Policy',
    iso27001ControlIds: ['A.5.15', 'A.5.18', 'A.8.3'],
    description: 'MFA, continuous authentication, and granular access control.'
  },
  {
    nis2Article: '21(2)(j)',
    enisaMeasureId: '12.1',
    enisaMeasureTitle: 'Asset Management',
    iso27001ControlIds: ['A.5.9', 'A.5.12', 'A.5.13'],
    description: 'Classification and handling of info assets and services.'
  }
];

async function main() {
  console.log('🚀 Starting NIS2 Mapping Migration...');
  const db = await getDb();

  try {
    // 1. Create table if not exists (using manual SQL since migrations are often manual in this repo)
    console.log('Creating table nis2_mappings...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "nis2_mappings" (
        "id" serial PRIMARY KEY,
        "nis2_article" varchar(50) NOT NULL,
        "enisa_measure_id" varchar(20) NOT NULL,
        "enisa_measure_title" varchar(255) NOT NULL,
        "iso27001_control_ids" json NOT NULL,
        "description" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 2. Clear existing mappings to avoid duplicates during re-runs
    await db.execute(sql`TRUNCATE TABLE "nis2_mappings" RESTART IDENTITY;`);

    // 3. Seed the data
    console.log(`Seeding ${MAPPINGS.length} mapping entries...`);
    for (const mapping of MAPPINGS) {
      await db.insert(nis2Mappings).values({
        nis2Article: mapping.nis2Article,
        enisaMeasureId: mapping.enisaMeasureId,
        enisaMeasureTitle: mapping.enisaMeasureTitle,
        iso27001ControlIds: mapping.iso27001ControlIds,
        description: mapping.description
      });
    }

    console.log('✅ NIS2 Mappings successfully integrated into the database!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

main();
