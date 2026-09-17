# Incident Response & Cyber Operations User Guide

## Overview
The Cyber Operations module helps your organization detect, report, and respond to security incidents. Designed to meet strict notification requirements (like NIS2 and GDPR), it guides your team through the entire incident lifecycle from initial detection to post-incident review.

## Key Features

### 1. Incident Reporting (NIS2 Aligned)
A structured workflow for reporting incidents to meet regulatory timelines.
*   **Early Warning (24h)**: Report initial detection of significant incidents to the CSIRT.
*   **Detailed Notification (72h)**: Provide a comprehensive assessment including IoCs (Indicators of Compromise).
*   **Final Report (1 Month)**: Submit a complete root cause analysis and lessons learned.

### 2. Incident Management
Centralized dashboard for tracking active security events.
*   **Severity Triage**: Classify incidents (Low, Medium, High, Critical) based on potential impact.
*   **Status Tracking**: Monitor progress through phases (Detection, Analysis, Containment, Eradication, Recovery).
*   **Assignees**: Delegate tasks to specific responders or teams.

### 3. Playbooks & Guidance
Ensure consistent response actions.
*   **Standard Operating Procedures**: Follow predefined steps for common scenarios (e.g., Phishing, Ransomware).
*   **Cross-Border Impact**: Assess and document if the incident affects multiple jurisdictions.

## How to Report an Incident

### Phase 1: Detection & Early Warning
1.  Navigate to **Cyber > Incidents**.
2.  Click **"Report Incident"**.
3.  **Basic Details**: Enter the date/time detected and selected the suspected cause (e.g., Phishing).
4.  **Severity**: Choose a severity level. *Note: "Critical" incidents trigger immediate alerts.*
5.  **Submit**: Click **"Submit Early Warning"** to log the initial report.

### Phase 2: Analysis & Containment (72h)
1.  Open the active incident from your dashboard.
2.  Go to the **"Analysis"** tab.
3.  **IoCs**: Log any IP addresses, file hashes, or domains associated with the attack.
4.  **Mitigation**: Document the steps taken to stop the spread (e.g., "Isolated infected host").
5.  **Detailed Report**: Submit the 72-hour update.

### Phase 3: Closure & Review
1.  Once the incident is resolved, go to the **"Final Report"** tab.
2.  **Root Cause**: Describe *how* the incident happened (e.g., "Unpatched vulnerability on Asset X").
3.  **Lessons Learned**: Document what went well and what needs improvement.
4.  **Close Incident**: Mark the incident as resolved to archive it.

## Best Practices
*   **Drills**: Use the module to run simulated incidents (tabletops) to test your team's readiness.
*   **Evidence Preservation**: Always log actions and keep copies of logs/files for potential forensic analysis.
*   **Communication**: Use the "Cross-Border" flag to determine if you need to notify authorities in other countries.
