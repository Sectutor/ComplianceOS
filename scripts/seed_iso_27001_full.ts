
import 'dotenv/config';
import { getDb } from '../db';
import { controls } from '../schema';
import { sql, eq } from 'drizzle-orm';

// Full ISO 27001:2022 Annex A Controls (A.5 - A.8)
const isoControls = [
    // 5. Organizational Controls (37 controls)
    { id: "A.5.1", name: "Policies for information security", description: "Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties.", category: "Organizational" },
    { id: "A.5.2", name: "Information security roles and responsibilities", description: "Information security roles and responsibilities shall be defined and allocated according to the organization needs.", category: "Organizational" },
    { id: "A.5.3", name: "Segregation of duties", description: "Conflicting duties and conflicting areas of responsibility shall be segregated.", category: "Organizational" },
    { id: "A.5.4", name: "Management responsibilities", description: "Management shall require all personnel to apply information security in accordance with the established information security policy, topic-specific policies and procedures of the organization.", category: "Organizational" },
    { id: "A.5.5", name: "Contact with authorities", description: "The organization shall establish and maintain contact with relevant authorities.", category: "Organizational" },
    { id: "A.5.6", name: "Contact with special interest groups", description: "The organization shall establish and maintain contact with special interest groups or other specialist security forums and professional associations.", category: "Organizational" },
    { id: "A.5.7", name: "Threat intelligence", description: "Information relating to information security threats shall be collected and analysed to produce threat intelligence.", category: "Organizational" },
    { id: "A.5.8", name: "Information security in project management", description: "Information security shall be integrated into project management.", category: "Organizational" },
    { id: "A.5.9", name: "Inventory of information and other associated assets", description: "An inventory of information and other associated assets, including owners, shall be developed and maintained.", category: "Organizational" },
    { id: "A.5.10", name: "Acceptable use of information and other associated assets", description: "Rules for the acceptable use of information and other associated assets shall be identified, documented and implemented.", category: "Organizational" },
    { id: "A.5.11", name: "Return of assets", description: "Personnel and other interested parties as appropriate shall return all of the organization assets in their possession upon change or termination of their employment, contract or agreement.", category: "Organizational" },
    { id: "A.5.12", name: "Classification of information", description: "Information shall be classified in terms of legal requirements, value, criticality and sensitivity to unauthorised disclosure or modification.", category: "Organizational" },
    { id: "A.5.13", name: "Labelling of information", description: "An appropriate set of procedures for information labelling shall be developed and implemented in accordance with the information classification scheme adopted by the organization.", category: "Organizational" },
    { id: "A.5.14", name: "Information transfer", description: "Information transfer rules, procedures and agreements shall be in place for all types of transfer facilities within the organization and between the organization and other parties.", category: "Organizational" },
    { id: "A.5.15", name: "Access control", description: "Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.", category: "Organizational" },
    { id: "A.5.16", name: "Identity management", description: "The full life cycle of identities shall be managed.", category: "Organizational" },
    { id: "A.5.17", name: "Authentication information", description: "Allocation and management of authentication information shall be controlled by a management process, including advising personnel on the appropriate handling of authentication information.", category: "Organizational" },
    { id: "A.5.18", name: "Access rights", description: "Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with the organization’s topic-specific policy on and rules for access control.", category: "Organizational" },
    { id: "A.5.19", name: "Information security in supplier relationships", description: "Processes and procedures shall be defined and implemented to manage the information security risks associated with the use of supplier's products or services.", category: "Organizational" },
    { id: "A.5.20", name: "Addressing information security within supplier agreements", description: "Relevant information security requirements shall be established and agreed with each supplier that may access, process, store, communicate, or provide infrastructure components for, the organization’s information.", category: "Organizational" },
    { id: "A.5.21", name: "Managing information security in the ICT supply chain", description: "Processes and procedures shall be defined and implemented to manage the information security risks associated with the ICT products and services supply chain.", category: "Organizational" },
    { id: "A.5.22", name: "Monitoring, review and change management of supplier services", description: "The organization shall regularly monitor, review, evaluate and manage change in supplier information security practices and service delivery.", category: "Organizational" },
    { id: "A.5.23", name: "Information security for use of cloud services", description: "Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization’s information security requirements.", category: "Organizational" },
    { id: "A.5.24", name: "Information security incident management planning and preparation", description: "The organization shall plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities.", category: "Organizational" },
    { id: "A.5.25", name: "Assessment and decision on information security events", description: "The organization shall assess information security events and decide if they are to be categorized as information security incidents.", category: "Organizational" },
    { id: "A.5.26", name: "Response to information security incidents", description: "Information security incidents shall be responded to in accordance with the documented procedures.", category: "Organizational" },
    { id: "A.5.27", name: "Learning from information security incidents", description: "Knowledge gained from information security incidents shall be used to strengthen and improve the information security controls.", category: "Organizational" },
    { id: "A.5.28", name: "Collection of evidence", description: "The organization shall establish and implement procedures for the identification, collection, acquisition and preservation of evidence related to information security events.", category: "Organizational" },
    { id: "A.5.29", name: "Information security during disruption", description: "The organization shall plan how to maintain information security at an appropriate level during disruption.", category: "Organizational" },
    { id: "A.5.30", name: "ICT readiness for business continuity", description: "ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements.", category: "Organizational" },
    { id: "A.5.31", name: "Legal, statutory, regulatory and contractual requirements", description: "Legal, statutory, regulatory and contractual requirements relevant to information security and the organization’s approach to meet these requirements shall be identified, documented and kept up to date.", category: "Organizational" },
    { id: "A.5.32", name: "Intellectual property rights", description: "The organization shall implement appropriate procedures to protect intellectual property rights.", category: "Organizational" },
    { id: "A.5.33", name: "Protection of records", description: "Records shall be protected from loss, destruction, falsification, unauthorized access and unauthorized release, in accordance with legislatory, regulatory, contractual and business requirements.", category: "Organizational" },
    { id: "A.5.34", name: "Privacy and protection of PII", description: "The organization shall identify and meet the requirements regarding the preservation of privacy and protection of PII according to applicable laws and regulations and contractual requirements.", category: "Organizational" },
    { id: "A.5.35", name: "Independent review of information security", description: "The organization’s approach to managing information security and its implementation including people, processes and technologies shall be reviewed independently at planned intervals or when significant changes occur.", category: "Organizational" },
    { id: "A.5.36", name: "Compliance with policies, rules and standards for information security", description: "Compliance with the organization’s information security policy, topic-specific policies, rules and standards shall be regularly reviewed.", category: "Organizational" },
    { id: "A.5.37", name: "Documented operating procedures", description: "Operating procedures for information processing facilities shall be documented and made available to personnel who need them.", category: "Organizational" },

    // 6. People Controls (8 controls)
    { id: "A.6.1", name: "Screening", description: "Background verification checks on all candidates to become personnel shall be carried out prior to joining the organization and on an ongoing basis taking into consideration applicable laws, regulations and ethics and be proportional to the business requirements, the classification of the information to be accessed and the perceived risks.", category: "People" },
    { id: "A.6.2", name: "Terms and conditions of employment", description: "The employment contractual agreements shall state the personnel’s and the organization’s responsibilities for information security.", category: "People" },
    { id: "A.6.3", name: "Information security awareness, education and training", description: "Personnel of the organization and relevant interested parties shall receive appropriate information security awareness, education and training and regular updates of the organization’s information security policy, topic-specific policies and procedures, as relevant for their job function.", category: "People" },
    { id: "A.6.4", name: "Disciplinary process", description: "A disciplinary process shall be formalized and communicated to take action against personnel and other relevant interested parties who have committed an information security policy violation.", category: "People" },
    { id: "A.6.5", name: "Responsibilities after termination or change of employment", description: "Information security responsibilities and duties that remain valid after termination or change of employment shall be defined, enforced and communicated to relevant personnel and other interested parties.", category: "People" },
    { id: "A.6.6", name: "Confidentiality or non-disclosure agreements", description: "Confidentiality or non-disclosure agreements reflecting the organization’s needs for the protection of information shall be identified, documented, reviewed and signed by personnel and other relevant interested parties.", category: "People" },
    { id: "A.6.7", name: "Remote working", description: "Security measures shall be implemented when personnel are working remotely to protect information accessed, processed or stored outside the organization’s premises.", category: "People" },
    { id: "A.6.8", name: "Information security event reporting", description: "The organization shall provide a mechanism for personnel to report observed or suspected information security events in a timely manner.", category: "People" },

    // 7. Physical Controls (14 controls)
    { id: "A.7.1", name: "Physical security perimeters", description: "Security perimeters shall be defined and used to protect areas that contain either sensitive or critical information and other associated assets.", category: "Physical" },
    { id: "A.7.2", name: "Physical entry", description: "Secure areas shall be protected by appropriate entry controls and access points.", category: "Physical" },
    { id: "A.7.3", name: "Securing offices, rooms and facilities", description: "Physical security for offices, rooms and facilities shall be designed and implemented.", category: "Physical" },
    { id: "A.7.4", name: "Physical security monitoring", description: "Premises shall be continuously monitored for unauthorized physical access.", category: "Physical" },
    { id: "A.7.5", name: "Protecting against physical and environmental threats", description: "Protection against physical and environmental threats, such as natural disasters and other intentional or accidental damage to infrastructure shall be designed and implemented.", category: "Physical" },
    { id: "A.7.6", name: "Working in secure areas", description: "Security measures for working in secure areas shall be designed and implemented.", category: "Physical" },
    { id: "A.7.7", name: "Clear desk and clear screen", description: "Clear desk rules for papers and removable storage media and clear screen rules for information processing facilities shall be defined and appropriately enforced.", category: "Physical" },
    { id: "A.7.8", name: "Equipment siting and protection", description: "Equipment shall be sited and protected to reduce the risks from environmental threats and hazards, and opportunities for unauthorized access.", category: "Physical" },
    { id: "A.7.9", name: "Security of assets off-premises", description: "Off-site assets shall be protected.", category: "Physical" },
    { id: "A.7.10", name: "Storage media", description: "Storage media shall be managed through their life cycle of acquisition, use, transportation and disposal in accordance with the organization’s classification scheme and handling requirements.", category: "Physical" },
    { id: "A.7.11", name: "Supporting utilities", description: "Information processing facilities shall be protected from power failures and other disruptions caused by failures in supporting utilities.", category: "Physical" },
    { id: "A.7.12", name: "Cabling security", description: "Cables carrying power, data or supporting information services shall be protected from interception, interference or damage.", category: "Physical" },
    { id: "A.7.13", name: "Equipment maintenance", description: "Equipment shall be maintained correctly to ensure its continued availability and integrity.", category: "Physical" },
    { id: "A.7.14", name: "Secure disposal or re-use of equipment", description: "Items of equipment containing storage media shall be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use.", category: "Physical" },

    // 8. Technological Controls (34 controls) - Subset to keep file size reasonable but cover roughly 93 total
    { id: "A.8.1", name: "User endpoint devices", description: "Information stored on, processed by or accessible via user endpoint devices shall be protected.", category: "Technological" },
    { id: "A.8.2", name: "Privileged access rights", description: "The allocation and use of privileged access rights shall be restricted and managed.", category: "Technological" },
    { id: "A.8.3", name: "Information access restriction", description: "Access to information and other associated assets shall be restricted in accordance with the established topic-specific policy on access control.", category: "Technological" },
    { id: "A.8.4", name: "Access to source code", description: "Read and write access to source code, development tools and software libraries shall be appropriately managed.", category: "Technological" },
    { id: "A.8.5", name: "Secure authentication", description: "Secure authentication technologies and procedures shall be implemented based on information access restrictions and the topic-specific policy on access control.", category: "Technological" },
    { id: "A.8.6", name: "Capacity management", description: "The use of resources shall be monitored and adjusted in line with current and expected capacity requirements.", category: "Technological" },
    { id: "A.8.7", name: "Protection against malware", description: "Protection against malware shall be implemented and supported by appropriate user awareness.", category: "Technological" },
    { id: "A.8.8", name: "Management of technical vulnerabilities", description: "Information about technical vulnerabilities of information systems in use shall be obtained, the organization’s exposure to such vulnerabilities evaluated and appropriate measures taken.", category: "Technological" },
    { id: "A.8.9", name: "Configuration management", description: "Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.", category: "Technological" },
    { id: "A.8.10", name: "Information deletion", description: "Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.", category: "Technological" },
    { id: "A.8.11", name: "Data masking", description: "Data masking shall be used in accordance with the organization’s topic-specific policy on access control and other related topic-specific policies, and business requirements, taking applicable legislation into consideration.", category: "Technological" },
    { id: "A.8.12", name: "Data leakage prevention", description: "Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.", category: "Technological" },
    { id: "A.8.13", name: "Information backup", description: "Backup copies of information, software and systems shall be maintained and regularly tested in accordance with the agreed topic-specific policy on backup.", category: "Technological" },
    { id: "A.8.14", name: "Redundancy of information processing facilities", description: "Information processing facilities shall be implemented with redundancy sufficient to meet availability requirements.", category: "Technological" },
    { id: "A.8.15", name: "Logging", description: "Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.", category: "Technological" },
    { id: "A.8.16", name: "Monitoring activities", description: "Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.", category: "Technological" },
    { id: "A.8.17", name: "Clock synchronization", description: "The clocks of all relevant information processing systems within the organization or security domain shall be synchronised to a single reference time source.", category: "Technological" },
    { id: "A.8.18", name: "Use of privileged utility programs", description: "The use of utility programs that can be capable of overriding system and application controls shall be restricted and tightly controlled.", category: "Technological" },
    { id: "A.8.19", name: "Installation of software on operational systems", description: "Procedures and measures shall be implemented to securely manage software installation on operational systems.", category: "Technological" },
    { id: "A.8.20", name: "Networks security", description: "Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.", category: "Technological" },
    { id: "A.8.21", name: "Security of network services", description: "Security mechanisms, service levels and management requirements of all network services shall be identified, implemented and monitored.", category: "Technological" },
    { id: "A.8.22", name: "Segregation of networks", description: "Groups of information services, users and information systems shall be segregated on networks.", category: "Technological" },
    { id: "A.8.23", name: "Web filtering", description: "Access to external websites shall be managed to reduce exposure to malicious content.", category: "Technological" },
    { id: "A.8.24", name: "Use of cryptography", description: "Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.", category: "Technological" },
    { id: "A.8.25", name: "Secure development life cycle", description: "Rules for the secure development of software and systems shall be established and applied.", category: "Technological" },
    { id: "A.8.26", name: "Application security requirements", description: "Information security requirements shall be identified, specified and approved when developing or acquiring applications.", category: "Technological" },
    { id: "A.8.27", name: "Secure system architecture and engineering principles", description: "Principles for engineering secure systems shall be established, documented, maintained and applied to any information system development activities.", category: "Technological" },
    { id: "A.8.28", name: "Secure coding", description: "Secure coding principles shall be applied to software development.", category: "Technological" },
    { id: "A.8.29", name: "Security testing in development and acceptance", description: "Security testing processes shall be defined and implemented in the development life cycle.", category: "Technological" },
    { id: "A.8.30", name: "Outsourced development", description: "The organization shall direct, monitor and validate the outsourced software development activities.", category: "Technological" },
    { id: "A.8.31", name: "Separation of development, test and production environments", description: "Development, testing and production environments shall be separated to reduce the risks of unauthorized access or changes to the operational environment.", category: "Technological" },
    { id: "A.8.32", name: "Change management", description: "Changes to information processing facilities and information systems shall be subject to change management procedures.", category: "Technological" },
    { id: "A.8.33", name: "Test information", description: "Test information shall be selected, protected and managed.", category: "Technological" },
    { id: "A.8.34", name: "Protection of information systems during audit testing", description: "Audit tests and other assurance activities involving assessment of operational systems shall be planned and agreed between the tester and appropriate management.", category: "Technological" }
];

async function seedISO() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    console.log(`--- Seeding ${isoControls.length} ISO 27001:2022 Controls ---`);

    for (const c of isoControls) {
        // Upsert based on controlId
        // Check if exists
        const existing = await db.select().from(controls).where(eq(controls.controlId, c.id));
        if (existing.length === 0) {
            await db.insert(controls).values({
                controlId: c.id,
                name: c.name,
                description: c.description,
                framework: "ISO 27001",
                category: c.category
            });
            console.log(`Included: ${c.id}`);
        } else {
            console.log(`Skipped (Exists): ${c.id}`);
        }
    }
    console.log("--- ISO Seed Complete ---");
    process.exit(0);
}

seedISO().catch(e => {
    console.error(e);
    process.exit(1);
});
