import crypto from "crypto"

const secret = process.env.TOOL_HMAC_SECRET || "dev-secret"
const path = process.argv[2] || "advisor.askQuestion"
const payload = process.argv[3] ? JSON.parse(process.argv[3]) : { clientId: 1, question: "Hello", context: { id: "demo" } }
const ts = Date.now().toString()
const message = `${path}:${ts}:${JSON.stringify(payload)}`
const sig = crypto.createHmac("sha256", secret).update(message).digest("hex")

console.log(JSON.stringify({ "x-signature": sig, "x-timestamp": ts }, null, 2))
