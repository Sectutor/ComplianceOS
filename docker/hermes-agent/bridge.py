"""Hermes Bridge — tmux-based persistent session + HTTP API."""
import json, os, subprocess, time, re, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

DEFAULT_SESSION = "hermes-default"
HERMES_HOME = os.environ.get("HERMES_HOME", "/app")

# Thread-safe session locks mapping
_session_locks = {}
_locks_lock = threading.Lock()

# Activity tracking for cleanup
_last_active = {}
_active_lock = threading.Lock()

def tmux(cmd):
    subprocess.run(["tmux"] + cmd, capture_output=True, timeout=30)

def update_last_active(session_name):
    with _active_lock:
        _last_active[session_name] = time.time()

def get_session_lock(session_name):
    with _locks_lock:
        if session_name not in _session_locks:
            _session_locks[session_name] = threading.Lock()
        return _session_locks[session_name]

def ensure_session(session_name):
    result = subprocess.run(
        ["tmux", "has-session", "-t", session_name],
        capture_output=True, timeout=5,
    )
    if result.returncode != 0:
        print(f"[Bridge] Initializing new isolated tmux session: {session_name}")
        # Start tmux server explicitly on fresh container
        subprocess.run(["tmux", "start-server"], capture_output=True, timeout=10)
        subprocess.run(["tmux", "new-session", "-d", "-s", session_name, "-x", "200", "-y", "50"], capture_output=True)
        ak = os.environ.get("COMPLIANCE_API_KEY", "")
        au = os.environ.get("COMPLIANCE_API_URL", "")
        subprocess.run(["tmux", "send-keys", "-t", session_name,
              f"export COMPLIANCE_API_KEY='{ak}' COMPLIANCE_API_URL='{au}' && "
              f"cd {HERMES_HOME} && hermes --yolo --skills grcompliance --cli", "Enter"], capture_output=True)
        for _ in range(120):
            time.sleep(2)
            pane = tmux_capture(session_name)
            # Wait until the real prompt appears (❯ on its own line or ⚕ ❯ msg=)
            for line in pane.split("\n"):
                stripped = line.strip()
                if stripped in ("❯", "❯ ", ">", "> "):
                    return
                if "⚕ ❯" in stripped and "msg=" in stripped:
                    return

def tmux_capture(session_name):
    result = subprocess.run(
        ["tmux", "capture-pane", "-t", session_name, "-p", "-S", "-300"],
        capture_output=True, text=True, timeout=10,
    )
    return result.stdout or ""

def tmux_send(session_name, text):
    subprocess.run(["tmux", "send-keys", "-t", session_name, text, "Enter"], capture_output=True)

def _extract_last_response(pane_text):
    """Extract the clean text from the last Hermes response box in the pane."""
    boxes = re.findall(r'╭─([^╰]*)╰─', pane_text, re.DOTALL)
    if not boxes:
        return ""
    inner = boxes[-1]
    inner = re.sub(r'[╭╰│╮╯╮]+', '', inner)
    inner = re.sub(r'─{2,}', '', inner)
    inner = re.sub(r'⚕\s+[^\n]+', '', inner)
    inner = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', inner)
    inner = "\n".join(
        l for l in inner.split("\n")
        if l.strip() and not l.strip().startswith(("⚕", "─", "❯")) and "❯" not in l
    ).strip()
    return inner

def _is_prompt_visible(pane_text):
    """Check if the Hermes prompt is visible in the pane."""
    for line in pane_text.split("\n"):
        stripped = line.strip()
        if stripped in ("❯", "❯ ", ">", "> "):
            return True
        if "⚕ ❯" in stripped and "msg=" in stripped:
            return True
    return False

def send_and_wait(session_name, message):
    """Send a message and wait for the complete response (thread-safe per session)."""
    ensure_session(session_name)
    session_lock = get_session_lock(session_name)
    with session_lock:
        update_last_active(session_name)
        
        # Capture the state of the pane BEFORE sending the message
        before_pane = tmux_capture(session_name)
        before_response = _extract_last_response(before_pane)
        before_boxes_count = len(re.findall(r'╭─([^╰]*)╰─', before_pane, re.DOTALL))
        
        tmux_send(session_name, message)
        
        # Wait loop
        last_content_hash = ""
        stable_ticks = 0
        response_text = ""

        for _ in range(480):  # up to 240 seconds
            time.sleep(0.5)
            current = tmux_capture(session_name)
            
            # Check boxes count in current pane
            current_boxes = re.findall(r'╭─([^╰]*)╰─', current, re.DOTALL)
            current_boxes_count = len(current_boxes)
            
            extracted = _extract_last_response(current)
            
            # Skip if we are still showing the previous response
            if current_boxes_count <= before_boxes_count and extracted == before_response:
                continue

            if extracted and any(w in extracted.lower() for w in
                ["cogitating", "thinking", "preparing", "installing", "working",
                 "hermes agent v", "available tools", "yolo mode"]):
                continue

            content_hash = hash(extracted) if extracted else ""

            # Stable detection: content present + stable + prompt visible
            if extracted and content_hash == last_content_hash and _is_prompt_visible(current):
                stable_ticks += 1
            else:
                stable_ticks = 0

            if extracted:
                response_text = extracted

            last_content_hash = content_hash

            if stable_ticks >= 4:
                break

        return _final_cleanup(response_text)

def _final_cleanup(text):
    """Strip box chars, high unicode, collapse newlines, format professionally."""
    import sys as _sys
    clean = text.strip()
    while clean and ord(clean[-1]) > 0x2000:
        clean = clean[:-1].strip()
    while clean and ord(clean[0]) > 0x2000:
        clean = clean[1:].strip()
    clean = re.sub(r'\n{3,}', '\n\n', clean)
    # Post-process: add **bold** around numbers
    clean = re.sub(r'(\d+)', r'**\1**', clean)
    # Post-process: add ## to section-style lines (short lines ending with : or starting with a key word)
    lines = clean.split("\n")
    section_keywords = ["summary", "finding", "state", "roster", "observation", "gap", "note",
                        "current", "recommend", "root", "phase", "timeline", "client", "risk",
                        "vendor", "policy", "control", "framework", "evidence", "action"]
    result = []
    for line in lines:
        stripped = line.strip()
        # If line looks like a section header (short, capitalized, no leading • or -)
        if (stripped and not stripped.startswith(("- ", "•", "|", "`", "#"))
            and len(stripped) < 50
            and any(stripped.lower().startswith(w) for w in section_keywords)):
            result.append("## " + stripped)
        else:
            result.append(line)
    clean = "\n".join(result)
    # Ensure it ends with a bold offer
    if "Want me to" not in clean:
        clean += "\n\n**Want me to take any of these actions?**"
    return clean.strip() or "(empty)"

def cleanup_loop():
    """Background thread to clean up inactive tmux sessions (idle > 30 minutes)."""
    while True:
        time.sleep(60)
        now = time.time()
        to_kill = []
        with _active_lock:
            for session, last_time in list(_last_active.items()):
                # hermes-default is never auto-killed to preserve quick start
                if session == DEFAULT_SESSION:
                    continue
                # 30 minutes = 1800 seconds
                if now - last_time > 1800:
                    to_kill.append(session)
                    del _last_active[session]

        for session in to_kill:
            print(f"[Bridge Cleanup] Killing idle session: {session}")
            subprocess.run(["tmux", "kill-session", "-t", session], capture_output=True)
            with _locks_lock:
                if session in _session_locks:
                    del _session_locks[session]

class BridgeHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode() if length else "{}"

        try:
            data = json.loads(body)
        except:
            data = {}

        if path == "/api/chat":
            message = (data.get("message") or "").strip()
            conversation_id = (data.get("conversation_id") or "").strip()
            if not message:
                self._json(400, {"error": "message required"})
                return
            
            # Resolve session name
            if not conversation_id:
                conversation_id = DEFAULT_SESSION
            clean_id = re.sub(r'[^a-zA-Z0-9_-]', '', conversation_id)
            session_name = f"hermes-{clean_id}"

            response = send_and_wait(session_name, message)
            import sys as _sys
            _sys.stderr.write(f"[DEBUG] session={session_name} response={repr(response[:200])}\n")
            _sys.stderr.flush()
            # Post-process: add bold around numbers + section headers + closing offer
            response = re.sub(r'(\d+)', r'**\1**', response)
            lines = response.split("\n")
            sk = ["summary", "finding", "state", "roster", "gap", "note", "current",
                  "recommend", "root", "phase", "timeline", "client", "risk",
                  "vendor", "policy", "control", "framework", "evidence", "action",
                  "observation"]
            result = []
            for line in lines:
                s = line.strip()
                if (s and not s.startswith(("- ", "•", "|", "`", "#"))
                     and len(s) < 50
                     and any(s.lower().startswith(w) for w in sk)):
                    result.append("## " + s)
                else:
                    result.append(line)
            response = "\n".join(result)
            if "Want me to" not in response:
                response += "\n\n**Want me to take any of these actions?**"
            # Final safety net — strip any high Unicode chars
            while response and ord(response[-1]) > 0x2000:
                response = response[:-1].strip()
            self._json(200, {
                "choices": [{"message": {"role": "assistant", "content": response}}],
                "conversation_id": conversation_id
            })
        else:
            self._json(404, {"error": "not found"})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._json(200, {"status": "ok", "agent": "hermes-native"})
        elif path == "/ready":
            result = subprocess.run(
                ["tmux", "has-session", "-t", DEFAULT_SESSION],
                capture_output=True, timeout=5,
            )
            self._json(200, {"ready": result.returncode == 0})
        elif path == "/api/suggested":
            # Generate dynamic suggested questions from default session data
            pane = tmux_capture(DEFAULT_SESSION)
            qs = [
                "How many risks?",
                "List my clients",
                "Show top risks",
                "Which vendors do I have?",
                "How many policies are approved?",
                "Show framework gaps",
            ]
            # Try to find actual entity counts in the pane to personalize questions
            for line in pane.split("\n"):
                low = line.lower()
                if "risk" in low:
                    nums = re.findall(r'\d+', line)
                    if nums and int(nums[0]) > 0:
                        qs[0] = f"How many risks? (saw {nums[0]})"
                        break
            self._json(200, {"questions": qs})
        else:
            self._json(404, {"error": "not found"})

    def _json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass


def main():
    # Start cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    cleanup_thread.start()

    print("[Bridge] Starting default Hermes session...")
    ensure_session(DEFAULT_SESSION)
    print("[Bridge] Default Hermes session ready")

    port = 9090
    server = HTTPServer(("0.0.0.0", port), BridgeHandler)
    print(f"[Bridge] HTTP server on 0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
