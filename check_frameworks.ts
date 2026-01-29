
import "dotenv/config";
import { getDb } from "./db";
import { clientFrameworks, clientFrameworkControls, controls } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();

    console.log("--- Standard Controls Frameworks ---");
    const standard = await db.selectDistinct({ framework: controls.framework }).from(controls);
    console.log(standard.map(c => c.framework));

    console.log("\n--- Client Frameworks ---");
    const imported = await db.select().from(clientFrameworks);
    console.log(imported.map(f => `${f.name} (v${f.version}) - Client ${f.clientId}`));

    console.log("\n--- Imported Controls Count ---");
    for (const f of imported) {
        const count = await db.select().from(clientFrameworkControls).where(eq(clientFrameworkControls.frameworkId, f.id));
        console.log(`Framework ${f.name}: ${count.length} controls`);
    }
}

main().catch(console.error).then(() => process.exit(0));
