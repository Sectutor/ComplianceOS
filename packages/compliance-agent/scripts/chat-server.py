#!/usr/bin/env python3
"""
Compliance Agent Chat Server — Embedded HTTP endpoint for the web chat widget.

Provides:
  POST /api/chat  — accepts {message} streams response via SSE
  GET  /health    — health check

Runs alongside Hermes Agent. Forwards messages to Hermes CLI subprocess
with the compliance-agent profile. No pre-fetch — Hermes queries the API
directly using curl (as instructed by the compliance-agent SKILL.md).
"""

import json, os, subprocess, uuid, re, html
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

HOST = os.environ.get("CHAT_HOST", "0.0.0.0")
PORT = int(os.environ.get("CHAT_PORT", "9090"))
API_URL = os.environ.get("COMPLIANCE_API_URL", "http://complianceos:3002/api/v1")
API_KEY = os.environ.get("COMPLIANCE_API_KEY", "")

def api_get(path: str) -> dict:
    """Fetch JSON from the GRCompliance API."""
    import urllib.request, json
    req = urllib.request.Request(f"{API_URL}{path}", headers={"X-API-Key": API_KEY})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))

def try_direct_answer(message: str) -> str | None:
    """Try to answer common data questions directly via the API — no Hermes needed."""
    import json
    msg = message.lower().strip()
    
    # ── Risk listing ───────────────────────────────────────────────────
    if any(kw in msg for kw in ["risk", "high risk", "list risk", "show risk", "top risk"]):
        try:
            data = api_get("/risks?limit=50")
            items = data.get("data", [])
            if not items:
                return "No risk data found. The risk register may be empty."
            # Sort by inherent_risk_score descending (highest risk first)
            scored = [r for r in items if (r.get("inherent_risk_score") or 0) > 0]
            scored.sort(key=lambda r: -(r.get("inherent_risk_score") or 0))
            
            # Extract count
            count = 10
            if "10" in msg: count = 10
            elif "5" in msg: count = 5
            elif "all" in msg: count = len(scored) or len(items)
            
            selected = scored[:count] if scored else items[:count]
            lines = [f"Here are the top {len(selected)} security risks:"]
            for i, r in enumerate(selected, 1):
                score = r.get("inherent_risk_score") or "N/A"
                status = r.get("status", "unknown")
                title = r.get("title", "Untitled")
                lines.append(f"{i}. [{score}] {title} ({status})")
            lines.append(f"\nSource: GRCompliance API ({len(items)} total risks)")
            return "\n".join(lines)
        except Exception as e:
            return f"Could not fetch risks: {e}"
    
    # ── Risk summary ───────────────────────────────────────────────────
    if any(kw in msg for kw in ["how many", "count", "total", "summary"]):
        try:
            data = api_get("/risks?limit=100")
            items = data.get("data", [])
            total = len(items)
            high = sum(1 for r in items if (r.get("inherent_risk_score") or 0) >= 15)
            open_c = sum(1 for r in items if r.get("status") == "open")
            return f"Risk summary: {total} total, {high} high (score >= 15), {open_c} open."
        except Exception as e:
            return f"Could not fetch risk summary: {e}"
    
    # ── Controls ───────────────────────────────────────────────────────
    if any(kw in msg for kw in ["control", "framework"]):
        try:
            data = api_get("/controls?limit=20")
            items = data if isinstance(data, list) else data.get("data", [])
            if not items:
                return "No controls found."
            lines = [f"Here are the controls ({len(items)} shown):"]
            for i, c in enumerate(items[:10], 1):
                fw = c.get("framework", "")
                name = c.get("name", "Untitled")
                lines.append(f"{i}. [{fw}] {name}")
            return "\n".join(lines)
        except Exception as e:
            return f"Could not fetch controls: {e}"
    
    return None  # Let Hermes handle it

def strip_ansi(text: str) -> str:
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)

def call_hermes(message: str) -> str:
    """Call Hermes CLI with the message and return the cleaned response."""
    # Try direct API answers for data queries first
    direct = try_direct_answer(message)
    if direct:
        return direct
    
    cmd = ["hermes", "chat", "-q", message, "--profile", "compliance-agent"]
    try:
        sub_env = {k: v for k, v in os.environ.items() if k != "HERMES_PROFILE"}
        sub_env["PYTHONUNBUFFERED"] = "1"
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=240, env=sub_env,
        )
        output = result.stdout or result.stderr or ""
        cleaned = strip_ansi(output)
        # Extract content between ╭─ and ╰─ boxes (Hermes TUI message boxes)
        lines = cleaned.split("\n")
        in_box = False
        body_lines = []
        for l in lines:
            if "╭─" in l or l.startswith("╭"):
                in_box = True; continue
            if "╰─" in l or l.startswith("╰"):
                in_box = False; continue
            if in_box:
                text = l.replace("║", "").strip()
                if text:
                    body_lines.append(text)
        if not body_lines:
            body_lines = [l for l in lines if l.strip() 
                          and not l.startswith(("╔","║","╚","╭","╰","─"))
                          and "Hermes" not in l and "Initializing" not in l
                          and "Resume this session" not in l
                          and "hermes --resume" not in l
                          and not l.startswith(("Session:","Duration:","Messages:"))]
        return "\n".join(body_lines).strip()
    except subprocess.TimeoutExpired:
        return "I'm sorry, the request timed out. Please try again with a simpler question."
    except Exception as e:
        return f"I encountered an error: {str(e)}"

class ChatHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
    
    def _check_auth(self) -> bool:
        if not API_KEY:
            return True
        if self.headers.get("X-API-Key", "") != API_KEY:
            self.send_error(401, "Invalid API key")
            return False
        return True
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok", "service": "compliance-agent-chat", "version": "1.0.0",
            }).encode())
            return
        self.send_error(404)
    
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/chat":
            self.send_error(404)
            return
        if not self._check_auth():
            return
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
            message = data.get("message", "").strip()
            conversation_id = data.get("conversation_id") or str(uuid.uuid4())
            if not message:
                self.send_error(400, "Message is required")
                return
            response = call_hermes(message)
            # SSE stream
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            words = response.split(" ")
            for i, word in enumerate(words):
                chunk = {"token": word + (" " if i < len(words) - 1 else "")}
                self.wfile.write(f"event: token\ndata: {json.dumps(chunk)}\n\n".encode())
                self.wfile.flush()
            done = {"summary": response[:200] + ("..." if len(response) > 200 else ""),
                    "conversation_id": conversation_id}
            self.wfile.write(f"event: done\ndata: {json.dumps(done)}\n\n".encode())
            self.wfile.flush()
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, str(e))
    
    def log_message(self, format, *args):
        pass

def main():
    import threading
    def warmup():
        try:
            subprocess.run(
                ["hermes", "chat", "-q", "ready", "--profile", "compliance-agent"],
                capture_output=True, timeout=60,
                env={k: v for k, v in os.environ.items() if k != "HERMES_PROFILE"}
            )
        except:
            pass
    threading.Thread(target=warmup, daemon=True).start()
    server = ThreadedHTTPServer((HOST, PORT), ChatHandler)
    print(f"[ChatServer] Compliance Agent chat API running on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
