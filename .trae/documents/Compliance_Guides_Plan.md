# Compliance Alignment Guides Implementation Plan

This plan outlines the implementation of educational "Alignment Guides" across the ComplianceOS application. These guides serve to educate users on how the platform's features align with major industry standards (ISO, NIST, etc.), similar to the ISO 22301 guide in the Business Continuity module.

## 1. Risk Management Guide
- **Target Module:** Risk Management Dashboard (`/clients/:id/risks/dashboard`)
- **Primary Standard:** **ISO 27005 & NIST SP 800-30**
- **Key Educational Topics:**
  - Risk Identification & Asset Valuation
  - Threat & Vulnerability Assessment
  - Risk Treatment (Accept, Avoid, Transfer, Mitigate)
  - Continuous Monitoring
- **Planned Route:** `/clients/:id/risks/alignment-guide`

## 2. Vendor Risk Management (TPRM) Guide
- **Target Module:** Vendor Dashboard (`/clients/:id/vendors/overview`)
- **Primary Standard:** **ISO 27001:2022 (Clause 5.19-5.23) & NIST SP 800-161**
- **Key Educational Topics:**
  - Supplier Due Diligence
  - Security Requirements in Contracts
  - Supply Chain Risk Management
  - Monitoring & Review
- **Planned Route:** `/clients/:id/vendors/alignment-guide`

## 3. Governance & Policy Guide
- **Target Module:** Governance Workbench (`/clients/:id/governance`)
- **Primary Standard:** **ISO 27001 Clause 5 & NIST CSF 2.0 (GOVERN Function)**
- **Key Educational Topics:**
  - Leadership & Commitment
  - Roles, Responsibilities & Authorities
  - Policy Lifecycle Management
  - Management Review
- **Planned Route:** `/clients/:id/governance/alignment-guide`

## 4. Federal Compliance Guide
- **Target Module:** Federal Hub (`/clients/:id/federal`)
- **Primary Standard:** **CMMC 2.0 & NIST SP 800-171**
- **Key Educational Topics:**
  - CUI vs FCI Identification
  - CMMC Maturity Levels (1, 2, 3)
  - SSP & POAM Management
  - Incident Reporting (DFARS 7012)
- **Planned Route:** `/clients/:id/federal/alignment-guide`

## 5. Audit Readiness Guide
- **Target Module:** Audit Readiness / Gap Analysis (`/clients/:id/audit-readiness`)
- **Primary Standard:** **ISO 19011 (Guidelines for Auditing)**
- **Key Educational Topics:**
  - Evidence Collection & Sampling
  - Internal Audit Program
  - Management of Non-Conformities
  - Audit Planning & Execution
- **Planned Route:** `/clients/:id/audit-readiness/alignment-guide`

## Implementation Strategy (Per Module)

For each of the above modules, we will execute the following steps:

1.  **Create the Page Component:**
    - Develop a standardized `ComplianceAlignmentPage` component (similar to `ISO22301CompliancePage`) that accepts content as props or is customized for each domain.
    - Structure: Overview, Standard Requirements (Tabs), Implementation Status, Benefits.
2.  **Register Route:**
    - Add the lazy import and `<Route>` definition in `App.tsx`.
3.  **Update Dashboard:**
    - Modify the main dashboard for that module to include a "Featured Card" linking to the guide.
    - Style: Uses the "GUIDE" badge and `BookOpen` icon distinct style.
