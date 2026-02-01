
import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../packages/core/src/db";
import { controls } from "../packages/core/src/schema";
import { eq } from "drizzle-orm";

const euAiActControls = [
    {
        controlId: "Art. 9",
        name: "Risk Management System",
        description: "Establish, implement, document and maintain a risk management system.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "Continuous iterative process throughout the entire lifecycle of a high-risk AI system, requiring regular review and updating."
    },
    {
        controlId: "Art. 10",
        name: "Data and Data Governance",
        description: "High-risk AI systems which make use of techniques involving the training of models with data shall be developed on the basis of training, validation and testing data sets that meet the quality criteria.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "Training, validation and testing data sets shall be subject to appropriate data governance and management practices."
    },
    {
        controlId: "Art. 11",
        name: "Technical Documentation",
        description: "The technical documentation of a high-risk AI system shall be drawn up before that system is placed on the market or put into service and shall be kept up-to-date.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "The technical documentation must demonstrate that the high-risk AI system complies with the requirements set out in this Chapter."
    },
    {
        controlId: "Art. 12",
        name: "Record-Keeping",
        description: "High-risk AI systems shall be designed and developed with capabilities enabling the automatic recording of events ('logs') while the high-risk AI systems is operating.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "Ensure traceability of the system's functioning throughout its lifecycle."
    },
    {
        controlId: "Art. 13",
        name: "Transparency and Provision of Information",
        description: "High-risk AI systems shall be designed and developed in such a way to ensure that their operation is sufficiently transparent to enable users to interpret the system’s output and use it appropriately.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "Accompanied by instructions for use in an appropriate digital format or otherwise that include concise, complete, correct and clear information."
    },
    {
        controlId: "Art. 14",
        name: "Human Oversight",
        description: "High-risk AI systems shall be designed and developed in such a way, including with appropriate human-machine interface tools, that they can be effectively overseen by natural persons.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "Measures should enable individuals to understand the capacities and limitations of the high-risk AI system and duly monitor its operation."
    },
    {
        controlId: "Art. 15",
        name: "Accuracy, Robustness and Cybersecurity",
        description: "High-risk AI systems shall be designed and developed in such a way that they achieve an appropriate level of accuracy, robustness and cybersecurity.",
        framework: "EU AI Act",
        category: "High-Risk AI Requirements",
        grouping: "Title III - Chapter 2",
        implementationGuidance: "Resilient against errors, faults or inconsistencies within the system or the environment in which the system operates."
    },
    {
        controlId: "Art. 16",
        name: "Obligations of Providers",
        description: "Providers of high-risk AI systems shall ensure that their systems are compliant with the requirements set out in Chapter 2 of this Title.",
        framework: "EU AI Act",
        category: "Provider Obligations",
        grouping: "Title III - Chapter 3",
        implementationGuidance: "Includes having a quality management system, drawing up technical documentation, and keeping logs."
    },
    {
        controlId: "Art. 17",
        name: "Quality Management System",
        description: "Providers of high-risk AI systems shall put a quality management system in place that ensures compliance with this Regulation.",
        framework: "EU AI Act",
        category: "Provider Obligations",
        grouping: "Title III - Chapter 3",
        implementationGuidance: "Documented in the form of written policies, procedures and instructions."
    }
];

async function seedEuAiAct() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        return;
    }

    console.log("Cleaning up old EU AI Act controls...");
    await db.delete(controls).where(eq(controls.framework, "EU AI Act"));

    console.log("Seeding EU AI Act Controls...");

    try {
        await db.insert(controls).values(euAiActControls.map(c => ({
            ...c,
            status: "active" as const
        })));
        console.log(`Successfully inserted ${euAiActControls.length} EU AI Act controls`);
    } catch (error) {
        console.error("Error seeding EU AI Act:", error);
    }

    process.exit(0);
}

seedEuAiAct();
