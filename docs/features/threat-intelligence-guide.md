# Threat Intelligence User Guide

## Overview
 The Threat Intelligence module in ComplianceOS provides real-time vulnerability scanning and monitoring for your organization's assets and vendors. It integrates with National Vulnerability Database (NVD) and CISA Known Exploited Vulnerabilities (KEV) catalog to identify risks before they can be exploited.

## Key Features

### 1. Asset Vulnerability Scanning
Automatically scan your hardware and software inventory for known vulnerabilities (CVEs).
*   **Automated Matching**: Matches assets based on vendor, product, and version information.
*   **CPE Generation**: Automatically generates Common Platform Enumeration (CPE) strings for accurate lookup.
*   **Daily Scans**: Continuous monitoring for new vulnerabilities affecting your existing assets.

### 2. Vendor Risk Intelligence
Extend vulnerability management to your third-party supply chain.
*   **Vendor Scanning**: Scan vendors by name to identify historical and active vulnerabilities associated with their products.
*   **Breach Monitoring**: (Premium) Track known security breaches and data leaks associated with your vendors.
*   **Risk Scoring**: Vendors are scored based on their vulnerability history and breach record.

### 3. CISA KEV Integration
Prioritize what matters most with the CISA Known Exploited Vulnerabilities catalog.
*   **Real-time KEV Sync**: Automatically identifies CVEs that are actively being exploited in the wild.
*   **Prioritization**: Vulnerabilities in the KEV catalog are flagged as "Critical" regardless of their CVSS score, urging immediate action.

### 4. Vulnerability Management Workflow
*   **Review & Triage**: Review potential CVE matches. Accept valid matches to create vulnerability records, or dismiss false positives.
*   **Vulnerability Record**: Detailed record for each accepted CVE, including CVSS scores, remediation advice, and affected assets.
*   **Risk Integration**: Automatically push critical vulnerabilities to the Risk Register for formal risk treatment.

## How to Use

### Scanning an Asset
1.  Navigate to **Assets** in the Cyber menu.
2.  Select an asset to view its details.
3.  Click the **"Scan for Vulnerabilities"** button in the Threat Intel tab.
4.  Review the suggested CVEs. Click "Import" to add them to your vulnerability list.

### Monitoring Vendors
1.  Navigate to **Vendor Management**.
2.  Select a vendor.
3.  In the **Security Profile** tab, view the "Vulnerability Intelligence" section.
4.  Click **"Refresh Scan"** to check for the latest CVEs associated with this vendor.

### Managing Vulnerabilities
1.  Go to **Cyber > Vulnerabilities**.
2.  View all active vulnerabilities across your organization.
3.  Filter by "Known Exploit" to see KEV-listed issues.
4.  Assign remediation tasks or link to a Risk Assessment.

## Configuration
*   **Sync Settings**: Configure how often the KEV catalog and NVD cache are updated (default: daily).
*   **Notification Rules**: Set up alerts for new Critical vulnerabilities or KEV matches.
