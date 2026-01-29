I have researched the availability of the OWASP ASVS 5.0.0 standard and designed a plan to import it into your ComplianceOS application.

### **Research Findings**
*   **Source:** The official OWASP ASVS repository hosted on GitHub.
*   **Version:** The latest stable version is **5.0.0** (released May 2025).
*   **Data Format:** The standard is available in JSON format, which is ideal for programmatic import.
*   **Structure:** ASVS is structured into **Chapters** (e.g., Architecture), **Sections** (e.g., Secure Software Development Lifecycle), and **Requirements** (e.g., 1.1.1 Verify that...).

### **Implementation Plan**
I will create a new seed script `scripts/seed_asvs.ts` that performs the following steps:

1.  **Fetch Data:** Download the ASVS 5.0.0 JSON definition directly from the official OWASP GitHub repository.
2.  **Parse & Transform:** Extract the requirements and map them to your `controls` table schema:
    *   `controlId`: The ASVS ID (e.g., `1.1.1`).
    *   `name`: A truncated version of the description or the ID (as ASVS doesn't always have short titles).
    *   `description`: The full requirement text.
    *   `framework`: Set to `"OWASP ASVS 5.0"`.
    *   `category`: Mapped to the **Chapter** (e.g., "V1: Architecture").
    *   `grouping`: Mapped to the **Section** title.
    *   `version`: Set to `5`.
3.  **Database Seeding:**
    *   Use the "upsert" logic (similar to the NIST fix) to insert new controls or update existing ones without violating unique constraints.
    *   This ensures the script is idempotent (can be run multiple times safely).
4.  **Verification:** Run the script and verify that the controls appear in the **Frameworks** list or **Controls Library**.

### **Integration for Developers**
Once seeded, the ASVS framework will be automatically available in the "Controls Framework" page. You can then:
*   Create a dedicated "ASVS 5.0" Framework Project for a client.
*   Map these controls to internal policies.
*   Use them in gap analysis assessments.

**Do you want me to proceed with creating and running the `seed_asvs.ts` script?**