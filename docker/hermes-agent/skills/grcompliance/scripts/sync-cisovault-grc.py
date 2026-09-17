#!/usr/bin/env python3
"""
CISOvault ↔ GRCompliance Sync Bridge
Bidirectional sync between CISOvault (security scanning) and GRCompliance (GRC).

Directions:
  1. CISOvault incidents → GRCompliance risks (new open HIGH/CRITICAL findings)
  2. CISOvault remediations → GRCompliance risk status updates
  3. GRCompliance mitigated risks → CISOvault incident state updates

Usage:
  python3 sync-cisovault-grc.py
  # Set env: CISOVAULT_URL, GRC_API_URL, GRC_API_KEY, GRC_DEFAULT_CLIENT_ID
"""

import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone

CISOVAULT_URL  = os.environ.get("CISOVAULT_URL", "http://localhost:3099")
GRC_API_URL    = os.environ.get("GRC_API_URL", "http://localhost:3005/api/v1")
GRC_API_KEY    = os.environ.get("GRC_API_KEY", "test-api-key-for-local-dev")
DEFAULT_CLIENT = int(os.environ.get("GRC_DEFAULT_CLIENT_ID", "1"))


def _headers():
    return {"Content-Type": "application/json", "X-API-Key": GRC_API_KEY}


def _req(method, base, path, body=None):
    url = f"{base}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=_headers(), method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  [WARN] {method} {path}: {e.code} {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"  [WARN] {method} {path}: {e}")
        return None


def _title(inc):
    return f"[CISOVault] {inc.get('title', 'Unknown finding')}"


def sync_incidents_to_grc():
    """CISOvault open HIGH/CRITICAL incidents → GRCompliance risks."""
    print("\n=== Incidents → Risks ===")
    existing = _req("GET", GRC_API_URL, "/risks?limit=9999") or {}
    titles = {r.get("title", "") for r in existing.get("data", [])}
    print(f"  Existing GRC risks: {len(titles)}")

    cv = _req("GET", CISOVAULT_URL, "/api/incidents?state=open") or {}
    incidents = cv.get("incidents", [])
    print(f"  CISOvault open incidents: {len(incidents)}")

    synced, skipped = 0, 0
    for inc in incidents:
        sev = inc.get("severity", "low").lower()
        if sev not in ("critical", "high"):
            skipped += 1
            continue
        t = _title(inc)
        if t in titles:
            skipped += 1
            continue

        desc = inc.get("description") or inc.get("title", "")
        rec = inc.get("recommendation", "")
        if rec:
            desc += f"\n\nRecommendation: {rec}"
        desc += f"\n\nSource: CISOvault (severity: {sev})"

        r = _req("POST", GRC_API_URL, "/risks", {
            "clientId": DEFAULT_CLIENT, "title": t,
            "description": desc, "category": "Security", "assessmentType": "asset",
        })
        if r and "data" in r:
            rid = r["data"]["id"]
            _req("PATCH", GRC_API_URL, f"/risks/{rid}",
                 {"status": "identified", "owner": "cisovault-sync"})
            titles.add(t)
            synced += 1
            print(f"  ✓ Risk #{rid}: {t[:70]}")
        else:
            print(f"  ✗ Failed: {t[:70]}")
    print(f"  Summary: {synced} created, {skipped} skipped")


def sync_remediated_to_grc():
    """CISOvault remediated incidents → GRC risk status 'monitored'."""
    print("\n=== Remediated → Status Update ===")
    cv = _req("GET", CISOVAULT_URL, "/api/incidents?state=remediated") or {}
    incs = cv.get("incidents", [])
    existing = _req("GET", GRC_API_URL, "/risks?limit=9999") or {}
    if "data" not in existing:
        return

    updated = 0
    for inc in incs:
        t = _title(inc)
        for r in existing["data"]:
            if r.get("title") == t and r.get("status") not in ("monitored", "mitigated"):
                _req("PATCH", GRC_API_URL, f"/risks/{r['id']}",
                     {"status": "monitored", "owner": "cisovault-sync"})
                updated += 1
                print(f"  ✓ Risk #{r['id']} → monitored: {t[:60]}")
                break
    print(f"  Summary: {updated} risks updated")


def sync_grc_to_cisovault():
    """GRC mitigated risks → CISOvault incident remediated."""
    print("\n=== GRC Mitigated → CISOvault Remediation ===")
    existing = _req("GET", GRC_API_URL, "/risks?limit=9999") or {}
    cv = _req("GET", CISOVAULT_URL, "/api/incidents") or {}
    if "data" not in existing:
        return

    inc_by_title = {i.get("title", ""): i for i in cv.get("incidents", [])}
    updated = 0
    for r in existing["data"]:
        title = r.get("title", "")
        if not title.startswith("[CISOVault]"):
            continue
        if r.get("status") not in ("monitored", "mitigated"):
            continue
        inc_title = title[12:]
        for orig, inc in inc_by_title.items():
            if (inc_title in orig or orig in inc_title) and \
               inc.get("state") != "remediated":
                if _req("PATCH", CISOVAULT_URL, f"/api/incidents/{inc['id']}",
                        {"state": "remediated"}):
                    updated += 1
                    print(f"  ✓ CISOvault #{inc['id'][:8]} → remediated")
                break
    print(f"  Summary: {updated} CISOvault incidents remediated")


def main():
    ts = datetime.now(timezone.utc).isoformat()
    print(f"CISOvault ↔ GRCompliance Sync | {ts}")
    print(f"  CISOvault: {CISOVAULT_URL}  |  GRC: {GRC_API_URL}")
    sync_incidents_to_grc()
    sync_remediated_to_grc()
    sync_grc_to_cisovault()
    print(f"Sync complete | {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    main()
