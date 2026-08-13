import express from "express";
import http from "http";
import {
  realtimeComplianceStreamHandler,
  broadcastComplianceEvent,
} from "../../packages/core/src/server/routes/realtimeComplianceStream";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Real-time Compliance Stream (SSE) Integration Test ===");

  const app = express();
  app.get("/api/v1/compliance/stream", realtimeComplianceStreamHandler);

  const port = 9888;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Test Express server listening on http://127.0.0.1:${port}`);
      resolve();
    });
  });

  try {
    const clientId = 1;
    let receivedInit = false;
    let receivedCustomEvent = false;

    await new Promise<void>((resolve, reject) => {
      const req = http.get(
        `http://127.0.0.1:${port}/api/v1/compliance/stream?clientId=${clientId}`,
        (res) => {
          console.log(`Connected to SSE stream. Status code: ${res.statusCode}`);
          console.log(`Content-Type: ${res.headers["content-type"]}`);

          if (res.statusCode !== 200 || res.headers["content-type"] !== "text/event-stream") {
            return reject(new Error("FAILED: Response is not 200 text/event-stream!"));
          }

          let buffer = "";

          res.on("data", (chunk) => {
            buffer += chunk.toString();

            // Check for init frame
            if (!receivedInit && buffer.includes("event: init")) {
              receivedInit = true;
              console.log("✅ Received SSE 'init' frame with initial compliance health state.");

              // Broadcast live event from server side
              setTimeout(() => {
                console.log("Broadcasting live 'health_update' event...");
                broadcastComplianceEvent(clientId, "health_update", {
                  score: 98,
                  status: "good",
                });
              }, 300);
            }

            // Check for broadcasted custom event
            if (receivedInit && !receivedCustomEvent && buffer.includes("event: health_update")) {
              receivedCustomEvent = true;
              console.log("✅ Received broadcasted SSE 'health_update' event frame.");
              req.destroy();
              resolve();
            }
          });

          res.on("error", (err) => {
            if (!receivedCustomEvent) reject(err);
          });
        }
      );

      req.on("error", (err) => {
        if (!receivedCustomEvent) reject(err);
      });

      // Timeout safety
      setTimeout(() => {
        if (!receivedInit || !receivedCustomEvent) {
          reject(new Error("FAILED: SSE stream test timed out before receiving expected frames!"));
        }
      }, 5000);
    });

    console.log("\n=== Real-time Compliance Stream Integration Test PASSED Successfully ===");
  } finally {
    server.close();
  }
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: SSE Stream Test failed:", err);
    process.exit(1);
  });
