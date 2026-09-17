# Trust Center & Public Profile User Guide

## Overview
The Trust Center in ComplianceOS is your organization's public-facing security profile. It allows you to build trust with customers and prospects by transparently showcasing your compliance posture, uptime, and security controls. It also streamlines the sales process by providing self-service access to security documents via a gated NDA workflow.

## Key Features

### 1. Real-Time Compliance Monitoring
Display your live security status to the world.
*   **Active Frameworks**: Show which standards (SOC 2, ISO 27001, GDPR) you are compliant with.
*   **Infrastructure Status**: Integrate with your monitoring tools to display real-time uptime (e.g., "99.99%").
*   **Data Sovereignty**: Clearly state where customer data is hosted (e.g., "EU & US Regions") and encryption standards.

### 2. Gated Document Access
Share sensitive security documents securely.
*   **Public vs. Customer-Only**: Mark some documents as public (e.g., Certificates) and others as restricted (e.g., Penetration Test Results, SOC 2 Reports).
*   **Built-in NDA**: Restricted documents require visitors to sign a digital Non-Disclosure Agreement (NDA) before downloading.
*   **Audit Bundles**: Allow prospects to request a full package of security artifacts in one click.

### 3. Visitor Tracking
Know who is looking at your security profile.
*   **Access Logs**: Track every download and NDA signature.
*   **Deanonymization**: Identify visiting companies based on email domains.
*   **Sales Enablement**: Automatically notify your sales team when a prospect accesses the Trust Center.

## How to Configure

### Setting Up Your Profile
1.  Navigate to **Settings > Trust Center**.
2.  **General Info**: Upload your logo and add a description of your security philosophy.
3.  **Metrics**: Toggle which metrics (Uptime, Encryption, Data Regions) to display on the dashboard.

### Managing Documents
1.  Go to **Trust Center > Documents**.
2.  Click **"Upload Artifact"**.
3.  Select the file (PDF recommended).
4.  **Set Visibility**:
    *   **Public**: Available to anyone with the link.
    *   **Restricted**: Requires email verification and NDA signature.
5.  **Category**: Tag the document (e.g., "Audit Report", "Penetration Test", "Legal").

### Customizing the NDA
1.  Go to **Trust Center > Settings > NDA**.
2.  Choose between the "Standard Mutual NDA" template or upload your own custom legal text.
3.  Set the expiration period for access tokens (default: 48 hours).

### Sharing Your Trust Center
1.  Your Trust Center is available at `https://compliance-os.com/trust-center/[your-client-id]`.
2.  Add a "Security" link to your website footer pointing to this URL.
3.  Include the link in your sales email signatures to proactively address security questionnaires.

## Best Practices
*   **Keep it Fresh**: Update your documents immediately after receiving new audit reports.
*   **Be Transparent**: Showing "In Progress" for a certification builds more trust than hiding it.
*   **Automate**: Connect your Trust Center to your CRM (Salesforce/HubSpot) to automatically log security reviews as sales activities.
