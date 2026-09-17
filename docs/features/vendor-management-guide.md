# Vendor Management & Details Guide

**Location:** `ComplianceOS > Clients > [Client Name] > Vendor Risk > [Vendor Name]`

The **Vendor Details** page is your central hub for managing the entire lifecycle of a third-party vendor relationship. Use this page to assess risks, store compliance evidence, manage contracts, and track remediation tasks.

---

## 1. Vendor Header & Actions

The top section provides immediate context about the vendor and quick actions.

*   **Status Badges:**
    *   **Active/Onboarding/Offboarding:** Indicates the current relationship stage.
    *   **Approved Subprocessor:** A special purple badge appears if this vendor processes personal data (Article 28 GDPR).
    *   **Review Status:** A pulsing red "Review Needed" badge appears if the vendor requires attention.
*   **Actions:**
    *   **Email Vendor:** Opens a pre-formatted email dialog to contact your vendor rep.
    *   **Edit Vendor:** Update core details, including the **Trust Center URL**.
    *   **Back:** Return to the main vendor list.

---

## 2. Risk Summary (Left Panel)

This panel stays visible across all tabs to keep risk top-of-mind.

*   **Risk Score (0-100):** An aggregated score calculated from automated risk scans and manual assessments.
    *   *Note: Higher scores indicate higher risk.*
*   **Criticality:** Internal rating (Low, Medium, High, Critical) based on business impact.
*   **Data Access:** Classifies the data they handle:
    *   **Internal:** Non-sensitive company data.
    *   **Confidential:** Sensitive intellectual property or business data.
    *   **Restricted:** Highly sensitive PII, PHI, or financial data.
*   **Quick Links:** Direct access to the vendor's **Website** and **Trust Center**.

---

## 3. Workflow Tabs

### A. Review (Default View)
The dashboard for this specific vendor.
*   **Action Items:** Highlights immediate tasks (e.g., "Review DPA", "mitigate CVE-2024-XXXX").
*   **Data Flows:** Displays exactly what data categories are shared (e.g., "Employee PII", "Customer Emails").

### B. Trust Center (Compliance Verification)
Use this tab to verify the vendor's security posture.
*   **AI Discovery:** The system automatically attempts to find the vendor's public trust center and artifacts.
*   **Manual Verification:** A checklist to manually verify key certifications.
    *   *How to use:* If you have physically verified a SOC 2 report, check the **"SOC 2 Type II"** box to record it in the system.
*   **Artifacts:** Links to detected downloadable documents (whitepapers, certifications).
*   **AI Analysis:** A generative AI summary of the vendor's security public profile.

### C. Assessments
Manage security questionnaires and formal reviews.
*   **Schedule Assessment:** Send a SIG Lite, SOC 2 Review, or custom questionnaire.
*   **Track Status:** Monitor progress from "Planned" -> "Sent" -> "In Review" -> "Completed".
*   **Findings:** Log gaps or issues found during the assessment.

### D. Documents
Your central repository for this vendor.
*   **Upload:** Store verified PDF reports, DPAs, and MSAs.
*   **Link:** Add links to external shared folders (SharePoint/Google Drive).

### E. Risk Scan
Automated technical surveillance of the vendor's public footprint.
*   **Vulnerabilities (CVEs):** Lists known security flaws in their infrastructure, ranked by CVSS severity.
*   **Breaches:** Checks public databases for known data breaches involving this vendor.
*   **Remediation:** Click on any high-risk CVE to create a **Mitigation Task** for your team.

### F. Contracts
Contract lifecycle management (CLM) for this relationship.
*   **Term Tracking:** Monitor Start Date, End Date, and Auto-Renewal status.
*   **SLA:** Record agreed Service Level Agreements (e.g., "99.9% Uptime").
*   **DPA Tracking:** Specifically tracks the status of the Data Processing Agreement ("Signed" vs "Not Signed").

### G. Contacts
A "Rolodex" for this vendor.
*   Store emails and phone numbers for key roles:
    *   Account Manager
    *   Security/CISO (for incident response)
    *   Legal
    *   Billing

---

## 4. Key Workflows

### How to Verify a Vendor?
1.  Go to the **Trust Center** tab.
2.  If the AI hasn't found links, click **Edit Vendor** (top right) and paste their Trust Center URL.
3.  Download their SOC 2 or ISO cert from their site.
4.  In the **Manual Compliance Verification** card, check the boxes for the certs you have verified.
5.  Go to **Documents** and upload the evidence file.

### How to Mitigate a Risk?
1.  Go to the **Risk Scan** tab.
2.  Identify a generic "High" or "Critical" vulnerability.
3.  Click the **Shield** icon next to the CVE.
4.  Assign a priority, owner, and due date. This creates a task in your Task Manager.

### How to Manage Subprocessors?
1.  Click **Edit Vendor**.
2.  Check the **"Approved Subprocessor"** box.
3.  Ensure a **DPA** is listed in the **Contracts** tab with status "Signed".
