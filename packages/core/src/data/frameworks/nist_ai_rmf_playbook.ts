export type NistAiRmfPlaybookItem = {
    controlId: string;
    category: "GOVERN" | "MAP" | "MEASURE" | "MANAGE";
    suggestedActions: string[];
    suggestedEvidence: string[];
    suggestedMetrics: string[];
};

const defaultsByCategory: Record<NistAiRmfPlaybookItem["category"], Omit<NistAiRmfPlaybookItem, "controlId" | "category">> = {
    GOVERN: {
        suggestedActions: [
            "Assign an accountable owner and define decision rights.",
            "Document policy/standard language and escalation paths.",
            "Define review cadence and change control for governance artifacts."
        ],
        suggestedEvidence: [
            "Policy/standard document and approval record",
            "RACI or ownership assignment",
            "Review cadence and meeting minutes or decision log"
        ],
        suggestedMetrics: [
            "Review completion rate",
            "Time-to-approve changes",
            "Number of unresolved governance decisions"
        ]
    },
    MAP: {
        suggestedActions: [
            "Document system purpose, deployment context, and intended users.",
            "Identify data sources, external dependencies, and tool integrations.",
            "Identify key risks, failure modes, and constraints before deployment."
        ],
        suggestedEvidence: [
            "System inventory entry (purpose, context, owners)",
            "Data flow diagram / architecture notes",
            "Risk scenarios / failure modes list"
        ],
        suggestedMetrics: [
            "Inventory completeness score",
            "Coverage of identified failure modes",
            "Change frequency for context fields"
        ]
    },
    MEASURE: {
        suggestedActions: [
            "Define tests/metrics for each key risk and run them on a schedule.",
            "Perform TEVV: test, evaluation, verification, and validation against thresholds.",
            "Record measurement results and trend them over time."
        ],
        suggestedEvidence: [
            "Test plans and test results",
            "Evaluation reports (bias, security, privacy, robustness)",
            "Monitoring dashboards and alert rules"
        ],
        suggestedMetrics: [
            "Test pass rate vs thresholds",
            "Drift/quality trend over time",
            "Mean time to detect measurement regressions"
        ]
    },
    MANAGE: {
        suggestedActions: [
            "Select a risk response: avoid, mitigate, transfer, accept.",
            "Implement mitigations and assign owners with due dates.",
            "Establish continuous monitoring and incident response triggers."
        ],
        suggestedEvidence: [
            "Risk treatment plan and approvals",
            "Implementation records and evidence artifacts",
            "Monitoring runbooks and incident response playbook"
        ],
        suggestedMetrics: [
            "Mitigation completion rate",
            "Time-to-remediate high-risk findings",
            "Alert volume and incident rate"
        ]
    }
};

const overrides: Partial<Record<string, Omit<NistAiRmfPlaybookItem, "controlId">>> = {
    "MAP 1.2": {
        category: "MAP",
        suggestedActions: [
            "Define deployment environment(s), user population, and operational constraints.",
            "Document where the system runs, who can access it, and what it can affect.",
            "Identify secondary impacts (downstream systems, humans, and processes)."
        ],
        suggestedEvidence: [
            "Deployment diagram and access boundaries",
            "User roles and permissions matrix",
            "Operational runbooks and escalation paths"
        ],
        suggestedMetrics: [
            "Access review completion rate",
            "Number of unauthorized access attempts",
            "Change events affecting deployment scope"
        ]
    },
    "MEAS 2.3": {
        category: "MEASURE",
        suggestedActions: [
            "Run adversarial testing for prompt injection and tool misuse.",
            "Validate sandboxing/isolation assumptions under realistic attack paths.",
            "Document security evaluation results and re-test after changes."
        ],
        suggestedEvidence: [
            "Red-team report and remediation notes",
            "Sandbox test logs and configuration evidence",
            "Security assessment checklist and sign-off"
        ],
        suggestedMetrics: [
            "High-severity findings count",
            "Time-to-fix security evaluation findings",
            "Rate of repeated findings after changes"
        ]
    },
    "MAN 2.3": {
        category: "MANAGE",
        suggestedActions: [
            "Implement runtime monitoring for drift, tool calls, and anomalous actions.",
            "Define halt/kill-switch triggers and run incident drills.",
            "Review logs and outcomes on a scheduled cadence."
        ],
        suggestedEvidence: [
            "Monitoring dashboards and alert rules",
            "Incident response runbook and drill records",
            "Tamper-evident audit log configuration"
        ],
        suggestedMetrics: [
            "Mean time to detect anomalous behavior",
            "Incident drill completion rate",
            "False positive / false negative rate for alerts"
        ]
    }
};

export function getNistAiRmfPlaybook(controlId: string, category: NistAiRmfPlaybookItem["category"]): NistAiRmfPlaybookItem {
    const override = overrides[controlId];
    if (override) {
        return { controlId, ...override };
    }
    const defaults = defaultsByCategory[category];
    return { controlId, category, ...defaults };
}

