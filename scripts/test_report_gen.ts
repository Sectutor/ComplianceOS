
import "dotenv/config";
import { ReportGenerator, ReportConfig, ReportData } from "../server/services/reportGenerator";

async function testGenerator() {
    console.log("Starting Report Generator Test...");

    const mockConfig: ReportConfig = {
        clientId: 3,
        title: "Test Report",
        implementationPlanId: 1,
        version: "v1.0",
        includedSections: ["execution_dashboard", "detailed_task_log"],
        generatedBy: 1
    };

    const mockData: ReportData = {
        client: { name: "Test Client" },
        implementationPlan: { id: 1, title: "Test Plan" },
        implementationTasks: [
            { id: 1, title: "Test Task 1", status: "done", priority: "high", description: "**Key Activities:**\n- Do validation.\n- Check results.\n\n**Deliverables:**\n- Report.\n\n**Tips:**\n- Be careful." },
            { id: 2, title: "Test Task 2", status: "in_progress", priority: "medium" },
            { id: 3, title: "Test Task 3", status: "todo", priority: "low" }
        ]
    };

    try {
        console.log("Initializing Generator...");
        const generator = new ReportGenerator(mockConfig, mockData);

        console.log("Generating Document...");
        const buffer = await generator.generate();

        console.log("Success! Buffer length:", buffer.length);
    } catch (err: any) {
        console.error("FATAL ERROR:");
        console.error(err);
        if (err.stack) console.error(err.stack);
    }
}

testGenerator().catch(console.error);
