
import 'dotenv/config';
import { getDb } from "../packages/core/src/db";
import { clientPolicies, employees, policyAssignments } from "../packages/core/src/schema";
import { eq, and, inArray } from "drizzle-orm";

async function main() {
    console.log("Testing policy assignment...");
    try {
        const db = await getDb();

        // 1. Get a policy
        const policies = await db.select().from(clientPolicies).limit(1);
        if (policies.length === 0) {
            console.error("No policies found. Cannot test.");
            process.exit(1);
        }
        const policyId = policies[0].id; // id is serial (number)
        console.log("Using Policy ID:", policyId);

        // 2. Get an employee
        const employeeList = await db.select().from(employees).limit(1);
        if (employeeList.length === 0) {
            console.error("No employees found. Cannot test.");
            process.exit(1);
        }
        const employeeId = employeeList[0].id;
        console.log("Using Employee ID:", employeeId);

        // 3. Clean up existing assignment if any
        await db.delete(policyAssignments)
            .where(and(
                eq(policyAssignments.policyId, policyId),
                eq(policyAssignments.employeeId, employeeId)
            ));

        console.log("Attempting insert...");
        // 4. Try Insert
        const res = await db.insert(policyAssignments).values({
            policyId: policyId,
            employeeId: employeeId,
            status: "pending"
        }).returning();

        console.log("Insert success:", res);

    } catch (e) {
        console.error("Insert failed:", e);
    }
    process.exit(0);
}

main();
