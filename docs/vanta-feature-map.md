# Vanta Feature Map — Target State for GRCompliance

Reference document: what Vanta offers vs what GRCompliance has today.
Each section = one improvement target for the daily pipeline.

---

## 1. Automated Evidence Collection

**Vanta:** 200+ integrations (AWS, GCP, Azure, GitHub, Okta, GSuite, Slack, etc.)
Auto-collects evidence every 24h. No manual screenshots.

**GRCompliance:** CISOvault integration (Nuclei/Nmap/Trivy scans). No SaaS integration framework yet.

**Δ Gap:** Missing integration framework for cloud providers, identity providers, code hosts.

---

## 2. Continuous Control Monitoring

**Vanta:** Controls tested automatically on schedule. Control health visible real-time.

**GRCompliance:** Static control framework with manual evidence upload. No auto-testing.

**Δ Gap:** No scheduled control execution engine. No auto-pass/fail per control.

---

## 3. Risk Management

**Vanta:** Risk register, heat map, treatment plans, residual risk tracking, scenario analysis.

**GRCompliance:** Risks exist (POST /risks). Phase 2 activator adds heat map + treatments.

**Δ Gap:** Phase 2 needs activation. Residual risk workflow needs enhancement.

---

## 4. Policy Management

**Vanta:** Policy templates, versioning, review reminders, employee acknowledgment.

**GRCompliance:** 13 policy templates (GET /policy-templates). Policy CRUD exists.

**Δ Gap:** Review scheduling exists (policyReviewScheduler). Need employee ack workflow.

---

## 5. Vendor Risk Management / TPRM

**Vanta:** Vendor risk assessments, questionnaires, vendor library, continuous monitoring.

**GRCompliance:** Vendor records exist (GET /vendors). No questionnaire/assessment workflow.

**Δ Gap:** No TPRM module. No vendor assessment automation.

---

## 6. Questionnaires & Surveys

**Vanta:** Pre-built SOC 2, ISO 27001, CAIQ, SIG questionnaires. Auto-scoring.

**GRCompliance:** None.

**Δ Gap:** Zero questionnaire capability. Needed for TPRM and audit prep.

---

## 7. Access Review Automation

**Vanta:** Auto-provisioned access reviews, reminders, certification workflow.

**GRCompliance:** None.

**Δ Gap:** No access review module.

---

## 8. Trust Center

**Vanta:** Public-facing security posture page. Share compliance status with customers.

**GRCompliance:** None.

**Δ Gap:** No customer-facing trust portal.

---

## 9. Audit Management

**Vanta:** Audit evidence packages, auditor direct access, request management.

**GRCompliance:** Board report export (PDF). Phase 2 activator mentions audit trail.

**Δ Gap:** No structured audit workflow. No auditor portal.

---

## 10. AI-Powered Compliance

**Vanta AI:** Auto-map controls, suggest evidence, draft policies, summarize gaps.

**GRCompliance:** Hermes Agent (DeepSeek) via chat widget. API-first agent (compliance-agent). No structured AI compliance features.

**Δ Gap:** AI capability exists but not productized as compliance automation features.

---

## 11. Framework Coverage

**Vanta:** SOC 2, ISO 27001, HIPAA, PCI DSS, GDPR, NIST CSF, FedRAMP, SOX, etc.

**GRCompliance:** NIS2 ✅, DORA ✅, GDPR ✅, ISO 27001:2022 ✅, NIST CSF ✅. Custom framework builder ✅.

**Δ Gap:** Close parity. More frameworks needed (SOC 2, PCI DSS, HIPAA, SOX).

---

## 12. Real-Time Dashboard

**Vanta:** Compliance score, control pass rate, evidence coverage, risk trends, drill-down.

**GRCompliance:** GET /summary. GET /report?framework=X. No real-time unified dashboard.

**Δ Gap:** No real-time compliance dashboard with drill-down.

---

## 13. Integrations & API

**Vanta:** REST API, 200+ pre-built integrations, webhook events, SSO/SAML.

**GRCompliance:** REST API ✅ (api-v1.ts). No integration marketplace. SSO is skip for now.

**Δ Gap:** Need integration framework + webhook system for auto-evidence.

---

## 14. Evidence Expiration & Renewal

**Vanta:** Evidence expiry tracking, auto-remediation, renewal reminders.

**GRCompliance:** evidenceExpirationScheduler exists ✅. Need auto-remediation.

**Δ Gap:** Scheduler exists but no auto-remediation workflow.

---

## Framework Mapping Summary

| Feature | Vanta | GRCompliance | Priority |
|---------|-------|-------------|----------|
| Evidence collection | 200+ auto-integrations | Manual + CISOvault only | **P0** |
| Control monitoring | Auto-testing on schedule | Static manual | **P0** |
| Risk heat map | Full visual matrix | Phase 2 (not activated) | **P1** |
| Treatment plans | Full workflow | Phase 2 (not activated) | **P1** |
| Policy ack | Employee sign-off | No | **P1** |
| TPRM/Questionnaires | Full module | No | **P2** |
| Access reviews | Automated | No | **P2** |
| Trust center | Customer portal | No | **P2** |
| Audit management | Auditor portal | Basic export only | **P2** |
| AI features | Vanta AI | Basic chat agent | **P3** |
| Frameworks | 20+ | 5 + custom builder | **P1** |
| Real-time dashboard | Yes | Basic API | **P1** |
| Integration mktplace | 200+ | 0 | **P2** |
| Evidence auto-renewal | Yes | Scheduler only | **P1** |
| Webhook system | Yes | No | **P2** |
