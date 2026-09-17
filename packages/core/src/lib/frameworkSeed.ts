/**
 * Framework Coverage Seed (scorecard P1 #11).
 *
 * Control manifests for SOC 2 (additional TSC criteria), PCI DSS v4, HIPAA
 * and SOX — 8-12 controls each — shaped for the `controls` table:
 * control_id, name, description, framework, category, status 'active',
 * version 1.
 *
 * `applyFrameworkControls` inserts missing controls idempotently
 * (ON CONFLICT control_id — see `onConflictDoNothing({ target })`). The seed
 * is NOT run automatically against the live database; the QA/conductor
 * decides when to apply it. Control ids are namespaced per framework
 * (e.g. `PCI.1.1`, `HIPAA.164.308.a.1`) because `controls.control_id` has no
 * unique index across frameworks — namespacing prevents cross-framework
 * collisions from silently swallowing an insert.
 */

import { controls } from '../schema';

export interface FrameworkControlManifest {
  controlId: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  status: 'active';
  version: number;
}

// ---------------------------------------------------------------------------
// SOC 2 — additional Trust Services Criteria (beyond the common criteria)
// ---------------------------------------------------------------------------

export const SOC2_ADDITIONAL_CONTROLS: FrameworkControlManifest[] = [
  {
    controlId: 'SOC2.A1.1',
    name: 'A1.1 Availability — Capacity Planning',
    description:
      'The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to facilitate the availability of the system.',
    framework: 'SOC 2',
    category: 'Availability',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.A1.2',
    name: 'A1.2 Availability — Environmental Protections',
    description:
      'The entity implements logical and physical access controls and environmental protections to safeguard system components from harm, including fires, floods, power loss, and other environmental damage.',
    framework: 'SOC 2',
    category: 'Availability',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.A1.3',
    name: 'A1.3 Availability — Recovery Procedures',
    description:
      'The entity develops and implements plans to maintain or resume system operations after a disruption, including documented recovery procedures and testing.',
    framework: 'SOC 2',
    category: 'Availability',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.C1.1',
    name: 'C1.1 Confidentiality — Classification & Protection',
    description:
      'The entity identifies and maintains confidential information to meet the entity\u2019s objectives related to confidentiality, including classification, labeling, and protective measures.',
    framework: 'SOC 2',
    category: 'Confidentiality',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.C1.2',
    name: 'C1.2 Confidentiality — Disposal & Destruction',
    description:
      'The entity disposes of confidential information to meet the entity\u2019s objectives related to confidentiality, including secure destruction of physical and logical media.',
    framework: 'SOC 2',
    category: 'Confidentiality',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.P1.1',
    name: 'P1.1 Privacy — Notice',
    description:
      'The entity provides notice to data subjects about its privacy practices to meet the entity\u2019s objectives related to privacy, including the types of personal information collected and its intended uses.',
    framework: 'SOC 2',
    category: 'Privacy',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.P1.2',
    name: 'P1.2 Privacy — Choice & Consent',
    description:
      'The entity communicates choices available to data subjects regarding the collection, use, and disclosure of personal information and obtains consent as appropriate.',
    framework: 'SOC 2',
    category: 'Privacy',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.P1.3',
    name: 'P1.3 Privacy — Retention & Disposal',
    description:
      'The entity retains personal information consistent with its objectives related to privacy and disposes of it in accordance with its retention schedule and legal obligations.',
    framework: 'SOC 2',
    category: 'Privacy',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.P1.4',
    name: 'P1.4 Privacy — Data Subject Access & Correction',
    description:
      'The entity grants data subjects access to their personal information and supports correction of inaccurate information consistent with its privacy objectives.',
    framework: 'SOC 2',
    category: 'Privacy',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOC2.L1.1',
    name: 'L1.1 Processing Integrity — Completeness & Accuracy',
    description:
      'The entity demonstrates that system processing is complete, accurate, timely, and authorized, including monitoring of processing and detection of errors.',
    framework: 'SOC 2',
    category: 'Processing Integrity',
    status: 'active',
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// PCI DSS v4.0
// ---------------------------------------------------------------------------

export const PCI_DSS_V4_CONTROLS: FrameworkControlManifest[] = [
  {
    controlId: 'PCI.1.1',
    name: 'PCI 1.1 — Network Security Controls Processes',
    description:
      'Processes and mechanisms for installing and maintaining network security controls are defined, documented, and understood.',
    framework: 'PCI DSS v4',
    category: 'Requirement 1',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.1.2',
    name: 'PCI 1.2 — NSC Configuration Standards',
    description:
      'Network security controls (NSCs) are configured and maintained: configuration standards are defined, implemented, and maintained.',
    framework: 'PCI DSS v4',
    category: 'Requirement 1',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.2.1',
    name: 'PCI 2.1 — Secure Configuration Processes',
    description:
      'Processes and mechanisms for applying secure configurations to system components are defined and understood.',
    framework: 'PCI DSS v4',
    category: 'Requirement 2',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.3.1',
    name: 'PCI 3.1 — Account Data Storage',
    description:
      'Procedures are implemented to protect stored account data, including minimizing storage amount and retention time.',
    framework: 'PCI DSS v4',
    category: 'Requirement 3',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.3.2',
    name: 'PCI 3.2 — PAN Encryption & Key Management',
    description:
      'Primary account numbers (PAN) are rendered unreadable anywhere they are stored, using strong cryptography and managed cryptographic keys.',
    framework: 'PCI DSS v4',
    category: 'Requirement 3',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.4.1',
    name: 'PCI 4.1 — Encrypt PAN over Open Networks',
    description:
      'Strong cryptography and security protocols are used to safeguard PAN during transmission over open, public networks.',
    framework: 'PCI DSS v4',
    category: 'Requirement 4',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.5.1',
    name: 'PCI 5.1 — Malware Protection',
    description:
      'Malicious software is prevented or detected: anti-malware solutions are deployed, updated, and actively monitored on all system components.',
    framework: 'PCI DSS v4',
    category: 'Requirement 5',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.7.1',
    name: 'PCI 7.1 — Restrict Access by Need to Know',
    description:
      'Access to system components and cardholder data is restricted to the minimum number of individuals with a business need.',
    framework: 'PCI DSS v4',
    category: 'Requirement 7',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.8.1',
    name: 'PCI 8.1 — User Identification & Authentication',
    description:
      'Access to system components and cardholder data is managed and authenticated: unique IDs, strong authentication, and account lifecycle controls.',
    framework: 'PCI DSS v4',
    category: 'Requirement 8',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.10.1',
    name: 'PCI 10.1 — Logging & Audit Trails',
    description:
      'Audit logs capture and protect all access to system components and cardholder data, and are retained per the retention policy.',
    framework: 'PCI DSS v4',
    category: 'Requirement 10',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'PCI.12.1',
    name: 'PCI 12.1 — Security Policies & Risk Assessment',
    description:
      'A comprehensive information security policy, risk assessment process, and supporting procedures are established, maintained, and communicated.',
    framework: 'PCI DSS v4',
    category: 'Requirement 12',
    status: 'active',
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// HIPAA Security Rule (Administrative, Physical, Technical safeguards)
// ---------------------------------------------------------------------------

export const HIPAA_CONTROLS: FrameworkControlManifest[] = [
  {
    controlId: 'HIPAA.164.308.a.1',
    name: 'Security Management Process',
    description:
      'Implement policies and procedures to prevent, detect, contain, and correct security violations, including risk analysis, risk management, and sanction policy.',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.308.a.2',
    name: 'Assigned Security Responsibility',
    description:
      'Identify the security official who is responsible for the development and implementation of the entity\u2019s security policies and procedures.',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.308.a.3',
    name: 'Workforce Security',
    description:
      'Implement policies and procedures to ensure that all members of the workforce have appropriate access to electronic protected health information (ePHI).',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.308.a.4',
    name: 'Information Access Management',
    description:
      'Implement policies and procedures for authorizing access to ePHI only when appropriate, including access authorization and access establishment.',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.308.a.5',
    name: 'Security Awareness and Training',
    description:
      'Implement a security awareness and training program for all members of the workforce, covering security reminders, malware protection, and login monitoring.',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.308.a.7',
    name: 'Contingency Plan',
    description:
      'Establish (and implement as needed) policies and procedures for responding to an emergency that damages systems containing ePHI, including data backup and disaster recovery.',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.310.a',
    name: 'Facility Access Controls',
    description:
      'Implement policies and procedures to limit physical access to electronic information systems and the facilities in which they are housed.',
    framework: 'HIPAA',
    category: 'Physical Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.310.d',
    name: 'Device and Media Controls',
    description:
      'Implement policies and procedures governing the receipt and removal of hardware and electronic media containing ePHI into and out of a facility.',
    framework: 'HIPAA',
    category: 'Physical Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.312.a',
    name: 'Access Control (Technical Safeguard)',
    description:
      'Implement technical policies and procedures for electronic information systems that maintain ePHI to allow access only to those persons with authorized access.',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.312.c',
    name: 'Integrity Controls',
    description:
      'Implement policies and procedures to protect ePHI from improper alteration or destruction, including mechanisms to corroborate that ePHI has not been altered.',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'HIPAA.164.312.e',
    name: 'Transmission Security',
    description:
      'Implement technical security measures to guard against unauthorized access to ePHI transmitted over an electronic communications network.',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    status: 'active',
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// SOX — IT General Controls (ITGC)
// ---------------------------------------------------------------------------

export const SOX_CONTROLS: FrameworkControlManifest[] = [
  {
    controlId: 'SOX.IT.1',
    name: 'IT Access Management',
    description:
      'Access to financially significant systems, applications, and data is provisioned, reviewed, and revoked in line with job responsibilities (segregation of duties).',
    framework: 'SOX',
    category: 'IT General Controls — Access',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.2',
    name: 'Privileged Access Control',
    description:
      'Administrative and privileged accounts are restricted, monitored, and periodically recertified; privileged activity is logged and reviewed.',
    framework: 'SOX',
    category: 'IT General Controls — Access',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.3',
    name: 'Segregation of Duties',
    description:
      'Conflicting duties (e.g., initiating vs. approving transactions) are segregated across the financially significant IT environment and compensating controls are documented.',
    framework: 'SOX',
    category: 'IT General Controls — Access',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.4',
    name: 'Change Management',
    description:
      'Changes to financially significant systems are authorized, tested, approved, and documented before promotion to production.',
    framework: 'SOX',
    category: 'IT General Controls — Change',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.5',
    name: 'Emergency Change Handling',
    description:
      'Emergency changes follow a defined process including post-change review, documentation, and retrospective approval.',
    framework: 'SOX',
    category: 'IT General Controls — Change',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.6',
    name: 'System Development Lifecycle Controls',
    description:
      'System development and configuration activities follow a documented SDLC including requirements, testing, and user acceptance before go-live.',
    framework: 'SOX',
    category: 'IT General Controls — Development',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.7',
    name: 'Backup and Recovery',
    description:
      'Financially significant systems are backed up on a defined schedule and recovery is tested to meet documented RTO/RPO objectives.',
    framework: 'SOX',
    category: 'IT General Controls — Operations',
    status: 'active',
    version: 1,
  },
  {
    controlId: 'SOX.IT.8',
    name: 'Security Monitoring and Incident Response',
    description:
      'Security events affecting financially significant systems are detected, logged, escalated, and responded to in line with the incident response plan.',
    framework: 'SOX',
    category: 'IT General Controls — Operations',
    status: 'active',
    version: 1,
  },
];

/** All seed frameworks, keyed by slug for convenience. */
export const FRAMEWORK_SEED_MANIFESTS: Record<string, FrameworkControlManifest[]> = {
  'SOC 2': SOC2_ADDITIONAL_CONTROLS,
  'PCI DSS v4': PCI_DSS_V4_CONTROLS,
  HIPAA: HIPAA_CONTROLS,
  SOX: SOX_CONTROLS,
};

/** Flat list of every seed control (deduplicated by controlId). */
export function listSeedControls(): FrameworkControlManifest[] {
  const seen = new Set<string>();
  const out: FrameworkControlManifest[] = [];
  for (const controlsList of Object.values(FRAMEWORK_SEED_MANIFESTS)) {
    for (const control of controlsList) {
      if (seen.has(control.controlId)) continue;
      seen.add(control.controlId);
      out.push(control);
    }
  }
  return out;
}

/**
 * Validate a seed manifest: every control must have the required fields,
 * a status of 'active', version 1, and a globally unique control_id.
 * Pure — returns { ok, errors } instead of throwing.
 */
export function validateFrameworkManifest(
  controlsList: FrameworkControlManifest[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const c of controlsList ?? []) {
    if (!c || typeof c !== 'object') {
      errors.push('Manifest contains a non-object entry');
      continue;
    }
    if (!c.controlId || typeof c.controlId !== 'string') {
      errors.push('Control missing string controlId');
      continue;
    }
    if (seen.has(c.controlId)) {
      errors.push(`Duplicate controlId "${c.controlId}"`);
    }
    seen.add(c.controlId);
    if (!c.name || typeof c.name !== 'string') errors.push(`Control ${c.controlId}: missing name`);
    if (!c.description || typeof c.description !== 'string') {
      errors.push(`Control ${c.controlId}: missing description`);
    }
    if (!c.framework || typeof c.framework !== 'string') {
      errors.push(`Control ${c.controlId}: missing framework`);
    }
    if (!c.category || typeof c.category !== 'string') {
      errors.push(`Control ${c.controlId}: missing category`);
    }
    if (c.status !== 'active') errors.push(`Control ${c.controlId}: status must be "active"`);
    if (c.version !== 1) errors.push(`Control ${c.controlId}: version must be 1`);
  }
  return { ok: errors.length === 0, errors };
}

export interface ApplyFrameworkControlsResult {
  inserted: number;
  skipped: number;
  total: number;
}

/**
 * Insert missing seed controls idempotently (ON CONFLICT control_id).
 *
 * 1. Loads existing control_ids from the `controls` table.
 * 2. Filters the manifest down to controls that are not present.
 * 3. Inserts them with `.onConflictDoNothing({ target: controls.controlId })`
 *    so a concurrent insert (or a row added between read and write) never
 *    duplicates or errors.
 *
 * Not run automatically — the QA/conductor decides when to apply.
 */
export async function applyFrameworkControls(
  db: any,
  frameworks:
    | FrameworkControlManifest[]
    | Record<string, FrameworkControlManifest[]>,
): Promise<ApplyFrameworkControlsResult> {
  const all = Array.isArray(frameworks)
    ? frameworks
    : Object.values(frameworks).flat();
  // Dedupe by controlId (first occurrence wins) so a manifest can never
  // produce conflicting rows for the same control_id.
  const unique = Array.from(
    new Map(all.map((c) => [c.controlId, c])).values(),
  );

  const existingRows = await db
    .select({ controlId: controls.controlId })
    .from(controls);
  const existing = new Set(
    (Array.isArray(existingRows) ? existingRows : []).map((r) => String(r?.controlId)),
  );

  const toInsert = unique.filter((c) => !existing.has(c.controlId));

  let inserted = 0;
  if (toInsert.length > 0) {
    await db
      .insert(controls)
      .values(toInsert)
      .onConflictDoNothing({ target: controls.controlId });
    inserted = toInsert.length;
  }

  return {
    inserted,
    skipped: unique.length - inserted,
    total: unique.length,
  };
}
