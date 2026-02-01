
import { config } from "dotenv";
config();

async function main() {
    console.log("Attempting to import frameworks router...");
    try {
        const fw = await import("../packages/core/src/server/routers/frameworks");
        console.log("Import successful!");
    } catch (e) {
        console.error("Import failed:", e);
    }
}

main();
