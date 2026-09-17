# Framework Implementation & Mapping Guide

**Location:** `ComplianceOS > Clients > [Client Name] > Assurance > [Framework Name]`

The **Framework Implementation** module is where high-level compliance requirements are translated into technical reality. This page allows you to manage the specific controls required by a standard (e.g., ISO 27001, SOC 2, CIS v8) and document their implementation status.

---

## 1. Navigating Domains & Categories

Technical frameworks are often massive. To make implementation manageable, we group requirements into **Domains** (e.g., "Access Control", "Network Security").

*   **Sidebar**: Use the left sidebar to select a specific technical domain.
*   **Progress Indicators**: Each category shows the number of requirements it contains, helping you track coverage.

---

## 2. Requirement Verification

For each requirement in a domain, you will see a card containing:

*   **Requirement ID & Title**: The specific code from the standard (e.g., "AC-1").
*   **Description**: What the standard actually requires.
*   **Current Status**: Whether the control is "Implemented", "In Progress", "Not Implemented", or "Not Applicable".
*   **Evidence Count**: The number of artifacts (documents, links, or screenshots) currently linked to this control.

### Updating Status
Use the dropdown menu on the right to update the status. This status is reflected in the main compliance dashboards.

---

## 3. Advanced Features

### Strategic Overlay
Some technical categories include a "Strategic Guidance" overlay. This provides:
*   **Business Impact**: Why this specific domain is critical for your business.
*   **Implementation Focus**: Key technical areas to prioritize.
*   **Roadmap**: Recommended next steps to achieve compliance in this area.

### AI Implementation Guide (Premium)
Click the **"AI Implementation Guide"** button on any requirement to generate tailored advice. The AI analyzes the requirement and provides:
1.  **Technical Steps**: What specific configurations need to be changed?
2.  **Evidence Suggestions**: What screenshots or logs should you collect?
3.  **Policy Alignment**: Which of your internal policies covers this requirement?

---

## 4. Key Workflows

### How to Verify a Control?
1.  Select the relevant **Domain** in the sidebar.
2.  Find the requirement and click **"Verify in Audit Hub"**.
3.  This will search the Audit Hub for all evidence linked to this specific `controlId`.
4.  Review the evidence. If sufficient, return to this page and set the status to **"Implemented"**.

### Dealing with "Not Applicable" (N/A)
If a requirement does not apply to your organization (e.g., "Wireless Security" for a fully wired data center):
1.  Select **"Not Applicable"** from the status dropdown.
2.  *Recommendation*: Use the internal comments or the Audit Hub to document the justification for the N/A status, as auditors will ask for it.

---

**Last Updated**: February 2026  
**Version**: 1.5
