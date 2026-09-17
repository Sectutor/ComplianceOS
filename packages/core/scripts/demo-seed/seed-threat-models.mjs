/**
 * Seeds 3 dev projects + 3 threat models (with components & data flows)
 * for a client. Usage: node --env-file=../../.env scripts/demo-seed/seed-threat-models.mjs [clientId]
 */
import postgres from "postgres";
import { Rng, agoDays } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "788", 10);
const rng = new Rng(9500 + clientId);

// idempotency: skip if already present
const existing = await sql`SELECT count(*)::int n FROM threat_models WHERE client_id=${clientId}`;
if (existing[0].n > 0) {
  console.log(JSON.stringify({ skipped: true, existing: existing[0].n }));
  await sql.end();
  process.exit(0);
}

const DEV_PROJECTS = [
  {
    name: "CargoTrack API Gateway",
    description: "Kong-based API gateway fronting all CargoTrack microservices. TLS termination, rate limiting, JWT validation.",
    repo: "https://gitlab.nordwind.example/security/api-gateway",
    stack: JSON.stringify(["Kong", "Lua", "PostgreSQL", "Redis"]),
    owner: "Platform Team",
    tm: {
      name: "API Gateway Threat Model (STRIDE)",
      methodology: "STRIDE",
      status: "in_review",
      components: [
        ["Mobile / Web Client", "Web Client", "Customer apps and portal browsers initiating API calls", 40, 40],
        ["Edge WAF", "Load Balancer", "Cloud WAF inspecting inbound TLS traffic", 200, 40],
        ["Kong API Gateway", "API Gateway", "TLS termination, JWT validation, rate limiting, routing", 360, 40],
        ["Auth Service (IdP)", "Identity Provider", "Token issuance and introspection against Entra ID", 520, 140],
        ["Rate Limit Store (Redis)", "Cache", "Sliding-window rate limit counters", 200, 240],
        ["Microservices Cluster", "Microservice", "Internal CargoTrack services behind gateway", 360, 240],
      ],
      flows: [
        [1, 2, "HTTPS", true, "Client TLS to edge"],
        [2, 3, "HTTPS", true, "Inspected traffic to gateway"],
        [3, 4, "HTTPS", true, "JWT introspection"],
        [3, 5, "Redis protocol", false, "Rate limit check — flagged: plaintext internal Redis"],
        [3, 6, "HTTPS/mTLS", true, "Routed upstream calls"],
      ],
    },
  },
  {
    name: "Driver Mobile App",
    description: "Android/iOS driver app for job updates, ePOD signature capture and GPS telemetry upload.",
    repo: "https://gitlab.nordwind.example/mobile/driver-app",
    stack: JSON.stringify(["React Native", "Node.js", "PostgreSQL", "S3"]),
    owner: "Mobile Squad",
    tm: {
      name: "Driver App Threat Model (STRIDE)",
      methodology: "STRIDE",
      status: "draft",
      components: [
        ["Driver Mobile Client", "Mobile Client", "Managed Android device with MDM policy", 60, 60],
        ["MDM / Intune", "Process", "Device compliance and app protection policies", 260, 60],
        ["App Backend API", "API", "Job state machine, ePOD ingestion, telemetry intake", 460, 60],
        ["Object Storage (S3)", "Object Storage", "Signature images and delivery documents", 300, 220],
        ["Telemetry Pipeline", "Database", "Streaming GPS data into Timestream", 560, 220],
      ],
      flows: [
        [1, 2, "MDM check-in", true, "Compliance state sync"],
        [1, 3, "HTTPS + cert pinning", true, "Job sync and ePOD upload"],
        [3, 4, "S3 API (presigned)", true, "Encrypted document storage"],
        [1, 3, "GPS batch upload", true, "Telemetry every 30s while on duty"],
        [3, 5, "Kinesis", true, "Stream processing"],
      ],
    },
  },
  {
    name: "EDI B2B Gateway Modernization",
    description: "Seeburger EDI exchange with retail customers — modernization project adding AS-2 with certificate rotation and message-level encryption.",
    repo: "https://gitlab.nordwind.example/integrations/edi-gateway",
    stack: JSON.stringify(["Seeburger BIS", "Java", "IBM MQ"]),
    owner: "Integration Team",
    tm: {
      name: "EDI Gateway Threat Model (Attack Trees)",
      methodology: "Attack Trees",
      status: "draft",
      components: [
        ["Trading Partner", "External Service", "Retail customer EDI endpoint", 50, 50],
        ["AS-2 Listener", "Process", "Receives signed/encrypted EDI messages", 230, 50],
        ["Message Broker (MQ)", "Message Queue", "Queued EDI messages awaiting processing", 420, 50],
        ["WMS Integration Service", "Process", "Translates EDIFACT to WMS orders", 230, 210],
        ["Operator Console", "Actor", "Internal staff managing partner certificates", 420, 210],
      ],
      flows: [
        [1, 2, "AS-2 (SMIME)", true, "Signed+encrypted interchange"],
        [2, 3, "MQ TLS", true, "Persisted to broker"],
        [3, 4, "gRPC mTLS", true, "Order translation pipeline"],
        [5, 2, "Admin UI over VPN", true, "Cert management — privileged path"],
      ],
    },
  },
];

const out = { dev_projects: [], threat_models: [] };

for (const dp of DEV_PROJECTS) {
  const [proj] = await sql`
    INSERT INTO dev_projects ${sql({
      client_id: clientId,
      name: dp.name,
      description: dp.description,
      repository_url: dp.repo,
      tech_stack: dp.stack,
      owner: dp.owner,
      created_at: agoDays(rng.int(90, 400)),
      updated_at: agoDays(rng.int(0, 14)),
    })} RETURNING id`;

  const tm = dp.tm;
  const [model] = await sql`
    INSERT INTO threat_models ${sql({
      client_id: clientId,
      dev_project_id: proj.id,
      name: tm.name,
      methodology: tm.methodology,
      status: tm.status,
    })} RETURNING id`;

  const compIds = [];
  for (const [name, type, description, x, y] of tm.components) {
    const [c] = await sql`
      INSERT INTO threat_model_components ${sql({
        threat_model_id: model.id,
        name, type, description, x, y,
      })} RETURNING id`;
    compIds.push(c.id);
  }
  for (const [si, ti, protocol, enc, description] of tm.flows) {
    await sql`
      INSERT INTO threat_model_data_flows ${sql({
        threat_model_id: model.id,
        source_component_id: compIds[si - 1],
        target_component_id: compIds[ti - 1],
        protocol,
        is_encrypted: enc,
        description,
      })}`;
  }

  out.dev_projects.push({ id: proj.id, name: dp.name });
  out.threat_models.push({ id: model.id, name: tm.name, components: compIds.length, flows: tm.flows.length });
}

console.log(JSON.stringify(out));
await sql.end();
