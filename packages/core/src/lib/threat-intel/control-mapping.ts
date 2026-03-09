export interface ControlMapping {
    threatCategory: string;
    iso27001: string[];
    nis2: string[];
}

export const THREAT_CONTROL_MAPPING: ControlMapping[] = [
    {
        threatCategory: 'Cyber Espionage',
        iso27001: ['A.5.1', 'A.5.10', 'A.5.15', 'A.8.2'],
        nis2: ['Article 21(2)(a)', 'Article 21(2)(c)']
    },
    {
        threatCategory: 'Ransomware',
        iso27001: ['A.8.1', 'A.8.10', 'A.8.11', 'A.8.12', 'A.8.13'],
        nis2: ['Article 21(2)(c)', 'Article 21(2)(e)']
    },
    {
        threatCategory: 'Supply Chain Attacks',
        iso27001: ['A.5.19', 'A.5.20', 'A.5.21', 'A.5.22', 'A.5.23'],
        nis2: ['Article 21(2)(d)']
    },
    {
        threatCategory: 'Data Breaches',
        iso27001: ['A.5.12', 'A.8.24', 'A.8.28'],
        nis2: ['Article 21(2)(f)']
    },
    {
        threatCategory: 'DDoS',
        iso27001: ['A.8.14', 'A.8.20'],
        nis2: ['Article 21(2)(c)']
    },
    {
        threatCategory: 'Insider Threat',
        iso27001: ['A.6.1', 'A.6.2', 'A.6.3', 'A.6.4'],
        nis2: ['Article 21(2)(g)']
    }
];

export function getControlsForThreat(category: string) {
    return THREAT_CONTROL_MAPPING.find(m => m.threatCategory === category) || {
        threatCategory: category,
        iso27001: ['A.5.1'],
        nis2: ['Article 21(2)']
    };
}
