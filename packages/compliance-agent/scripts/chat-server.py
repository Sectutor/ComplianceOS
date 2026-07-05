#!/usr/bin/env python3
"""
Compliance Agent Chat Server — Hybrid approach.
Fast answers for common data queries via direct API calls.
Complex questions fall through to Hermes CLI.
"""

import json, os, subprocess, uuid, re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

HOST = os.environ.get("CHAT_HOST", "0.0.0.0")
PORT = int(os.environ.get("CHAT_PORT", "9090"))
API_URL = os.environ.get("COMPLIANCE_API_URL", "http://complianceos:3002/api/v1")
API_KEY = os.environ.get("COMPLIANCE_API_KEY", "")

def api_get(path):
    import urllib.request
    req = urllib.request.Request(f"{API_URL}{path}", headers={"X-API-Key": API_KEY})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))

# ── Direct answers for common queries ────────────────────────────────────────

MITIGATIONS = {
    "weak password": ["Enforce MFA on all production systems", "Deploy a Privileged Access Management (PAM) solution", "Implement password complexity and rotation policies", "Audit SSH key usage monthly", "Deploy SSO with hardware security keys (FIDO2)"],
    "encryption": ["Enable encryption at rest (AES-256) and in transit (TLS 1.3)", "Implement key management with automated rotation", "Deploy certificate pinning and HSTS", "Audit all S3 bucket configurations for encryption"],
    "ddos": ["Deploy Web Application Firewall (WAF) with rate limiting", "Enable DDoS protection (AWS Shield / Cloudflare)", "Implement auto-scaling groups with health checks", "Deploy CDN for static content"],
    "unpatched": ["Deploy automated patch management", "Implement vulnerability scanning schedule weekly", "Enforce 7-day SLA for critical patches", "Segment legacy systems from production"],
    "supply chain": ["Implement vendor security assessments", "Require SOC 2 Type II reports from vendors", "Enforce supply chain security in contracts", "Monitor third-party access logs quarterly"],
    "backup": ["Test backup restoration quarterly", "Implement 3-2-1 backup strategy", "Deploy immutable backups for ransomware protection", "Document RTO and RPO for all critical systems"],
}

def try_direct(message):
    msg = message.lower().strip()
    
    # Risk list
    if any(kw in msg for kw in ["risk"]) and any(kw in msg for kw in ["list", "top", "show", "all"]):
        try:
            count = 10 if "10" in msg else 5 if "5" in msg else 20 if "20" in msg else 10
            data = api_get(f"/risks?limit={count}")
            items = data.get("data", [])
            if not items: return "No risk data found."
            lines = [f"Top {min(count, len(items))} risks:"]
            for i, r in enumerate(items[:count], 1):
                s = r.get("inherent_risk_score") or "N/A"
                st = r.get("status", "?")
                t = r.get("title", "Untitled")
                lines.append(f"{i}. [{s}] {t} ({st})")
            return "\n".join(lines)
        except Exception as e:
            return f"Could not fetch risks: {e}"
    
    # Risk summary
    if any(kw in msg for kw in ["how many", "count risk", "total risk"]):
        try:
            data = api_get("/risks?limit=100")
            items = data.get("data", [])
            h = sum(1 for r in items if (r.get("inherent_risk_score") or 0) >= 15)
            o = sum(1 for r in items if r.get("status") == "open")
            return f"Risks: {len(items)} total, {h} high, {o} open."
        except Exception as e:
            return f"Could not fetch risks: {e}"
    
    # Mitigation
    if any(kw in msg for kw in ["mitigate", "mitigation", "how do we", "how to fix"]):
        risk_title = msg.replace("mitigate","").replace("mitigation","").replace("remediate","").replace("how do we","").replace("how to fix","").replace("risk:","").replace("risk","").strip().title()
        matched = None
        for key, steps in MITIGATIONS.items():
            if key in risk_title.lower():
                matched = steps; break
        if not matched:
            matched = ["Implement access controls", "Review and update security policies", "Conduct risk assessment and prioritize remediation"]
        lines = [f"Mitigation steps for {risk_title or 'this risk'}:"]
        for i, s in enumerate(matched, 1):
            lines.append(f"{i}. {s}")
        return "\n".join(lines)
    
    return None  # Fall through to Hermes

# ── Hermes passthrough ──────────────────────────────────────────────────────

def strip_ansi(text):
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)

def call_hermes(message):
    # Pre-fetch risk data as system context
    context = ""
    try:
        data = api_get("/risks?limit=100")
        items = data.get("data", [])
        h = sum(1 for r in items if (r.get("inherent_risk_score") or 0) >= 15)
        o = sum(1 for r in items if r.get("status") == "open")
        top3 = [{"title": r.get("title",""), "status": r.get("status","")} for r in items[:3]]
        context = f"\n[SYSTEM: GRC API data: {len(items)} risks ({h} high, {o} open). Sample: {json.dumps(top3)}. Use curl to query more data at {API_URL}. Do NOT search files.]"
    except:
        context = f"\n[SYSTEM: GRC API at {API_URL}. Use curl with X-API-Key to query data.]"
    
    full = message + context
    cmd = ["hermes", "chat", "-q", full, "--profile", "compliance-agent"]
    try:
        env = {k: v for k, v in os.environ.items() if k != "HERMES_PROFILE"}
        env["PYTHONUNBUFFERED"] = "1"
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=240, env=env)
        output = result.stdout or result.stderr or ""
        cleaned = strip_ansi(output)
        lines = cleaned.split("\n")
        in_box = False; body = []
        for l in lines:
            if "╭─" in l or l.startswith("╭"): in_box = True; continue
            if "╰─" in l or l.startswith("╰"): in_box = False; continue
            if in_box:
                t = l.replace("║", "").strip()
                if t: body.append(t)
        if not body:
            body = [l for l in lines if l.strip() and not l.startswith(("╔","║","╚","╭","╰","─"))
                    and "Hermes" not in l and "Initializing" not in l
                    and "Resume this session" not in l and "hermes --resume" not in l
                    and not l.startswith(("Session:","Duration:","Messages:"))]
        return "\n".join(body).strip()
    except subprocess.TimeoutExpired:
        return "The request timed out. Please try a simpler question."
    except Exception as e:
        return f"Error: {str(e)}"

# ── HTTP Handler ─────────────────────────────────────────────────────────────

class ChatHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
    
    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()
    
    def do_GET(self):
        if urlparse(self.path).path == "/health":
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "application/json"); self.end_headers()
            self.wfile.write(json.dumps({"status":"ok","service":"compliance-agent-chat","version":"1.0.0"}).encode())
            return
        self.send_error(404)
    
    def do_POST(self):
        if urlparse(self.path).path != "/api/chat": self.send_error(404); return
        if not API_KEY or self.headers.get("X-API-Key","") == API_KEY:
            pass
        else:
            self.send_error(401, "Invalid API key"); return
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length",0))))
            msg = data.get("message","").strip()
            if not msg: self.send_error(400,"Message required"); return
            cid = data.get("conversation_id") or str(uuid.uuid4())
            
            # Try direct answer first
            response = try_direct(msg)
            if response is None:
                response = call_hermes(msg)
            
            # SSE stream
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache"); self.end_headers()
            words = response.split(" ")
            for i, w in enumerate(words):
                self.wfile.write(f"event: token\ndata: {json.dumps({'token': w + (' ' if i < len(words)-1 else '')})}\n\n".encode())
                self.wfile.flush()
            self.wfile.write(f"event: done\ndata: {json.dumps({'summary': response[:200], 'conversation_id': cid})}\n\n".encode())
            self.wfile.flush()
        except Exception as e:
            self.send_error(500, str(e))
    
    def log_message(self, *a): pass

def main():
    server = ThreadedHTTPServer((HOST, PORT), ChatHandler)
    print(f"[ChatServer] Compliance Agent on {HOST}:{PORT}")
    try: server.serve_forever()
    except KeyboardInterrupt: server.shutdown()

if __name__ == "__main__":
    main()
