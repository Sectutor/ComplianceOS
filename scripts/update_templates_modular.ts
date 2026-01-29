
import 'dotenv/config';
import { getDb } from '../db';
import { policyTemplates } from '../schema';
import { eq } from 'drizzle-orm';

async function migrate() {
    const db = await getDb();
    if (!db) {
        console.error("Could not connect to DB");
        process.exit(1);
    }
    console.log("Migrating templates to Modular Sections...");

    const updates = [
        {
            templateId: "1",
            sections: [
                { id: "1-1", title: "Purpose", content: "The purpose of this Information Security Policy is to protect the organization's information assets from all threats, whether internal or external, deliberate or accidental.", optional: false, defaultEnabled: true },
                { id: "1-2", title: "Scope", content: "This policy applies to all employees, contractors, consultants, and temporary staff who have access to the organization's information systems and data.", optional: false, defaultEnabled: true },
                { id: "1-3", title: "Objectives", content: "1. Confidentiality: Ensure that information is accessible only to those authorized to have access.\n2. Integrity: Safeguard the accuracy and completeness of information and processing methods.\n3. Availability: Ensure that authorized users have access to information and associated assets when required.", optional: false, defaultEnabled: true },
                { id: "1-4", title: "Roles and Responsibilities", content: "The CISO is responsible for maintaining this policy.\nAll employees are responsible for adhering to this policy.", optional: true, defaultEnabled: true }
            ]
        },
        {
            templateId: "2",
            sections: [
                { id: "2-1", title: "Objective", content: "To limit access to information and information processing facilities to authorized users.", optional: false, defaultEnabled: true },
                { id: "2-2", title: "User Access Management", content: "Access rights will be granted based on the principle of least privilege.", optional: false, defaultEnabled: true }
            ]
        },
        {
            templateId: "3",
            sections: [
                { id: "3-1", title: "Purpose", content: "To ensure a consistent and effective approach to the management of information security incidents.", optional: false, defaultEnabled: true },
                { id: "3-2", title: "Reporting", content: "All security events must be reported immediately through the designated channels.", optional: false, defaultEnabled: true }
            ]
        },
        {
            templateId: "4",
            sections: [
                { id: "4-1", title: "Purpose", content: "To ensure that data is retained only for as long as necessary and disposed of securely.", optional: false, defaultEnabled: true },
                { id: "4-2", title: "Retention Schedule", content: "Data retention periods are defined in the Data Retention Schedule.", optional: false, defaultEnabled: true }
            ]
        }
    ];

    for (const update of updates) {
        console.log(`Updating ${update.templateId}...`);
        await db.update(policyTemplates)
            .set({ sections: update.sections, content: "" }) // Clear monolithic content
            .where(eq(policyTemplates.templateId, update.templateId));
    }

    console.log("Migration complete.");
    process.exit(0);
}

migrate().catch(e => {
    console.error(e);
    process.exit(1);
});
