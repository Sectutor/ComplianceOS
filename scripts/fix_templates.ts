
import { config } from 'dotenv';
config();
import { getDb, closeDb } from '../db';
import { policyTemplates } from '../schema';
import { eq } from 'drizzle-orm';

async function fixTemplates() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        return;
    }

    const updates = [
        {
            id: 1,
            name: "Information Security Policy",
            content: "# Information Security Policy\n\n## Purpose\nTo protect the confidentiality, integrity, and availability of [COMPANY NAME]'s information assets.\n\n## Policy Statement\n[COMPANY NAME] shall implement a comprehensive information security program."
        },
        {
            id: 2,
            name: "Access Control Policy",
            content: "# Access Control Policy\n\n## Purpose\nTo ensure only authorized users have access to systems and data.\n\n## Policy Statement\nAccess shall be granted based on the principle of least privilege and need-to-know."
        },
        {
            id: 3,
            name: "Incident Response Policy",
            content: "# Incident Response Policy\n\n## Purpose\nTo provide a structured approach for handling security incidents.\n\n## Policy Statement\n[COMPANY NAME] shall establish an incident response capability to detect, report, and respond to information security incidents."
        },
        {
            id: 4,
            name: "Data Retention Policy",
            content: "# Data Retention Policy\n\n## Purpose\nTo ensure data is retained for appropriate periods and securely disposed of when no longer needed.\n\n## Policy Statement\nData retention schedules shall be defined for all data categories."
        }
    ];

    for (const u of updates) {
        console.log(`Updating template ${u.id} (${u.name})...`);
        await db.update(policyTemplates)
            .set({ content: u.content })
            .where(eq(policyTemplates.id, u.id));
    }

    console.log("Templates updated.");
    await closeDb();
}

fixTemplates().catch(console.error);
