
/**
 * ENISA Threat Taxonomy based on ENISA Threat Landscape 2024
 * This provides a standardized classification for NIS2 Article 21(1) risk assessments.
 */

export interface ENISAThreat {
    id: string;
    name: string;
    category: 'Malware' | 'Phishing' | 'DoS/DDoS' | 'Ransomware' | 'Supply Chain' | 'Social Engineering' | 'Data Breach' | 'Insider' | 'Natural Disaster' | 'Misc';
    description: string;
    impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    nis2ArticleMapping: string[]; // e.g., ["21(2)(d)", "21(2)(g)"]
}

export const ENISA_THREAT_TAXONOMY: ENISAThreat[] = [
    {
        id: "TH-001",
        name: "Ransomware Operations",
        category: "Ransomware",
        description: "Targeted encryption of organizational data for financial extortion, often involving double extortion (data leaks).",
        impactLevel: "Critical",
        nis2ArticleMapping: ["21(2)(b)", "21(2)(c)"]
    },
    {
        id: "TH-002",
        name: "Advanced Malware Delivery",
        category: "Malware",
        description: "Stealthy malicious software (spyware, trojans) used to gain initial access or maintain persistence.",
        impactLevel: "High",
        nis2ArticleMapping: ["21(2)(d)", "21(2)(j)"]
    },
    {
        id: "TH-003",
        name: "Volumetric DDoS Attacks",
        category: "DoS/DDoS",
        description: "Flooding network resources to disrupt the availability of essential services.",
        impactLevel: "High",
        nis2ArticleMapping: ["21(2)(e)"]
    },
    {
        id: "TH-004",
        name: "Supply Chain Compromise",
        category: "Supply Chain",
        description: "Attacks targeting third-party software, hardware, or service providers to reach the final target.",
        impactLevel: "Critical",
        nis2ArticleMapping: ["21(2)(g)"]
    },
    {
        id: "TH-005",
        name: "Targeted Phishing & BEC",
        category: "Phishing",
        description: "Spear-phishing or Business Email Compromise targeting high-privilege users.",
        impactLevel: "High",
        nis2ArticleMapping: ["21(2)(j)", "21(2)(g)"]
    },
    {
        id: "TH-006",
        name: "Malicious Insider Activity",
        category: "Insider",
        description: "Unauthorized data access or sabotage by employees, contractors, or partners.",
        impactLevel: "High",
        nis2ArticleMapping: ["21(2)(i)", "21(2)(j)"]
    },
    {
        id: "TH-007",
        name: "Zero-day exploitation",
        category: "Misc",
        description: "Exploitation of unknown vulnerabilities before patches are available.",
        impactLevel: "Critical",
        nis2ArticleMapping: ["21(2)(d)"]
    },
    {
        id: "TH-008",
        name: "Physical Infrastructure Damage",
        category: "Natural Disaster",
        description: "Damage to data centers or power grids due to natural disasters or physical sabotage.",
        impactLevel: "High",
        nis2ArticleMapping: ["21(2)(c)"]
    }
];

export function getThreatsByArticle(article: string): ENISAThreat[] {
    return ENISA_THREAT_TAXONOMY.filter(t => t.nis2ArticleMapping.includes(article));
}

export function getThreatsByCategory(category: ENISAThreat['category']): ENISAThreat[] {
    return ENISA_THREAT_TAXONOMY.filter(t => t.category === category);
}
