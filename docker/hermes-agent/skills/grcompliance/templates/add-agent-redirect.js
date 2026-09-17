/**
 * Add /agent → Hermes Dashboard redirect to GRCompliance server_entry.ts
 *
 * Inserts 302 redirect routes BEFORE the SPA catch-all route
 * so that /agent, /agent-full, /agent-old redirect to the Hermes Dashboard.
 *
 * Run:
 *   docker cp add-redirect.js complianceos-app-1:/tmp/
 *   docker exec -w /app complianceos-app-1 node /tmp/add-redirect.js
 *   docker exec complianceos-app-1 sh -c "kill $(pgrep -f tsx)"
 *   # Wait for app to restart, then test:
 *   curl -sv http://localhost:3005/agent 2>&1 | grep -i "location"
 */
const fs = require("fs");
const path = "/app/server_entry.ts";
let src = fs.readFileSync(path, "utf8");

const marker = "// Handle SPA routing";
const redirectBlock = `    // DEMO: Agent routes → Hermes Dashboard redirect
    app.get(["/agent-full", "/agent", "/agent-old"], (_req, res) => {
      return res.redirect("http://localhost:9118");
    });

    ${marker}`;

src = src.replace(marker, redirectBlock);
fs.writeFileSync(path, src);
console.log("✅ Added agent route redirects");

// Verify
const check = fs.readFileSync(path, "utf8");
if (check.includes("Agent routes → Hermes Dashboard redirect")) {
  console.log("✅ Verification passed — redirect present in file");
} else {
  console.log("❌ Verification failed — redirect not found");
  process.exit(1);
}
