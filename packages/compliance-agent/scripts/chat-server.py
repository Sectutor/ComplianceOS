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
    # Pre-fetch a quick summary from the API so Hermes doesn't need to search the filesystem
    api_context = ""
    try:
        import urllib.request, json
        api_url = os.environ.get("COMPLIANCE_API_URL", "http://complianceos:3002/api/v1")
        api_key = os.environ.get("COMPLIANCE_API_KEY", "")
        headers = {"X-API-Key": api_key, "Accept": "application/json"}
        
        req = urllib.request.Request(f"{api_url}/health", headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                # Fetch risk summary
                req2 = urllib.request.Request(f"{api_url}/risks", headers=headers)
                with urllib.request.urlopen(req2, timeout=10) as r2:
                    raw = r2.read().decode('utf-8')
                    data = json.loads(raw).get('data', [])
                    total = len(data)
                    # Compute severity summary from inherent_risk_score
                    high = sum(1 for r in data if (r.get('inherent_risk_score') or 0) >= 15 or (r.get('inherentScore') or 0) >= 15)
                    medium = sum(1 for r in data if 8 <= ((r.get('inherent_risk_score') or 0)) < 15)
                    low = sum(1 for r in data if ((r.get('inherent_risk_score') or 0)) < 8)
                    open_count = sum(1 for r in data if r.get('status') == 'open')
                    api_context = f"""
GRCompliance API risk summary:
- Total risks: {total}
- High: {high}
- Medium: {medium}  
- Low: {low}
- Open: {open_count}

First 3 risks: {json.dumps([{'title': r.get('title',''), 'status': r.get('status',''), 'risk_score': r.get('inherent_risk_score') or r.get('inherentScore')} for r in data[:3]])}

Answer the user's question directly using this data."""
    except Exception as e:
        api_context = f"\n\nNote: GRCompliance API is not reachable ({e})."
    
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
            timeout=120,
            env=sub_env,
        )
        output = result.stdout or result.stderr or ""
        cleaned = strip_ansi(output)
        # Strip Hermes banner/header lines and TUI artifacts
        lines = cleaned.split("\n")
        body_lines = [l for l in lines if not l.startswith("╔") and not l.startswith("║") 
                      and not l.startswith("╚") and not l.startswith("╭") and not l.startswith("╰")
                      and "Hermes" not in l and "Initializing" not in l
                      and not l.startswith("?") and not l.startswith("Query:")
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
