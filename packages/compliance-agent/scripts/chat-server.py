#!/usr/bin/env python3
"""
Compliance Agent Chat Server — API-first agent for GRCompliance.

Architecture:
  Browser → Chat Server (:9090) → GRCompliance API (:3002/api/v1)
                                  → DeepSeek API (analytical questions)

Every question hits the real API. No fragile keyword matching.
No Hermes subprocess (eliminates TTY/ANSI/profile/tool issues).
"""
import json, os, re, uuid, urllib.request, urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from socketserver import ThreadingMixIn

# ── Config ──────────────────────────────────────────────────────────────────────

HOST = os.environ.get("CHAT_HOST", "0.0.0.0")
PORT = int(os.environ.get("CHAT_PORT", "9090"))
API_URL = os.environ.get("COMPLIANCE_API_URL", "http://127.0.0.1:3002/api/v1")
API_KEY = os.environ.get("COMPLIANCE_API_KEY", "")
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.environ.get("COMPLIANCE_LLM_MODEL", "deepseek-v4-pro")

# ── API Client ──────────────────────────────────────────────────────────────────

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class ApiError(Exception):
    def __init__(self, msg, status=500):
        super().__init__(msg)
        self.status = status


def api_get(path, timeout=15):
    """GET request to GRCompliance API."""
    url = f"{API_URL}{path}"
    req = urllib.request.Request(url, headers={"X-API-Key": API_KEY})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        raise ApiError(f"API {e.code} on GET {path}: {body}", e.code)
    except urllib.error.URLError as e:
        raise ApiError(f"Cannot reach API at {url}: {e.reason}", 503)


def api_post(path, body, timeout=15, method="POST"):
    """POST/PATCH request to GRCompliance API."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{API_URL}{path}",
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8", errors="replace")[:300]
        raise ApiError(f"API {e.code} on POST {path}: {resp_body}", e.code)
    except urllib.error.URLError as e:
        raise ApiError(f"Cannot reach API at {path}: {e.reason}", 503)


# ── Severity Labels ─────────────────────────────────────────────────────────────

def severity_label(score):
    if score is None:
        return "unknown"
    if score >= 15:
        return "high"
    if score >= 8:
        return "medium"
    return "low"


# ── Agent Logic ─────────────────────────────────────────────────────────────────

# Conversation memory: { conversation_id: [(role, message), ...] }
CONVERSATIONS = {}

def _extract_risk_context(text):
    """Extract risk IDs mentioned in a response for follow-up context."""
    ids = re.findall(r'(?:risk|Risk)\s*[#]?\s*(\d+)', text)
    return [int(i) for i in ids]

def _is_followup(message):
    """Check if message is a follow-up referencing previous context."""
    msg_lower = message.lower().strip()
    # Strip punctuation for cleaner matching
    clean = re.sub(r'[?.!,;:]', '', msg_lower)
    pronouns = ["it", "this", "that", "them", "these", "those", "the risk", "that risk", "this risk"]
    words = clean.split()
    return any(p == words[0] or p in words[:5] or p in clean.split() for p in pronouns)

def answer_question(message, conversation_id=None):
    """
    Parse the user's question, call the relevant API endpoint, format response.
    Supports conversation context via conversation_id.
    """
    # Restore context from previous conversation
    context_note = ""
    injected_id = None
    if conversation_id and conversation_id in CONVERSATIONS:
        history = CONVERSATIONS[conversation_id]
        if _is_followup(message) and len(history) >= 2:
            # The last entry in history is the current user message (added by HTTP handler)
            # Look at the entry BEFORE that for the agent response
            last_agent = history[-2][1] if history[-2][0] == "agent" else ""
            if not last_agent and len(history) >= 4:
                last_agent = history[-3][1] if history[-3][0] == "agent" else ""
            risk_ids = _extract_risk_context(last_agent)
            if risk_ids:
                injected_id = risk_ids[0]
            if not injected_id and len(history) >= 3:
                last_user = history[-3][1] if history[-3][0] == "user" else ""
                risk_ids = _extract_risk_context(last_user)
                if risk_ids:
                    injected_id = risk_ids[0]

    # If this is a follow-up about a specific risk, inject the ID into the message
    if injected_id:
        message = f"{message} (risk {injected_id})"
        context_note = f" [CONTEXT: Referring to risk #{injected_id}]"

    msg_lower = (message + context_note).lower().strip()

    # ── Intent: Health check ─────────────────────────────────────────────────
    if any(kw == msg_lower.strip() or (len(msg_lower) < 20 and kw in msg_lower) for kw in ["health", "ping", "are you alive", "are you there"]):
        try:
            data = api_get("/health")
            db = data.get("database", {})
            return (
                f"GRCompliance API: {data.get('status', 'unknown')}\n"
                f"Database: {'connected' if db.get('connected') else 'disconnected'} "
                f"(latency: {db.get('latencyMs', '?')}ms)\n"
                f"Uptime: {data.get('uptime', 0):.0f}s\n"
                f"Auth mode: {data.get('authMode', '?')}"
            )
        except ApiError as e:
            return f"API health check failed: {e}"

    # ── Intent: General "how many" for any entity ────────────────────────────
    entity_kw = None
    for kw in ["client", "asset", "vendor", "control", "framework", "evidence", "polic"]:
        if re.search(r'\b' + kw, msg_lower) and any(w in msg_lower for w in ["how many", "count", "total", "number of"]):
            entity_kw = kw
            break
    if entity_kw:
        try:
            s = api_get("/summary")
            labels = {"client": "clients", "asset": "assets", "vendor": "vendors",
                      "control": "controls", "framework": "frameworks",
                      "evidence": "evidence", "polic": "policies"}
            key = labels.get(entity_kw, entity_kw + "s")
            count = s.get(key, "?")
            return f"{key.title()}: {count}"
        except ApiError as e:
            return f"Could not fetch {entity_kw} count: {e}"

    # ── Intent: How many / total risks ───────────────────────────────────────
    if any(re.search(r'\b' + re.escape(kw) + r'\b', msg_lower) for kw in ["how many", "count", "total risk", "number of risk"]):
        try:
            data = api_get("/risks?limit=9999")
            items = data.get("data", [])
            if not items:
                return "No risks found in the database."
            total = len(items)
            high = sum(1 for r in items if severity_label(r.get("inherent_risk_score")) == "high")
            medium = sum(1 for r in items if severity_label(r.get("inherent_risk_score")) == "medium")
            low = sum(1 for r in items if severity_label(r.get("inherent_risk_score")) == "low")
            identified = sum(1 for r in items if (r.get("status") or "").lower() == "identified")
            analyzed = sum(1 for r in items if (r.get("status") or "").lower() == "analyzed")
            treated = sum(1 for r in items if (r.get("status") or "").lower() == "treated")
            monitored = sum(1 for r in items if (r.get("status") or "").lower() == "monitored")
            mitigated = sum(1 for r in items if (r.get("status") or "").lower() == "mitigated")
            open_s = sum(1 for r in items if (r.get("status") or "").lower() == "open")
            draft = sum(1 for r in items if (r.get("status") or "").lower() in ("draft", ""))
            other = total - identified - analyzed - treated - monitored - mitigated - open_s - draft
            parts = [f"  Total: {total}"]
            if high or medium or low: parts.append(f"  By severity: {high} high, {medium} medium, {low} low")
            parts.append(f"  By status: {identified} identified, {analyzed} analyzed, {treated} treated, {monitored} monitored, {mitigated} mitigated, {open_s} open, {draft} draft")
            if other: parts.append(f"  Other: {other}")
            return f"Risk Summary:\n" + "\n".join(parts)
        except ApiError as e:
            return f"Could not fetch risks: {e}"

    # ── Intent: Find risk by title ───────────────────────────────────────────
    # Matches: "find risk about X", "show risk for X", "risk ID for X", quoted titles
    title_match = re.search(r"""risk\s+(?:id\s+)?(?:for|about|titled?|named?|called?|"|"|')\s*['\"]?(.+?)(?:['\"]?\s*$|['\"]?\s*\?)""", msg_lower)
    if not title_match:
        title_match = re.search(r"""['\"](.+?)['\"]\s*(?:risk|mitigation)""", msg_lower)
    if not title_match:
        title_match = re.search(r"""(?:find|search|look\s*up|locate)\s+(?:the\s+)?risk\s+(?:about|for|titled?|named?|called?)?\s*(.+)""", msg_lower)
    if title_match and any(kw in msg_lower for kw in ["find", "search", "look", "title", "name", "which risk", "what risk", "risk id", "\"", "'"]):
        query = title_match.group(1).strip().strip('"').strip("'").strip('?')
        if len(query) < 3:
            return "Please provide more of the risk title to search for."
        try:
            data = api_get("/risks?limit=9999")
            items = data.get("data", [])
            # Score matches by word overlap
            query_words = set(query.lower().split())
            scored = []
            for r in items:
                title = (r.get("title") or "").lower()
                score = sum(1 for w in query_words if w in title)
                if score > 0:
                    scored.append((score, r))
            scored.sort(key=lambda x: -x[0])
            if not scored:
                return f"No risks matching '{query}' found."
            lines = [f"Risks matching '{query}' ({len(scored)} found):"]
            for score, r in scored[:20]:
                rid = r.get("id")
                status = r.get("status", "?")
                title = r.get("title", "Untitled")[:80]
                marker = "*" if score >= len(query_words) else ""
                lines.append(f"  {marker}#{rid} [{status}] {title}{marker}")
            if len(scored) > 20:
                lines.append(f"  ... and {len(scored) - 20} more")
            return "\n".join(lines)
        except ApiError as e:
            return f"Could not search risks: {e}"

    # ── Intent: List risks filtered by status ────────────────────────────────
    # Matches: "list of treated risks", "show analyzed risks", "all identified", etc.
    status_keywords = ["treated", "analyzed", "identified", "monitored", "draft", "open", "mitigated"]
    matched_status = None
    for sk in status_keywords:
        if re.search(r'\b' + sk + r'\b', msg_lower) and any(kw in msg_lower for kw in ["list", "show", "all", "get"]):
            matched_status = sk
            break
    if matched_status:
        try:
            data = api_get("/risks?limit=9999")
            items = data.get("data", [])
            target = matched_status
            filtered = [r for r in items if (r.get("status") or "").lower() == target]
            if target == "draft":
                filtered = [r for r in items if (r.get("status") or "").lower() in ("draft", "")]
            if not filtered:
                return f"No risks with status '{matched_status}' found."
            lines = [f"{matched_status.title()} risks ({len(filtered)}):"]
            for i, r in enumerate(filtered[:50], 1):
                score = r.get("inherent_risk_score")
                title = r.get("title", "Untitled")[:70]
                lines.append(f"  {i}. [{score or '?'}] {title}")
            if len(filtered) > 50:
                lines.append(f"  ... and {len(filtered) - 50} more")
            return "\n".join(lines)
        except ApiError as e:
            return f"Could not fetch risks: {e}"

    # ── Intent: List/show risks ──────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["list risk", "show risk", "top risk", "all risk", "risk list"]):
        # Skip if a numeric ID follows "risk" — let the "Show specific risk" handler take it
        if re.search(r"risk\s*\d+", msg_lower) and not any(kw in msg_lower for kw in ["list", "all", "top", "filter", "status", "treated", "analyzed", "draft", "identified"]):
            pass  # fall through to show-specific-risk handler
        else:
            try:
                limit = 20
                for num in re.findall(r"\d+", msg_lower):
                    limit = int(num)
                    break
                if "all" in msg_lower:
                    limit = 200
                data = api_get(f"/risks?limit={limit}")
                items = data.get("data", [])
                if not items:
                    return "No risks found."
                lines = [f"Risks ({len(items)} shown):"]
                for i, r in enumerate(items[:limit], 1):
                    score = r.get("inherent_risk_score")
                    sev = severity_label(score)
                    status = r.get("status", "?")
                    title = r.get("title", "Untitled")[:80]
                    marker = {"high": "🔴", "medium": "🟡", "low": "🟢", "unknown": "⚪"}.get(sev, "⚪")
                    lines.append(f"{marker} {i}. [{score or '?'}] {title} ({status})")
                return "\n".join(lines)
            except ApiError as e:
                return f"Could not fetch risks: {e}"

    # ── Intent: Add mitigation/treatment to a risk ───────────────────────────
    if any(kw in msg_lower for kw in ["mitigate", "mitigation", "treatment", "add treatment", "remediate"]) and not any(kw in msg_lower for kw in ["show", "list", "view", "get", "what treatment", "what mitigation"]):
        # Find the risk ID
        risk_id_match = re.search(r"risk\s*(?:id\s*)?[#:]?\s*(\d+)", msg_lower)
        if not risk_id_match:
            return "Please specify a risk ID. Example: 'add mitigation to risk #42'"
        risk_id = int(risk_id_match.group(1))

        # Extract strategy text — handle "risk N: text" and "by:" patterns
        strategy = ""
        # Pattern 1: "risk 61: do X, do Y, do Z"
        colon_match = re.search(r"risk\s*\d+\s*[:;]\s*(.+)", msg_lower)
        if colon_match:
            strategy = message[colon_match.start(1):].strip().strip('"').strip("'")[:500]
        if not strategy:
            for prefix in ["strategy:", "mitigation:", "plan:", "by:", "with:"]:
                idx = msg_lower.find(prefix)
                if idx >= 0:
                    raw = message[idx + len(prefix):].strip().strip('"').strip("'")
                    if raw:
                        strategy = raw[:500]
                        break
        if not strategy:
            strategy = "Implement access controls, enforce MFA, review security policies"

        # Split comma/semicolon-separated strategies into multiple treatments
        strategies = [s.strip() for s in re.split(r'[;,]\s*(?=(?:implement|deploy|enable|set up|run|enforce|rotate|create|develop|establish|configure|install|apply|conduct|update|migrate|encrypt|disable|restrict|monitor|audit|train|review|test|validate|document))', strategy, flags=re.IGNORECASE)
                      if len(s.strip()) > 10]
        if len(strategies) <= 1:
            strategies = [s.strip() for s in re.split(r'\s*[,;]\s+', strategy) if len(s.strip()) > 10]
        if not strategies:
            strategies = [strategy]

        client_id = 1
        try:
            created_ids = []
            for s in strategies:
                result = api_post("/treatments", {
                    "clientId": client_id,
                    "riskScenarioId": risk_id,
                    "treatmentType": "mitigate",
                    "strategy": s,
                })
                created_ids.append(str(result.get("data", {}).get("id", "?")))
            return (
                f"✅ {len(created_ids)} treatment(s) added to Risk #{risk_id}\n" +
                "\n".join(
                    f"  #{cid} — {s[:100]}" for cid, s in zip(created_ids, strategies)
                )
            )
        except ApiError as e:
            return f"Could not add treatment: {e}"

    # ── Intent: Show a specific risk by ID ────────────────────────────────────
    risk_id_match = re.search(r"risk\s*(?:id\s*)?[#:]?\s*(\d+)", msg_lower)
    if risk_id_match and any(kw in msg_lower for kw in ["risk", "show", "detail", "get"]) and not any(kw in msg_lower for kw in ["mitigate", "mitigation", "treatment", "add", "create", "update", "change", "mark", "set"]):
        risk_id = int(risk_id_match.group(1))
        try:
            data = api_get(f"/risks/{risk_id}")
            r = data.get("data", {})
            if not r:
                return f"Risk #{risk_id} not found."
            return (
                f"Risk #{r.get('id')}: {r.get('title', 'Untitled')}\n"
                f"  Status: {r.get('status', '?')}\n"
                f"  Inherent score: {r.get('inherent_risk_score', '?')}\n"
                f"  Likelihood: {r.get('likelihood', '?')}/5\n"
                f"  Impact: {r.get('impact', '?')}/5\n"
                f"  Category: {r.get('category', '?')}\n"
                f"  Owner: {r.get('owner', 'unassigned')}\n"
                f"  Description: {(r.get('description') or 'N/A')[:300]}"
            )
        except ApiError as e:
            return f"Could not fetch risk #{risk_id}: {e}"

    # ── Intent: Show frameworks ──────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["framework", "compliance framework"]):
        try:
            data = api_get("/frameworks")
            items = data.get("data", [])
            if not items:
                return "No frameworks found."
            lines = ["Frameworks:"]
            for fw in items:
                name = fw.get("framework", "?")
                total = fw.get("total_controls", 0)
                pr = fw.get("pass_rate", 0)
                lines.append(f"  {name}: {total} controls, pass rate {pr}%")
            return "\n".join(lines)
        except ApiError as e:
            return f"Could not fetch frameworks: {e}"

    # ── Intent: Show gaps ────────────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["gap", "missing evidence", "control gap"]):
        framework = None
        for fw_name in ["nis2", "dora", "gdpr", "iso 27001", "iso27001", "soc2", "soc 2"]:
            if fw_name in msg_lower:
                framework = fw_name
                break
        try:
            path = f"/gaps{'?framework=' + framework if framework else ''}"
            data = api_get(path)
            items = data.get("data", [])
            if not items:
                return f"No gaps found{' for ' + framework.upper() if framework else ''}."
            total = data.get("total", len(items))
            lines = [f"Gaps ({total}):"]
            for i, g in enumerate(items[:30], 1):
                name = g.get("name", g.get("control_id", "?"))[:60]
                fw = g.get("framework", "")
                lines.append(f"  {i}. [{fw}] {name}")
            if total > 30:
                lines.append(f"  ... and {total - 30} more")
            return "\n".join(lines)
        except ApiError as e:
            return f"Could not fetch gaps: {e}"

    # ── Intent: Show controls ────────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["control", "list control"]):
        framework = None
        for fw_name in ["nis2", "dora", "gdpr", "iso 27001", "iso27001", "soc2", "soc 2"]:
            if fw_name in msg_lower:
                framework = fw_name
                break
        try:
            path = f"/controls{'?framework=' + framework if framework else ''}"
            data = api_get(path)
            items = data.get("data", [])
            if not items:
                return f"No controls found{' for ' + framework.upper() if framework else ''}."
            total = len(items)
            lines = [f"Controls ({total}):"]
            for i, c in enumerate(items[:20], 1):
                cid = c.get("controlId", "?")
                name = c.get("name", "Untitled")[:60]
                lines.append(f"  {i}. {cid} — {name}")
            if total > 20:
                lines.append(f"  ... and {total - 20} more")
            return "\n".join(lines)
        except ApiError as e:
            return f"Could not fetch controls: {e}"

    # ── Intent: Evidence status ──────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["evidence", "expiring evidence", "expired evidence"]):
        params = ""
        if "expiring" in msg_lower or "expiring soon" in msg_lower:
            days = 7
            for num in re.findall(r"\d+", msg_lower):
                days = int(num)
                break
            params = f"?expiring_within={days}d"
        try:
            data = api_get(f"/evidence{params}")
            items = data.get("data", [])
            if not items:
                return "No evidence found."
            total = len(items)
            pending = sum(1 for e in items if (e.get("status") or "").lower() == "pending")
            collected = sum(1 for e in items if (e.get("status") or "").lower() == "collected")
            expired = sum(1 for e in items if (e.get("status") or "").lower() == "expired")
            lines = [f"Evidence ({total} total):"]
            if pending:
                lines.append(f"  Pending: {pending}")
            if collected:
                lines.append(f"  Collected: {collected}")
            if expired:
                lines.append(f"  Expired: {expired}")
            if params:
                lines.append(f"  Expiring within {days} days: shown above")
            # Show first 5 items
            for i, e in enumerate(items[:5], 1):
                desc = (e.get("description") or e.get("evidenceId") or "?")[:50]
                st = e.get("status", "?")
                lines.append(f"  {i}. [{st}] {desc}")
            if total > 5:
                lines.append(f"  ... and {total - 5} more")
            return "\n".join(lines)
        except ApiError as e:
            return f"Could not fetch evidence: {e}"

    # ── Intent: Readiness report ─────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["readiness report", "readiness", "report", "compliance report"]):
        framework = None
        for fw_name in ["nis2", "dora", "gdpr", "iso 27001", "iso27001", "soc2", "soc 2"]:
            if fw_name in msg_lower:
                framework = fw_name
                break
        try:
            from urllib.parse import quote
            path = f"/report{'?framework=' + quote(framework) if framework else ''}"
            data = api_get(path)
            return (
                f"Readiness Report{' for ' + data.get('framework', 'All').upper() if framework else ' (All Frameworks)'}:\n"
                f"  Total controls: {data.get('totalControls', 0)}\n"
                f"  Pass rate: {data.get('readinessScore', 0)}%\n"
                f"  Implementation:\n"
                f"    - Implemented: {data.get('implementation', {}).get('implemented', 0)}\n"
                f"    - In progress: {data.get('implementation', {}).get('inProgress', 0)}\n"
                f"    - Not implemented: {data.get('implementation', {}).get('notImplemented', 0)}\n"
                f"    - N/A: {data.get('implementation', {}).get('notApplicable', 0)}\n"
                f"  Evidence:\n"
                f"    - Total: {data.get('evidence', {}).get('total', 0)}\n"
                f"    - Verified: {data.get('evidence', {}).get('verified', 0)}\n"
                f"    - Pending: {data.get('evidence', {}).get('pending', 0)}\n"
                f"    - Expiring soon: {data.get('evidence', {}).get('expiringSoon', 0)}\n"
                f"  Gaps: {data.get('gaps', 0)}"
            )
        except ApiError as e:
            return f"Could not generate report: {e}"

    # ── Intent: Create a risk ────────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["create risk", "add risk", "new risk", "register risk"]):
        # Extract title and description from message
        title = "New risk"
        desc = ""
        # Try to extract after "title:" or after "create risk" etc
        for prefix in ["title:", "called:", "named:"]:
            idx = msg_lower.find(prefix)
            if idx >= 0:
                raw = message[idx + len(prefix):].strip().strip('"').strip("'")
                if raw:
                    title = raw[:200]
                    break
        if not title or title == "New risk":
            # Try to extract as the remainder after the intent keywords
            for kw in ["create risk", "add risk", "new risk", "register risk"]:
                idx = msg_lower.find(kw)
                if idx >= 0:
                    raw = message[idx + len(kw):].strip().strip('"').strip("'").strip(":")
                    if raw:
                        # Take text up to first period or end
                        end = raw.find(". ")
                        title = (raw[:end] if end > 0 else raw)[:200]
                        if end > 0:
                            desc = raw[end + 2:][:500]
                        break
        client_id = 1  # Default — most setups have client_id=1
        try:
            result = api_post("/risks", {
                "clientId": client_id,
                "title": title,
                "description": desc,
                "category": "General",
                "assessmentType": "asset",
            })
            created = result.get("data", {})
            return f"✅ Risk created: #{created.get('id')} — \"{created.get('title')}\""
        except ApiError as e:
            return f"Could not create risk: {e}"

    # ── Intent: Create evidence ──────────────────────────────────────────────
    if any(kw in msg_lower for kw in ["add evidence", "create evidence", "submit evidence", "upload evidence"]):
        return (
            "Creating evidence requires: clientId, clientControlId, evidenceId.\n"
            "Example: 'Add evidence for control #5 with status collected'\n"
            "Please specify which control the evidence belongs to."
        )

    # ── Intent: List clients/assets/vendors/policies ──────────────────────────
    for entity, label in [("client", "clients"), ("asset", "assets"), ("vendor", "vendors"), ("polic", "policies")]:
        if re.search(r'\b' + entity, msg_lower) and any(kw in msg_lower for kw in ["list", "show", "all", "get"]):
            if re.search(r'\d+', msg_lower) and not any(kw in msg_lower for kw in ["all", "list", "every"]):
                pass  # looks like ID lookup, skip to next handler
            else:
                try:
                    data = api_get(f"/{label}?limit=100")
                    items = data.get("data", [])
                    if not items:
                        return f"No {label} found."
                    lines = [f"{label.title()} ({len(items)}):"]
                    for i, r in enumerate(items[:30], 1):
                        name = r.get("name", r.get("title", "?"))
                        extra = r.get("status", r.get("type", r.get("category", ""))) or ""
                        lines.append(f"  {i}. {name}" + (f" [{extra}]" if extra else ""))
                    if len(items) > 30:
                        lines.append(f"  ... and {len(items) - 30} more")
                    return "\n".join(lines)
                except ApiError as e:
                    return f"Could not fetch {label}: {e}"

    # ── Intent: Show treatments for a risk ───────────────────────────────────
    if any(kw in msg_lower for kw in ["treatment", "mitigation"]) and any(kw in msg_lower for kw in ["show", "list", "what", "get", "view"]):
        risk_id_match = re.search(r"risk\s*(?:id\s*)?[#:]?\s*(\d+)", msg_lower)
        if risk_id_match:
            risk_id = int(risk_id_match.group(1))
            try:
                data = api_get(f"/treatments?riskScenarioId={risk_id}")
                items = data.get("data", [])
                if not items:
                    return f"No treatments found for risk #{risk_id}."
                lines = [f"Treatments for Risk #{risk_id} ({len(items)}):"]
                for i, t in enumerate(items, 1):
                    ttype = t.get("treatment_type", "?")
                    strategy = (t.get("strategy") or "No details")[:100]
                    lines.append(f"  {i}. [{ttype}] {strategy}")
                return "\n".join(lines)
            except ApiError as e:
                return f"Could not fetch treatments: {e}"

    # ── Intent: Update risk status ───────────────────────────────────────────
    if any(kw in msg_lower for kw in ["update risk", "change risk", "set risk", "mark risk", "change status"]):
        risk_id_match = re.search(r"risk\s*(?:id\s*)?[#:]?\s*(\d+)", msg_lower)
        if not risk_id_match:
            return "Please specify a risk ID. Example: 'mark risk #59 as analyzed'"
        risk_id = int(risk_id_match.group(1))
        # Find the target status
        new_status = None
        for st in ["identified", "analyzed", "treated", "monitored", "mitigated", "draft", "open"]:
            if re.search(r'\b' + st + r'\b', msg_lower):
                new_status = st
                break
        if not new_status:
            return "Please specify the new status. Example: 'mark risk 59 as treated'"
        try:
            result = api_post(f"/risks/{risk_id}", {"status": new_status}, method="PATCH")
            updated = result.get("data", {})
            return f"✅ Risk #{risk_id} status changed to '{new_status}'.\n  Title: {updated.get('title', '?')[:80]}"
        except ApiError as e:
            return f"Could not update risk: {e}"

    # ── Intent: Help / what can you do ───────────────────────────────────────
    if any(kw in msg_lower for kw in ["help", "what can you do", "commands", "capabilities"]):
        return (
            "I can query and manage your GRC database:\n\n"
            "  • \"How many risks?\" — risk summary with severity breakdown\n"
            "  • \"List risks\" — show top risks\n"
            "  • \"Show risk #5\" — details of a specific risk\n"
            "  • \"List controls\" — show controls (add framework: NIS2, DORA)\n"
            "  • \"Show gaps\" — controls missing evidence\n"
            "  • \"Show frameworks\" — compliance frameworks with pass rates\n"
            "  • \"Evidence status\" — current evidence collection state\n"
            "  • \"Readiness report\" — compliance readiness\n"
            "  • \"Add mitigation to risk #42 by: strategy text\" — add treatment\n"
            "  • \"Create risk titled: SQL Injection\" — create a new risk\n"
            "  • \"Health check\" — API connection status"
        )

    # ── Fallback: try DeepSeek LLM for analytical questions ──────────────────
    return call_llm(message, conversation_id=conversation_id)


# ── LLM Fallback ────────────────────────────────────────────────────────────────

def fetch_context_for_llm():
    """Fetch a compact snapshot of the GRC database for LLM context."""
    parts = []
    try:
        r = api_get("/health", timeout=5)
        parts.append(f"API: {r.get('status')}, DB: {'connected' if r.get('database',{}).get('connected') else 'disconnected'}")
    except Exception:
        parts.append("API: unreachable")

    # Full system summary (clients, assets, vendors, controls, etc.)
    try:
        s = api_get("/summary", timeout=10)
        parts.append(f"System: {s.get('clients','?')} clients, {s.get('assets','?')} assets, {s.get('vendors','?')} vendors, {s.get('controls','?')} controls across {s.get('frameworks','?')} frameworks, {s.get('evidence','?')} evidence records, {s.get('policies','?')} policies")
    except Exception:
        pass

    try:
        r = api_get("/risks?limit=9999", timeout=10)
        items = r.get("data", [])
        if items:
            high = sum(1 for x in items if severity_label(x.get("inherent_risk_score")) == "high")
            medium = sum(1 for x in items if severity_label(x.get("inherent_risk_score")) == "medium")
            low = sum(1 for x in items if severity_label(x.get("inherent_risk_score")) == "low")
            identified = sum(1 for x in items if (x.get("status") or "").lower() == "identified")
            analyzed = sum(1 for x in items if (x.get("status") or "").lower() == "analyzed")
            treated = sum(1 for x in items if (x.get("status") or "").lower() == "treated")
            monitored = sum(1 for x in items if (x.get("status") or "").lower() == "monitored")
            mitigated = sum(1 for x in items if (x.get("status") or "").lower() == "mitigated")
            open_s = sum(1 for x in items if (x.get("status") or "").lower() == "open")
            draft = sum(1 for x in items if (x.get("status") or "").lower() in ("draft", ""))
            parts.append(f"Risks: {len(items)} total — by status: {identified} identified, {analyzed} analyzed, {treated} treated, {monitored} monitored, {mitigated} mitigated, {open_s} open, {draft} draft. Severity: {high} high, {medium} med, {low} low.")
            # Include samples grouped by status for accurate answers
            by_status = {}
            for x in items:
                s = (x.get("status") or "draft").lower()
                by_status.setdefault(s, []).append({"id": x["id"], "title": x["title"][:60], "score": x.get("inherent_risk_score")})
            for st in ["identified", "analyzed", "treated", "monitored", "draft"]:
                if st in by_status:
                    parts.append(f"{st.title()} risks ({len(by_status[st])}): {json.dumps(by_status[st][:15])}")
    except Exception as e:
        parts.append(f"Risks: fetch failed ({e})")

    try:
        r = api_get("/frameworks", timeout=10)
        fws = r.get("data", [])
        parts.append(f"Frameworks: {json.dumps([{'name': f.get('framework'), 'pass_rate': f.get('pass_rate')} for f in fws])}")
    except Exception:
        pass

    try:
        r = api_get("/report", timeout=10)
        if r:
            parts.append(f"Readiness score: {r.get('readinessScore', '?')}%, gaps: {r.get('gaps', '?')}")
    except Exception:
        pass

    return "\n".join(parts)


def call_llm(message, conversation_id=None):
    """Function-calling loop: LLM calls GRCompliance API tools directly."""
    if not DEEPSEEK_KEY:
        return "LLM not configured."

    context = fetch_context_for_llm()
    messages = [
        {"role": "system", "content": (
            "You are a GRC compliance agent. You have tools to query and write to the GRCompliance API.\n"
            "Use the tools to get accurate data, then answer the user concisely.\n"
            "Available API endpoints: /health /summary /risks /risks/N /clients /assets /vendors\n"
            "/policies /frameworks /gaps /report /controls /evidence /treatments?riskScenarioId=N\n"
            "POST: /risks /treatments /evidence | PATCH: /risks/N (body: {status,owner})\n"
            f"Live system snapshot:\n{context}"
        )},
    ]

    # Add conversation history
    if conversation_id and conversation_id in CONVERSATIONS:
        for role, text in CONVERSATIONS[conversation_id][-16:]:
            messages.append({"role": "user" if role == "user" else "assistant", "content": text[:500]})

    messages.append({"role": "user", "content": message})

    # Define tools
    tools = [
        {"type": "function", "function": {
            "name": "query_api", "description": "GET data from the GRCompliance API",
            "parameters": {"type": "object", "properties": {
                "endpoint": {"type": "string", "description": "API path, e.g. /risks?limit=10 or /summary or /risks/52 or /treatments?riskScenarioId=61"},
            }, "required": ["endpoint"]}
        }},
        {"type": "function", "function": {
            "name": "write_api", "description": "POST or PATCH data to the GRCompliance API",
            "parameters": {"type": "object", "properties": {
                "method": {"type": "string", "enum": ["POST", "PATCH"]},
                "endpoint": {"type": "string", "description": "API path, e.g. /risks or /treatments or /risks/52"},
                "body": {"type": "object", "description": "JSON body to send"}
            }, "required": ["method", "endpoint", "body"]}
        }}
    ]

    # Function-calling loop (max 5 tool calls)
    for _ in range(5):
        payload = {"model": DEEPSEEK_MODEL, "messages": messages, "tools": tools, "max_tokens": 1024, "temperature": 0.3}
        try:
            req = urllib.request.Request("https://api.deepseek.com/v1/chat/completions",
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {DEEPSEEK_KEY}"})
            with urllib.request.urlopen(req, timeout=45) as r:
                result = json.loads(r.read())
        except Exception as e:
            return f"API error: {e}"

        choice = result["choices"][0]
        msg = choice["message"]

        # If no tool call, return the text answer
        if not msg.get("tool_calls"):
            return msg.get("content", "") or "(empty response)"

        # Execute tool calls
        # DeepSeek v4-pro requires reasoning_content to be passed back
        assistant_msg = {"role": msg["role"], "content": msg.get("content") or ""}
        if msg.get("reasoning_content"):
            assistant_msg["reasoning_content"] = msg.get("reasoning_content")
        if msg.get("tool_calls"):
            assistant_msg["tool_calls"] = msg["tool_calls"]
        messages.append(assistant_msg)
        for tc in msg["tool_calls"]:
            fn = tc["function"]
            args = json.loads(fn["arguments"])
            try:
                if fn["name"] == "query_api":
                    data = api_get(args["endpoint"], timeout=15)
                    result_text = json.dumps(data)[:2000]
                else:  # write_api
                    if args["method"] == "PATCH":
                        data = api_post(args["endpoint"], args["body"], method="PATCH")
                    else:
                        data = api_post(args["endpoint"], args["body"])
                    result_text = json.dumps(data)[:2000]
            except ApiError as e:
                result_text = f"API error: {e}"
            except Exception as e:
                result_text = f"Error: {e}"

            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result_text})

    return "I wasn't able to complete the analysis. Please try a more specific question."


# ── HTTP Handler ────────────────────────────────────────────────────────────────

class ChatHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "service": "compliance-agent-chat",
                "version": "2.0.0",
                "llm_configured": bool(DEEPSEEK_KEY),
                "api_url": API_URL,
            }).encode())
            return
        if parsed.path == "/" or parsed.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            with open("packages/compliance-agent/marketing.html", "rb") as f:
                self.wfile.write(f.read())
            return
        self.send_error(404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/chat":
            self.send_error(404)
            return

        # Check API key
        if API_KEY and self.headers.get("X-API-Key", "") != API_KEY:
            self.send_error(401, "Invalid API key")
            return

        try:
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            data = json.loads(body)
            msg = data.get("message", "").strip()
            if not msg:
                self.send_error(400, "Message required")
                return
            cid = data.get("conversation_id") or str(uuid.uuid4())

            # Restore conversation history
            if cid not in CONVERSATIONS:
                CONVERSATIONS[cid] = []
            CONVERSATIONS[cid].append(("user", msg))

            # Get the answer with context
            response = answer_question(msg, conversation_id=cid)

            # Store the response
            CONVERSATIONS[cid].append(("agent", response))
            if len(CONVERSATIONS[cid]) > 50:
                CONVERSATIONS[cid] = CONVERSATIONS[cid][-40:]  # keep last 20 exchanges

            # Stream as SSE
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()

            # Split into words for streaming
            words = response.split(" ")
            for i, w in enumerate(words):
                token = w + (" " if i < len(words) - 1 else "")
                self.wfile.write(
                    f"event: token\ndata: {json.dumps({'token': token})}\n\n".encode()
                )
                self.wfile.flush()

            # Done signal
            self.wfile.write(
                f"event: done\ndata: {json.dumps({'summary': response[:200], 'conversation_id': cid})}\n\n".encode()
            )
            self.wfile.flush()

        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, *a):
        pass


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    server = ThreadedHTTPServer((HOST, PORT), ChatHandler)
    print(f"[ChatServer] Compliance Agent v2 — listening on {HOST}:{PORT}")
    print(f"[ChatServer] API target: {API_URL}")
    print(f"[ChatServer] API key configured: {bool(API_KEY)}")
    print(f"[ChatServer] LLM fallback (DeepSeek): {'enabled' if DEEPSEEK_KEY else 'disabled'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ChatServer] Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
