/**
 * Seed script to add framework control mappings to nis2_mappings table
 * Run with: npx tsx seed_framework_mappings.ts
 * 
 * This populates the nist_csf_control_ids, soc2_control_ids, and pci_dss_control_ids columns
 */

import { getDb } from './packages/core/src/db';
import { eq } from 'drizzle-orm';
import { nis2Mappings } from './packages/core/src/schema';

// Sample mappings - these should be customized based on actual compliance requirements
const FRAMEWORK_MAPPINGS = [
    // Article 21(2)(a) - Policies and procedures
    {
        nis2Article: '21(2)(a)',
        nistCsf: ['AC-1', 'AC-2', 'AC-3', 'AC-17', 'AU-2', 'AU-6', 'SC-8', 'SC-13'],
        soc2: ['CC1.1', 'CC1.2', 'CC1.3', 'CC2.1', 'CC5.1', 'CC5.2', 'CC6.1', 'CC7.2'],
        pciDss: ['Req-1.1', 'Req-1.2', 'Req-2.1', 'Req-2.2', 'Req-7.1', 'Req-7.2', 'Req-12.1']
    },
    // Article 21(2)(b) - Risk analysis
    {
        nis2Article: '21(2)(b)',
        nistCsf: ['ID-1', 'ID-2', 'ID-3', 'RA-1', 'RA-2', 'RA-3', 'RA-5'],
        soc2: ['CC3.1', 'CC3.2', 'CC3.3', 'CC3.4', 'CC6.1', 'CC7.1', 'CC7.2', 'CC7.3'],
        pciDss: ['Req-6.1', 'Req-6.2', 'Req-6.3', 'Req-6.4', 'Req-6.5', 'Req-6.6', 'Req-12.2']
    },
    // Article 21(2)(c) - Incident handling
    {
        nis2Article: '21(2)(c)',
        nistCsf: ['CP-1', 'CP-2', 'CP-3', 'CP-4', 'CP-9', 'CP-10', 'IR-1', 'IR-2', 'IR-3', 'IR-4', 'IR-5', 'IR-6', 'IR-7', 'IR-8'],
        soc2: ['CC7.1', 'CC7.2', 'CC7.3', 'CC7.4', 'CC7.5', 'CC8.1', 'CC10.1'],
        pciDss: ['Req-10.1', 'Req-10.2', 'Req-10.3', 'Req-10.4', 'Req-10.5', 'Req-10.6', 'Req-10.7', 'Req-12.10']
    },
    // Article 21(2)(d) - Business continuity
    {
        nis2Article: '21(2)(d)',
        nistCsf: ['CP-1', 'CP-2', 'CP-3', 'CP-4', 'CP-5', 'CP-6', 'CP-7', 'CP-8', 'CP-9', 'CP-10', 'RC-1', 'RC-2', 'RC-3', 'RC-4'],
        soc2: ['CC1.1', 'CC1.2', 'CC2.1', 'CC2.2', 'CC7.1', 'CC7.4', 'CC9.1', 'CC9.2'],
        pciDss: ['Req-9.1', 'Req-9.2', 'Req-9.3', 'Req-9.4', 'Req-9.9', 'Req-9.10', 'Req-12.11']
    },
    // Article 21(2)(e) - Supply chain security
    {
        nis2Article: '21(2)(e)',
        nistCsf: ['ID-1', 'ID-2', 'ID-3', 'ID-5', 'RA-3', 'RA-5', 'SA-1', 'SA-2', 'SA-3', 'SA-4', 'SA-5', 'SC-7', 'SC-30'],
        soc2: ['CC1.1', 'CC1.2', 'CC3.1', 'CC3.2', 'CC6.1', 'CC6.6', 'CC6.7', 'CC9.1', 'CC9.2', 'CC9.3'],
        pciDss: ['Req-12.8.1', 'Req-12.8.2', 'Req-12.8.3', 'Req-12.8.4', 'Req-12.8.5']
    },
    // Article 21(2)(f) - Security in network/services procurement
    {
        nis2Article: '21(2)(f)',
        nistCsf: ['AC-3', 'AC-4', 'AC-17', 'AC-18', 'AC-19', 'AC-20', 'SC-3', 'SC-4', 'SC-5', 'SC-6', 'SC-7', 'SC-8', 'SC-13'],
        soc2: ['CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5', 'CC6.6', 'CC6.7', 'CC6.8'],
        pciDss: ['Req-1.1', 'Req-1.2', 'Req-1.3', 'Req-1.4', 'Req-2.1', 'Req-2.2', 'Req-2.3']
    },
    // Article 21(2)(g) - Cryptography
    {
        nis2Article: '21(2)(g)',
        nistCsf: ['SC-8', 'SC-9', 'SC-10', 'SC-11', 'SC-12', 'SC-13', 'SC-28'],
        soc2: ['CC6.1', 'CC6.2', 'CC6.6', 'CC6.7', 'CC7.1'],
        pciDss: ['Req-3.1', 'Req-3.2', 'Req-3.3', 'Req-3.4', 'Req-3.5', 'Req-3.6', 'Req-4.1', 'Req-4.2', 'Req-4.3']
    },
    // Article 21(2)(h) - Human resources security
    {
        nis2Article: '21(2)(h)',
        nistCsf: ['AT-1', 'AT-2', 'AT-3', 'AT-4', 'AC-1', 'AC-2', 'IA-1', 'IA-2', 'IA-3', 'IA-4', 'IA-5'],
        soc2: ['CC1.1', 'CC1.2', 'CC5.1', 'CC5.2', 'CC5.3', 'CC6.1', 'CC6.2'],
        pciDss: ['Req-12.1', 'Req-12.2', 'Req-12.3', 'Req-12.4', 'Req-12.5', 'Req-12.6']
    },
    // Article 21(2)(i) - Access control
    {
        nis2Article: '21(2)(i)',
        nistCsf: ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7', 'AC-8', 'AC-9', 'AC-10', 'AC-11', 'AC-12', 'AC-14', 'AC-15', 'AC-16', 'AC-17', 'AC-18', 'AC-19', 'AC-20'],
        soc2: ['CC1.1', 'CC5.1', 'CC5.2', 'CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5', 'CC6.6'],
        pciDss: ['Req-7.1', 'Req-7.2', 'Req-7.3', 'Req-8.1', 'Req-8.2', 'Req-8.3', 'Req-8.4', 'Req-8.5', 'Req-8.6', 'Req-8.7', 'Req-8.8']
    },
    // Article 21(2)(j) - Use of multi-factor authentication
    {
        nis2Article: '21(2)(j)',
        nistCsf: ['IA-1', 'IA-2', 'IA-3', 'IA-4', 'IA-5', 'IA-6', 'IA-7', 'IA-8'],
        soc2: ['CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5', 'CC6.6'],
        pciDss: ['Req-8.3', 'Req-8.3.1', 'Req-8.3.2', 'Req-8.3.3', 'Req-8.3.4']
    }
];

async function seedFrameworkMappings() {
    const db = await getDb();

    console.log('Seeding framework control mappings...');

    let updated = 0;
    for (const mapping of FRAMEWORK_MAPPINGS) {
        const result = await db.update(nis2Mappings)
            .set({
                nistCsfControlIds: mapping.nistCsf,
                soc2ControlIds: mapping.soc2,
                pciDssControlIds: mapping.pciDss,
                updatedAt: new Date()
            })
            .where(eq(nis2Mappings.nis2Article, mapping.nis2Article));

        if (result) updated++;
        console.log(`Updated ${mapping.nis2Article}`);
    }

    console.log(`\nDone! Updated ${updated} mappings.`);

    // Verify the updates
    const allMappings = await db.select({
        article: nis2Mappings.nis2Article,
        nistCsf: nis2Mappings.nistCsfControlIds,
        soc2: nis2Mappings.soc2ControlIds,
        pciDss: nis2Mappings.pciDssControlIds
    }).from(nis2Mappings);

    console.log('\nVerification - Sample mappings:');
    allMappings.slice(0, 3).forEach(m => {
        console.log(`  ${m.article}:`);
        console.log(`    NIST CSF: ${JSON.stringify(m.nistCsf)}`);
        console.log(`    SOC 2: ${JSON.stringify(m.soc2)}`);
        console.log(`    PCI-DSS: ${JSON.stringify(m.pciDss)}`);
    });
}

seedFrameworkMappings().catch(console.error);
