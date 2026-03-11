
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
    nistCsfControlIds: ['ID.AM-01', 'ID.AM-02', 'GV.OC-01', 'GV.RR-01'],
    soc2ControlIds: ['CC-001', 'CC-002', 'CC-003'],
    pciDssControlIds: ['12.1', '12.10'],
    description: 'Establishment and approval of information security policies.'
  },
  {
    nis2Article: '21(2)(a)',
    enisaMeasureId: '2.1',
    enisaMeasureTitle: 'Risk Management Framework',
    iso27001ControlIds: ['6.1.2', '6.1.3', 'A.5.7', 'A.5.19'],
    nistCsfControlIds: ['ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-05'],
    soc2ControlIds: ['CC-006', 'RM-001', 'RM-002'],
    pciDssControlIds: ['12.2', '12.3'],
    description: 'A comprehensive framework for cybersecurity risk management.'
  },
  {
    nis2Article: '21(2)(b)',
    enisaMeasureId: '3.1',
    enisaMeasureTitle: 'Incident Handling Policy',
    iso27001ControlIds: ['A.5.24', 'A.5.25', 'A.5.26'],
    nistCsfControlIds: ['RS.AN-1', 'RS.AN-2', 'RS.AN-3', 'RS.MI-1', 'RS.MI-2', 'RS.IM-1'],
    soc2ControlIds: ['CC7.1', 'CC7.2', 'CC7.3', 'CC7.4'],
    pciDssControlIds: ['Req-12.10', 'Req-10.1', 'Req-10.2'],
    description: 'Policies and procedures for monitoring and managing incidents.'
  },
  {
    nis2Article: '21(2)(c)',
    enisaMeasureId: '4.1',
    enisaMeasureTitle: 'Business Continuity & Disaster Recovery Plan',
    iso27001ControlIds: ['A.5.29', 'A.5.30'],
    nistCsfControlIds: ['RS.RP-1', 'RS.CO-1', 'RS.CO-2', 'RS.AN-4', 'RS.MI-3'],
    soc2ControlIds: ['CC8.1', 'CC9.1', 'CC9.2'],
    pciDssControlIds: ['Req-12.8', 'Req-12.10', 'Req-9.9'],
    description: 'Ensuring resilience and recovery from disruptive incidents.'
  },
  {
    nis2Article: '21(2)(d)',
    enisaMeasureId: '5.1',
    enisaMeasureTitle: 'Supply Chain Security Policy',
    iso27001ControlIds: ['A.5.19', 'A.5.20', 'A.5.21', 'A.8.30'],
    nistCsfControlIds: ['ID.SC-1', 'ID.SC-2', 'ID.SC-3', 'ID.SC-4', 'ID.SC-5'],
    soc2ControlIds: ['CC9.1', 'CC9.2', 'CC9.3', 'CC9.4'],
    pciDssControlIds: ['Req-12.8', 'Req-12.9', 'Req-12.10'],
    description: 'Managing risks associated with third-party providers.'
  },
  {
    nis2Article: '21(2)(e)',
    enisaMeasureId: '6.7',
    enisaMeasureTitle: 'Network Security',
    iso27001ControlIds: ['A.8.16', 'A.8.20', 'A.8.22'],
    nistCsfControlIds: ['PR.AC-1', 'PR.AC-2', 'PR.AC-3', 'PR.AC-4', 'PR.AC-5', 'PR.AC-6'],
    soc2ControlIds: ['CC6.1', 'CC6.2', 'CC6.6', 'CC6.7'],
    pciDssControlIds: ['Req-1.1', 'Req-1.2', 'Req-1.3', 'Req-1.4', 'Req-2.1', 'Req-2.2'],
    description: 'Security of network infrastructure and services.'
  },
  {
    nis2Article: '21(2)(e)',
    enisaMeasureId: '6.2',
    enisaMeasureTitle: 'Secure Development (SDLC)',
    iso27001ControlIds: ['A.8.25', 'A.8.26', 'A.8.31'],
    nistCsfControlIds: ['PR.DS-1', 'PR.DS-2', 'PR.DS-3', 'PR.DS-4', 'PR.DS-5', 'PR.DS-6'],
    soc2ControlIds: ['CC8.1', 'CC9.2', 'CC6.1'],
    pciDssControlIds: ['Req-6.1', 'Req-6.2', 'Req-6.3', 'Req-6.4', 'Req-6.5'],
    description: 'Acquisition, development, and maintenance of network and information systems.'
  },
  {
    nis2Article: '21(2)(f)',
    enisaMeasureId: '7.1',
    enisaMeasureTitle: 'Assessment of Effectiveness',
    iso27001ControlIds: ['9.1', '9.2', '9.3'],
    nistCsfControlIds: ['DE.AE-1', 'DE.AE-2', 'DE.CM-1', 'DE.CM-2', 'DE.CM-3', 'DE.CM-4'],
    soc2ControlIds: ['CC7.1', 'CC7.2', 'CC7.3'],
    pciDssControlIds: ['Req-11.1', 'Req-11.2', 'Req-11.3'],
    description: 'Policies and procedures for assessing security effectiveness.'
  },
  {
    nis2Article: '21(2)(g)',
    enisaMeasureId: '8.1',
    enisaMeasureTitle: 'Awareness and Cyber Hygiene',
    iso27001ControlIds: ['7.3', 'A.6.3'],
    nistCsfControlIds: ['PR.AT-1', 'PR.AT-2', 'PR.AT-3', 'PR.AT-4', 'PR.AT-5'],
    soc2ControlIds: ['CC1.1', 'CC1.2', 'CC2.1', 'CC2.2'],
    pciDssControlIds: ['Req-12.6', 'Req-12.7', 'Req-12.11'],
    description: 'Basic cyber hygiene practices and cybersecurity training.'
  },
  {
    nis2Article: '21(2)(h)',
    enisaMeasureId: '9.1',
    enisaMeasureTitle: 'Cryptography & Encryption',
    iso27001ControlIds: ['A.5.31', 'A.8.24'],
    nistCsfControlIds: ['PR.DS-1', 'PR.DS-2', 'PR.DS-3', 'PR.DS-4', 'PR.DS-5', 'PR.DS-6'],
    soc2ControlIds: ['CC6.1', 'CC6.7', 'CC6.8'],
    pciDssControlIds: ['Req-3.1', 'Req-3.2', 'Req-3.3', 'Req-3.4', 'Req-4.1', 'Req-4.2', 'Req-4.3'],
    description: 'Policies and procedures regarding the use of cryptography.'
  },
  {
    nis2Article: '21(2)(i)',
    enisaMeasureId: '10.1',
    enisaMeasureTitle: 'Human Resources Security',
    iso27001ControlIds: ['7.1', '7.2', 'A.6.2', 'A.6.3'],
    nistCsfControlIds: ['PR.AT-1', 'PR.AT-2', 'PR.PT-1', 'PR.PT-2'],
    soc2ControlIds: ['CC1.1', 'CC1.4', 'CC1.5', 'CC2.1'],
    pciDssControlIds: ['Req-12.4', 'Req-12.5', 'Req-12.6'],
    description: 'Security protocols during recruitment, employment, and termination.'
  },
  {
    nis2Article: '21(2)(j)',
    enisaMeasureId: '11.1',
    enisaMeasureTitle: 'Access Control Policy',
    iso27001ControlIds: ['A.5.15', 'A.5.18', 'A.8.3'],
    nistCsfControlIds: ['PR.AC-1', 'PR.AC-2', 'PR.AC-3', 'PR.AC-4', 'PR.AC-5', 'PR.AC-6'],
    soc2ControlIds: ['CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5'],
    pciDssControlIds: ['Req-7.1', 'Req-7.2', 'Req-7.3', 'Req-8.1', 'Req-8.2', 'Req-8.3'],
    description: 'MFA, continuous authentication, and granular access control.'
  },
  {
    nis2Article: '21(2)(j)',
    enisaMeasureId: '12.1',
    enisaMeasureTitle: 'Asset Management',
    iso27001ControlIds: ['A.5.9', 'A.5.12', 'A.5.13'],
    nistCsfControlIds: ['ID.AM-1', 'ID.AM-2', 'ID.AM-3', 'ID.AM-4', 'ID.AM-5', 'ID.AM-6'],
    soc2ControlIds: ['CC6.1', 'CC6.6', 'CC6.7'],
    pciDssControlIds: ['Req-9.1', 'Req-9.2', 'Req-9.3', 'Req-9.4'],
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
        "nist_csf_control_ids" json,
        "soc2_control_ids" json,
        "pci_dss_control_ids" json,
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
        nistCsfControlIds: mapping.nistCsfControlIds || null,
        soc2ControlIds: mapping.soc2ControlIds || null,
        pciDssControlIds: mapping.pciDssControlIds || null,
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
