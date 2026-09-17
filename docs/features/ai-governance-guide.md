# AI Governance User Guide

## Overview
The AI Governance module in ComplianceOS enables organizations to manage the unique risks associated with Artificial Intelligence systems. Built on the **NIST AI Risk Management Framework (AI RMF 1.0)**, it provides a structured approach to mapping, measuring, and managing AI risks throughout the system lifecycle.

## Key Features

### 1. AI System Inventory
Maintain a centralized registry of all AI models and tools in use.
*   **Documentation**: Track system name, purpose, type (Internal/Vendor), and status.
*   **Context**: Define the "Intended Purpose" to establish the baseline for risk assessments.
*   **Vendor Linking**: Associate AI systems with third-party vendors (e.g., OpenAI, Anthropic) for supply chain risk management.

### 2. Impact Assessments (NIST AI RMF)
Conduct standardized assessments to evaluate system trustworthiness.
*   **MAP Function**: Establish the context and categorize the system's risks.
*   **MEASURE Function**: Quantify risks related to accuracy, bias, and explainability.
*   **Risk Scoring**: Generate an overall risk score (0-100) and assign a level (Low/Medium/High/Critical).

### 3. Model Cards
Automatically generate transparency documentation.
*   **Exportable Artifacts**: Create standard JSON or PDF "Model Cards" that document system performance and limitations.
*   **Transparency**: Share these cards with internal stakeholders or external auditors to demonstrate accountability.

### 4. Control Mapping
Link AI risks to specific controls.
*   **NIST Core**: Map your systems against the 73 subcategories of the NIST AI RMF Core.
*   **Gap Analysis**: Visual dashboards show where you have coverage and where you are exposed.

## How to Use

### Registering a New AI System
1.  Navigate to **Governance > AI Governance**.
2.  Click **"Register AI System"**.
3.  **Basic Info**: Enter the Name (e.g., "Customer Support Chatbot") and Description.
4.  **Type**: Select whether it is "In-house Developed", "Vendor Provided", or "Open Source".
5.  **Risk Level**: Assign an initial self-assessed risk level.
6.  **Purpose**: Clearly define the business mission (MAP 1.1) to frame future assessments.

### Running an Impact Assessment
1.  Select a system from your inventory.
2.  Go to the **"Assessments"** tab or click **"Assessment"**.
3.  Complete the **NIST MEASURE** wizard:
    *   **Data Quality**: Assess training data for bias and completeness.
    *   **Reliability**: Evaluate how the system performs under stress or adversarial attacks.
    *   **Human Oversight**: Document "Human-in-the-loop" protocols.
4.  Submitting the assessment calculates the **Overall Risk Score**.

### Generating a Model Card
1.  Open the details page for an AI System.
2.  Click the **"Model Card"** button.
3.  The system compiles all configuration, assessment data, and performance metrics into a standardized JSON file.
4.  Use this file for compliance reporting or regulatory submissions (e.g., EU AI Act).

## Best Practices
*   **Inventory Everything**: Don't forget "Shadow AI". Register even small tools used by individual teams.
*   **Continuous Assessment**: AI drifts. Re-run assessments whenever the model is retrained or the deployment context changes.
*   **Human-in-the-Loop**: Ensure every High/Critical system has a designated human owner responsible for its outputs.
