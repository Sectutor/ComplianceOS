
import { ENISA_THREAT_TAXONOMY, type ENISAThreat } from './enisa-taxonomy';

export interface ThreatScenario {
    id: string;
    title: string;
    description: string;
    baseThreatId: string;
    industrySector: string[];
    likelihood: 'Low' | 'Medium' | 'High';
    potentialImpact: string;
    recommendedControls: string[]; // ISO 27001 control IDs
}

const SECTOR_SCENARIOS: ThreatScenario[] = [
    {
        id: "SC-FIN-01",
        title: "Financial Transaction Interception",
        description: "Man-in-the-middle attack targeting SWIFT/SEPA transaction processing systems.",
        baseThreatId: "TH-002",
        industrySector: ["Finance", "Banking"],
        likelihood: "Medium",
        potentialImpact: "High financial loss and regulatory fines under NIS2.",
        recommendedControls: ["A.8.24", "A.8.16"]
    },
    {
        id: "SC-HC-01",
        title: "Patient Data Ransomware",
        description: "Targeted ransomware attack on Hospital Information Systems (HIS) causing operational shutdown.",
        baseThreatId: "TH-001",
        industrySector: ["Healthcare", "Pharma"],
        likelihood: "High",
        potentialImpact: "Threat to life, massive data privacy breach (GDPR + NIS2).",
        recommendedControls: ["A.5.29", "A.8.1"]
    },
    {
        id: "SC-MFG-01",
        title: "Industrial Control System (ICS) Sabotage",
        description: "Compromise of OT networks leading to unauthorized manipulation of manufacturing equipment.",
        baseThreatId: "TH-006",
        industrySector: ["Manufacturing", "Energy"],
        likelihood: "Low",
        potentialImpact: "Physical damage to assets and environmental risk.",
        recommendedControls: ["A.8.20", "A.7.12"]
    },
    {
        id: "SC-GEN-01",
        title: "Phishing of High-Privilege Admin",
        description: "Spear-phishing targeting IT admins to gain cloud infrastructure control.",
        baseThreatId: "TH-005",
        industrySector: ["Any"],
        likelihood: "High",
        potentialImpact: "Full infrastructure takeover and data exfiltration.",
        recommendedControls: ["A.5.15", "A.8.5"]
    }
];

/**
 * Generate relevant threat scenarios for a client based on their industry
 */
export function generateScenariosForClient(industry: string): ThreatScenario[] {
    const sector = industry.toLowerCase();
    
    // Filter scenarios by specific sector or "Any"
    const relevant = SECTOR_SCENARIOS.filter(s => 
        s.industrySector.some(sec => sec === "Any" || sector.includes(sec.toLowerCase()))
    );

    // If no specific scenarios, provide general ones
    if (relevant.length === 0) {
        return SECTOR_SCENARIOS.filter(s => s.industrySector.includes("Any"));
    }

    return relevant;
}

/**
 * Map ENISA base threats to high-level scenarios
 */
export function getScenariosByThreat(threatId: string): ThreatScenario[] {
    return SECTOR_SCENARIOS.filter(s => s.baseThreatId === threatId);
}
