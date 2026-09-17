# CISVault API Reference

Container: `complianceos-cisovault-1`, port 3099, service name `cisovault`.
FastAPI app (uvicorn). OpenAPI schema at `GET /openapi.json`.

**Note on Windows**: Host-to-container HTTP returns "Empty reply from server." Route all calls through `docker exec` from within Docker network.

## Health

```
GET /health → {"status":"ok","service":"cisovault-backend","version":"0.2.0"}
```

## Key Endpoints for GRC Sync

### Scans
```
GET /api/scans              → List all scans (includes report, findings, diffs)
GET /api/scan/{scan_id}/report  → Single scan report
```

### Incidents
```
GET /api/incidents              → List all incidents
GET /api/incidents/{id}         → Single incident
PATCH /api/incidents/{id}       → Update state
```

### Domain Recon
```
GET /api/scan/domain-recon/{session_id}/report  → Full recon report
GET /api/scan/domain-recon/{session_id}/export/docx  → Word export
GET /api/scan/domain-recon/{session_id}/export/pdf   → PDF export
```

### Engagements (pentests)
```
GET /api/engagements                    → List engagements
GET /api/engagements/{id}/findings      → Findings for engagement
POST /api/engagements/{id}/report       → Generate report
```

### Reports
```
GET /api/reports          → All reports (scans + incidents)
GET /api/reports/{id}     → Single report
GET /api/report/generate  → Generate new report
```

## Finding Severities

CISVault uses: `critical`, `high`, `medium`, `low`, `info`.

Scan findings are embedded in the scan report under `diffs` (array of probe results) and also auto-created as incidents for HIGH/MEDIUM findings. Each incident carries:
- `title`, `severity`, `state` (`open`|`remediated`|`acknowledged`)
- `source` (`agent`|`manual`)
- `recommendation` (remediation steps)
- `project_id`

## Query Examples

```bash
# Latest completed scan
docker exec complianceos-cisovault-1 curl -s http://localhost:3099/api/scans | python3 -c "
import sys,json
scans = json.load(sys.stdin)['scans']
completed = [s for s in scans if s['status']=='completed']
print(completed[0]['report'][:5000] if completed else 'no completed scans')
"

# Open HIGH/CRITICAL incidents
docker exec complianceos-cisovault-1 curl -s http://localhost:3099/api/incidents | python3 -c "
import sys,json
incs = json.load(sys.stdin)['incidents']
for i in incs:
    if i['state']=='open' and i['severity'] in ('high','critical'):
        print(f\"{i['severity']:8s} | {i['title'][:80]}\")
"
```
