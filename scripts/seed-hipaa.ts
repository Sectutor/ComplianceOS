/**
 * HIPAA Security Rule Framework Seeder
 * 
 * Seeds the HIPAA Security Rule framework with Administrative, Physical, 
 * and Technical Safeguard controls.
 * 
 * Usage: docker cp scripts/seed-hipaa.ts complianceos-app-1:/tmp/ &&
 *        docker exec -w /app complianceos-app-1 sh -c 'NODE_PATH=/app/node_modules npx tsx /tmp/seed-hipaa.ts'
 */

import { eq, and, count as drizzleCount } from 'drizzle-orm';
import { getDb } from '/app/packages/core/src/db';
import { clientFrameworks, clientFrameworkControls } from '/app/packages/core/src/schema';

const CLIENT_ID = 3;
const FRAMEWORK_NAME = 'HIPAA Security Rule';
const FRAMEWORK_VERSION = '2024';

interface HipaaControl {
  id: string;
  name: string;
  description: string;
  category: string;
  implementationGuidance?: string;
}

// HIPAA Security Rule - Administrative, Physical, Technical Safeguards
const hipaaControls: HipaaControl[] = [
  // === Administrative Safeguards (§ 164.308) ===
  { id: "164.308(a)(1)(i)", name: "Security Management Process", description: "Implement policies and procedures to prevent, detect, contain, and correct security violations.", category: "Administrative Safeguards", implementationGuidance: "Implement risk analysis, risk management, sanction policy, and information system activity review." },
  { id: "164.308(a)(1)(ii)(A)", name: "Risk Analysis", description: "Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of ePHI.", category: "Administrative Safeguards", implementationGuidance: "Use NIST 800-30 or similar methodology for risk assessment." },
  { id: "164.308(a)(1)(ii)(B)", name: "Risk Management", description: "Implement security measures sufficient to reduce risks and vulnerabilities to a reasonable and appropriate level.", category: "Administrative Safeguards", implementationGuidance: "Document risk treatment plans and residual risk acceptance." },
  { id: "164.308(a)(1)(ii)(C)", name: "Sanction Policy", description: "Apply appropriate sanctions against workforce members who fail to comply with security policies and procedures.", category: "Administrative Safeguards", implementationGuidance: "Maintain a disciplinary policy that covers security violations." },
  { id: "164.308(a)(1)(ii)(D)", name: "Information System Activity Review", description: "Implement procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports.", category: "Administrative Safeguards", implementationGuidance: "Schedule periodic review of access logs and security events." },
  { id: "164.308(a)(2)", name: "Assigned Security Responsibility", description: "Identify the security official who is responsible for the development and implementation of the policies and procedures required by the Security Rule.", category: "Administrative Safeguards", implementationGuidance: "Designate a CISO or equivalent security officer in writing." },
  { id: "164.308(a)(3)(i)", name: "Workforce Security", description: "Implement policies and procedures to ensure that all members of the workforce have appropriate access to ePHI and to prevent those who should not have access from obtaining access.", category: "Administrative Safeguards", implementationGuidance: "Implement role-based access control and termination procedures." },
  { id: "164.308(a)(3)(ii)(A)", name: "Authorization and/or Supervision", description: "Implement procedures for the authorization and/or supervision of workforce members who work with ePHI or in locations where it might be accessed.", category: "Administrative Safeguards", implementationGuidance: "Maintain an access request and approval process." },
  { id: "164.308(a)(3)(ii)(B)", name: "Workforce Clearance Procedure", description: "Implement procedures to determine that the access of a workforce member to ePHI is appropriate.", category: "Administrative Safeguards", implementationGuidance: "Conduct background checks commensurate with access level." },
  { id: "164.308(a)(3)(ii)(C)", name: "Termination Procedures", description: "Implement procedures for terminating access to ePHI when a workforce member's employment ends or as required.", category: "Administrative Safeguards", implementationGuidance: "Automate de-provisioning within 24 hours of termination." },
  { id: "164.308(a)(4)(i)", name: "Information Access Management", description: "Implement policies and procedures for authorizing access to ePHI consistent with the Privacy Rule.", category: "Administrative Safeguards", implementationGuidance: "Maintain access control lists and review them quarterly." },
  { id: "164.308(a)(4)(ii)(A)", name: "Isolating Health Information Clearinghouse", description: "If a health care clearinghouse is part of the covered entity, implement policies and procedures to protect ePHI from unauthorized access.", category: "Administrative Safeguards", implementationGuidance: "Apply additional access restrictions for clearinghouse functions." },
  { id: "164.308(a)(4)(ii)(B)", name: "Access Authorization", description: "Implement policies and procedures for granting access to ePHI, consistent with the Privacy Rule.", category: "Administrative Safeguards", implementationGuidance: "Implement role-based access with manager approval workflows." },
  { id: "164.308(a)(4)(ii)(C)", name: "Access Establishment and Modification", description: "Implement policies and procedures to establish, document, review, and modify a user's right of access to a workstation, transaction, program, or process.", category: "Administrative Safeguards", implementationGuidance: "Use quarterly access reviews to validate and modify access." },
  { id: "164.308(a)(5)(i)", name: "Security Awareness and Training", description: "Implement a security awareness and training program for all workforce members.", category: "Administrative Safeguards", implementationGuidance: "Deliver annual security awareness training with phishing simulations." },
  { id: "164.308(a)(5)(ii)(A)", name: "Security Reminders", description: "Provide periodic security updates and reminders.", category: "Administrative Safeguards", implementationGuidance: "Send monthly security newsletters and alerts." },
  { id: "164.308(a)(5)(ii)(B)", name: "Protection from Malicious Software", description: "Procedures for guarding against, detecting, and reporting malicious software.", category: "Administrative Safeguards", implementationGuidance: "Deploy EDR with anti-malware on all endpoints." },
  { id: "164.308(a)(5)(ii)(C)", name: "Log-in Monitoring", description: "Procedures for monitoring log-in attempts and reporting discrepancies.", category: "Administrative Safeguards", implementationGuidance: "Alert on failed login attempts exceeding threshold." },
  { id: "164.308(a)(5)(ii)(D)", name: "Password Management", description: "Procedures for creating, changing, and safeguarding passwords.", category: "Administrative Safeguards", implementationGuidance: "Enforce 12+ character passwords with MFA." },
  { id: "164.308(a)(6)(i)", name: "Security Incident Procedures", description: "Implement policies and procedures to address security incidents.", category: "Administrative Safeguards", implementationGuidance: "Implement incident response plan with defined severity levels." },
  { id: "164.308(a)(6)(ii)", name: "Response and Reporting", description: "Identify and respond to suspected or known security incidents; mitigate, document incidents and outcomes.", category: "Administrative Safeguards", implementationGuidance: "Document all incidents in a tracking system with SLA-based response." },
  { id: "164.308(a)(7)(i)", name: "Contingency Plan", description: "Establish and implement policies and procedures for responding to an emergency that damages systems containing ePHI.", category: "Administrative Safeguards", implementationGuidance: "Maintain BCP/DRP with annual testing." },
  { id: "164.308(a)(7)(ii)(A)", name: "Data Backup Plan", description: "Establish and implement procedures to create and maintain retrievable exact copies of ePHI.", category: "Administrative Safeguards", implementationGuidance: "Automated daily backups with offsite/cloud replication." },
  { id: "164.308(a)(7)(ii)(B)", name: "Disaster Recovery Plan", description: "Establish and implement procedures to restore any loss of data.", category: "Administrative Safeguards", implementationGuidance: "Documented DR plan with RTO/RPO targets and annual testing." },
  { id: "164.308(a)(7)(ii)(C)", name: "Emergency Mode Operation Plan", description: "Establish and implement procedures to enable continuation of critical business processes.", category: "Administrative Safeguards", implementationGuidance: "Define critical systems and alternate processing procedures." },
  { id: "164.308(a)(7)(ii)(D)", name: "Testing and Revision Procedures", description: "Procedures for periodic testing and revision of contingency plans.", category: "Administrative Safeguards", implementationGuidance: "Conduct annual tabletop exercises and DR tests." },
  { id: "164.308(a)(7)(ii)(E)", name: "Applications and Data Criticality Analysis", description: "Assess the relative criticality of specific applications and data in support of contingency plans.", category: "Administrative Safeguards", implementationGuidance: "Maintain BIA with RTO/RPO classifications for all systems." },
  { id: "164.308(a)(8)", name: "Evaluation", description: "Perform a periodic technical and non-technical evaluation to assess compliance with security requirements.", category: "Administrative Safeguards", implementationGuidance: "Conduct annual risk assessment and compliance audit." },
  { id: "164.308(b)(1)", name: "Business Associate Contracts and Other Arrangements", description: "Obtain satisfactory assurances from business associates that they will appropriately safeguard ePHI.", category: "Administrative Safeguards", implementationGuidance: "Maintain BAAs with all business associates handling ePHI." },

  // === Physical Safeguards (§ 164.310) ===
  { id: "164.310(a)(1)", name: "Facility Access Controls", description: "Implement policies and procedures to limit physical access to electronic information systems and facilities.", category: "Physical Safeguards", implementationGuidance: "Implement physical access control systems (badge, biometric)." },
  { id: "164.310(a)(2)(i)", name: "Contingency Operations", description: "Establish procedures that allow facility access in support of restoration of lost data under disaster recovery plan.", category: "Physical Safeguards", implementationGuidance: "Maintain emergency access procedures for authorized personnel." },
  { id: "164.310(a)(2)(ii)", name: "Facility Security Plan", description: "Implement policies and procedures to safeguard the facility and equipment from unauthorized physical access, tampering, and theft.", category: "Physical Safeguards", implementationGuidance: "Document physical security controls and conduct periodic walkthroughs." },
  { id: "164.310(a)(2)(iii)", name: "Access Control and Validation Procedures", description: "Implement procedures to control and validate a person's access to facilities based on their role or function.", category: "Physical Safeguards", implementationGuidance: "Visitor log, escort policy, and badge access audit trail." },
  { id: "164.310(a)(2)(iv)", name: "Maintenance Records", description: "Implement policies and procedures to document repairs and modifications to the physical components of a facility.", category: "Physical Safeguards", implementationGuidance: "Maintain a log of all facility maintenance and security repairs." },
  { id: "164.310(b)", name: "Workstation Use", description: "Implement policies and procedures that specify the proper functions to be performed and the manner in which those functions are performed on workstations.", category: "Physical Safeguards", implementationGuidance: "Define acceptable use policy for workstations accessing ePHI." },
  { id: "164.310(c)", name: "Workstation Security", description: "Implement physical safeguards for all workstations that access ePHI to restrict access to authorized users.", category: "Physical Safeguards", implementationGuidance: "Use auto-lock screensavers, cable locks, and secure positioning." },
  { id: "164.310(d)(1)", name: "Device and Media Controls", description: "Implement policies and procedures governing the receipt and removal of hardware and electronic media containing ePHI.", category: "Physical Safeguards", implementationGuidance: "Maintain inventory and disposal procedures for all media with ePHI." },
  { id: "164.310(d)(2)(i)", name: "Disposal", description: "Implement policies and procedures to address the final disposition of electronic media and hardware containing ePHI.", category: "Physical Safeguards", implementationGuidance: "Use NIST 800-88 compliant media sanitization." },
  { id: "164.310(d)(2)(ii)", name: "Media Re-use", description: "Implement procedures for removal of ePHI from electronic media before the media are made available for re-use.", category: "Physical Safeguards", implementationGuidance: "Use cryptographic erasure or degaussing before re-use." },
  { id: "164.310(d)(2)(iii)", name: "Accountability", description: "Maintain a record of the movements of hardware and electronic media and any person responsible for them.", category: "Physical Safeguards", implementationGuidance: "Track all media with asset tags and movement logs." },
  { id: "164.310(d)(2)(iv)", name: "Data Backup and Storage", description: "Create a retrievable exact copy of ePHI before movement of equipment.", category: "Physical Safeguards", implementationGuidance: "Always verify backup integrity before moving equipment." },

  // === Technical Safeguards (§ 164.312) ===
  { id: "164.312(a)(1)", name: "Access Control", description: "Implement technical policies and procedures for electronic information systems that maintain ePHI to allow access only to those persons or programs that have been granted access rights.", category: "Technical Safeguards", implementationGuidance: "Implement RBAC, MFA, and principle of least privilege." },
  { id: "164.312(a)(2)(i)", name: "Unique User Identification", description: "Assign a unique name and/or number for identifying and tracking user identity.", category: "Technical Safeguards", implementationGuidance: "Enforce unique user IDs; no shared or generic accounts." },
  { id: "164.312(a)(2)(ii)", name: "Emergency Access Procedure", description: "Establish and implement procedures for obtaining necessary ePHI during an emergency.", category: "Technical Safeguards", implementationGuidance: "Implement break-glass access with post-event review." },
  { id: "164.312(a)(2)(iii)", name: "Automatic Logoff", description: "Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity.", category: "Technical Safeguards", implementationGuidance: "Auto-logoff after 15 minutes of inactivity." },
  { id: "164.312(a)(2)(iv)", name: "Encryption and Decryption", description: "Implement a mechanism to encrypt and decrypt ePHI.", category: "Technical Safeguards", implementationGuidance: "Encrypt ePHI at rest (AES-256) and in transit (TLS 1.2+)." },
  { id: "164.312(b)", name: "Audit Controls", description: "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI.", category: "Technical Safeguards", implementationGuidance: "Enable comprehensive audit logging on all systems with ePHI." },
  { id: "164.312(c)(1)", name: "Integrity Controls", description: "Implement policies and procedures to protect ePHI from improper alteration or destruction.", category: "Technical Safeguards", implementationGuidance: "Use checksums, versioning, and WORM storage for audit logs." },
  { id: "164.312(c)(2)", name: "Mechanism to Authenticate Electronic Protected Health Information", description: "Implement electronic mechanisms to corroborate that ePHI has not been altered or destroyed in an unauthorized manner.", category: "Technical Safeguards", implementationGuidance: "Use digital signatures or HMAC for integrity verification." },
  { id: "164.312(d)", name: "Person or Entity Authentication", description: "Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.", category: "Technical Safeguards", implementationGuidance: "MFA required for all systems with ePHI." },
  { id: "164.312(e)(1)", name: "Transmission Security", description: "Implement technical security measures to guard against unauthorized access to ePHI transmitted over electronic communications networks.", category: "Technical Safeguards", implementationGuidance: "Use TLS 1.2+ for all data in transit." },
  { id: "164.312(e)(2)(i)", name: "Integrity Controls", description: "Implement security measures to ensure that electronically transmitted ePHI is not improperly modified without detection.", category: "Technical Safeguards", implementationGuidance: "Use TLS with message authentication." },
  { id: "164.312(e)(2)(ii)", name: "Encryption", description: "Implement a mechanism to encrypt ePHI whenever deemed appropriate.", category: "Technical Safeguards", implementationGuidance: "Encrypt all ePHI transmitted over open networks." },

  // === Organizational Requirements (§ 164.314) ===
  { id: "164.314(a)(1)", name: "Business Associate Contract Requirements", description: "Ensure contracts with business associates include required HIPAA safeguards and reporting obligations.", category: "Organizational Requirements", implementationGuidance: "Review and update BAAs annually." },
  { id: "164.314(a)(2)(i)", name: "Business Associate Obligations", description: "Business associates must comply with applicable HIPAA Security Rule requirements.", category: "Organizational Requirements", implementationGuidance: "Include specific security requirements in all BAAs." },
  { id: "164.314(b)(1)", name: "Requirements for Group Health Plans", description: "Group health plans must ensure that plan documents provide for appropriate safeguards.", category: "Organizational Requirements", implementationGuidance: "Review plan documents for required security provisions." },

  // === Policies and Procedures (§ 164.316) ===
  { id: "164.316(a)", name: "Policies and Procedures", description: "Implement reasonable and appropriate policies and procedures to comply with the Security Rule.", category: "Policies and Procedures", implementationGuidance: "Document all security policies and review them annually." },
  { id: "164.316(b)(1)", name: "Documentation - Time Limit", description: "Maintain written or electronic copies of policies and procedures for 6 years from date of creation or last effective date.", category: "Policies and Procedures", implementationGuidance: "Use a document management system with retention policies." },
  { id: "164.316(b)(2)(i)", name: "Documentation - Availability", description: "Make documentation available to those responsible for implementing the procedures.", category: "Policies and Procedures", implementationGuidance: "Maintain policies in an accessible knowledge base." },
  { id: "164.316(b)(2)(ii)", name: "Documentation - Updates", description: "Review and update documentation periodically in response to environmental or operational changes.", category: "Policies and Procedures", implementationGuidance: "Annual policy review with change-driven updates." },

  // === Breach Notification Rule (§ 164.400-414) ===
  { id: "164.400", name: "Breach Notification - General Requirements", description: "Provide notification following a breach of unsecured protected health information.", category: "Breach Notification", implementationGuidance: "Implement breach notification procedures per HIPAA Breach Notification Rule." },
  { id: "164.402(a)", name: "Breach - Definition", description: "Impermissible use or disclosure that compromises security or privacy of PHI with risk of financial, reputational, or other harm.", category: "Breach Notification", implementationGuidance: "Document breach risk assessment process." },
  { id: "164.404(a)", name: "Notification to Individuals", description: "Notify affected individuals without unreasonable delay and no later than 60 days from discovery.", category: "Breach Notification", implementationGuidance: "Use template notification letters and track delivery." },
  { id: "164.406(a)", name: "Notification to the Secretary", description: "Notify HHS Secretary; 500+ affected = immediately, <500 = annual log.", category: "Breach Notification", implementationGuidance: "Maintain HHS breach reporting procedures." },
  { id: "164.408(a)", name: "Notification by a Business Associate", description: "Business associates must notify covered entities of breaches without unreasonable delay.", category: "Breach Notification", implementationGuidance: "Include breach notification obligations in all BAAs." },
  { id: "164.410(a)", name: "Notification by a Business Associate to the Covered Entity", description: "Business associate notifies covered entity of breach at or by the business associate.", category: "Breach Notification", implementationGuidance: "Define notification SLA in BAAs (e.g., within 24 hours)." },
];

async function main() {
  console.log('🛡️  HIPAA Security Rule Framework Seeder');
  console.log(`📋 Loading ${hipaaControls.length} controls...`);

  const db = await getDb();

  // Check if framework already exists
  const existing = await db.select({ id: clientFrameworks.id })
    .from(clientFrameworks)
    .where(
      and(
        eq(clientFrameworks.clientId, CLIENT_ID),
        eq(clientFrameworks.name, FRAMEWORK_NAME)
      )
    )
    .limit(1);

  let frameworkId: number;

  if (existing.length > 0) {
    frameworkId = existing[0].id;
    console.log(`ℹ️ Framework "${FRAMEWORK_NAME}" already exists (id=${frameworkId}).`);

    const existingControls = await db.select({ count: drizzleCount() })
      .from(clientFrameworkControls)
      .where(eq(clientFrameworkControls.frameworkId, frameworkId));

    const count = Number(existingControls[0]?.count || 0);
    if (count > 0) {
      console.log(`ℹ️ ${count} controls already exist. Skipping.`);
      process.exit(0);
    }
  } else {
    console.log('✨ Creating HIPAA Security Rule framework record...');
    const [framework] = await db.insert(clientFrameworks).values({
      clientId: CLIENT_ID,
      name: FRAMEWORK_NAME,
      version: FRAMEWORK_VERSION,
      sourceFileName: 'hipaa_security_rule_auto_seed',
      status: 'active'
    }).returning();
    frameworkId = framework.id;
    console.log(`✅ Framework created with id=${frameworkId}`);
  }

  // Group by category
  const categoryMap: Record<string, HipaaControl[]> = {};
  for (const ctrl of hipaaControls) {
    if (!categoryMap[ctrl.category]) categoryMap[ctrl.category] = [];
    categoryMap[ctrl.category].push(ctrl);
  }

  const categories = Object.keys(categoryMap).sort();
  console.log(`📊 Categories found: ${categories.length}`);
  for (const cat of categories) {
    console.log(`   ${cat}: ${categoryMap[cat].length} controls`);
  }

  // Bulk insert
  console.log('💾 Inserting controls...');
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < hipaaControls.length; i += batchSize) {
    const batch = hipaaControls.slice(i, i + batchSize).map(c => ({
      frameworkId,
      controlCode: c.id,
      title: c.name,
      description: c.description,
      grouping: c.category,
      status: 'not_implemented',
      applicability: 'applicable',
      originalData: {
        implementationGuidance: c.implementationGuidance || '',
        category: c.category,
      },
    }));

    await db.insert(clientFrameworkControls).values(batch as any);
    inserted += batch.length;
    console.log(`   ${inserted}/${hipaaControls.length} controls inserted...`);
  }

  console.log(`✅ HIPAA Security Rule seeding complete!`);
  console.log(`   Framework ID: ${frameworkId}`);
  console.log(`   Client ID: ${CLIENT_ID}`);
  console.log(`   Total controls: ${inserted}`);
  console.log(`   Categories covered: ${categories.length}`);
  for (const cat of categories) {
    console.log(`      ${cat}: ${categoryMap[cat].length} controls`);
  }
}

main().catch(e => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
