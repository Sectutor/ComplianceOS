# Project & Task Management User Guide

## Overview
ComplianceOS isn't just for policies; it's designed to secure your engineering and IT projects. The Project Management module allows you to wrap security and privacy contexts around specific initiatives (e.g., "New Mobile App Launch" or "Cloud Migration"), ensuring that risks are identified and managed at the project level.

## Key Features

### 1. Project Security Posture
Get a dedicated security dashboard for every project.
*   **NIST CSF Breakdown**: See how your project aligns with the NIST Cybersecurity Framework functions (Identify, Protect, Detect, Respond, Recover).
*   **OWASP Stats**: Track common application security risks (e.g., Injection, Broken Access Control) specific to this project.
*   **Control Implementation**: Monitor the percentage of required security controls that have been implemented.

### 2. Privacy Threat Modeling (LINDDUN)
Integrate privacy by design into your projects.
*   **LINDDUN Framework**: Systematically identify privacy threats like Linkability, Identifiability, and Non-repudiation.
*   **Status Tracking**: Monitor which privacy models have been completed and which are pending.

### 3. Project Risk Register
Manage risks in the context where they occur.
*   **Granular Tracking**: Document risks specific to the project without cluttering the organizational risk register.
*   **Inheritance**: Project risks automatically roll up to the enterprise view for executive reporting.
*   **Mitigation Plans**: Assign tasks to developers or engineers to fix identified vulnerabilities.

## How to Use

### Creating a Project
1.  Navigate to **Projects**.
2.  Click **"New Project"**.
3.  **Details**: Enter the Project Name, Description, and Owner.
4.  **Type**: Select the project type (e.g., Software Development, Infrastructure, AI System).
5.  **Scope**: Define the boundaries of the project to help with accurate risk assessment.

### Assessing Security Posture
1.  Open a Project to view its dashboard.
2.  Review the **"Security Analysis"** tab.
3.  **Gap Analysis**: Identify which NIST CSF functions have low maturity scores.
4.  **Action Items**: Create tasks to implement missing controls to improve the score.

### conducting Privacy Modeling
1.  Go to the **"Privacy & Data"** tab within a project.
2.  Click **"Start LINDDUN Analysis"**.
3.  Follow the wizard to map data flows and identify potential privacy leaks.
4.  The system will suggest specific privacy controls based on your inputs.

### Managing Project Risks
1.  Go to the **"Risk Register"** tab.
2.  Click **"Add Risk"**.
3.  **Context**: Describe the risk (e.g., "API lacks rate limiting").
4.  **Scoring**: Rate the Likelihood and Impact.
5.  **Treatment**: detailed how the risk will be mitigated (e.g., "Implement Redis-based rate limiter").
6.  **Assign**: Assign the mitigation task to a developer.

## Best Practices
*   **Start Early**: Create the project record during the design phase, not after launch.
*   **Review Gates**: Use the Project Security Posture score as a "Go/No-Go" metric for release.
*   **Associate Assets**: Link the specific servers, code repositories, or data stores involved in the project for better context.
