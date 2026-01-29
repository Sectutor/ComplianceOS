
import { getDb } from "../db";
import * as schema from "../schema";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

async function testImport() {
    try {
        console.log("Starting test import...");
        const dbConn = await getDb();
        console.log("DB connected");

        const rootDir = process.cwd();
        const samplePath = path.join(rootDir, "data", "sample_poam_data.json");

        console.log("Sample path:", samplePath);

        const rawData = await fs.readFile(samplePath, "utf-8");
        const samples = JSON.parse(rawData);
        console.log(`Loaded ${samples.length} samples`);

        const clientId = 1; // Assuming client 1 exists

        console.log("Inserting POAM...");
        const [poam] = await dbConn.insert(schema.federalPoams).values({
            clientId: clientId,
            title: "TEST Sample POA&M",
            status: 'active',
            updatedAt: new Date(),
        }).returning();

        console.log("POAM inserted with ID:", poam.id);

        const itemsToInsert = samples.map((item: any) => ({
            poamId: poam.id,
            controlId: item.controlId,
            weaknessName: item.weaknessName,
            weaknessDescription: item.weaknessDescription,
            pointOfContact: item.pointOfContact,
            scheduledCompletionDate: item.scheduledCompletionDate ? new Date(item.scheduledCompletionDate) : null,
            status: 'open',
            updatedAt: new Date(),
        }));

        console.log("Inserting POAM items...");
        await dbConn.insert(schema.poamItems).values(itemsToInsert);
        console.log("Items inserted successfully");

        process.exit(0);
    } catch (error) {
        console.error("Test failed:");
        console.error(error);
        process.exit(1);
    }
}

testImport();
