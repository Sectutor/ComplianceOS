const fs = require('fs');
const c = fs.readFileSync('/app/server_entry.ts', 'utf-8');
const marker = 'app.use(authMiddleware);';
const route = "\n" +
"app.post('/api/agent-chat', express.json(), async (req: any, res: express.Response) => {\n" +
"    const { message, conversation_id } = req.body;\n" +
"    if (!message) return res.status(400).json({ error: 'Message required' });\n" +
"    const agentUrl = process.env.AGENT_API_URL || 'http://hermes-agent:9090/api/chat';\n" +
"    const apiKey = process.env.COMPLIANCE_API_KEY || '';\n" +
"    try {\n" +
"        const resp = await fetch(agentUrl, {\n" +
"            method: 'POST',\n" +
"            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },\n" +
"            body: JSON.stringify({ message, conversation_id }),\n" +
"            signal: AbortSignal.timeout(120000),\n" +
"        });\n" +
"        if (!resp.ok) {\n" +
"            const t = await resp.text();\n" +
"            return res.status(resp.status).json({ error: 'Agent error: ' + t });\n" +
"        }\n" +
"        const data = await resp.json();\n" +
"        const content = data.choices?.[0]?.message?.content || '';\n" +
"        res.setHeader('Content-Type', 'text/event-stream');\n" +
"        res.write(JSON.stringify({ token: content }) + '\\n\\n');\n" +
"        res.write(JSON.stringify({ done: true }) + '\\n\\n');\n" +
"        res.end();\n" +
"    } catch(e) {\n" +
"        res.status(502).json({ error: 'Failed to contact agent: ' + e.message });\n" +
"    }\n" +
"});\n\n";
const patched = c.replace(marker, route + marker);
fs.writeFileSync('/tmp/server_entry_patched.ts', patched, 'utf-8');
console.log('PATCHED', patched.split('\n').length, 'lines');
