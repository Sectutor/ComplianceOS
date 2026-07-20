# Agent Security Best Practices Guide

**Classification:** PUBLIC — COMPLIANCE KNOWLEDGE BASE  
**Version:** 2.1.0  
**Date:** July 20, 2026  
**Prepared by:** ComplianceOS Advisory Services  

---

## 1. Introduction

This guide is maintained by ComplianceOS as a practitioner-level reference for engineering teams deploying AI agents and LLM applications in regulated environments. It synthesizes security guidance from 6 international governance frameworks into actionable operational practices.

**Audience:** Security engineers, DevOps engineers, GRC practitioners, and CISOs deploying AI agents.

**Framework Coverage:**
- OWASP LLM Top 10 (2025)
- OWASP Agentic Security Index (ASI 1-10)
- EU AI Act Chapter III High-Risk Requirements (Art.8-72)
- NIST AI RMF 1.0 (GOVERN/MAP/MEASURE/MANAGE)
- Microsoft AI Governance (PyRIT, Azure Defender, Content Safety)
- NVIDIA Infrastructure (NIM, OpenShell, Morpheus)

---

## 2. Architecture Patterns

### 2.1 Trust Boundaries

Every AI agent deployment has three trust boundaries that must be explicitly defined:

**Boundary 1: User ↔ Agent**
- All user inputs are untrusted until validated
- Output must be sanitized before rendering in browsers/shells/applications
- Session isolation must prevent cross-user data leakage

**Boundary 2: Agent ↔ Tools/Plugins**
- Tool calls must be schema-validated before execution
- Tool outputs must be treated as untrusted data (not instructions)
- Plugin installation must be verified via signature + SBOM + CVE scan

**Boundary 3: Agent ↔ External APIs**
- All outbound network must be explicit allowlist (default deny)
- Responses from external APIs must be sanitized
- Cloud metadata endpoints must be blocked (anti-SSRF)

### 2.2 Secure Deployment Patterns

**Pattern A: Air-Gapped Agent (Highest Security)**
- No outbound network (`network_mode: none`)
- Model runs locally (on-prem GPU cluster or local LLM)
- All inputs/outputs go through on-prem DLP scanner
- Suitable for: classified environments, financial trading, healthcare

**Pattern B: Sandboxed Cloud Agent (Production Standard)**
- Agent runs in read-only Docker container with no network
- API calls routed through corporate proxy with allowlist
- All outputs logged to SIEM with immutable audit trail
- Suitable for: enterprise SaaS, customer support, internal tools

**Pattern C: Hardened Cloud Agent (Balanced)**
- Agent has limited outbound access (specific API endpoints only)
- All tool calls require manual approval (HITL mode)
- Container sandbox with resource limits and cap_drop ALL
- Suitable for: startups, prototyping, low-risk use cases

**Do NOT use:**
- Direct host execution (no sandbox)
- Root inside container
- Default network (bridge) without allowlist
- Manual approval disabled in production

### 2.3 Decision Tree: Which Controls Apply?

```
Is your agent autonomous (self-directing goals)?
├── YES → Apply OWASP ASI controls (ASI01-ASI10)
│   └── Does it have tool access?
│       ├── YES → Apply HITL, command blocklist, sandbox controls
│       └── NO → Apply output controls + DoS protection
└── NO → Apply OWASP LLM controls (LLM01-LLM10)
    └── Does it have tool access?
        ├── YES → Apply output sanitization + tool validation
        └── NO → Apply input scanning + output encoding

Do you operate in the EU?
├── YES → Apply EU AI Act Art.8-72 (high-risk requirements)
└── NO → Apply NIST AI RMF (GOV-1 through MGMT-4)

Do you use cloud providers?
├── AWS → Apply AWS ISM + cloud metadata blocking
├── Azure → Apply Azure AI Defender + Content Safety
├── GCP → Apply Vertex AI Safety + Chronicle
└──multi-cloud → Apply all cloud-specific controls

Do you use NVIDIA infrastructure?
├── YES → Apply NVIDIA NIM + OpenShell + Morpheus controls
└── NO → Skip NVIDIA-specific controls
```

---

## 3. Deployment Hardening

### 3.1 Container Security

**Minimal viable Dockerfile for agent runtime:**
```dockerfile
FROM python:3.11.9-slim-bookworm@sha256:abc123...

# Create non-root user
RUN groupadd -g 1001 sandbox_group && \
    useradd -u 1001 -g sandbox_group -s /bin/false sandbox_runner

# Install dependencies as root, then drop privileges
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Verify SBOM
RUN pip install pip-audit && pip-audit --strict

# Switch to non-root
USER 1001:1001
WORKDIR /workspace/sandbox

# Read-only root filesystem requires entrypoint to handle /tmp
ENTRYPOINT ["python3", "-m", "hermes.agent"]
```

**Security checklist for container builds:**
- [ ] Use pinned base image with SHA256 digest
- [ ] Create and use non-root user (UID 1001+)
- [ ] Drop ALL capabilities before adding back minimal
- [ ] Set `no-new-privileges:true` security_opt
- [ ] Mount root filesystem as read-only
- [ ] Set resource limits (CPU, memory, PIDs, file size)
- [ ] Disable swap (memory_swap = memory)
- [ ] Auto-remove container after session
- [ ] Scan image with Trivy/Grype before deployment
- [ ] Verify SBOM included and signed

### 3.2 Network Security

**Default-deny network policy (Kubernetes):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hermes-agent-deny-all
  namespace: hermes-sandbox
spec:
  podSelector:
    matchLabels:
      app: hermes-agent
  policyTypes:
    - Ingress
    - Egress
  # No ingress or egress rules = deny all
```

**Allowlist specific endpoints:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hermes-agent-allowlist
spec:
  podSelector:
    matchLabels:
      app: hermes-agent
  policyTypes:
    - Egress
  egress:
    - to:  # Allow DNS
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:  # Allow HTTPS to API endpoints
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 169.254.0.0/16  # Block cloud metadata
              - 10.0.0.0/8       # Block internal networks
              - 172.16.0.0/12    # Block internal networks
              - 192.168.0.0/16   # Block internal networks
      ports:
        - protocol: TCP
          port: 443
```

---

## 4. Runtime Monitoring

### 4.1 Metrics to Track

| Metric | Type | Alert Threshold | Framework |
|--------|------|-----------------|-----------|
| Compliance score | Gauge | Drop by 5+ points | All |
| Gap count | Gauge | > 10 gaps | All |
| Injection attempts blocked | Counter | Any in 5 min | LLM01, ASI01 |
| Commands blocked | Counter | > 10 in 5 min | LLM08, ASI03 |
| Secret detections | Counter | Any | LLM06, ASI07 |
| Session hijack attempts | Counter | Any | ASI02, ASI04 |
| Rate limit exceeded | Counter | > 5 in 5 min | LLM04, ASI09 |
| Model API errors | Counter | > 5% error rate | NIST MEAS-4 |
| Container escape attempts | Counter | Any | ASI05 |

### 4.2 Prometheus Alerting Rules

```yaml
groups:
  - name: hermes_security_alerts
    rules:
      - alert: PromptInjectionAttack
        expr: rate(hermes_injection_blocked_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Prompt injection attack detected"
          description: "Blocked {{ $value }} injection attempts per second"

      - alert: SecretLeakDetected
        expr: rate(hermes_secret_detections_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Secret leak detected in agent output"

      - alert: ComplianceScoreDrop
        expr: hermes_compliance_score < 80
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Compliance score dropped below 80%"

      - alert: HighGapCount
        expr: hermes_gap_count > 10
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "More than 10 compliance gaps detected"
```

### 4.3 Grafana Dashboard Panels

1. **Compliance Score Trend** — Line chart, daily granularity, 90-day window
2. **Gaps Over Time** — Stacked bar chart, color-coded by severity
3. **Injection Attempts** — Heatmap by hour-of-day and day-of-week
4. **Command Blocks** — Top blocked commands (pie chart)
5. **Secret Detections** — Table with timestamp, type, and action taken
6. **Active Sessions** — Gauge showing current active vs max concurrent
7. **Model Usage** — Token consumption per model, per day
8. **Container Resource Usage** — CPU, memory, PIDs utilization vs limits

---

## 5. Incident Response

### 5.1 Incident Categories

| Category | Description | Initial Response | Escalation |
|----------|-------------|------------------|------------|
| **INJ-01** | Prompt injection attempt detected | Block input, alert, log | If repeated → Level 1 |
| **SEC-01** | Secret leak in agent output | Block output, redact, alert | Always Level 1 |
| **CMD-01** | Dangerous command blocked | Block command, log | If spike → Level 1 |
| **SES-01** | Session hijack attempt | Isolate session, kill session | Always Level 1 |
| **NET-01** | Unauthorized network request | Block request, log | If repeated → Level 1 |
| **MOD-01** | Model API failure | Switch to fallback model | If > 5 min → Level 2 |
| **DOS-01** | Rate limit triggered | Throttle, queue | If sustained → Level 1 |
| **SUP-01** | Malicious skill detected | Block installation, quarantine | Always Level 1 |

### 5.2 Incident Response Runbook

**Immediate Actions (First 5 minutes):**

1. **Contain:** Isolate affected session, block malicious input
2. **Assess:** Determine blast radius (single user, all users, infrastructure)
3. **Alert:** Notify oncall via Slack/PagerDuty
4. **Preserve:** Capture logs, session state, request/response pairs
5. **Record:** Create incident ticket with timestamp and initial assessment

**Investigation (First 30 minutes):**

1. **Replay:** Replay the attack in sandbox environment
2. **Identify:** Determine which control blocked/failed to block
3. **Correlate:** Check if related indicators exist in other sessions
4. **Attribute:** Classify attack type (external attacker, insider, automated)
5. **Document:** Update incident timeline with findings

**Resolution (First 4 hours):**

1. **Remediate:** Apply configuration fix or deploy patch
2. **Verify:** Re-attack with same payload to confirm fix
3. **Monitor:** Increase monitoring sensitivity for 48 hours
4. **Update:** Update incident ticket with resolution details
5. **Notify:** Inform affected users if data may have been exposed

**Post-Incident (Within 72 hours):**

1. **Review:** Conduct blameless post-incident review
2. **Improve:** Update controls to prevent recurrence
3. **Train:** Update runbook with new patterns discovered
4. **Report:** Generate executive summary for security leadership
5. **Archive:** Store all evidence per retention policy (365 days)

---

## 6. Supply Chain Security

### 6.1 Skill/Plugin Approval Process

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Skill Source   │────▶│  Automated Scan  │────▶│  Security Review │
│  (GitHub, NPM)  │     │  (Trivy/Grype)  │     │  (Human)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  CVE Found?     │     │  Code Review    │
                        │  (HIGH/CRIT?)   │     │  (Manual)       │
                        └─────────────────┘     └─────────────────┘
                               │                        │
                    ┌─────YES──┴──NO─────┐            │
                    ▼                    ▼            ▼
              ┌───────────┐      ┌───────────┐  ┌───────────┐
              │  REJECT   │      │  APPROVE  │  │  APPROVE  │
              │  (Auto)   │      │  (Auto)   │  │  (Human)  │
              └───────────┘      └───────────┘  └───────────┘
```

### 6.2 SBOM Verification Checklist

- [ ] SBOM format is SPDX-JSON or CycloneDX-JSON
- [ ] All direct dependencies listed
- [ ] All transitive dependencies listed
- [ ] License identifiers included (SPDX IDs)
- [ ] Checksums/hashes provided for each component
- [ ] No dependencies with known CRITICAL CVEs
- [ ] No dependencies with known HIGH CVEs older than 90 days
- [ ] No dependencies with copyleft licenses (GPL, AGPL) if proprietary
- [ ] SBOM signed by publisher's GPG key
- [ ] SBOM timestamp is recent (< 90 days)

---

## 7. Compliance Mapping

### 7.1 OWASP LLM Top 10 → Controls

| OWASP ID | Vulnerability | Primary Control | Config Reference |
|----------|---------------|-----------------|------------------|
| LLM01 | Prompt Injection | Input scanning + system prompt protection | context.scan_inputs, context.protect_first_system |
| LLM02 | Insecure Output Handling | HTML sanitization + DLP + URL validation | output.sanitize_html, output.dlp |
| LLM03 | Training Data Poisoning | SBOM verification + signature check | skills.sbom, skills.signatures |
| LLM04 | Model Denial of Service | Rate limiting + resource limits | rate_limiting, terminal.docker.memory |
| LLM05 | Supply Chain Vulnerabilities | Pre-install scan + SBOM + signatures | skills.pre_install_scan |
| LLM06 | Sensitive Information Disclosure | Masking + DLP + output scanning | env.mask, output.dlp |
| LLM07 | Insecure Plugin/Tool Design | Schema validation + sandbox execution | skills.plugin_validation |
| LLM08 | Excessive Agency | Manual approval + command blocklist | approvals.mode, commands.deny |
| LLM09 | Overreliance | Output encoding + citation verification | output.sanitize_html |
| LLM10 | Model Theft | Model pinning + auth + access control | model.primary.pin_version |

### 7.2 OWASP ASI → Controls

| ASI ID | Vulnerability | Primary Control | Config Reference |
|--------|---------------|-----------------|------------------|
| ASI01 | Prompt Injection | Input scanning + signatures | context.scan_inputs, context.injection_signatures |
| ASI02 | Broken Authentication | Session isolation + idle timeout | sessions.isolation, sessions.idle_timeout |
| ASI03 | Tool Misuse | Command blocklist + approval | commands.deny, approvals.mode |
| ASI04 | Broken Access Control | Path restrictions + allowlist | folders.allowed_paths, folders.blocked_paths |
| ASI05 | Code Execution | Container sandbox + cap_drop | terminal.docker.security_opt, cap_drop |
| ASI06 | Supply Chain | Pre-install scan + SBOM | skills.pre_install_scan, skills.sbom |
| ASI07 | Data Leakage | Masking + DLP | env.mask, output.dlp |
| ASI08 | Context Poisoning | No history persistence + protect system prompt | sessions.history.persist, context.protect_first_system |
| ASI09 | Availability | Rate limiting + resource limits | rate_limiting, terminal.docker.memory |
| ASI10 | Autonomy Risks | Manual HITL + escalation | approvals.mode, approvals.escalation |

### 7.3 EU AI Act Articles → Controls

| Article | Requirement | Primary Control | Config Reference |
|---------|-------------|-----------------|------------------|
| Art.6-7 | Risk Classification | Agent scope definition | agent.scope.risk_level |
| Art.8 | High-Risk Compliance | Governance metadata | compliance.eu_ai_act |
| Art.9 | Risk Management System | Risk register + review schedule | compliance.risk_register |
| Art.10 | Data Governance | PII detection + DLP | pii_detection, output.dlp |
| Art.11 | Technical Documentation | Documentation generation | compliance.declarations |
| Art.12 | Record-Keeping | Immutable audit logging | logging.immutable |
| Art.13 | Transparency | System prompt hardening + disclaimers | context.system_prompt_hardening |
| Art.14 | Human Oversight | Manual HITL approval | approvals.mode |
| Art.15 | Accuracy + Cybersecurity | Container hardening + injection defense | terminal.docker, context.scan_inputs |
| Art.16 | Conformity Assessment | Assessment report generation | compliance.declarations |
| Art.17 | Quality Management | Continuous monitoring | continuous_monitoring |
| Art.72 | Post-Market Monitoring | Reassessment + drift detection | continuous_monitoring.reassessment |

### 7.4 NIST AI RMF → Controls

| Function | Subcategory | Primary Control |
|----------|-------------|-----------------|
| GOVERN-1 | Policies for AI risk management | Agent scope definition |
| GOVERN-2 | Accountability and roles | Roles and responsibilities |
| GOVERN-3 | Workforce AI risk training | Documentation + runbooks |
| GOVERN-4 | AI risk in enterprise risk management | Risk register |
| GOVERN-5 | Data collection policies | PII detection + masking |
| GOVERN-6 | Accountability structures | Accountable officer |
| MAP-1 | System context documented | Agent scope definition |
| MAP-2 | Risk impacts identified | Gap assessment |
| MAP-3 | Trustworthiness characteristics mapped | Framework mapping |
| MAP-4 | Risk likelihood assessed | Risk scoring |
| MAP-5 | Risk prioritization | Remediation priority matrix |
| MAP-6 | System boundaries defined | Agent scope out_of_scope |
| MEAS-1 | Risk metrics | Prometheus dashboards |
| MEAS-2 | Trustworthiness testing | Red teaming schedule |
| MEAS-3 | Security testing | Penetration testing |
| MEAS-4 | Monitoring and review | Continuous monitoring |
| MEAS-5 | Feedback mechanisms | Post-incident reviews |
| MEAS-6 | Impact evaluation | Post-market monitoring |
| MEAS-7 | Outcomes tracked | Audit logging |
| MGMT-1 | Risk response plans | Incident response |
| MGMT-2 | Mitigation outcomes monitored | Drift detection |
| MGMT-3 | Incident procedures | Response runbooks |
| MGMT-4 | Continuous improvement | Regulatory update monitoring |

---

## 8. Security Training for AI Agent Teams

### 8.1 Role-Based Curriculum

**For Security Engineers:**
- LLM attack surface mapping (16 hours)
- Prompt injection detection and evasion (8 hours)
- Container hardening for AI workloads (8 hours)
- Supply chain security for AI (4 hours)

**For DevOps Engineers:**
- Secure Docker/Kubernetes for AI agents (16 hours)
- Immutable logging and monitoring (8 hours)
- Rate limiting and DoS protection (4 hours)
- Incident response for AI systems (8 hours)

**For Developers:**
- Secure prompt engineering (8 hours)
- Input validation and output encoding (8 hours)
- Plugin development security (4 hours)
- Framework-specific hardening (4 hours)

**For CISOs/GRC:**
- AI regulatory landscape (EU AI Act, NIST) (8 hours)
- AI risk management frameworks (4 hours)
- AI incident response planning (4 hours)
- AI vendor risk assessment (4 hours)

### 8.2 Recommended Certifications

| Certification | Provider | Relevance | Level |
|---------------|----------|-----------|-------|
| Certificate of Cloud Security Knowledge (CCSK) | CSA | Cloud security + AI | Foundation |
| Certified Information Systems Security Professional (CISSP) | ISC2 | Security leadership | Advanced |
| Certified Cloud Professional (CCP) | CCA | Cloud-native AI | Intermediate |
| AWS Certified Security – Specialty | AWS | AWS agent deployments | Intermediate |
| Microsoft Certified: Azure Security Engineer | Azure | Azure AI security | Intermediate |
| NVIDIA DLI: AI Security | NVIDIA | NVIDIA infrastructure | Intermediate |

---

## 9. AI Agent Threat Model

### 9.1 STRIDE for AI Agents

| Threat Category | AI Agent Example | Mitigation |
|-----------------|------------------|------------|
| **Spoofing** | Attacker impersonates legitimate user | MFA, session binding, behavior analysis |
| **Tampering** | Attacker modifies agent config via injection | Immutable config, audit logging |
| **Repudiation** | Agent user denies sending prompt | Immutable audit trail with user attribution |
| **Information Disclosure** | Secret leak in output | Masking + DLP + output scanning |
| **Denial of Service** | Token exhaustion attack | Rate limits + resource limits |
| **Elevation of Privilege** | Container escape | cap_drop ALL + security_opt + namespaces |

### 9.2 Attack Trees

**Tree 1: Achieve Remote Code Execution via Agent**
```
Goal: Execute arbitrary code on host
├── Via tool misuse
│   ├── Trick agent into running shell commands
│   │   ├── Direct prompt injection ──▶ context.injection_signatures
│   │   ├── Indirect injection (via document) ──▶ context.scan_inputs
│   │   └── Multi-turn gradual escalation ──▶ behavioral_detection
│   └── Exploit command blocklist bypass
│       ├── Encoding (base64) ──▶ Deep inspection needed
│       ├── Obfuscation ──▶ Regex + behavioral detection
│       └── Novel technique ──▶ Scanner model update
├── Via supply chain
│   ├── Install malicious skill ──▶ skills.pre_install_scan
│   ├── Install malicious dependency ──▶ skills.sbom + signatures
│   └── Exploit vulnerable dependency ──▶ CVE scanning + auto-patch
└── Via container escape
    ├── Kernel exploit ──▶ Read-only root + cap_drop ALL
    ├── Docker socket mount ──▶ Volume restrictions
    └── Privileged escalation ──▶ security_opt: no-new-privileges
```

---

## 10. Regulatory Update Monitoring

### 10.1 Key Regulatory Bodies to Monitor

| Body | Jurisdiction | Relevance | Update Frequency |
|------|--------------|-----------|------------------|
| European Commission | EU | EU AI Act implementation, guidelines | Quarterly |
| ENISA | EU | AI cybersecurity certification | Biannually |
| NIST | US | AI RMF updates, AI standards | Annually |
| CISA | US | AI security advisories, alerts | As needed |
| ICO | UK | AI GDPR enforcement guidance | As needed |
|Secretary for DPC | Ireland | EU AI Act enforcement (Big Tech HQ) | As needed |
| ANSI | US | AI standards coordination | Biannually |
| ISO/IEC | International | ISO/IEC 42001 (AI management) | Biannually |

### 10.2 Regulatory Decision Framework

```
New regulation/standard published
        │
        ├── Does it change assessment requirements?
        │   ├── YES → Update checklist + standard.js
        │   │        Update mapping rows in auditor.js
        │   │        Regenerate reports
        │   │        Score impact assessment
        │   │
        │   └── NO → Log for awareness only
        │
        ├── Does it change technical controls?
        │   ├── YES → Update hardened_config.yaml
        │   │        Update best practices guide
        │   │        Schedule customer notification (30 days)
        │   │
        │   └── NO → No action required
        │
        └── Does it change reporting obligations?
            ├── YES → Update report templates
            │        Update executive summary
            │        Notify enterprise customers
            │
            └── NO → No action required
```

---

## 11. Glossary

| Term | Definition |
|------|------------|
| Agentic AI | AI systems capable of autonomous goal-directed behavior |
| AIMS | Artificial Intelligence Management System (ISO 42001) |
| Allowlist | Explicit list of approved items (opposite of blocklist) |
| Capability (Linux) | Fine-grained privilege divisions (e.g., NET_BIND_SERVICE, SYS_PTRACE) |
| CVE | Common Vulnerabilities and Exposures |
| Cyclonedx | SBOM format specification |
| DLP | Data Loss Prevention |
| HITL | Human-in-the-Loop |
| LLM | Large Language Model |
| MTTR | Mean Time to Remediate |
| NIM | NVIDIA Inference Microservice |
| OWASP | Open Web Application Security Project |
| PII | Personally Identifiable Information |
| RACI | Responsible, Accountable, Consulted, Informed |
| RMF | Risk Management Framework (NIST) |
| SBOM | Software Bill of Materials |
| SPDX | Software Package Data Exchange (SBOM format) |
| SSRF | Server-Side Request Forgery |
| STRIDE | Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation |
| Trivy | Open-source vulnerability scanner (Aqua Security) |
| XSS | Cross-Site Scripting |

---

## 12. References

### Standards and Frameworks
- OWASP LLM Top 10 (2025) — https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP Agentic Security Index (2024) — https://owasp.org/www-project-llm-verification-standard/
- EU AI Act (2024) — https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- NIST AI RMF 1.0 (2023) — https://www.niso.org/standards/ai-rmf
- ISO/IEC 42001:2023 — https://www.iso.org/standard/81230.html

### Tools and Scanners
- Trivy (Aqua Security) — https://trivy.dev/
- Grype (Anchore) — https://github.com/anchore/grype
- LlamaGuard (Meta) — https://github.com/meta-llama/PurpleLlama
- ShieldGemma (Google) — https://github.com/google/shieldgemma
- PyRIT (Microsoft) — https://github.com/Azure/PyRIT
- NeMo Guardrails (NVIDIA) — https://github.com/NVIDIA/NeMo-Guardrails

### Documentation
- ComplianceOS Hardened Config (v2.1.0) — https://grcompliance.com/docs
- ComplianceOS Security Checklist — https://grcompliance.com/checklist
- Docker Security Best Practices — https://docs.docker.com/engine/security/
- Kubernetes Security Best Practices — https://kubernetes.io/docs/concepts/security/

---

**Report Prepared By:** ComplianceOS Advisory Services  
**Version:** 2.1.0  
**Last Updated:** July 20, 2026  
**Next Review:** January 20, 2027  

---

*© 2026 ComplianceOS. This document is provided for informational purposes. Organizations should consult with qualified legal and security professionals for specific compliance obligations.*
