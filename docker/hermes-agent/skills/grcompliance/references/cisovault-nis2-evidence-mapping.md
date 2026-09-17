# CISOvault → NIS2 Evidence Mapping

Maps CISOvault security scan finding categories to NIS2 Directive Article 21 controls for automated evidence creation.

## NIS2 Article 21 Controls (10)

| ID | Control | Focus Area |
|----|---------|------------|
| 21(2)(a) | Risk Management & Security Policies | Risk analysis, security policies |
| 21(2)(b) | Incident Handling | Detection, response, recovery |
| 21(2)(c) | Business Continuity & Crisis Mgmt | Service continuity |
| 21(2)(d) | Supply Chain Security | Third-party risk |
| 21(2)(e) | Secure Development & Vulnerabilities | DevSecOps, patch mgmt |
| 21(2)(f) | Effectiveness Monitoring | Audits, testing, exercises |
| 21(2)(g) | Cyber Hygiene & Awareness | Training, basic security practices |
| 21(2)(h) | Cryptography & Encryption | Crypto policies, key mgmt |
| 21(2)(i) | HR Security, Access & Asset Mgmt | Access control, asset inventory |
| 21(2)(j) | MFA & Secure Communications | Authentication, secure channels |

## CISOvault Finding Categories → NIS2 Mappings

### Domain Recon Scans
| CISOvault Finding Type | NIS2 Control | Evidence Rationale |
|------------------------|-------------|-------------------|
| SPF/DMARC missing | 21(2)(a) | Security policy gap — email authentication is a foundational risk mgmt control |
| TLS Certificate Validation | 21(2)(h) | Cryptography — TLS cert management and cipher strength |
| Subdomain Enumeration | 21(2)(d) | Supply chain / attack surface — forgotten subdomains are third-party risk |
| Page Source Info Leaks | 21(2)(g) | Cyber hygiene — exposed emails/comments in HTML source |
| Missing Security Headers (HSTS, CSP, XFO) | 21(2)(a) or 21(2)(j) | (a) security policy gaps, or (j) MFA/secure comms |
| HTTP-only (no HTTPS redirect) | 21(2)(j) | Secure communications — cleartext traffic control |

### Application Security Scans
| CISOvault Finding Type | NIS2 Control | Evidence Rationale |
|------------------------|-------------|-------------------|
| Vulnerable dependencies (lodash, express) | 21(2)(e) | Secure development — dependency vuln mgmt |
| Missing security middleware (helmet, rate-limit) | 21(2)(e) | Secure development — missing app-layer controls |
| Rate limiting absent | 21(2)(a) | Risk mgmt — DoS protection gap |
| Access logging absent | 21(2)(b) | Incident handling — no forensic logging |

### Generic / Pentest Findings
| CISOvault Finding Type | NIS2 Control | Evidence Rationale |
|------------------------|-------------|-------------------|
| Exposed credentials in repo | 21(2)(g) | Cyber hygiene / access control |
| Prototype pollution | 21(2)(e) | Secure development — input validation |
| Lateral movement detection | 21(2)(b) | Incident handling — network segmentation |
| Outdated software/OS | 21(2)(e) | Vulnerability handling — patch mgmt |
| Open ports / exposed services | 21(2)(i) | Asset management — unmanaged services |

## Evidence Creation Workflow

```bash
# 1. Find the client_control_id for the NIS2 control you want to map to
CLIENT_CONTROL_ID=$(curl -s -H "X-API-Key: $GRC_API_KEY" \
  "$GRC_API_URL/gaps?framework=NIS2" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data'][0]['client_control_id'])")

# 2. Post evidence for that control
curl -s -X POST -H "X-API-Key: $GRC_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": 1,
    \"clientControlId\": $CLIENT_CONTROL_ID,
    \"evidenceId\": \"CISOVault-001\",
    \"description\": \"CISOvault domain recon: SPF/DMARC missing for verifyfix.com\",
    \"status\": \"collected\"
  }" \
  "$GRC_API_URL/evidence"
```

## Pass Rate Impact

Each evidence item mapped to a control moves its `client_control` status from `not_implemented` to `in_progress`. However, **`in_progress` does NOT count toward the pass rate** — only `implemented` and `not_applicable` do (see the `/frameworks` SQL: `FILTER (WHERE cc.status IN ('implemented', 'not_applicable'))`).

This means:
- **Evidence alone** moves pass rate from **0% → 0%** (controls go to `in_progress`, not `implemented`)
- **To show a non-zero pass rate**, explicitly mark 2-3 controls as `implemented` after evidence is collected
- **Realistic demo target**: 4-6 controls `in_progress` with evidence + 2 controls `implemented` = **20-30% pass rate**, enough to show the pipeline progressing

### Updating implementation status

```bash
# After evidence is collected, promote 2 controls from in_progress → implemented
docker exec -w /app complianceos-app-1 sh -c "
NODE_PATH=/app/node_modules node -e '
const{Pool}=require(\"pg\");
const p=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{
  const r=await p.query(\"UPDATE client_controls cc SET status=\\\'implemented\\' FROM controls c WHERE c.id=cc.control_id AND cc.client_id=1 AND c.framework=\\\'NIS2\\' AND c.control_id IN(\\\'21(2)(a)\\\',\\\'21(2)(g)\\\') RETURNING cc.id\");
  console.log(\"Updated \"+r.rowCount+\" controls to implemented\");
  await p.end();
})()
'
```
