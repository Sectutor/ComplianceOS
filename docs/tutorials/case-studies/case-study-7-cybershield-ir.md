# Case Study Tutorial: CyberShield Security — Responding to a Breach

> **Workflow:** Incident Response
> **Industry:** Technology / Cybersecurity
> **Company Size:** 50 employees
**Timeline:** 48 hours (active incident) + 2 weeks (post-incident)

---

## Overview

CyberShield, an irony not lost on anyone, detects unauthorized access to their development environment at 2 AM. An attacker exploited a misconfigured S3 bucket containing API keys. The on-call engineer panics and pages the CEO. They have no incident response plan. This tutorial shows you how to use ComplianceOS to detect, contain, eradicate, recover, and learn from a security incident.

---

## Situation

- No Incident Response Plan (IRP)
- No defined roles or escalation paths
- Forensic evidence may be lost during containment
- Customer communication is ad-hoc
- No post-incident review process exists

---

## What You'll Need Before Starting

| Prerequisite | Why You Need It |
|---|---|
| 24/7 contact list for incident response team | You need to reach people at 2 AM |
| Access to cloud consoles (AWS, Azure, GCP) | For containment and forensics |
| Legal counsel on retainer | For breach notification requirements |
| Cyber insurance policy number | For carrier notification |
| Pre-drafted customer notification templates | For rapid communication |

---

## Step-by-Step Walkthrough

### Step 1: Preparation (Before an Incident)

**Time:** 4-8 hours (one-time setup)

1. Navigate to `/clients/{id}/incidents`
2. Click **"Incident Response Plan"**
3. Define roles and responsibilities:

| Role | Person | Responsibilities |
|---|---|---|
| Incident Commander | CISO | Overall coordination, decision authority |
| Technical Lead | Senior Engineer | Technical investigation, containment |
| Communications Lead | CEO/COO | Internal and external communications |
| Legal Counsel | External law firm | Regulatory obligations, liability |
| Scribe | On-call engineer | Timeline documentation, evidence collection |

4. Define severity levels:

| Level | Description | Example | Response Time |
|---|---|---|---|
| Critical | Active breach, data exfiltration | Ransomware, data breach | Immediate |
| High | Confirmed compromise, no data loss yet | Unauthorized access | 1 hour |
| Medium | Suspicious activity, investigation needed | Phishing attempt | 4 hours |
| Low | Minor security event | Failed login spike | 24 hours |

5. Define escalation paths:
   - On-call engineer → Technical Lead → Incident Commander → CEO
   - Auto-escalate if no response in 15 minutes

6. Save the IRP

> **Behind the Scenes:** The IRP is stored as a version-controlled document. Role assignments and escalation paths are used to auto-notify the right people when an incident is declared.

---

### Step 2: Detection and Analysis

**Time:** 1-4 hours

1. Alert triggers at 2 AM:
   - CloudTrail API shows unusual S3 access pattern
   - API keys accessed from unknown IP address
   - 3 AM: On-call engineer receives PagerDuty alert

2. Engineer navigates to `/clients/{id}/incidents`
3. Click **"Declare Incident"**
4. Fill in initial details:
   - **Title:** "Unauthorized S3 bucket access — API keys exposed"
   - **Severity:** Critical
   - **Detected At:** 2026-08-15 02:15 UTC
   - **Detected By:** Automated alert (CloudTrail)
   - **Description:** "Unusual API access pattern detected. S3 bucket containing API keys accessed from unknown IP. Possible data exposure."
   - **Affected Assets:** S3 bucket "cyberflare-dev-config", API keys for payment processing

5. System auto-notifies:
   - Technical Lead (SMS + email)
   - Incident Commander (SMS + email)
   - CEO (email — escalation if no response in 15 min)

6. Technical investigation:
   - Review CloudTrail logs (who accessed what, when, from where)
   - Identify the attacker's IP address
   - Determine scope: Which files were accessed? Were they downloaded?
   - Check if the keys were used (any transactions with the exposed keys?)

7. Initial findings:
   - Attacker accessed S3 bucket from IP 185.220.101.x (known malicious)
   - 3 files downloaded: API keys, database credentials, encryption keys
   - Keys were used: 2 fraudulent transactions detected ($4,200 total)
   - Scope: Development environment only (production not affected)

8. Update incident record with findings

> **Behind the Scenes:** Incident records are stored with full timeline tracking. Every update (status change, finding, action) is timestamped and attributed to the user who made it. This creates the audit trail auditors and regulators require.

---

### Step 3: Containment

**Time:** 30 minutes - 2 hours

1. Short-term containment (stop the bleeding):
   - Rotate all exposed API keys immediately
   - Rotate database credentials
   - Rotate encryption keys
   - Block attacker IP at the firewall
   - Make the S3 bucket private (remove public access)

2. Long-term containment (prevent spread):
   - Audit all S3 buckets for misconfigurations
   - Review IAM policies for excessive permissions
   - Enable S3 access logging (if not already enabled)
   - Enable MFA delete on critical buckets

3. Document all containment actions in ComplianceOS:
   - Timestamp each action
   - Note who performed it
   - Record the result

**Containment Actions Log:**

| Time | Action | Performed By | Result |
|---|---|---|---|
| 02:30 | Rotated payment API keys | Engineer | Keys rotated, attacker access revoked |
| 02:35 | Rotated database credentials | Engineer | Credentials rotated |
| 02:40 | Rotated encryption keys | Engineer | Keys rotated |
| 02:45 | Blocked attacker IP | Engineer | IP blocked at WAF |
| 02:50 | Made S3 bucket private | Engineer | Public access removed |
| 03:00 | Audited all S3 buckets | Technical Lead | 2 other misconfigurations found |
| 03:15 | Reviewed IAM policies | Technical Lead | 3 over-privileged roles identified |
| 03:30 | Enabled S3 access logging | Engineer | Logging enabled |
| 03:45 | Enabled MFA delete | Engineer | MFA delete enabled |

4. Verify containment:
   - Confirm attacker can no longer access systems
   - Confirm exposed credentials are no longer valid
   - Confirm no further suspicious activity

5. Update incident status: **Contained**

> **Behind the Scenes:** Containment actions are tracked in real-time. The system correlates actions with affected assets and verifies that all exposed credentials have been rotated. A "containment score" indicates how complete your containment is.

---

### Step 4: Eradication and Recovery

**Time:** 4-24 hours

1. Eradication (remove the root cause):
   - Identify how the attacker found the misconfigured bucket (bucket enumeration)
   - Fix the root cause: Implement S3 bucket policy that denies public access by default
   - Fix the contributing cause: Implement automated S3 misconfiguration scanning
   - Remove any attacker persistence (backdoors, new accounts)

2. Recovery (restore to normal):
   - Verify systems are clean (no attacker artifacts)
   - Restore any affected data from backups (if needed)
   - Monitor for signs of re-compromise
   - Gradually restore normal operations

3. Document eradication and recovery:

**Eradication Actions:**

| Time | Action | Result |
|---|---|---|
| 04:00 | Implemented S3 bucket policy (deny public) | All buckets now private by default |
| 04:30 | Deployed automated S3 scanner | Scans run hourly, alerts on misconfigurations |
| 05:00 | Audited all IAM users | No attacker-created accounts found |
| 05:30 | Verified system integrity | No backdoors or persistence found |
| 06:00 | Monitored for 1 hour | No suspicious activity detected |
| 07:00 | Declared systems clean | Recovery phase complete |

4. Update incident status: **Recovered**

> **Behind the Scenes:** Eradication and recovery actions are linked to the incident. The system tracks which root causes were addressed and verifies that recovery criteria are met before declaring the incident resolved.

---

### Step 5: Post-Incident Review

**Time:** 2-4 hours (within 72 hours of incident resolution)

1. Navigate to `/clients/{id}/incidents`
2. Open the incident record
3. Click **"Post-Incident Review"**
4. Conduct retrospective:

**Timeline Reconstruction:**

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

5. Identify lessons learned:

| What Went Well | What Went Wrong | Improvement |
|---|---|---|
| Alerting worked (15 min detection) | No IRP existed | Create and maintain IRP |
| Engineer responded quickly | Engineer didn't know escalation path | Document and train on escalation |
| Containment was effective | S3 bucket was misconfigured | Implement automated scanning |
| Key rotation stopped attacker | No MFA delete on bucket | Enable MFA delete everywhere |

6. Create action items:

| Action Item | Owner | Deadline |
|---|---|---|
| Create formal IRP | CISO | 2 weeks |
| Train all engineers on IRP | CISO | 4 weeks |
| Implement automated S3 scanning | DevOps | 1 week |
| Enable MFA delete on all buckets | DevOps | 1 week |
| Conduct tabletop exercise | CISO | 4 weeks |
| Update incident response playbooks | Technical Lead | 2 weeks |

7. Update incident status: **Closed**

> **Behind the Scenes:** Post-incident reviews are stored with the incident record. Action items are tracked to completion. The system generates metrics: Mean Time to Detect (MTTD), Mean Time to Respond (MTTR), Mean Time to Contain (MTTC). These metrics feed into your security posture dashboard.

---

### Step 6: Customer Notification

**Time:** 2-4 hours (within GDPR's 72-hour requirement)

1. Navigate to `/clients/{id}/incidents`
2. Open the incident record
3. Click **"Breach Notification"**
4. Determine notification requirements:
   - **GDPR:** 72 hours to supervisory authority
   - **State laws:** Varies (some require 30-60 days to affected individuals)
   - **Contractual:** Customer contracts may specify notification timelines

5. Generate notification:
   - **Regulatory notification:** Pre-populated template with incident details
   - **Customer notification:** Customized for affected customers
   - **Internal notification:** For all-hands awareness

6. Send notifications:

| Audience | Method | Timeline |
|---|---|---|
| Supervisory authority | Email to DPA | Within 48 hours |
| Affected customers (12) | Email + status page update | Within 48 hours |
| Internal all-hands | Slack + email | Within 24 hours |
| Cyber insurance carrier | Email + phone | Within 24 hours |

7. Document all notifications in ComplianceOS

> **Behind the Scenes:** Breach notification templates are pre-loaded with regulatory requirements. The system tracks notification deadlines and sends alerts if you're approaching a regulatory deadline. All notifications are stored with delivery confirmation.

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

## Troubleshooting

| Problem | Solution |
|---|---|
| "We don't know if we've been breached" | Assume you have. Start investigating. Better to over-respond than under-respond. |
| "We can't contain the incident" | Isolate affected systems. Disconnect from the network. Call your incident response retainer. |
| "We don't have forensic capabilities** | Preserve evidence (logs, disk images, memory dumps) and engage a forensic firm. Don't try to investigate yourself. |
| "We don't know who to notify" | Start with legal counsel. They'll guide regulatory notification. Then notify affected customers. |
| "Our customers are angry" | Be transparent. Explain what happened, what you're doing, and how you'll prevent recurrence. Honesty builds trust. |
| "The same incident keeps happening" | Your eradication isn't working. Go back to the root cause. You're treating symptoms, not the disease. |

---

## Next Steps

1. **Implement all action items** — Track completion in ComplianceOS.
2. **Update your IRP** — Incorporate lessons learned from this incident.
3. **Conduct tabletop exercises** — Test your IRP with simulated scenarios.
4. **Add detection rules** — Implement alerts for the attack patterns you discovered.
5. **Expand to threat hunting** — Proactively search for indicators of compromise.

---

## Related Documentation

- [Incident Response Workflow](/start-here) — Start Here page
- [Vendor Risk Case Study](./case-study-6-metrobank-vrm.md) — Vendor breach response
- [Business Continuity Case Study](./case-study-4-shopsphere-bcp.md) — Continuity during incidents
- [Risk Assessment Case Study](./case-study-1-payflow-risk-register.md) — Risk-based incident priorities
