# Asset Management User Guide

## Overview
The Asset Management module in ComplianceOS is the foundation for your cybersecurity and compliance program. It allows you to maintain a comprehensive inventory of all organizational assets, including hardware, software, data, and people. By effectively managing your assets, you can accurately assess risks, monitor vulnerabilities, and ensure compliance with frameworks like SOC 2 and ISO 27001.

## Key Features

### 1. Asset Inventory
A centralized repository for all your organization's assets.
*   **Detailed Records**: Track asset name, type, description, owner, location, and status.
*   **Lifecycle Management**: Monitor acquisition dates and schedule regular reviews.
*   **CIA Valuation**: Assign Confidentiality, Integrity, and Availability scores to prioritize critical assets.

### 2. Threat Intelligence Integration
ComplianceOS automatically cross-references your assets with real-time threat data.
*   **Automated Scanning**: The system scans your asset info (Vendor, Product, Version) against the National Vulnerability Database (NVD) and CISA Known Exploited Vulnerabilities (KEV) list.
*   **Active Threats**: View active threat feeds relevant to your specific technology stack directly from the asset list.
*   **Risk Linking**: Easily convert identified threats into formal Risk entries in your Risk Register.

### 3. Risk Association
Link assets to specific risks to build a clear picture of your risk landscape.
*   **Risk Counts**: Quickly see how many risks are associated with each asset.
*   **Impact Analysis**: Use asset CIA valuations to inform risk impact assessments.

## How to Use

### Adding an Asset
1.  Navigate to **Risk Management > Asset Inventory**.
2.  Click the **"Add Asset"** button.
3.  Fill in the required details:
    *   **Name**: A descriptive name for the asset (e.g., "Production Database Server").
    *   **Type**: Choose from Hardware, Software, Data, People, or Facility.
    *   **Owner**: Assign a responsible individual.
    *   **CIA Valuation**: Rate the asset's Confidentiality, Integrity, and Availability (Low/Medium/High).
4.  Switch to the **"Technical Details"** tab (for Software/Hardware) to enter Vendor, Product, and Version for accurate vulnerability scanning.
5.  Click **"Save Asset"**.

### Conducting a Vulnerability Scan
1.  In the Asset Inventory view, click the **"Scan All Assets"** button (lightning bolt icon).
2.  The system will process your inventory and alert you to any matched CVEs.
3.  Review individual asset details to see specific vulnerabilities.

### Reviewing Active Threats
1.  Look for the **"Active Threats"** badge on your asset list.
2.  Click the badge to open the Threat Intelligence dialog.
3.  Review recent security news and alerts relevant to that asset.
4.  If a threat assumes a significant risk, click **"Create Risk"** to add it to your Risk Register.

## Best Practices
*   **Regular Reviews**: Schedule quarterly reviews of your asset inventory to ensure accuracy.
*   **Granularity**: Balance detail with manageability. Group identical assets (e.g., "Employee Laptops") where appropriate, but track critical servers individually.
*   **Ownership**: Ensure every asset has a designated owner responsible for its security and maintenance.
