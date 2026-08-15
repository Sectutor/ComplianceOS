# Case Study 7 Implementation: CyberShield IR — Responding to a Breach

> **Workflow:** Incident Response
> **Industry:** Technology / Cybersecurity
> **Company Size:** 50 employees
> **Timeline:** 48 hours (active incident) + 2 weeks (post-incident)
> **Client ID:** 7 (PayFlow Technologies)
> **Date Implemented:** 2026-08-15

---

## Overview

This implementation follows the CyberShield Security case study tutorial to respond to a security incident in ComplianceOS. CyberShield detects unauthorized access to their development environment at 2 AM when an attacker exploited a misconfigured S3 bucket containing API keys.

---

## Implementation Summary

| Step | Description | Status | Items Created |
|---|---|---|---|
| 1 | Preparation (IRP Setup) | ✅ Documented | IRP Document |
| 2 | Detection and Analysis | ✅ Documented | Incident Record |
| 3 | Containment | ✅ Documented | Containment Actions |
| 4 | Eradication and Recovery | ✅ Documented | Recovery Actions |
| 5 | Post-Incident Review | ✅ Documented | Lessons Learned |
| 6 | Customer Notification | ✅ Documented | Notifications |

---

## Step 1: Preparation (Before an Incident)

### Incident Response Plan (IRP)

| Role | Person | Responsibilities |
|---|---|---|
| Incident Commander | CISO | Overall coordination, decision authority |
| Technical Lead | Senior Engineer | Technical investigation, containment |
| Communications Lead | CEO/COO | Internal and external communications |
| Legal Counsel | External law firm | Regulatory obligations, liability |
| Scribe | On-call engineer | Timeline documentation, evidence collection |

### Severity Levels

| Level | Description | Example | Response Time |
|---|---|---|---|
| Critical | Active breach, data exfiltration | Ransomware, data breach | Immediate |
| High | Confirmed compromise, no data loss yet | Unauthorized access | 1 hour |
| Medium | Suspicious activity, investigation needed | Phishing attempt | 4 hours |
| Low | Minor security event | Failed login spike | 24 hours |

### Escalation Path
- On-call engineer → Technical Lead → Incident Commander → CEO
- Auto-escalate if no response in 15 minutes

---

## Step 2: Detection and Analysis

### Incident Details

| Field | Value |
|---|---|
| Title | Unauthorized S3 bucket access — API keys exposed |
| Severity | Critical |
| Detected At | 2026-08-15 02:15 UTC |
| Detected By | Automated alert (CloudTrail) |
| Description | Unusual API access pattern detected. S3 bucket containing API keys accessed from unknown IP. Possible data exposure. |
| Affected Assets | S3 bucket "cyberflare-dev-config", API keys for payment processing |

### Auto-Notifications
- Technical Lead (SMS + email)
- Incident Commander (SMS + email)
- CEO (email — escalation if no response in 15 min)

### Technical Investigation Findings
- Attacker accessed S3 bucket from IP 185.220.101.x (known malicious)
- 3 files downloaded: API keys, database credentials, encryption keys
- Keys were used: 2 fraudulent transactions detected ($4,200 total)
- Scope: Development environment only (production not affected)

---

## Step 3: Containment

### Short-Term Containment Actions

| Time | Action | Performed By | Result |
|---|---|---|---|
| 02:30 | Rotated payment API keys | Engineer | Keys rotated, attacker access revoked |
| 02:35 | Rotated database credentials | Engineer | Credentials rotated |
| 02:40 | Rotated encryption keys | Engineer | Keys rotated |
| 02:45 | Blocked attacker IP | Engineer | IP blocked at WAF |
| 02:50 | Made S3 bucket private | Engineer | Public access removed |

### Long-Term Containment Actions

| Time | Action | Performed By | Result |
|---|---|---|---|
| 03:00 | Audited all S3 buckets | Technical Lead | 2 other misconfigurations found |
| 03:15 | Reviewed IAM policies | Technical Lead | 3 over-privileged roles identified |
| 03:30 | Enabled S3 access logging | Engineer | Logging enabled |
| 03:45 | Enabled MFA delete | Engineer | MFA delete enabled |

### Containment Verification
- Attacker can no longer access systems ✅
- Exposed credentials are no longer valid ✅
- No further suspicious activity ✅
- **Incident Status: Contained**

---

## Step 4: Eradication and Recovery

### Eradication Actions

| Time | Action | Result |
|---|---|---|
| 04:00 | Implemented S3 bucket policy (deny public) | All buckets now private by default |
| 04:30 | Deployed automated S3 scanner | Scans run hourly, alerts on misconfigurations |
| 05:00 | Audited all IAM users | No attacker-created accounts found |
| 05:30 | Verified system integrity | No backdoors or persistence found |

### Recovery Actions

| Time | Action | Result |
|---|---|---|
| 06:00 | Monitored for 1 hour | No suspicious activity detected |
| 07:00 | Declared systems clean | Recovery phase complete |

**Incident Status: Recovered**

---

## Step 5: Post-Incident Review

### Timeline Reconstruction

| Time | Event |
|---|---|
| 01:30 | Attacker scans for open S3 buckets |
| 01:45 | Attacker finds misconfigured bucket |
| 02:00 | Attacker downloads API keys file |
| 02:15 | CloudTrail alert triggers |
| 02:18 | On-call engineer acknowledges alert |
| 02:22 | Engineer begins investigation |
| 02:30 | Containment begins (key rotation) |
| 03:45 | Containment complete |
| 04:00 | Eradication begins |
| 07:00 | Recovery complete |
| 07:30 | Incident declared resolved |

### Lessons Learned

| What Went Well | What Went Wrong | Improvement |
|---|---|---|
| Alerting worked (15 min detection) | No IRP existed | Create and maintain IRP |
| Engineer responded quickly | Engineer didn't know escalation path | Document and train on escalation |
| Containment was effective | S3 bucket was misconfigured | Implement automated scanning |
| Key rotation stopped attacker | No MFA delete on bucket | Enable MFA delete everywhere |

### Action Items

| Action Item | Owner | Deadline |
|---|---|---|
| Create formal IRP | CISO | 2 weeks |
| Train all engineers on IRP | CISO | 4 weeks |
| Implement automated S3 scanning | DevOps | 1 week |
| Enable MFA delete on all buckets | DevOps | 1 week |
| Conduct tabletop exercise | CISO | 4 weeks |
| Update incident response playbooks | Technical Lead | 2 weeks |

### Incident Metrics

| Metric | Value |
|---|---|
| Mean Time to Detect (MTTD) | 15 minutes |
| Mean Time to Respond (MTTR) | 12 minutes |
| Mean Time to Contain (MTTC) | 15 minutes |
| Total Incident Duration | 6 hours |

---

## Step 6: Customer Notification

### Notification Requirements

| Regulation | Timeline | Status |
|---|---|---|
| GDPR | 72 hours to supervisory authority | Within 48 hours ✅ |
| State laws | 30-60 days to affected individuals | Within 48 hours ✅ |
| Contractual | Per customer contract | Within 48 hours ✅ |

### Notifications Sent

| Audience | Method | Timeline | Status |
|---|---|---|---|
| Supervisory authority | Email to DPA | Within 48 hours | ✅ Sent |
| Affected customers (12) | Email + status page update | Within 48 hours | ✅ Sent |
| Internal all-hands | Slack + email | Within 24 hours | ✅ Sent |
| Cyber insurance carrier | Email + phone | Within 24 hours | ✅ Sent |

---

## Expected Outcome

After completing this tutorial, you'll have:

- ✅ Incident contained within 45 minutes of detection
- ✅ All attacker access revoked and verified
- ✅ Zero data exfiltrated (confirmed via forensic analysis)
- ✅ Root cause fixed (S3 bucket policy + automated scanning)
- ✅ GDPR notifications sent within 48 hours (under 72-hour requirement)
- ✅ Post-incident review completed with 6 action items
- ✅ Customer churn: 0% (transparent communication preserved trust)

---

## Notes

**Community Edition Limitations:**
- Full incident response workflow requires premium edition
- This case study documents the process and would be implemented with premium features
- The incident response process can be tracked manually using the audit log and activity tracking features

---

## Related Documentation

- [Incident Response Workflow](/start-here) — Start Here page
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — Vendor breach response
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — Continuity during incidents
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Risk-based incident priorities
