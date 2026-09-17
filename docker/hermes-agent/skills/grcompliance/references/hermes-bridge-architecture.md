# Hermes Bridge Architecture

## Overview

The Hermes Bridge (`bridge.py`) is a thin HTTP-to-tmux transport that runs Hermes natively. Hermes CLI is the actual engine.

```
HTTP POST /api/chat
  → send_and_wait(message)
    → tmux send-keys → Hermes CLI processes
    → poll: tmux capture-pane (0.5s intervals)
    → fast path (5s) OR main loop (120-240s)
    → _extract_last_response() → _final_cleanup()
  → do_POST post-processing (bold numbers, sections, closing offer)
  → JSON response {"choices": [{"message": {"content": "..."}}]}
```

## Why tmux Instead of Subprocess Pipes

`hermes` (interactive CLI) uses `prompt_toolkit` which requires a real PTY. `subprocess.PIPE` doesn't provide a PTY.

| Approach | Problem |
|----------|---------|
| `subprocess.Popen` with `stdin=PIPE` | No PTY — Hermes hangs on prompt_toolkit init |
| `hermes chat -q` | Fresh session per call — no memory, no tools persistence |
| `hermes gateway run` | Messaging platform gateway — no HTTP chat API |
| `hermes dashboard` | Web UI + WebSocket — POST /api/chat returns 405 |
| `hermes proxy` | Requires OAuth (Nous Portal), not API-key auth |

## Response Extraction

### Box Detection

`re.findall(r'╭─([^╰]*)╰─', pane, re.DOTALL)` captures ONLY content between `╭─` and `╰─` — not borders, not status bar, not prompt.

### Box Counting (Avoid Stale Responses)

Record box count BEFORE sending message. Only consider boxes that appeared after:

```python
boxes_before = len(re.findall(r'╭─([^╰]*)╰─', current_before, re.DOTALL))
tmux_send(message)
# Later: only boxes[boxes_before:] are new
```

### Fast Path

First 10 iterations (5 seconds). Checks for existing response. If found, returns immediately. MUST skip welcome banner and thinking indicators:

```python
skip = ["cogitating", "thinking", "preparing", "installing", "working",
        "hermes agent v", "available tools", "yolo mode"]
```

### Main Loop

After fast path, falls through to 480-iteration (240s) main loop. Uses `content_hash` (hash of extracted box) NOT `current_hash` (hash of full pane) for stability detection. The status bar timer (`⏲ 2s`) changes the pane hash every second.

### Stable Detection

Three conditions for "response complete":
1. `extracted` — non-empty box content
2. `content_hash == last_content_hash` — content hasn't changed
3. `_is_prompt_visible(current)` — prompt `❯` or `⚕ ❯ msg=` is visible

After 4 consecutive stable ticks (2 seconds), response is considered complete.

### Prompt Detection

Hermes CLI shows two prompt formats:
- **Initial prompt**: `❯` alone on its own line (bare, no prefix)
- **After first response**: `⚕ ❯ msg=interrupt ...` (menu bar with status)

Both are detected by scanning ALL pane lines (not just last N).

```python
for line in pane.split("\n"):  # full scan, not [-5:] or [-10:]
    stripped = line.strip()
    if stripped in ("❯", "❯ ", ">", "> "):
        return True
    if "⚕ ❯" in stripped and "msg=" in stripped:
        return True
```

## Environment Setup

### Env Vars in Tmux

Docker `-e` env vars are NOT inherited by tmux sessions. Must be exported explicitly:

```python
ak = os.environ.get("COMPLIANCE_API_KEY", "")
au = os.environ.get("COMPLIANCE_API_URL", "")
tmux(["send-keys", "-t", TMUX_SESSION,
      f"export COMPLIANCE_API_KEY='{ak}' COMPLIANCE_API_URL='{au}' && "
      f"cd {HERMES_HOME} && hermes --yolo --skills grcompliance --cli", "Enter"])
```

DO NOT use `$VAR` expansion in the f-string — Python's f-string doesn't expand shell variables. Use `os.environ.get()` to read from Python.

### Tmux Server Lifecycle

- `tmux start-server` — must be called before `new-session` on a fresh container
- `tmux has-session -t hermes-chat` — check if session exists (exit 0 = yes)
- `tmux kill-session -t hermes-chat` — destroy session (needed before /reset if starting fresh)
- `kill 1` kills the bridge process → Docker restarts the container → tmux server must be recreated

## Content Cleanup Pipeline

1. Strip box borders: `re.sub(r'[╭╰│╮╯╮]+', '', inner)`
2. Strip dashes: `re.sub(r'─{2,}', '', inner)` — removes separator lines
3. Strip status bar: `re.sub(r'⚕\s+[^\n]+', '', inner)` — note `[^\n]` not `.*` which would be greedy
4. Strip ANSI: `re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', inner)`
5. Filter lines: skip empty, `⚕`, `─`, `❯`
6. High Unicode strip: `while clean and ord(clean[-1]) > 0x2000: clean = clean[:-1]`
7. Post-process in do_POST: bold numbers, section headers, closing offer

## Post-Processing (do_POST)

Applied AFTER `send_and_wait` returns, BEFORE JSON serialization:

```python
response = send_and_wait(message)
# 1. Bold all numbers
response = re.sub(r'(\d+)', r'**\1**', response)
# 2. Add ## section headers to short capitalised lines
for line in lines:
    if matches_section_keyword(line):
        result.append("## " + line)
    else:
        result.append(line)
# 3. Ensure closing offer
if "Want me to" not in response:
    response += "\n\n**Want me to take any of these actions?**"
```

## Deploying Changes

### docker cp + kill 1 (fast iteration)

```bash
docker cp bridge.py container:/app/bridge.py
docker exec container sh -c "rm -rf /app/__pycache__/; kill 1"
```

`rm -rf __pycache__/` is CRITICAL — Python's bytecode cache may be stale after `docker cp`, causing old code to run.

### Full rebuild (for permanent changes)

```bash
cd docker/hermes-agent
docker build -qt hermes-grc-agent .
docker stop complianceos-hermes-agent-1
docker rm complianceos-hermes-agent-1
docker run -d --name complianceos-hermes-agent-1 \
  --network complianceos-network --network-alias hermes-agent \
  -p 9090:9090 \
  -e DEEPSEEK_API_KEY=... \
  -e COMPLIANCE_API_KEY=... \
  -e COMPLIANCE_API_URL=http://complianceos-app-1:3001/api/v1 \
  hermes-grc-agent
```

## Common Failure Modes

### Trailing `❯` (U+276F) in Responses
Not captured in box content (regex uses capture group `╭─([^╰]*)╰─`). If it appears, check bytecode cache.

### Box Count Stuck
`current_box_count` never exceeds `boxes_before`. Check tmux session is alive, Hermes isn't stuck.

### Non-JSON Response / Empty Response
Bridge process may have crashed. Check `docker logs`. Stale `.pyc` is the most common cause.

### Welcome Banner Returned
Fast path skip list missing "hermes agent v" or "available tools". Must be in BOTH fast path and main loop skip lists.
