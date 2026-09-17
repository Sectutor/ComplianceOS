# OWASP SAMM v2 Assessment Guide

**Location:** `ComplianceOS > Clients > [Client Name] > Assurance > SAMM v2`

The **SAMM v2 Assessment** module implements the Software Assurance Maturity Model (SAMM) methodology. It allows organizations to assess their software security posture across 5 Business Functions and 15 Security Practices using a rigorous, stream-based approach.

---

## 1. Core Methodology: Streams vs. Practices

Unlike simple checklists, SAMM v2 divides each of the 15 Security Practices into two distinct **Streams**:
*   **Stream A**: Focuses on the core activity and primary outcomes.
*   **Stream B**: Focuses on lifecycle integration, automation, and measurement.

**Maturity Calculation:**
A practice's maturity score (0.0 to 3.0) is the average of its two streams. For example, if Stream A is at Level 2 and Stream B is at Level 1, the overall Practice Score is **1.5**.

---

## 2. Navigating the Assessment

### Business Functions
The sidebar (or top bar on small screens) lists the 5 core functions:
1.  **Governance**: Strategy & Metrics, Policy & Compliance, Education & Guidance.
2.  **Design**: Threat Assessment, Security Requirements, Security Architecture.
3.  **Implementation**: Secure Build, Secure Deployment, Defect Management.
4.  **Verification**: Architecture Review, Security Testing, Requirements Testing.
5.  **Operations**: Incident Management, Environment Management, Operational Resilience.

### Selecting a Practice
Click a Business Function to see its associated practices. Each practice card shows its current score vs. its target score.

---

## 3. Performing an Assessment

Click on a practice to open the **Practice Assessment View**.

### Setting Target Levels
Use the target level selector (L1, L2, L3) for each stream. This sets the organization's goal and is used to identify gaps for the Improvement Roadmap.

### Assessment Panel
For each stream (A or B), you assess three maturity levels:

1.  **Activity Answer**: Have you implemented the core activity? (Binary: Yes/No).
2.  **Quality Criteria**: A set of specific requirements that must be met for the level to be considered "fully achieved".
3.  **Level-specific Notes**: Document specific context, internal blockers, or evidence references for *that specific maturity level*.

### Assessment Notes & Evidence
At the bottom of the panel, use the general notes section to track overall progress and link to external evidence (e.g., SharePoint, GitHub repositories).

---

## 4. Building the Roadmap

One of the most powerful features of the SAMM v2 module is the **Roadmap Generator**.

1.  Complete assessments for the practices you wish to improve.
2.  Ensure you have set a **Target Level** higher than your **Current Level**.
3.  Click the **"Build Roadmap"** button in the header.
4.  The system will:
    *   Identify all streams with a maturity gap.
    *   Create a new **Implementation Plan**.
    *   Generate specific **Tasks** for every identified gap, including relevant level-specific notes and requirements.
    *   Redirect you to the **Kanban Board** to begin managing the improvements.

---

## 5. Best Practices

*   **Be Honest with Quality Criteria**: Meeting the "Activity" is not enough; the quality criteria ensure the process is repeatable and reliable.
*   **Use Level-specific Notes**: These are invaluable during audits. Instead of one giant note, documenting *why* you are stuck at Level 1 vs. Level 2 helps pinpoint exactly what needs to change.
*   **Set Realistic Targets**: Don't aim for Level 3 across all practices immediately. SAMM is designed for incremental improvement.

---

**Last Updated**: February 2026  
**Version**: 2.1 (Stream-based)
