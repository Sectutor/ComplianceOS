
import 'dotenv/config';
import { getDb } from "../db";
import { kris } from "../schema";
import { eq } from "drizzle-orm";

async function seedKRIs() {
    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        return;
    }

    const clientId = 1; // Defaulting to Client 1 for now

    const defaultKRIs = [
        {
            name: "Mean Time to Patch (MTTP)",
            description: "Average time (in days) between vulnerability disclosure and patch application. High latency indicates increased risk exposure.",
            thresholdGreen: "< 7 days",
            thresholdAmber: "7 - 30 days",
            thresholdRed: "> 30 days",
            currentValue: "5 days",
            currentStatus: "green"
        },
        {
            name: "Endpoint Protection Coverage",
            description: "Percentage of corporate assets with active, up-to-date Endpoint Detection & Response (EDR) agents.",
            thresholdGreen: "> 98%",
            thresholdAmber: "90% - 98%",
            thresholdRed: "< 90%",
            currentValue: "92%",
            currentStatus: "amber"
        },
        {
            name: "Phishing Simulation Click Rate",
            description: "Percentage of employees who clicked on a link in the monthly phishing simulation.",
            thresholdGreen: "< 4%",
            thresholdAmber: "4% - 10%",
            thresholdRed: "> 10%",
            currentValue: "3%",
            currentStatus: "green"
        },
        {
            name: "Privileged Access Growth",
            description: "Net increase in accounts with administrative privileges over the last month.",
            thresholdGreen: "0 (Stable)",
            thresholdAmber: "1 - 5 (Review)",
            thresholdRed: "> 5 (Investigate)",
            currentValue: "2",
            currentStatus: "amber"
        },
        {
            name: "Vendor Assessment Delays",
            description: "Number of high-risk vendors with overdue security assessments.",
            thresholdGreen: "0",
            thresholdAmber: "1 - 2",
            thresholdRed: "> 2",
            currentValue: "0",
            currentStatus: "green"
        }
    ];

    console.log("Seeding KRIs for Client ID:", clientId);

    for (const kri of defaultKRIs) {
        await db.insert(kris).values({
            clientId,
            ...kri,
            status: 'active'
        });
        console.log(`Added KRI: ${kri.name}`);
    }
}

seedKRIs().catch(console.error);
