#!/usr/bin/env python3
"""
CISOvault ↔ GRCompliance Sync Bridge
Bidirectional sync between CISOvault (security scanning) and GRCompliance (GRC).

Directions:
  1. CISOvault incidents → GRCompliance risks (uses domain→client mapping)
  2. CISOvault scan findings → GRCompliance risks
  3. CISOvault remediations → GRCompliance risk status updates
  4. GRCompliance mitigated risks → CISOvault incident state updates

Domain→Client Routing:
  Before creating risks, the bridge checks client_domain_mappings table.
  If the incident's target domain has a verified client mapping → uses that clientId
  If no mapping found → logs as unassigned (domains appear in holding pool)

Run: python3 sync-cisovault-grc.py
"""
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────────

CISOVAULT_URL = os.environ.get("CISOVAULT_URL", "http://localhost:3099")
GRC_API_URL = os.environ.get("GRC_API_URL", "http://[::1]:3005/api/v1")
GRC_API_KEY = os.environ.get("GRC_API_KEY", "test-api-key-for-local-dev")
DEFAULT_CLIENT_ID = int(os.environ.get("GRC_DEFAULT_CLIENT_ID", "1"))

# ── Helpers ────────────────────────────────────────────────────────────────


def grc_headers():
    return {
        "Content-Type": "application/json",
        "X-API-Key": GRC_API_KEY,
    }


def api_get(base_url, path, headers=None):
    url = f"{base_url}{path}"
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  [WARN] HTTP {e.code} GET {path}: {body}")
        return None
    except Exception as e:
        print(f"  [WARN] GET {path}: {e}")
        return None


def api_post(base_url, path, body, headers=None):
    url = f"{base_url}{path}"
    data = json.dumps(body).encode()
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  [WARN] HTTP {e.code} POST {path}: {e.read().decode()[:300]}")
        return None
    except Exception as e:
        print(f"  [WARN] POST {path}: {e}")
        return None


def api_patch(base_url, path, body, headers=None):
    url = f"{base_url}{path}"
    data = json.dumps(body).encode()
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  [WARN] HTTP {e.code} PATCH {path}: {e.read().decode()[:300]}")
        return None
    except Exception as e:
        print(f"  [WARN] PATCH {path}: {e}")
        return None


def make_risk_title(incident):
    return f"[CISOVault] {incident.get('title', 'Unknown finding')}"


def extract_domain(incident):
    """Extract target domain from incident metadata."""
    meta = incident.get("metadata", {}) or {}
    domain = meta.get("target_domain", "")
    if not domain:
        target = incident.get("target_url", "")
        if target:
            domain = target.replace("https://", "").replace("http://", "").split("/")[0]
    return domain.strip().lower()


# ── Domain → Client Resolution ─────────────────────────────────────────────


def fetch_domain_mappings():
    """Fetch verified domain→client mappings from GRCompliance."""
    result = api_get(GRC_API_URL, "/domain-mappings?status=verified", headers=grc_headers())
    if not result or "data" not in result:
        return {}
    mappings = {}
    for m in result["data"]:
        domain = m.get("domain", "").strip().lower()
        client_id = m.get("clientId")
        if domain and client_id:
            mappings[domain] = client_id
    return mappings


def fetch_unassigned_domains():
    """Fetch pending (unassigned) domain mappings for reporting."""
    result = api_get(GRC_API_URL, "/domain-mappings?status=pending", headers=grc_headers())
    if not result or "data" not in result:
        return []
    return [m.get("domain", "") for m in result["data"] if m.get("domain")]


# ── Sync 1: CISOvault Incidents → GRCompliance Risks ──────────────────────

def sync_incidents_to_grc():
    """Sync HIGH/CRITICAL open CISOvault incidents as new GRC risks.
    Uses domain→client mapping to route to the correct client.
    Unmapped domains are collected and reported as unassigned."""
    print("\n=== Sync: CISOvault Incidents → GRCompliance Risks ===")

    # 1. Fetch domain mappings
    domain_map = fetch_domain_mappings()
    print(f"  Verified domain mappings: {len(domain_map)}")

    # 2. Fetch existing GRC risk titles for dedup
    existing = api_get(GRC_API_URL, "/risks", headers=grc_headers())
    if not existing:
        print("  [ERROR] Cannot fetch GRCompliance risks")
        return
    existing_titles = set()
    if "data" in existing:
        for r in existing["data"]:
            existing_titles.add(r.get("title", ""))
    print(f"  GRC risks: {len(existing_titles)}")

    # 3. Open CISOvault incidents
    cv = api_get(CISOVAULT_URL, "/api/incidents?state=open")
    if not cv:
        print("  [ERROR] Cannot fetch CISOvault incidents")
        return
    incidents = cv.get("incidents", [])
    print(f"  CISOvault open incidents: {len(incidents)}")

    # 4. Sync new HIGH/CRITICAL with domain routing
    synced = 0
    skipped = 0
    unassigned = {}  # domain → count

    for inc in incidents:
        sev = inc.get("severity", "low").lower()
        if sev not in ("critical", "high"):
            skipped += 1
            continue
        title = make_risk_title(inc)
        if title in existing_titles:
            skipped += 1
            continue

        # Resolve client via domain mapping
        domain = extract_domain(inc)
        client_id = domain_map.get(domain)

        if client_id is None:
            # No mapping → collect as unassigned
            if domain:
                unassigned[domain] = unassigned.get(domain, 0) + 1
            else:
                unassigned["(no domain)"] = unassigned.get("(no domain)", 0) + 1
            skipped += 1
            continue

        desc = inc.get("description") or inc.get("title", "")
        rec = inc.get("recommendation", "")
        if rec:
            desc += f"\n\nRecommendation: {rec}"
        desc += f"\n\nSource: CISOvault (severity: {sev}, domain: {domain})"

        result = api_post(GRC_API_URL, "/risks", {
            "clientId": client_id,
            "title": title,
            "description": desc,
            "category": "Security",
            "assessmentType": "asset",
        }, headers=grc_headers())
        if result and "data" in result:
            synced += 1
            existing_titles.add(title)
            print(f"  ✓ Risk #{result['data']['id']}: {title[:70]} → client {client_id}")
        else:
            print(f"  ✗ Failed: {title[:70]}")

    # 5. Auto-create domain mappings for new domains
    for domain in unassigned:
        # Check if already in mappings table (pending or verified)
        check = api_get(GRC_API_URL, f"/domain-mappings", headers=grc_headers())
        existing_domains = set()
        if check and "data" in check:
            existing_domains = {m.get("domain", "").lower() for m in check["data"]}

        if domain not in existing_domains and domain != "(no domain)":
            api_post(GRC_API_URL, "/domain-mappings", {
                "domain": domain,
                "clientId": 0,
                "createdBy": "sync-bridge",
            }, headers=grc_headers())
            print(f"  🆕 Created pending mapping for domain: {domain}")

    print(f"  Summary: {synced} created, {skipped} skipped")
    if unassigned:
        print(f"\n  ⚠️  Unassigned domains (findings not routed):")
        for dom, cnt in sorted(unassigned.items(), key=lambda x: -x[1]):
            print(f"     {dom}: {cnt} findings")


# ── Sync 2: CISOvault Scan Findings → GRCompliance Risks ──────────────────

def sync_scans_to_grc():
    """Sync CISOvault completed scans with CRITICAL findings as GRC risks."""
    print("\n=== Sync: CISOvault Scans → GRCompliance Risks ===")

    # Fetch domain mappings
    domain_map = fetch_domain_mappings()

    scans = api_get(CISOVAULT_URL, "/api/scans")
    if not scans:
        print("  [ERROR] Cannot fetch CISOvault scans")
        return
    scan_list = scans.get("scans", [])
    completed = [s for s in scan_list if s.get("status") == "completed"][:20]

    existing = api_get(GRC_API_URL, "/risks", headers=grc_headers())
    if not existing or "data" not in existing:
        return
    existing_titles = {r.get("title", "") for r in existing["data"]}

    synced = 0
    unassigned = {}
    for s in completed:
        target = s.get("target_url", "unknown")
        report = s.get("report", "") or str(s.get("diffs", []))[:1000]
        crit = report.lower().count("critical")
        if crit == 0:
            continue

        # Extract domain from target URL
        domain = target.replace("https://", "").replace("http://", "").split("/")[0].strip().lower()
        client_id = domain_map.get(domain)

        if client_id is None:
            unassigned[domain] = unassigned.get(domain, 0) + 1
            continue

        title = f"[CISOVault] Scan Findings — {target}"
        if title in existing_titles:
            continue

        result = api_post(GRC_API_URL, "/risks", {
            "clientId": client_id,
            "title": title,
            "description": f"Scan for {target} found CRITICAL issues\n\n{report[:1500]}",
            "category": "Security",
            "assessmentType": "asset",
        }, headers=grc_headers())
        if result and "data" in result:
            existing_titles.add(title)
            synced += 1
            print(f"  ✓ Risk #{result['data']['id']} from scan: {target[:40]} → client {client_id}")

    print(f"  Summary: {synced} scan risks created")
    if unassigned:
        print(f"  ⚠️  Unassigned scan targets:")
        for dom, cnt in sorted(unassigned.items(), key=lambda x: -x[1]):
            print(f"     {dom}: {cnt} scans")


# ── Sync 3: CISOvault Remediated → GRCompliance Status Update ─────────────

def sync_remediated_to_grc():
    """Mark GRC risks as 'monitored' when CISOvault incident is remediated."""
    print("\n=== Sync: CISOvault Remediated → GRC Status Update ===")

    remediated = api_get(CISOVAULT_URL, "/api/incidents?state=remediated")
    if not remediated:
        return
    r_incidents = remediated.get("incidents", [])
    print(f"  CISOvault remediated incidents: {len(r_incidents)}")

    existing = api_get(GRC_API_URL, "/risks", headers=grc_headers())
    if not existing or "data" not in existing:
        return

    updated = 0
    title_lookup = {r.get("title"): r for r in existing["data"]}
    for inc in r_incidents:
        title = make_risk_title(inc)
        match = title_lookup.get(title)
        if match and match.get("status") not in ("monitored", "mitigated"):
            api_patch(GRC_API_URL, f"/risks/{match['id']}",
                      {"status": "monitored", "owner": "cisovault-sync"},
                      headers=grc_headers())
            updated += 1
            print(f"  ✓ Risk #{match['id']} → monitored")

    print(f"  Summary: {updated} risks updated")


# ── Sync 4: GRCompliance Mitigated → CISOvault Remediation ────────────────

def sync_grc_to_cisovault():
    """When a GRC risk is mitigated/monitored, mark CISOvault as remediated."""
    print("\n=== Sync: GRC Mitigated → CISOvault Remediation ===")

    existing = api_get(GRC_API_URL, "/risks", headers=grc_headers())
    if not existing or "data" not in existing:
        return

    cv = api_get(CISOVAULT_URL, "/api/incidents")
    if not cv:
        return

    inc_by_title = {}
    for inc in cv.get("incidents", []):
        inc_by_title[inc.get("title", "")] = inc

    updated = 0
    for r in existing["data"]:
        title = r.get("title", "")
        if not title.startswith("[CISOVault]"):
            continue
        if r.get("status") not in ("monitored", "mitigated"):
            continue
        inc_title_stub = title[12:]

        for orig_title, inc in inc_by_title.items():
            if (inc_title_stub in orig_title or orig_title in inc_title_stub) \
               and inc.get("state") != "remediated":
                result = api_patch(CISOVAULT_URL, f"/api/incidents/{inc['id']}",
                                   {"state": "remediated"})
                if result:
                    updated += 1
                    print(f"  ✓ CISOvault #{inc['id'][:8]} → remediated")
                break

    print(f"  Summary: {updated} CISOvault incidents remediated")


# ── Unassigned Domains Report ──────────────────────────────────────────────

def report_unassigned():
    """Report pending domain mappings that need client assignment."""
    print("\n=== Unassigned Domain Report ===")
    unassigned = fetch_unassigned_domains()
    if not unassigned:
        print("  ✅ No unassigned domains. All domains have verified client mappings.")
        return

    print(f"  ⚠️  {len(unassigned)} domains need client assignment:")
    for dom in sorted(unassigned):
        print(f"     {dom}")
    print(f"\n  To assign: PATCH /api/v1/domain-mappings/<id>")
    print(f"    Body: {{\"clientId\": <client_id>, \"status\": \"verified\"}}")
    print(f"  Or ask Hermes: \"Show me unassigned domains\"")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    ts = datetime.now(timezone.utc).isoformat()
    print(f"╔═══ CISOvault ↔ GRCompliance Sync Bridge ═══╗")
    print(f"  Started: {ts}")
    print(f"  CISOvault: {CISOVAULT_URL}")
    print(f"  GRCompliance: {GRC_API_URL}")
    print(f"  Default client: {DEFAULT_CLIENT_ID}")

    sync_incidents_to_grc()
    sync_scans_to_grc()
    sync_remediated_to_grc()
    sync_grc_to_cisovault()
    report_unassigned()

    print(f"\n╚═══ Sync complete: {datetime.now(timezone.utc).isoformat()} ═══╝")


if __name__ == "__main__":
    main()
