#!/usr/bin/env python3
"""
Compliance Agent Chat Server — Embedded HTTP endpoint for the web chat widget.

Provides:
  POST /api/chat  — accepts {message, conversation_id?} streams response via SSE
  GET  /health    — health check

Runs alongside Hermes Agent. Forwards messages to Hermes CLI subprocess.
"""

import json, os, subprocess, uuid, re, html
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server — health checks don't block on requests."""
    daemon_threads = True

HOST = os.environ.get("CHAT_HOST", "0.0.0.0")
PORT = int(os.environ.get("CHAT_PORT", "9090"))
API_KEY = os.environ.get("COMPLIANCE_API_KEY", "")
HERMES_SKILLS = os.environ.get("HERMES_SKILLS", "compliance-agent")

def strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from Hermes terminal output."""
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)

def call_hermes(message: str) -> str:
    """Call Hermes CLI with the message and return the response."""
    # Smart pre-fetch: only inject API context for compliance-related questions
    api_context = ""
    risk_keywords = ["risk", "high", "medium", "critical", "control", "evidence", 
                     "gap", "framework", "compliance", "report", "audit",
                     "vulnerability", "threat", "incident", "vendor", "policy",
                     "how many", "list", "summarize", "show"]
    msg_lower = message.lower()
    if any(kw in msg_lower for kw in risk_keywords):
        try:
            import urllib.request, json
            api_url = os.environ.get("COMPLIANCE_API_URL", "http://complianceos:3002/api/v1")
            api_key = os.environ.get("COMPLIANCE_API_KEY", "")
            req = urllib.request.Request(f"{api_url}/risks?limit=100", 
                                          headers={"X-API-Key": api_key})
            with urllib.request.urlopen(req, timeout=10) as r:
                raw = r.read().decode('utf-8')
                data = json.loads(raw).get('data', [])
                high = sum(1 for r2 in data if (r2.get('inherent_risk_score') or 0) >= 15)
                open_c = sum(1 for r2 in data if r2.get('status') == 'open')
                total = len(data)
                api_context = f"""
[SYSTEM: GRCompliance API response — this is authoritative live data.]
Risks: {total} total, {high} high (score>=15), {open_c} open.
Answer the user using ONLY this data. Do NOT search files or make API calls."""
        except:
            api_context = ""
    
    full_message = message + api_context
    cmd = ["hermes", "chat", "-q", full_message]
    # Use profile name 'compliance-agent' (the entrypoint registers it)
    cmd += ["--profile", "compliance-agent"]
    try:
        # Unset HERMES_PROFILE path — use explicit --profile flag instead
        sub_env = {k: v for k, v in os.environ.items() if k != "HERMES_PROFILE"}
        sub_env["PYTHONUNBUFFERED"] = "1"
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=240,
            env=sub_env,
        )
        output = result.stdout or result.stderr or ""
        cleaned = strip_ansi(output)
        # Extract content between ╭─ and ╰─ boxes (Hermes TUI message boxes)
        lines = cleaned.split("\n")
        in_box = False
        body_lines = []
        for l in lines:
            # Start of message box
            if "╭─" in l or l.startswith("╭"):
                in_box = True
                continue
            # End of message box
            if "╰─" in l or l.startswith("╰"):
                in_box = False
                continue
            if in_box:
                # Remove box borders (║ characters)
                text = l.replace("║", "").strip()
                if text:
                    body_lines.append(text)
        
        # If no box content found, fall back to line filtering
        if not body_lines:
            body_lines = [l for l in lines if not l.startswith("╔") and not l.startswith("║") 
                          and not l.startswith("╚") and not l.startswith("╭") and not l.startswith("╰")
                          and "Hermes" not in l and "Initializing" not in l
                          and "Resume this session" not in l
                          and "hermes --resume" not in l
                          and not l.startswith("Session:") and not l.startswith("Duration:")
                          and not l.startswith("Messages:")
                          and l.strip() and not l.startswith("─")]
        
        return "\n".join(body_lines).strip()
    except subprocess.TimeoutExpired:
        return "I'm sorry, the request timed out. Please try again with a simpler question."
    except Exception as e:
        return f"I encountered an error: {str(e)}"

class ChatHandler(BaseHTTPRequestHandler):
    """HTTP handler for chat API."""
    
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
    
    def _check_auth(self) -> bool:
        if not API_KEY:
            return True  # dev mode
        key = self.headers.get("X-API-Key", "")
        if key != API_KEY:
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
                "status": "ok",
                "service": "compliance-agent-chat",
                "version": "1.0.0",
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
            
            # Call Hermes
            response = call_hermes(message)
            
            # SSE response
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            
            # Stream response tokens (word by word for UI effect)
            words = response.split(" ")
            for i, word in enumerate(words):
                chunk = {"token": word + (" " if i < len(words) - 1 else "")}
                self.wfile.write(f"event: token\ndata: {json.dumps(chunk)}\n\n".encode())
                self.wfile.flush()
            
            # Send done event
            done = {
                "summary": response[:200] + ("..." if len(response) > 200 else ""),
                "conversation_id": conversation_id,
            }
            self.wfile.write(f"event: done\ndata: {json.dumps(done)}\n\n".encode())
            self.wfile.flush()
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, str(e))
    
    def log_message(self, format, *args):
        """Suppress default HTTP server logging."""
        pass

def main():
    # Warm-up: pre-load Hermes profile so first user request is fast
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
    print(f"[ChatServer] API key auth: {'enabled' if API_KEY else 'disabled (dev mode)'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ChatServer] Shutting down...")
        server.shutdown()

if __name__ == "__main__":
    main()
