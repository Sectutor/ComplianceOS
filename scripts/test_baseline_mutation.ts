
import 'dotenv/config';
import { getDb } from './db';
import { controls, controlBaselines, clientControls } from './schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

async function testMutation() {
    const dbConn = await getDb();
    const input = {
        clientId: 3,
        framework: "NIST SP 800-53 Rev 5",
        baseline: "high"
    };

    console.log(`Testing Mutation for Client ${input.clientId}...`);

    let targetBaselines = [input.baseline];
    if (input.baseline.toLowerCase() === 'high') targetBaselines = ['low', 'moderate', 'high'];
    else if (input.baseline.toLowerCase() === 'moderate') targetBaselines = ['low', 'moderate'];
    else targetBaselines = ['low'];

    const baselineMappings = await dbConn.select()
        .from(controlBaselines)
        .where(and(
            eq(controlBaselines.framework, input.framework),
            inArray(controlBaselines.baseline, targetBaselines)
        ));

    const targetControlCodes = [...new Set(baselineMappings.map((bm: any) => bm.controlId))] as string[];
    console.log(`Found ${targetControlCodes.length} codes.`);

    if (targetControlCodes.length === 0) {
        console.log("No controls found.");
        return;
    }

    const validControls = await dbConn.select({
        id: controls.id,
        controlId: controls.controlId
    }).from(controls)
        .where(inArray(controls.controlId, targetControlCodes));

    console.log(`Resolved ${validControls.length} valid controls.`);

    const existingControls = await dbConn.select({
        controlId: clientControls.controlId
    }).from(clientControls)
        .where(eq(clientControls.clientId, input.clientId));

    const existingControlIds = new Set(existingControls.map((c: any) => c.controlId));
    console.log(`Client ${input.clientId} already has ${existingControlIds.size} controls.`);

    const toInsert: any[] = [];
    for (const ctrl of validControls) {
        if (!existingControlIds.has(ctrl.id)) {
            toInsert.push({
                clientId: input.clientId,
                controlId: ctrl.id,
                clientControlId: ctrl.controlId,
                status: 'not_implemented',
                applicability: 'applicable',
                implementationNotes: `Applied via ${input.baseline} baseline`
            });
        }
    }

    console.log(`To insert: ${toInsert.length}`);
    process.exit(0);
}

testMutation().catch(err => {
    console.error("Mutation failed:", err);
    process.exit(1);
});
