Based on the code review, here is the current status of all frameworks and the recommended roadmap for missing ones.

### **1. Fully Implemented Frameworks & Regulations**
These are fully defined in `data/frameworks` or `data/regulations` and have complete support.

| Standard | Type | Location |
| :--- | :--- | :--- |
| **SOC 2 Type II** | Framework | `data/frameworks` |
| **ISO 27001:2022** | Framework | `data/frameworks` |
| **NIST CSF 2.0** | Framework | `data/frameworks` |
| **CIS Controls v8** | Framework | `data/frameworks` |
| **CSA CCM v4** | Framework | `data/frameworks` |
| **GDPR** | Regulation | `data/regulations` |
| **HIPAA** | Regulation | `data/regulations` |
| **CMMC 2.0** | Regulation | `data/regulations` |
| **EU AI Act** | Regulation | `data/regulations` |
| **DORA** | Regulation | `data/regulations` |
| **NIS 2** | Regulation | `data/regulations` |

---

### **2. Partially Implemented (Action Required)**
These exist in the UI or Database Schema but lack standard definitions in `data/`. They should be fully implemented to ensure consistency.

*   **ISO 22301 (Business Continuity)**
    *   *Current Status:* Has a dedicated page (`ISO22301CompliancePage.tsx`) but no data definition.
    *   *Action:* Create `data/frameworks/iso22301.ts`.
*   **NIST SP 800-171 / 800-172**
    *   *Current Status:* Supported in `federalSSPs` table schema but not in the unified framework list.
    *   *Action:* Create `data/frameworks/nist-800-171.ts`.
*   **NIST SP 800-161 (Supply Chain)**
    *   *Current Status:* Referenced in Vendor Alignment UI.
    *   *Action:* Create `data/frameworks/nist-800-161.ts`.

---

### **3. Missing / Planned Frameworks**
These are referenced in documentation or billing logic (`stripe_sku_mapping.json`) but are completely missing from the codebase.

*   **PCI DSS v4.0**
    *   *Source:* Listed in `stripe_sku_mapping.json` as `pci`.
    *   *Action:* **High Priority.** Needs full implementation.

---

### **4. Recommended Additional Frameworks**
To complete the "ComplianceOS" offering, these are the standard industry missing pieces:

*   **NIST SP 800-53** (Federal Information Systems - often the base for FedRAMP)
*   **CCPA / CPRA** (California Privacy - Major gap given GDPR is there)
*   **SOX** (Sarbanes-Oxley - Financial/Public Companies)
*   **FERPA** (Education)

### **Implementation Plan**
1.  **Standardize Partial Frameworks:** Refactor ISO 22301 and NIST 800-171 to use the standard `data/frameworks` system.
2.  **Implement PCI DSS:** Add `data/frameworks/pci.ts`.
3.  **Add CCPA:** Add `data/regulations/ccpa.ts`.
