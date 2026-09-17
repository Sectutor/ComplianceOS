# Audit Hub (Secure Clean Room) Guide

**Location:** `ComplianceOS > Clients > [Client Name] > Assurance > Audit Hub`

The **Audit Hub** is a secure "Clean Room" designed for collaboration between internal compliance teams and external auditors. It manages the **Provided by Client (PBC)** list, evidence verification, and audit findings in a centralized, auditable workspace.

---

## 1. The Secure Clean Room Environment

The Audit Hub is designed with two distinct views:
*   **Compliance Team View**: Full access to manage the PBC list, assign owners, and upload evidence.
*   **Auditor View (Clean Room)**: A restricted view where external auditors can only see "Verified" evidence, ask questions, and log findings.

---

## 2. Managing the PBC List (Requests)

The PBC (Provided by Client) list is the core of any audit.

*   **Initialize Standard**: Use the "Rotate" icon to sync a standard request list (e.g., ISO 27001) for this client.
*   **Create Request**: Add manual requests for custom audit requirements.
*   **Request Statuses**:
    *   **Open**: Request created, awaiting evidence.
    *   **In Review**: Evidence has been uploaded and is ready for internal quality check.
    *   **Accepted (Verified)**: Internal team has verified the evidence; it is now visible to the auditor.
    *   **Returned (Rejected)**: Evidence was insufficient; the request is reopened for the owner.

---

## 3. Evidence Collection

Click on any request to open the **Detail Pane**.

### Uploading Files
*   **Manual Upload**: Drag and drop files directly into the "Auditor Files" section.
*   **Audit Vault Sync**: Coming soon. Select files already stored in the Global Evidence Library.

### Automated Integrations
For certain technical controls (e.g., GitHub settings, AWS backups), you can **Link an Integration**. The system will automatically fetch the proof and attach it to the request, marked with an "Automated" badge.

---

## 4. Auditor Collaboration

### Discussions
Instead of messy email chains, use the **Discussions** thread on each request. Every comment is timestamped and preserved as part of the audit trail.

### Findings
Auditors use the **Findings** tab to log potential non-conformities or observations.
*   **Logging a Finding**: Enter the description, severity (Minor, Major, Observation), and the specific requirement it violates.
*   **Remediation**: The internal team can respond to findings by linking to a **Mitigation Task**.

---

## 5. Auditor Invitations

To grant access to an external auditor:
1.  Click **"Invite Auditor"** in the header.
2.  Enter their professional email.
3.  The auditor will receive a secure **Magic Link** that grants them one-click access to the Clean Room (restricted to only the files you have marked as "Verified").

---

**Last Updated**: February 2026  
**Version**: 3.0 (Clean Room)
