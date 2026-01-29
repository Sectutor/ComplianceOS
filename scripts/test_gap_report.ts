import 'dotenv/config';
import { appRouter } from "../routers";
import { getDb } from "../db";

async function main() {
  const ctx = { req: {} as any, res: {} as any, user: { id: 1, role: 'admin' } };
  const caller = appRouter.createCaller(ctx);

  const db = await getDb();
  const [{ id }] = await db.execute<any>("SELECT id FROM gap_assessments ORDER BY updated_at DESC LIMIT 1");
  console.log("Using assessmentId:", id);

  const result = await caller.gapAnalysis.generateReportContent({ assessmentId: Number(id) });
  console.log("generateReportContent result keys:", Object.keys(result));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
