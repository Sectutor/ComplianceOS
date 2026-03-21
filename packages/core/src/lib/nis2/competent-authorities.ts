/**
 * NIS2 Competent Authorities Registry
 * 
 * Database of all 27 EU member states' competent authorities for NIS2 incident reporting.
 * Each country has specific authorities responsible for cybersecurity oversight.
 * 
 * NIS2 Directive requires incident reporting to the relevant competent authority
 * within the jurisdiction where the entity is established.
 * 
 * Updated: January 2025
 */

// Country codes and names
export const EU_COUNTRIES = [
    { code: 'AT', name: 'Austria', nameLocal: 'Österreich' },
    { code: 'BE', name: 'Belgium', nameLocal: 'België / Belgique' },
    { code: 'BG', name: 'Bulgaria', nameLocal: 'България' },
    { code: 'HR', name: 'Croatia', nameLocal: 'Hrvatska' },
    { code: 'CY', name: 'Cyprus', nameLocal: 'Κύπρος' },
    { code: 'CZ', name: 'Czech Republic', nameLocal: 'Česko' },
    { code: 'DK', name: 'Denmark', nameLocal: 'Danmark' },
    { code: 'EE', name: 'Estonia', nameLocal: 'Eesti' },
    { code: 'FI', name: 'Finland', nameLocal: 'Suomi' },
    { code: 'FR', name: 'France', nameLocal: 'France' },
    { code: 'DE', name: 'Germany', nameLocal: 'Deutschland' },
    { code: 'GR', name: 'Greece', nameLocal: 'Ελλάδα' },
    { code: 'HU', name: 'Hungary', nameLocal: 'Magyarország' },
    { code: 'IE', name: 'Ireland', nameLocal: 'Éire' },
    { code: 'IT', name: 'Italy', nameLocal: 'Italia' },
    { code: 'LV', name: 'Latvia', nameLocal: 'Latvija' },
    { code: 'LT', name: 'Lithuania', nameLocal: 'Lietuva' },
    { code: 'LU', name: 'Luxembourg', nameLocal: 'Luxembourg' },
    { code: 'MT', name: 'Malta', nameLocal: 'Malta' },
    { code: 'NL', name: 'Netherlands', nameLocal: 'Nederland' },
    { code: 'PL', name: 'Poland', nameLocal: 'Polska' },
    { code: 'PT', name: 'Portugal', nameLocal: 'Portugal' },
    { code: 'RO', name: 'Romania', nameLocal: 'România' },
    { code: 'SK', name: 'Slovakia', nameLocal: 'Slovensko' },
    { code: 'SI', name: 'Slovenia', nameLocal: 'Slovenija' },
    { code: 'ES', name: 'Spain', nameLocal: 'España' },
    { code: 'SE', name: 'Sweden', nameLocal: 'Sverige' },
] as const;

export type EUCountryCode = typeof EU_COUNTRIES[number]['code'];

// Competent Authority information
export interface CompetentAuthority {
    countryCode: EUCountryCode;
    countryName: string;
    authorityName: string;
    authorityNameLocal?: string;
    acronym?: string;
    website: string;
    email: string;
    phone?: string;
    address?: string;
    // For incident reporting
    incidentEmail?: string;
    incidentPhone?: string;
    reportingPortal?: string;
    // Additional info
    sectors?: string[];
    notes?: string;
}

// Complete registry of EU competent authorities
export const COMPETENT_AUTHORITIES: CompetentAuthority[] = [
    // AUSTRIA
    {
        countryCode: 'AT',
        countryName: 'Austria',
        authorityName: 'Austrian Federal Computing Centre',
        authorityNameLocal: 'Bundesamt für Cybersicherheit Österreich (BKO)',
        acronym: 'BKO',
        website: 'https://www.cert.at',
        email: 'security@bko.gv.at',
        phone: '+43 1 715 80 61',
        incidentEmail: 'incident@cert.at',
        reportingPortal: 'https://www.cert.at/incidents',
        sectors: ['essential', 'important'],
        notes: 'Also operates CERT.at as the national CSIRT'
    },

    // BELGIUM
    {
        countryCode: 'BE',
        countryName: 'Belgium',
        authorityName: 'Centre for Cyber Security Belgium',
        acronym: 'CCB',
        website: 'https://www.ccb.belgium.be',
        email: 'contact@ccb.belgium.be',
        phone: '+32 2 501 08 00',
        incidentEmail: 'incident@ccb.belgium.be',
        reportingPortal: 'https://www.ccb.belgium.be/en/report-incident',
        sectors: ['essential', 'important'],
    },

    // BULGARIA
    {
        countryCode: 'BG',
        countryName: 'Bulgaria',
        authorityName: 'State e-Government Agency',
        authorityNameLocal: 'Държавна агенция "Електронно управление"',
        acronym: 'EGOA',
        website: 'https://www.gov.bg/en/cybersecurity',
        email: 'cyber@egov.bg',
        incidentEmail: 'incidents@cyber.bg',
        sectors: ['essential', 'important'],
    },

    // CROATIA
    {
        countryCode: 'HR',
        countryName: 'Croatia',
        authorityName: 'Croatian Security and Intelligence Agency',
        authorityNameLocal: 'Sigurnosno-obavještajna agencija',
        acronym: 'SOA',
        website: 'https://www.soa.hr',
        email: 'cert@cert.hr',
        phone: '+385 1 236 33 00',
        incidentEmail: 'incidents@cert.hr',
        reportingPortal: 'https://www.cert.hr',
        sectors: ['essential', 'important'],
    },

    // CYPRUS
    {
        countryCode: 'CY',
        countryName: 'Cyprus',
        authorityName: 'Digital Security Authority',
        acronym: 'DSA',
        website: 'https://www.dsa.gov.cy',
        email: 'info@dsa.gov.cy',
        phone: '+357 22 20 200',
        incidentEmail: 'incidents@dsa.gov.cy',
        sectors: ['essential', 'important'],
    },

    // CZECH REPUBLIC
    {
        countryCode: 'CZ',
        countryName: 'Czech Republic',
        authorityName: 'National Cyber and Information Security Agency',
        authorityNameLocal: 'Národní úřad pro kybernetickou a informační bezpečnost',
        acronym: 'NUKIB',
        website: 'https://www.nukib.cz/en/',
        email: 'nukib@nukib.cz',
        phone: '+420 541 541 111',
        incidentEmail: 'incident@nukib.cz',
        reportingPortal: 'https://www.nukib.cz/en/report-incident',
        sectors: ['essential', 'important'],
    },

    // DENMARK
    {
        countryCode: 'DK',
        countryName: 'Denmark',
        authorityName: 'Centre for Cyber Security',
        authorityNameLocal: 'Center for Cybersikkerhed',
        acronym: 'CFCS',
        website: 'https://cfcs.dk/en/',
        email: 'cfcs@cfcs.dk',
        phone: '+45 33 18 20 00',
        incidentEmail: 'incidents@cfcs.dk',
        reportingPortal: 'https://cfcs.dk/en/contact',
        sectors: ['essential', 'important'],
    },

    // ESTONIA
    {
        countryCode: 'EE',
        countryName: 'Estonia',
        authorityName: 'Information System Authority',
        authorityNameLocal: 'Riigi Infosüsteemi Amet',
        acronym: 'RIA',
        website: 'https://www.ria.ee/en',
        email: 'info@ria.ee',
        phone: '+372 600 55 00',
        incidentEmail: 'cert@ria.ee',
        reportingPortal: 'https://www.ria.ee/en/contact',
        sectors: ['essential', 'important'],
    },

    // FINLAND
    {
        countryCode: 'FI',
        countryName: 'Finland',
        authorityName: 'Finnish Transport and Communications Agency',
        authorityNameLocal: 'Liikenne- ja viestintävirasto',
        acronym: 'Traficom',
        website: 'https://www.traficom.fi/en',
        email: 'kyberturvallisuus@traficom.fi',
        phone: '+358 29 539 500',
        incidentEmail: 'cert@traficom.fi',
        reportingPortal: 'https://www.kyberturvallisuuskeskus.fi/en/report_incident',
        sectors: ['essential', 'important'],
    },

    // FRANCE
    {
        countryCode: 'FR',
        countryName: 'France',
        authorityName: 'National Agency for the Security of Information Systems',
        authorityNameLocal: 'Agence Nationale de la Sécurité des Systèmes d\'Information',
        acronym: 'ANSSI',
        website: 'https://www.ssi.gouv.fr/en/',
        email: 'contact@ssi.gouv.fr',
        phone: '+33 1 71 75 84 68',
        incidentEmail: 'incident@ssi.gouv.fr',
        reportingPortal: 'https://www.ssi.gouv.fr/en/incident-reporting/',
        sectors: ['essential', 'important'],
    },

    // GERMANY
    {
        countryCode: 'DE',
        countryName: 'Germany',
        authorityName: 'Federal Office for Information Security',
        authorityNameLocal: 'Bundesamt für Sicherheit in der Informationstechnik',
        acronym: 'BSI',
        website: 'https://www.bsi.bund.de/EN',
        email: 'info@bsi.bund.de',
        phone: '+49 228 99 82 82',
        incidentEmail: ' incidents@bsi.bund.de',
        reportingPortal: 'https://www.bsi.bund.de/EN/Topics/Incident/incident_node.html',
        sectors: ['essential', 'important'],
    },

    // GREECE
    {
        countryCode: 'GR',
        countryName: 'Greece',
        authorityName: 'National Cyber Security Authority',
        authorityNameLocal: 'Εθνική Αρχή Κυβερνοασφάλειας',
        acronym: 'EAD',
        website: 'https://www.cybersecurity.gov.gr',
        email: 'contact@cybersecurity.gov.gr',
        phone: '+30 213 204 0000',
        incidentEmail: 'incidents@cybersecurity.gov.gr',
        sectors: ['essential', 'important'],
    },

    // HUNGARY
    {
        countryCode: 'HU',
        countryName: 'Hungary',
        authorityName: 'National Cyber Security Centre',
        authorityNameLocal: 'Országos Kiberbiztonsági Központ',
        acronym: 'NKC',
        website: 'https://nki.gov.hu/en/',
        email: 'info@nki.gov.hu',
        phone: '+36 1 336 40 00',
        incidentEmail: 'incident@nki.gov.hu',
        reportingPortal: 'https://nki.gov.hu/en/contact',
        sectors: ['essential', 'important'],
    },

    // IRELAND
    {
        countryCode: 'IE',
        countryName: 'Ireland',
        authorityName: 'National Cyber Security Centre',
        acronym: 'NCSC-IE',
        website: 'https://www.ncsc.gov.ie',
        email: 'info@ncsc.gov.ie',
        phone: '+353 1 678 2333',
        incidentEmail: 'incidents@ncsc.gov.ie',
        reportingPortal: 'https://www.ncsc.gov.ie/report-an-incident/',
        sectors: ['essential', 'important'],
    },

    // ITALY
    {
        countryCode: 'IT',
        countryName: 'Italy',
        authorityName: 'National Cybersecurity Agency',
        authorityNameLocal: 'Agenzia per la Cybersicurezza Nazionale',
        acronym: 'ACN',
        website: 'https://www.acn.gov.it/en',
        email: 'contatti@acn.gov.it',
        phone: '+39 06 825 0001',
        incidentEmail: 'incidente@acn.gov.it',
        reportingPortal: 'https://www.acn.gov.it/en/report-incident',
        sectors: ['essential', 'important'],
    },

    // LATVIA
    {
        countryCode: 'LV',
        countryName: 'Latvia',
        authorityName: 'Information Technology Security Incident Response Institution',
        authorityNameLocal: 'Informācijas tehnoloģiju drošības incidentu reaģēšanas institūcija',
        acronym: 'CERT.LV',
        website: 'https://www.cert.lv/en',
        email: 'cert@cert.lv',
        phone: '+371 670 73 100',
        incidentEmail: 'incidents@cert.lv',
        sectors: ['essential', 'important'],
    },

    // LITHUANIA
    {
        countryCode: 'LT',
        countryName: 'Lithuania',
        authorityName: 'National Cyber Security Centre',
        authorityNameLocal: 'Nacionalinis kibernetinio saugumo centras',
        acronym: 'NKSC',
        website: 'https://www.nksc.lt/en/',
        email: 'info@nksc.lt',
        phone: '+370 8 527 99 000',
        incidentEmail: 'incident@nksc.lt',
        reportingPortal: 'https://www.nksc.lt/en/contact',
        sectors: ['essential', 'important'],
    },

    // LUXEMBOURG
    {
        countryCode: 'LU',
        countryName: 'Luxembourg',
        authorityName: 'National Cybersecurity Centre',
        authorityNameLocal: 'Centre national de cybersécurité',
        acronym: 'CNPD',
        website: 'https://www.cslux.lu',
        email: 'contact@cslux.lu',
        phone: '+352 27 40 75 01',
        incidentEmail: 'incident@cslux.lu',
        sectors: ['essential', 'important'],
    },

    // MALTA
    {
        countryCode: 'MT',
        countryName: 'Malta',
        authorityName: 'Malta Information Security Services',
        acronym: 'MITA',
        website: 'https://www.mita.gov.mt',
        email: 'security@mita.gov.mt',
        phone: '+356 2550 6000',
        incidentEmail: 'incidents@csirt.gov.mt',
        sectors: ['essential', 'important'],
    },

    // NETHERLANDS
    {
        countryCode: 'NL',
        countryName: 'Netherlands',
        authorityName: 'National Cyber Security Centre',
        acronym: 'NCSC-NL',
        website: 'https://www.ncsc.nl/en',
        email: 'info@ncsc.nl',
        phone: '+31 70 751 55 55',
        incidentEmail: 'incident@ncsc.nl',
        reportingPortal: 'https://www.ncsc.nl/en/incident-response',
        sectors: ['essential', 'important'],
    },

    // POLAND
    {
        countryCode: 'PL',
        countryName: 'Poland',
        authorityName: 'NASK - National Research Institute',
        authorityNameLocal: 'Naukowa i Akademicka Sieć Komputerowa - Państwowy Instytut Badawczy',
        acronym: 'NASK',
        website: 'https://www.nask.pl/en',
        email: 'sekretariat@nask.pl',
        phone: '+48 22 380 84 00',
        incidentEmail: 'incydent@cert.pl',
        reportingPortal: 'https://incydent.cert.pl/',
        sectors: ['essential', 'important'],
    },

    // PORTUGAL
    {
        countryCode: 'PT',
        countryName: 'Portugal',
        authorityName: 'National Cybersecurity Centre',
        authorityNameLocal: 'Centro Nacional de Cibersegurança',
        acronym: 'CNCS',
        website: 'https://www.cncs.gov.pt/en/',
        email: 'cncs@cncs.gov.pt',
        phone: '+351 210 493 010',
        incidentEmail: 'incidentes@cncs.gov.pt',
        reportingPortal: 'https://www.cncs.gov.pt/en/incidentes/',
        sectors: ['essential', 'important'],
    },

    // ROMANIA
    {
        countryCode: 'RO',
        countryName: 'Romania',
        authorityName: 'National Computer Security Incident Response Team',
        authorityNameLocal: 'Centrul Național de Răspuns la Incidente de Securitate Cibernetică',
        acronym: 'DNSC',
        website: 'https://www.dnsc.ro/en',
        email: 'contact@dnsc.ro',
        phone: '+40 21 316 16 41',
        incidentEmail: 'incidente@dnsc.ro',
        reportingPortal: 'https://www.dnsc.ro/en/report-incident',
        sectors: ['essential', 'important'],
    },

    // SLOVAKIA
    {
        countryCode: 'SK',
        countryName: 'Slovakia',
        authorityName: 'National Security Authority',
        authorityNameLocal: 'Národný bezpečnostný úrad',
        acronym: 'NBÚ',
        website: 'https://www.nbu.gov.sk/en/',
        email: 'nbu@nbu.gov.sk',
        phone: '+421 2 6869 5111',
        incidentEmail: 'incident@sk-cert.sk',
        sectors: ['essential', 'important'],
    },

    // SLOVENIA
    {
        countryCode: 'SI',
        countryName: 'Slovenia',
        authorityName: 'Information Security Office',
        authorityNameLocal: 'Urad za informacijsko varnost',
        acronym: 'URSIV',
        website: 'https://www.gov.si/en/topics/information-security/',
        email: 'ursiv@ursiv.gov.si',
        phone: '+386 1 478 36 00',
        incidentEmail: 'incidents@cert.si',
        reportingPortal: 'https://www.cert.si/en/',
        sectors: ['essential', 'important'],
    },

    // SPAIN
    {
        countryCode: 'ES',
        countryName: 'Spain',
        authorityName: 'National Cryptological Centre',
        authorityNameLocal: 'Centro Criptológico Nacional',
        acronym: 'CCN',
        website: 'https://www.ccn.cni.es/en',
        email: 'ccn@cnI.es',
        phone: '+34 91 372 50 00',
        incidentEmail: 'incidentes@ccn.cni.es',
        reportingPortal: 'https://www.ccn.cni.es/en/incident',
        sectors: ['essential', 'important'],
    },

    // SWEDEN
    {
        countryCode: 'SE',
        countryName: 'Sweden',
        authorityName: 'Swedish Civil Contingencies Agency',
        authorityNameLocal: 'Myndigheten för samhällsskydd och beredskap',
        acronym: 'MSB',
        website: 'https://www.msb.se/en',
        email: 'registrator@msb.se',
        phone: '+46 10 240 40 00',
        incidentEmail: 'soc@msb.se',
        reportingPortal: 'https://www.msb.se/en/contact',
        sectors: ['essential', 'important'],
    },
];

// Helper function to get authority by country code
export function getCompetentAuthority(countryCode: EUCountryCode): CompetentAuthority | undefined {
    return COMPETENT_AUTHORITIES.find(ca => ca.countryCode === countryCode);
}

// Helper function to get authority by country name
export function getCompetentAuthorityByName(countryName: string): CompetentAuthority | undefined {
    const normalized = countryName.toLowerCase();
    return COMPETENT_AUTHORITIES.find(ca =>
        ca.countryName.toLowerCase() === normalized ||
        ca.countryName.toLowerCase().includes(normalized)
    );
}

// Get all authorities
export function getAllCompetentAuthorities(): CompetentAuthority[] {
    return COMPETENT_AUTHORITIES;
}

// Entity classification under NIS2
export const ENTITY_CLASSIFICATIONS = [
    {
        id: 'essential',
        name: 'Essential Entity',
        description: 'Entities in critical sectors (energy, transport, banking, health, drinking water, digital infrastructure)',
        criteria: [
            'Operators of essential services',
            'Digital service providers',
            'Entities with >250 employees or >€50M turnover',
        ],
        maxFine: '€10M or 2% global turnover',
    },
    {
        id: 'important',
        name: 'Important Entity',
        description: 'Entities in other critical sectors or those meeting size thresholds',
        criteria: [
            'Entities in listed sectors not classified as essential',
            'Entities with 50-250 employees and €10-50M turnover',
        ],
        maxFine: '€7M or 1.4% global turnover',
    },
] as const;

export type EntityClassification = typeof ENTITY_CLASSIFICATIONS[number]['id'];
