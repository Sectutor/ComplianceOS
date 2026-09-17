import http from "http";
import { getDb } from "../../packages/core/src/db";
import * as schema from "../../packages/core/src/schema";
import {
  createWebhookSubscription,
  dispatchWebhookEvent,
  getClientWebhookSubscriptions,
  getClientWebhookDeliveries,
  generateWebhookSignature,
} from "../../packages/core/src/lib/webhooks/webhookRegistry";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Webhook System Integration Test ===");
  const db = await getDb();

  // 1. Get or create a test client
  let [client] = await db.select().from(schema.clients).limit(1);
  if (!client) {
    [client] = await db
      .insert(schema.clients)
      .values({ name: "Webhook Test Client", status: "active" })
      .returning();
  }
  const clientId = client.id;
  console.log(`Using Client ID #${clientId}...`);

  // 2. Start a local mock HTTP server to receive webhooks
  let receivedHeaders: http.IncomingHttpHeaders = {};
  let receivedBody = "";

  const serverPort = 9876;
  const mockServer = http.createServer((req, res) => {
    receivedHeaders = req.headers;
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      receivedBody = body;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "acknowledged" }));
    });
  });

  await new Promise<void>((resolve) => {
    mockServer.listen(serverPort, () => {
      console.log(`Mock webhook receiver listening on http://127.0.0.1:${serverPort}`);
      resolve();
    });
  });

  try {
    const targetUrl = `http://127.0.0.1:${serverPort}/webhook-endpoint`;
    const secretKey = "test-secret-key-12345";

    // 3. Create Webhook Subscription
    const subscription = await createWebhookSubscription({
      clientId,
      name: "Integration Test Webhook",
      targetUrl,
      events: ["control.failed", "test.ping"],
      secret: secretKey,
    });

    console.log(`Created Webhook Subscription #${subscription.id} -> ${subscription.targetUrl}`);

    // 4. Verify subscription listing
    const subs = await getClientWebhookSubscriptions(clientId);
    const foundSub = subs.find((s) => s.id === subscription.id);
    if (!foundSub) {
      throw new Error("FAILED: Created subscription not found in subscription list!");
    }
    console.log("✅ Subscription list query verified.");

    // 5. Dispatch Event
    const payloadData = { controlId: "CTRL-101", status: "failed", reason: "Automated test check" };
    const dispatchResult = await dispatchWebhookEvent(clientId, "control.failed", payloadData);

    console.log("\nDispatch Result:", dispatchResult);
    if (dispatchResult.dispatchedCount === 0 || dispatchResult.successCount === 0) {
      throw new Error("FAILED: Webhook event was not dispatched successfully!");
    }

    // 6. Verify received HTTP headers & HMAC signature
    console.log("\nReceived Headers:", {
      event: receivedHeaders["x-complianceos-event"],
      signature: receivedHeaders["x-complianceos-signature"],
      timestamp: receivedHeaders["x-complianceos-timestamp"],
    });

    if (receivedHeaders["x-complianceos-event"] !== "control.failed") {
      throw new Error("FAILED: Header X-ComplianceOS-Event mismatch!");
    }

    const expectedSignature = `sha256=${generateWebhookSignature(receivedBody, secretKey)}`;
    if (receivedHeaders["x-complianceos-signature"] !== expectedSignature) {
      throw new Error(
        `FAILED: Signature mismatch! Expected '${expectedSignature}', got '${receivedHeaders["x-complianceos-signature"]}'`
      );
    }
    console.log("✅ HMAC SHA-256 signature verification passed.");

    // 7. Verify delivery audit history
    const deliveries = await getClientWebhookDeliveries(clientId, 10);
    console.log(`\nDelivery Audit History: Found ${deliveries.length} record(s).`);

    const latestDelivery = deliveries[0];
    if (!latestDelivery || !latestDelivery.success || latestDelivery.statusCode !== 200) {
      throw new Error("FAILED: Delivery record missing or failed in audit table!");
    }
    console.log("✅ Delivery log audit history verified.");

    console.log("\n=== Webhook System Integration Test PASSED Successfully ===");
  } finally {
    mockServer.close();
  }
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Webhook System Test failed:", err);
    process.exit(1);
  });
