import {
  createApiKey,
  rotateApiKey,
  validateApiKey,
} from "../../packages/core/src/lib/apiKeyRotationService";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== API Key Rotation System Integration Test ===");
  const clientId = 1;

  // 1. Create API key
  const { record, rawKey } = await createApiKey(clientId, "Production Integrations Key");
  console.log(`Created API Key #${record.id} (Prefix: '${record.keyPrefix}')`);

  // 2. Validate original active key
  const check1 = await validateApiKey(rawKey);
  console.log("Check 1 (Original Key):", check1);
  if (!check1.valid || check1.isGracePeriod) {
    throw new Error("FAILED: Original key should be valid and not in grace period!");
  }

  // 3. Rotate API Key with 48h grace period
  const { record: rotatedRecord, newRawKey } = await rotateApiKey(clientId, record.id, 48);
  console.log(`\nRotated API Key #${rotatedRecord.id}. Grace Period Ends: ${rotatedRecord.gracePeriodEnd}`);

  // 4. Validate original key (Should still be valid during grace period)
  const check2 = await validateApiKey(rawKey);
  console.log("Check 2 (Original Key during Grace Period):", check2);
  if (!check2.valid || !check2.isGracePeriod) {
    throw new Error("FAILED: Original key should remain valid in GRACE PERIOD after rotation!");
  }

  // 5. Validate new active key
  const check3 = await validateApiKey(newRawKey);
  console.log("Check 3 (New Active Key):", check3);
  if (!check3.valid || check3.isGracePeriod) {
    throw new Error("FAILED: New key should be valid and active!");
  }

  // 6. Validate fake key
  const check4 = await validateApiKey("cos_1_fake1234567890qwertyuiop");
  console.log("Check 4 (Invalid Fake Key):", check4);
  if (check4.valid) {
    throw new Error("FAILED: Fake key should be rejected!");
  }

  console.log("\n=== API Key Rotation System Test PASSED Successfully ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: API Key Rotation Test failed:", err);
    process.exit(1);
  });
