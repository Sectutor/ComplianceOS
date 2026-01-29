
import { getEnhancedDashboardStats } from '../db';
import { closeDb } from '../db';

async function verifyStats() {
    console.log("Verifying Dashboard Stats...");
    try {
        const stats = await getEnhancedDashboardStats();
        console.log("------------------------------------------");
        console.log("Global Overview:", JSON.stringify(stats.overview, null, 2));
        console.log("------------------------------------------");
        console.log("Controls by Framework:", JSON.stringify(stats.controlsByFramework, null, 2));
        console.log("------------------------------------------");
        console.log("Controls by Status (Dashboard):", JSON.stringify(stats.controlsByStatus, null, 2));
        console.log("------------------------------------------");

        // Check if we have clients
        if (stats.clientsOverview.length > 0) {
            console.log("First Client Overview:", JSON.stringify(stats.clientsOverview[0], null, 2));
        } else {
            console.log("No clients found.");
        }

        console.log("------------------------------------------");
        console.log("SUCCESS: Stats retrieved without error.");
    } catch (error) {
        console.error("ERROR retrieving stats:", error);
    } finally {
        await closeDb();
    }
}

verifyStats();
