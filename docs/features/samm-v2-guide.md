# OWASP SAMM v2 Assessment Guide

## Overview
The Software Assurance Maturity Model (SAMM) is an open framework from OWASP that helps organizations formulate and implement a strategy for software security. ComplianceOS integrates SAMM v2 to provide a structured way to assess and improve your Secure Software Development Lifecycle (SSDLC).

## Core Concepts

### 1. Business Functions
SAMM is organized around five core business functions:
*   **Governance**: Strategy, Metrics, Policy, Compliance, and Education.
*   **Design**: Threat Modeling, Security Requirements, and Security Architecture.
*   **Implementation**: Secure Build, Secure Deployment, and Defect Management.
*   **Verification**: Architecture Review, Code Review, and Security Testing.
*   **Operations**: Incident Management, Environment Management, and Operational Resilience.

### 2. Maturity Levels
Each security practice is measured on a scale from 0 to 3:
*   **Level 0**: Practice not performed.
*   **Level 1**: Initial, ad-hoc implementation.
*   **Level 2**: Structured and consistently applied implementation.
*   **Level 3**: Optimized, automated, and continuously improving implementation.

## How to Conduct a SAMM Assessment in ComplianceOS

### 1. Diagnostic Assessment
Navigate to the SAMM v2 view and select a practice to assess.
*   **Stream A/B**: Most practices are divided into two streams (e.g., Governance/Strategy & Metrics).
*   **Interview Questions**: Use the built-in diagnostic questions to evaluate your current maturity.
*   **Evidence Collection**: Upload documents or link to existing ComplianceOS artifacts (e.g., policies) to justify maturity scores.

### 2. Visualization & Benchmarking
*   **Maturity Radar**: Visualize your current maturity across all 15 security practices.
*   **Target vs. Actual**: Set target maturity levels and see the gap in real-time.
*   **Benchmark Comparisons**: (Premium) Compare your maturity against industry averages.

### 3. Roadmap Generation
Based on your assessment and targets, ComplianceOS generates a phased roadmap.
*   **Priority Recommendations**: Identifies "Low Hanging Fruit" (high impact, low effort).
*   **Phased Planning**: Organizes improvements into logical phases (Phase 1-4).
*   **Task Integration**: Automatically creates remediation tasks in the Projects module.

## Reporting
ComplianceOS provides comprehensive SAMM reports:
*   **Executive Summary**: High-level maturity overview for leadership.
*   **Detailed Findings**: practice-by-practice breakdown with evidence.
*   **Roadmap Report**: Clear action plan for achieving target maturity.

## Best Practices
*   **Cross-Functional Involvement**: Engage security, development, and operations teams for accurate scoring.
*   **Continuous Assessment**: Update assessments every 6-12 months or after major changes to the SSDLC.
*   **Leverage Autopilot**: Use the Autopilot feature to automatically gather evidence from linked tools like GitHub, GitLab, or Jira.
