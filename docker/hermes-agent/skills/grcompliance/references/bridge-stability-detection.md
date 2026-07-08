# Bridge Stability Detection — Response Timing & Post-Processing

The Hermes bridge (`bridge.py`) polls the tmux pane for response completion. Several bugs caused 60s+ response times even for simple queries.

## Bug 1: Pane hash included status bar timer

The status bar updates every second (`⏲ 2s` → `⏲ 3s`). Hashing the full pane means the hash changes every second after Hermes finishes.

**Fix**: Hash only the EXTRACTED BOX CONTENT. The box content stabilizes immediately when Hermes finishes.

```python
content_hash = hash(extracted) if extracted else ""
```

## Bug 2: Prompt detection scanned only last 10 lines

Hermes CLI welcome banner is ~53 lines. The `❯` prompt is at line 41. `[-10:]` starts at line 43 — prompt never found, ensure_session() waited 4+ minutes.

**Fix**: Scan ALL lines, not just last N.

```python
for line in pane.split("\n"):  # NOT [-10:]
```

## Bug 3: Tmux server dies on container restart

`kill 1` restarts the container but tmux socket is gone. `new-session` fails silently.

**Fix**: Call `tmux start-server` before `new-session`.

```python
subprocess.run(["tmux", "start-server"], ...)
tmux(["-d", "-s", "hermes-chat", "-x", "200", "-y", "50"])
tmux(["send-keys", "-t", "hermes-chat",
      f"export COMPLIANCE_API_KEY='{ak}' COMPLIANCE_API_URL='{au}' && "
      f"cd {HERMES_HOME} && hermes --yolo --skills grcompliance --cli", "Enter"])
```

## Bug 4: Stale Python bytecode cache

`docker cp` overwrites the `.py` file but Python may use a cached `.pyc` from the OLD version. The new `_final_cleanup` or `do_POST` code NEVER runs.

**Fix**: Delete `__pycache__` before restarting:
```bash
docker cp bridge.py container:/app/bridge.py
docker exec container rm -rf /app/__pycache__ /app/bridge.pyc
docker exec container sh -c "kill 1"
```

## Fast Path Optimization

5-second fast path catches quick answers before entering main polling loop. MUST share the same skip list (welcome banner, thinking indicators):

```python
for _ in range(10):
    current = tmux_capture()
    extracted = _extract_last_response(current)
    if extracted and not any(w in extracted.lower() for w in
        ["cogitating", "thinking", "preparing", "installing", "working",
         "hermes agent v", "available tools", "yolo mode"]):
        if _is_prompt_visible(current):
            clean = _final_cleanup(extracted)
            if len(clean) > 5:
                return clean
    if "cogitating" in current.lower() or "preparing" in current.lower():
        break  # fall through to main loop
```

## Post-Processing Formatter (in BridgeHandler.do_POST)

DeepSeek DOES NOT follow SOUL.md formatting rules. The bridge's post-processing is the ONLY reliable way to ensure bold/section formatting.

After `send_and_wait` returns, three transforms apply:

### 1. Bold numbers
```python
response = re.sub(r'(\d+)', r'**\1**', response)
```
Wraps every digit sequence in `**bold**`. This handles **21 risks**, **5 clients**, **0%**, etc.

### 2. Section headers
```python
sk = ["summary", "finding", "state", "roster", "gap", "note", "current",
      "recommend", "root", "phase", "timeline", "client", "risk",
      "vendor", "policy", "control", "framework", "evidence", "action",
      "observation"]
for line in lines:
    s = line.strip()
    if (s and not s.startswith(("- ", "•", "|", "`", "#"))
        and len(s) < 50
        and any(s.lower().startswith(w) for w in sk)):
        result.append("## " + s)
```
Lines matching keywords (short, capitalized, no list/table prefix) get `## ` prepended.

### 3. Closing offer
```python
if "Want me to" not in response:
    response += "\n\n**Want me to take any of these actions?**"
```

## Expected Response Times

| Query Type | Time | Bottleneck |
|-----------|------|------------|
| Greeting | 5-8s | DeepSeek API + skill loading |
| Simple API query | 8-15s | DeepSeek + single API call |
| Cross-entity analysis | 20-30s | Multiple API calls + reasoning |
| Compliance summary | 30-90s | 5+ API calls + complex output |
| Framework plan | 60-120s | 10+ API calls + structured output |

## Deploying Changes

- `docker cp` writes to container overlay — persists across `kill 1` and `docker restart`
- **ALWAYS** delete bytecode cache: `docker exec container rm -rf /app/__pycache__/` BEFORE `kill 1`
- If the change still doesn't apply, the container was recreated from image (docker stop/rm/run). Rebuild: `docker build -qt hermes-grc-agent .`
- Full rebuild needed for SKILL.md, SOUL.md, or config.yaml changes (these are baked into image, not in bridge.py)

## Thread Safety

`send_and_wait` uses `threading.Lock()` to serialize queries. Without it, rapid-fire requests interleave in the tmux session and produce wrong responses. The lock ensures one-at-a-time processing even though Python HTTP server is single-threaded.
