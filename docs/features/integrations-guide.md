# Integrations & Automation User Guide

## Overview
ComplianceOS is designed to work within your existing technology ecosystem. This guide covers how to connect external services, configure automated notifications, and import data from other tools.

## Supported Integrations

### 1. Email & Notifications (SMTP)
Configure your own email server to ensure all system notifications (e.g., policy approvals, risk assignments) are sent from your domain (e.g., `compliance@yourcompany.com`).
*   **Provider Support**: Works with Microsoft 365, Google Workspace (Gmail), SendGrid, AWS SES, and any standard SMTP server.
*   **Customization**: All email templates can be branded with your logo and voice.

### 2. Threat Intelligence Feeds
ComplianceOS automatically pulls data from government and industry sources to keep your risk register up to date.
*   **NVD (National Vulnerability Database)**: Syncs CVEs (Common Vulnerabilities and Exposures) daily.
*   **CISA KEV**: Checks your assets against the "Known Exploited Vulnerabilities" catalog.
*   **Configuration**: These integrations are enabled by default for all "Pro" workspaces.

### 3. Data Import/Export
Easily migrate data in and out of the platform using standard formats.
*   **Framework Import**: Upload custom compliance frameworks via CSV/Excel using the "Custom Framework Wizard".
*   **Asset Import**: Bulk upload asset inventories from ITAM tools.
*   **PDF Exports**: Generate audit-ready reports for Policies, Risks, and Compliance Status.

## How to Configure

### Setting up Custom SMTP
1.  Navigate to **Settings > Integrations**.
2.  Locate the **SMTP Configuration** card.
3.  Enter your server details:
    *   **Host**: e.g., `smtp.office365.com`
    *   **Port**: e.g., `587`
    *   **User/Pass**: Your service account credentials.
4.  Click **"Send Test Email"** to verify the connection.
5.  Once verified, toggle the "Enable Custom SMTP" switch.

### Importing a Custom Framework
1.  Navigate to **Settings > Frameworks**.
2.  Click **"Import Framework"**.
3.  Download the CSV Template.
4.  Fill in your controls, domains, and descriptions.
5.  Upload the file and map the columns.
6.  The new framework will immediately be available for gap analysis.

### Automating Workflows
While ComplianceOS handles many logic flows automatically, you can customize triggers:
1.  **Policy Reminders**: Go to **Policies > Settings** to define how often employees are nudged to sign policies (e.g., "Every 3 days").
2.  **Risk Reviews**: Set automated review cycles for risks (e.g., "Critical risks must be reviewed monthly").

## API Access
For developers, ComplianceOS offers a REST-compatible API for programmatically accessing:
*   Evidence Uploads
*   User Management
*   Compliance Status

*Contact support for API documentation and access tokens.*
