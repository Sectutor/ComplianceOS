#!/usr/bin/env python3
"""
CISOvault → GRCompliance Bridge
Polls CISOvault for new HIGH/CRITICAL findings and creates risks + evidence in GRCompliance.

Run as a cron job: */30 * * * * python3 cisovault-to-grc.py

Requires env vars:
  CISOVAULT_API_URL=http://cisovault:3099
  CISOVAULT_API_KEY=xxx
  COMPLIANCE_API_URL=http://complianceos:3002/api/v1
  COMPLIANCE_API_KEY=xxx
"""

import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timedelta

CISOVAULT_API = os.environ.get("CISOVAULT_API_URL", "")
CISOVAULT_KEY = os.environ.get("CISOVAULT_API_KEY", "")
GRC_API = os.environ.get("COMPLIANCE_API_URL", "http://complianceos:3002/api/v1")
GRC_KEY = os.environ.get("COMPLIANCE_API_KEY", "")
SINCE_HOURS = int(os.environ.get("CISOVAULT_SINCE_HOURS", "24"))

def json_req(url: str, headers: dict, data: bytes | None = None) -> dict | list:
    """Make an HTTP JSON request with error handling."""
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return {}
    except urllib.error.URLError as e:
        print(f"  Connection error: {e.reason}")
        return {}

def fetch_findings() -> list:
    """Fetch recent HIGH/CRITICAL findings from CISOvault."""
    if not CISOVAULT_API or not CISOVAULT_KEY:
        print("[Bridge] CISOvault not configured — skipping")
        return []
    
    since = (datetime.utcnow() - timedelta(hours=SINCE_HOURS)).isoformat()
    url = f"{CISOVAULT_API.rstrip('/')}/api/scans?severity=high,critical&since={since}"
    
    headers = {
        "Authorization": f"Bearer {CISOVAULT_KEY}",
        "Accept": "application/json",
    }
    
    result = json_req(url, headers)
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        return result.get("data", result.get("findings", result.get("results", [])))
    return []

def create_grc_risk(finding: dict) -> bool:
    """Create a risk in GRCompliance for a CISOvault finding."""
    payload = json.dumps({
        "clientId": 1,  # default tenant
        "title": f"[CISOvault] {finding.get('title', finding.get('name', 'Unknown finding'))}",
        "description": finding.get("description", ""),
        "category": "Security",
        "assessmentType": "scenario",
    }).encode()
    
    headers = {
        "X-API-Key": GRC_KEY,
        "Content-Type": "application/json",
    }
    
    result = json_req(f"{GRC_API}/risks", headers, payload)
    created = result.get("data", result)
    risk_id = created.get("id") if isinstance(created, dict) else None
    
    if risk_id:
        print(f"  ✅ Created risk #{risk_id}: {finding.get('title', 'Unknown')}")
        return True
    else:
        print(f"  ⚠️ Failed to create risk: {finding.get('title', 'Unknown')}")
        return False

def main():
    print(f"╔══════════════════════════════════════════════╗")
    print(f"║  CISOvault → GRCompliance Bridge            ║")
    print(f"╚══════════════════════════════════════════════╝")
    print(f"CISOvault: {CISOVAULT_API or 'not configured'}")
    print(f"GRC API:   {GRC_API}")
    print(f"Since:     {SINCE_HOURS}h ago")
    print()
    
    findings = fetch_findings()
    print(f"Found {len(findings)} new HIGH/CRITICAL findings")
    
    created = 0
    for finding in findings:
        if create_grc_risk(finding):
            created += 1
    
    print(f"\nDone. Created {created}/{len(findings)} risks in GRCompliance.")
    
    # Output JSON for agent consumption
    result = {"fetched": len(findings), "created": created}
    print(f"\n---RESULT:{json.dumps(result)}")

if __name__ == "__main__":
    main()
