import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../db";
import { controls } from "../schema";
import { eq, sql } from "drizzle-orm";
import { nistCsf2FullData } from "./nist_2_0_full_data";

async function seedNist() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        return;
    }
    console.log("Cleaning up old NIST CSF controls...");
    await db.delete(controls).where(eq(controls.framework, "NIST CSF 2.0"));

    console.log("Seeding NIST CST...");

    // Map the scraped data to the database schema
    const nistControls = nistCsf2FullData.map(item => ({
        controlId: item.id,
        name: item.description, // Subcategory text as Main Name
        description: "", // Empty to avoid duplication in UI
        framework: "NIST CSF 2.0",
        owner: "Unassigned",
        frequency: "Annual",
        evidenceType: "Document",
        status: "active",
        category: item.function, // Function as high-level Category (Govern, etc.)
        grouping: item.category, // NIST Category as Grouping
        implementationGuidance: (item as any).implementation_examples || "", // Map examples
    }));

    try {
        // Cast status to any to query constraint issues if strict typing is blocked, but InsertControl should match
        await db.insert(controls).values(nistControls as any);
        console.log(`Successfully inserted ${nistControls.length} NIST CSF controls`);
    } catch (error) {
        console.error("Error seeding NIST:", error);
    }
}

seedNist();
