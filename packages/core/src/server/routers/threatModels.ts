
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { threatModels, threatModelComponents, riskScenarios, devProjects, riskTreatments, threatModelDataFlows, riskAssessments } from "../../schema";
import { eq, and, desc, or } from "drizzle-orm";
import { logActivity } from "../../lib/audit";

import { calculateResidualScore, scoreToRiskLevel } from "../../lib/riskCalculations";

// Basic STRIDE mapping logic
const STRIDE_MAPPING: Record<string, any[]> = {
    'Web Client': [
        {
            title: 'Cross-Site Scripting (XSS)',
            category: 'Tampering',
            description: 'Malicious scripts injected into trusted websites.',
            mitigations: ['Output encoding', 'Content Security Policy (CSP)', 'OWASP Top 10: A03:2021']
        },
        {
            title: 'Sensitive Data in Local Storage',
            category: 'Information Disclosure',
            description: 'storing sensitive secrets (tokens, PII) in localStorage/sessionStorage.',
            mitigations: ['Use HttpOnly Cookies', 'Encrypted local storage', 'Do not store sensitive data on client']
        },
        {
            title: 'Client-Side Logic Bypass',
            category: 'Tampering',
            description: 'Attacker modifies client-side code to bypass validation or business logic.',
            mitigations: ['Server-side validation', 'Obfuscation (limited)', 'Integrity checks']
        },
        {
            title: 'DOM-based XSS',
            category: 'Tampering',
            description: 'Vulnerability in client-side code modifying the DOM environment.',
            mitigations: ['Avoid dangerous sinks (innerHTML)', 'Sanitize input', 'Use frameworks correctly']
        },
        {
            title: 'Clickjacking',
            category: 'Tampering',
            description: 'Attacker tricks user into clicking on invisible overlays.',
            mitigations: ['X-Frame-Options: DENY', 'CSP: frame-ancestors']
        },
        {
            title: 'Cross-Site Request Forgery (CSRF)',
            category: 'Elevation of Privilege',
            description: 'Unauthorized commands transmitted from a user that the web application trusts.',
            mitigations: ['Anti-CSRF Tokens', 'SameSite Cookie Attribute', 'OWASP Top 10: A01:2021']
        },
    ],
    'API': [
        {
            title: 'Broken Object Level Authorization',
            category: 'Information Disclosure',
            description: 'API does not correctly validate user permissions involves accessing resources.',
            mitigations: ['Implement authorization checks for every object access', 'ASVS V4: Access Control']
        },
        {
            title: 'Injection Attacks (SQL/NoSQL)',
            category: 'Tampering',
            description: 'Untrusted data is sent to an interpreter as part of a command or query.',
            mitigations: ['Parameterized queries', 'Stored procedures', 'OWASP Top 10: A03:2021']
        },
        {
            title: 'Denial of Service (DoS)',
            category: 'Denial of Service',
            description: 'API resources exhausted by massive traffic.',
            mitigations: ['Rate limiting', 'Auto-scaling', 'Resource quotas']
        },
    ],
    'Database': [
        {
            title: 'SQL Injection',
            category: 'Tampering',
            description: 'Insertion of malicious SQL statements.',
            mitigations: ['Use ORM/Query Builders', 'Parameterized queries', 'Principle of Least Privilege for DB user']
        },
        {
            title: 'Weak Encryption at Rest',
            category: 'Information Disclosure',
            description: 'Sensitive data stored without adequate encryption.',
            mitigations: ['AES-256 Encryption', 'Client-side encryption', 'ASVS V6: Stored Data Cryptography']
        },
    ],
    'External Service': [
        {
            title: 'Insecure Direct Object References',
            category: 'Information Disclosure',
            description: 'Reference to internal implementation object context.',
            mitigations: ['Indirect Reference Maps', 'OWASP Top 10: A04:2021']
        },
        {
            title: 'Man-in-the-Middle',
            category: 'Tampering',
            description: 'Communication intercepted between services.',
            mitigations: ['Enforce Mutual TLS', 'Certificate Pinning', 'ASVS V9: Communications']
        }
    ],
    'Authentication Service': [
        {
            title: 'Spoofing Identity',
            category: 'Spoofing',
            description: 'Attacker successfully identifies as another user.',
            mitigations: ['Multi-Factor Authentication (MFA)', 'Secure Identity Providers (Auth0, Clerk)', 'ASVS V2: Authentication']
        },
        {
            title: 'Brute Force Attack',
            category: 'Repudiation',
            description: 'Systematic checking of all possible keys or passwords.',
            mitigations: ['Account Lockout / Throttling', 'CAPTCHA', 'Monitor for failed logins']
        }
    ],
    'Process': [
        {
            title: 'Elevation of Privilege',
            category: 'Elevation of Privilege',
            description: 'Process accepts input that modifies control flow or executes arbitrary code.',
            mitigations: ['Input Validation', 'Least Privilege Execution', 'Sandboxing']
        },
        {
            title: 'Denial of Service',
            category: 'Denial of Service',
            description: 'Process resource exhaustion via malformed requests.',
            mitigations: ['Rate Limiting', 'Resource Quotas', 'Timeouts']
        }
    ],
    'Store': [
        {
            title: 'Insecure Data Storage',
            category: 'Information Disclosure',
            description: 'Data store does not use encryption at rest',
            mitigations: ['Encrypt Disk/Volume', 'Field Level Encryption']
        },
        {
            title: 'Integrity Violation',
            category: 'Tampering',
            description: 'Unauthorized modification of stored data.',
            mitigations: ['File Integrity Monitoring (FIM)', 'Write-Ahead Logging', 'Strict ACLs']
        }
    ],
    'Actor': [
        {
            title: 'Spoofing User',
            category: 'Spoofing',
            description: 'Malicious actor impersonating a legitimate user.',
            mitigations: ['Strong Authentication', 'Device Fingerprinting']
        }
    ],
    // --- NEW ROBUST MAPPINGS ---
    'LLM Model': [
        {
            title: 'Prompt Injection / Jailbreaking',
            category: 'Tampering',
            description: 'Attacker manipulates inputs to bypass safety filters or execute unauthorized actions.',
            mitigations: ['Input Sanitization', 'LLM Guardrails / Firewalls', 'Human in the Loop']
        },
        {
            title: 'Training Data Extraction',
            category: 'Information Disclosure',
            description: 'Attacker queries the model to reconstruct sensitive training examples.',
            mitigations: ['Differential Privacy in Training', 'Output Filtering', 'Rate Limiting']
        }
    ],
    'AI Agent': [
        {
            title: 'Goal Misalignment / Hallucination',
            category: 'Tampering',
            description: 'Agent takes unintended destructive actions based on faulty logic or hallucinations.',
            mitigations: ['Strict Permission Scoping', 'Action Confirmation Dialogs', 'Sandboxed Execution Environment']
        }
    ],
    'IoT Device': [
        {
            title: 'Physical Tampering',
            category: 'Tampering',
            description: 'Attacker gains physical access to device to extract keys or modify firmware.',
            mitigations: ['Secure Boot', 'Hardware Security Module (HSM)', 'Tamper-evident Enclosures']
        },
        {
            title: 'Insecure Firmware Update',
            category: 'Elevation of Privilege',
            description: 'Compromised update mechanism installs malicious firmware.',
            mitigations: ['Signed Firmware Updates', 'Remote Attestation']
        }
    ],
    'Container': [
        {
            title: 'Container Escape',
            category: 'Elevation of Privilege',
            description: 'Attacker breaks out of container isolation to access host OS.',
            mitigations: ['Run as Non-Root', 'Seccomp profiles', 'gVisor / Kata Containers']
        },
        {
            title: 'Insecure Image Registry',
            category: 'Tampering',
            description: 'Pulling compromised images from public registries.',
            mitigations: ['Private Registry', 'Image Scanning', 'Content Trust / Signing']
        }
    ],
    'Serverless Function': [
        {
            title: 'Event Injection',
            category: 'Tampering',
            description: 'Malicious payloads in event triggers (S3, SQS, API Gateway).',
            mitigations: ['Strict Schema Validation', 'Least Privilege IAM Roles']
        },
        {
            title: 'Resource Exhaustion (wallet denial)',
            category: 'Denial of Service',
            description: 'Function invoked repeatedly to exhaust budget/concurrency limits.',
            mitigations: ['Concurrency Limits', 'API Gateway Throttling', 'Billing Alarms']
        }
    ],
    'Object Storage': [
        {
            title: 'Public Bucket Exposure',
            category: 'Information Disclosure',
            description: 'Storage bucket configured with public read access.',
            mitigations: ['Block Public Access at Org Level', 'Bucket Policies', 'Cloud Security Posture Management (CSPM)']
        }
    ],
    'Load Balancer': [
        {
            title: 'SSL Termination Weakness',
            category: 'Information Disclosure',
            description: 'Weak cypher suites or outdated TLS versions enabled.',
            mitigations: ['Enforce TLS 1.2+', 'Hardware Security Modules', 'Strict Transport Security (HSTS)']
        }
    ],
    'Identity Provider': [
        {
            title: 'Token Theft / Replay',
            category: 'Spoofing',
            description: 'Attacker steals OIDC/SAML tokens to impersonate users.',
            mitigations: ['Short Token Lifetimes', 'Token Binding / DPoP', 'Sender Constrained Tokens']
        },
        {
            title: 'Misconfigured Scope Grants',
            category: 'Elevation of Privilege',
            description: 'IdP issues tokens with excessive permissions (scopes) to untrusted clients.',
            mitigations: ['Strict Scope Validation', 'Least Privilege for OAuth Clients', 'Audit Grants']
        },
        {
            title: 'Account Enumeration',
            category: 'Information Disclosure',
            description: 'Login endpoints reveal validity of usernames/emails.',
            mitigations: ['Generic Error Messages', 'Consistent Response Times', 'Rate Limiting']
        }
    ],
    'API Gateway': [
        {
            title: 'Bypassing Rate Limits',
            category: 'Denial of Service',
            description: 'Attacker rotates IPs or Keys to exhaust backend resources.',
            mitigations: ['Distributed Rate Limiting (Redis)', 'Anomalous Behavior Detection', 'Proof of Work']
        },
        {
            title: 'Improper Authentication Routing',
            category: 'Elevation of Privilege',
            description: 'Gateway routes unauthenticated traffic to internal services expecting auth.',
            mitigations: ['Enforce Auth at Gateway', 'Mutual TLS to internal services', 'Zero Trust Network']
        },
        {
            title: 'Shadow/Zombie APIs',
            category: 'Information Disclosure',
            description: 'Unmanaged or outdated API endpoints exposed through the gateway.',
            mitigations: ['Regular API Audits', 'Strict OpenAPI Spec Enforcement', 'Disable older versions']
        },
        {
            title: 'Request Smuggling',
            category: 'Tampering',
            description: 'Attacker hides request inside another to bypass WAF/Gateway controls.',
            mitigations: ['Strict HTTP Compliance', 'Use HTTP/2', 'Disable Transfer-Encoding']
        }
    ],
    'Microservice': [
        {
            title: 'Cascading Failure (DoS)',
            category: 'Denial of Service',
            description: 'Failure in this service causes widespread outage in dependent services.',
            mitigations: ['Circuit Breakers', 'Bulkheads', 'Graceful Degradation']
        },
        {
            title: 'Insecure Service-to-Service Comm',
            category: 'Information Disclosure',
            description: 'Internal traffic sent in plaintext, allowing interception.',
            mitigations: ['mTLS (Service Mesh)', 'Internal Network Segmentation', 'Payload Encryption']
        },
        {
            title: 'Distributed Tracing Data Leak',
            category: 'Information Disclosure',
            description: 'Trace headers/logs containing sensitive user data.',
            mitigations: ['Redact PII in logs/traces', 'Encrypted logging pipeline', 'Short retention']
        }
    ],
    'Payment Processor': [
        {
            title: 'Payment Data Tampering',
            category: 'Tampering',
            description: 'Attacker modifies transaction amount or currency before processing.',
            mitigations: [' HMAC Signatures', 'Server-side validation of amounts', 'Idempotency Keys']
        },
        {
            title: 'Replay Attacks',
            category: 'Spoofing',
            description: 'Resending valid payment requests to duplicate transactions.',
            mitigations: ['Nonce/Timestamp validation', 'Strict Idempotency', 'Short transaction windows']
        },
        {
            title: 'PCI DSS Non-Compliance',
            category: 'Information Disclosure',
            description: 'Storing sensitive cardholder data (CVV, Full PAN) improperly.',
            mitigations: ['Tokenization', 'Use hosted payment fields', 'Never store CVV']
        }
    ],
    'Vector DB': [
        {
            title: 'Prompt Injection Storage',
            category: 'Tampering',
            description: 'Storing malicious prompts that get retrieved/executed by LLM later.',
            mitigations: ['Input Validation before storage', 'Output Sanitization on retrieval']
        },
        {
            title: 'Vector Space Pollution',
            category: 'Tampering',
            description: 'Attacker injects junk data to degrade retrieval accuracy (DoS equivalent).',
            mitigations: ['Rate limiting ingestion', 'Data quality checks', 'Review pipelines']
        }
    ],
};

const PASTA_MAPPING: Record<string, any[]> = {
    'Web Client': [
        {
            title: 'Reputation Damage due to Defacement',
            category: 'Business Impact',
            description: 'Attackers modifying the visual appearance of the application to erode trust.',
            mitigations: ['File Integrity Monitoring', 'Strict CSP', 'WAF Anti-Defacement']
        }
    ],
    'Database': [
        {
            title: 'Financial Loss via Ransomware',
            category: 'Business Impact',
            description: 'Database encryption by attackers leading to extortion demands.',
            mitigations: ['Immutable Backups', 'Network Segregation', 'Egress Filtering']
        },
        {
            title: 'Regulatory Fines (GDPR/CCPA)',
            category: 'Compliance Impact',
            description: 'Data breach of PII leading to massive regulatory penalties.',
            mitigations: ['Data Encryption', 'Data Minimization', 'Cyber Insurance']
        }
    ],
    'Payment Processor': [
        {
            title: 'Fraudulent Transaction Loss',
            category: 'Business Impact',
            description: 'Attackers processing fake transactions or chargebacks.',
            mitigations: ['Fraud Detection AI', '3D Secure', 'Manual Review Thresholds']
        }
    ],
    'Mobile Client': [
        {
            title: 'App Store Delisting Risk',
            category: 'Business Impact',
            description: 'Violation of app store policies leading to business disruption.',
            mitigations: ['Compliance Review', 'automated scanning', 'Third-party audit']
        }
    ]
};

const LINDDUN_MAPPING: Record<string, any[]> = {
    'Web Client': [
        {
            title: 'User Unawareness of Collection',
            category: 'Unawareness',
            description: 'Users are not adequately informed about what data is collected via the browser.',
            mitigations: ['Privacy Notices', 'Just-in-time consent', 'Cookie Banners']
        },
        {
            title: 'Session Linkability (Fingerprinting)',
            category: 'Linkability',
            description: 'Adversary links multiple sessions to a single user without identity.',
            mitigations: ['Anti-fingerprinting techniques', 'Stateless components', 'Short-lived sessions']
        }
    ],
    'Mobile Client': [
        {
            title: 'Session Token Linkability',
            category: 'Linkability',
            description: 'Session tokens can link authentication events to banking transactions.',
            mitigations: ['Pseudonymous identifiers in logs', 'Regular rotation of pseudonyms', 'Tokenization']
        },
        {
            title: 'Device Fingerprinting',
            category: 'Linkability',
            description: 'Device fingerprints could link multiple sessions to the same user.',
            mitigations: ['Resettable device identifiers', 'Limit access to device hardware info']
        },
        {
            title: 'Identifiable Metadata Collection',
            category: 'Identifiability',
            description: 'Collection of device identifiers, location data, and biometric data.',
            mitigations: ['Data minimization', 'Anonymization in non-production', 'Strong encryption for PII']
        },
        {
            title: 'Implicit Data Collection',
            category: 'Unawareness',
            description: 'Behavioral data from app usage collected without explicit user knowledge.',
            mitigations: ['Just-in-time notifications', 'Granular consent management', 'Privacy dashboard']
        }
    ],
    'API': [
        {
            title: 'Data Leakage in API Responses',
            category: 'Disclosure of Information',
            description: 'Excessive data returned in API payloads beyond what is strictly necessary.',
            mitigations: ['Data Minimization', 'API Output Filtering', 'Strict Schema Validation']
        },
        {
            title: 'Traceable Identifiers in Endpoints',
            category: 'Identifiability',
            description: 'Use of predictable or persistent IDs that allow user identification.',
            mitigations: ['Use UUIDs/Pseudonyms', 'Rotate technical IDs', 'Tokenization']
        }
    ],
    'Database': [
        {
            title: 'Linkability of User Records',
            category: 'Linkability',
            description: 'Common identifiers allow correlation across different data sets.',
            mitigations: ['Anonymization', 'Pseudonymization at rest', 'K-Anonymity']
        },
        {
            title: 'Unauthorized Data Access',
            category: 'Disclosure of Information',
            description: 'Storage of PII without adequate protection/access controls.',
            mitigations: ['Encryption at rest', 'Access logging', 'DB-level row encryption']
        },
        {
            title: 'Direct PII Storage',
            category: 'Identifiability',
            description: 'Direct storage of PII (names, IDs) and financial records tied to identities.',
            mitigations: ['Encrypt PII fields separately', 'Data minimization', 'Pseudonymization']
        },
        {
            title: 'Retention Policy Violation',
            category: 'Non-Compliance',
            description: 'Data retained longer than necessary without automated purging.',
            mitigations: ['Automated TTL Deletion', 'Data Lifecycle Policy', 'Regular Purge Audits']
        }
    ],
    'Process': [
        {
            title: 'Opacity of Processing',
            category: 'Unawareness',
            description: 'The internal logic of the process is opaque to the user, hiding potential bias or misuse.',
            mitigations: ['Algorithmic Transparency', 'Explainable AI', 'Public Documentation']
        },
        {
            title: 'Unnecessary Data Processing',
            category: 'Identifiability',
            description: 'Process ingests more data fields than required for the specific function.',
            mitigations: ['Input Filtering', 'Privacy by Design', 'Data Minimization']
        }
    ],
    'Store': [
        {
            title: 'Insecure Logs / History',
            category: 'Disclosure of Information',
            description: 'Logs or backup stores containing cleartext PII.',
            mitigations: ['Log Redaction', 'Encrypted Backups', 'Short Retention']
        },
        {
            title: 'Data Emanation',
            category: 'Disclosure of Information',
            description: 'Side-channel leakage from storage (e.g., size, timing).',
            mitigations: ['Padding', 'Constant-time operations']
        }
    ],

    // --- COMPREHENSIVE LINDDUN MAPPINGS FOR NEW TYPES ---
    'Identity Provider': [
        {
            title: 'IdP Impersonation',
            category: 'Identifiability',
            description: 'If the IdP is compromised, all user identities are exposed and linkable across services.',
            mitigations: ['Harden IdP Infrastructure', 'Monitor IdP Logs', 'Use Hardware Security Modules']
        },
        {
            title: 'Metadata Leakage in Tokens',
            category: 'Disclosure of Information',
            description: 'JWTs or SAML assertions containing excessive user attributes (Roles, Emails, Groups).',
            mitigations: ['Minimize Claims', 'Encrypt Tokens (JWE)', 'Opaque Tokens']
        },
        {
            title: 'Authentication Pattern Detectability',
            category: 'Detectability',
            description: 'Login times/frequencies could reveal user habits.',
            mitigations: ['Private information retrieval', 'Noise injection']
        }
    ],
    'Firewall/WAF': [
        {
            title: 'Traffic Analysis (Side Channel)',
            category: 'Identifiability',
            description: 'Encrypted traffic patterns revealing user activity or identity.',
            mitigations: ['Traffic Padding', 'Decoroy Routing']
        },
        {
            title: 'Log Data Exposure',
            category: 'Disclosure of Information',
            description: 'WAF logs storing sensitive headers, cookies, or payloads.',
            mitigations: ['Log Redaction/Masking', 'Secure Log Storage', 'Short Retention Policies']
        }
    ],
    'API Gateway': [
        {
            title: 'Global Correlation ID Tracking',
            category: 'Linkability',
            description: 'Gateway generating persistent tracking IDs for all user requests across microservices.',
            mitigations: ['Rotate Correlation IDs', 'Use separate internal/external IDs']
        },
        {
            title: 'Unintended Data Exposure in Errors',
            category: 'Disclosure of Information',
            description: 'Gateway error messages revealing backend architecture or data types.',
            mitigations: ['Generic Error Messages', 'Strip Internal Headers']
        }
    ],
    'Microservice': [
        {
            title: 'Service-to-Service Data Leakage',
            category: 'Disclosure of Information',
            description: 'Internal services sharing excessive user context via headers or payloads.',
            mitigations: ['Zero Trust Architecture', 'Service Mesh mTLS', 'Strict API Contracts']
        },
        {
            title: 'Aggregation of User Data',
            category: 'Linkability',
            description: 'Service aggregating data from multiple sources to creating a detailed user profile.',
            mitigations: ['Purpose Limitation', 'Data Siloing', 'Policy Enforcement']
        }
    ],
    'Vector DB': [
        {
            title: 'Reconstruction of Embeddings',
            category: 'Identifiability',
            description: 'Inverting vector embeddings to recover original text or user attributes.',
            mitigations: ['Embedding Differential Privacy', 'Access Controls on Vector Search']
        },
        {
            title: 'Unlinkability Violation via Similarity',
            category: 'Linkability',
            description: 'Using vector similarity to link pseudonymous records to real identities.',
            mitigations: ['Add Noise to vectors', 'Threshold-based Access']
        },
        {
            title: 'Detectability via Query Patterns',
            category: 'Detectability',
            description: 'Query patterns could reveal sensitive financial interests or concerns.',
            mitigations: ['Query padding', 'Private information retrieval techniques', 'Noise injection']
        },
        {
            title: 'Data Aggregation Risks',
            category: 'Disclosure of Information',
            description: 'Combining vector data with other sources could reveal sensitive patterns.',
            mitigations: ['Data segmentation', 'Access control separation']
        }
    ],
    'External Service': [
        {
            title: 'Third-Party Data Sharing',
            category: 'Disclosure of Information',
            description: 'Sharing user data with external vendors without explicit consent.',
            mitigations: ['Data Processing Agreements (DPA)', 'Data Minimization', 'User Consent Management']
        },
        {
            title: 'Vendor Non-Compliance',
            category: 'Non-compliance',
            description: 'External service operating in a jurisdiction with lower privacy standards.',
            mitigations: ['Standard Contractual Clauses (SCCs)', 'Vendor Risk Assessment']
        }
    ],
    'Payment Processor': [
        {
            title: 'Transaction Linkability',
            category: 'Linkability',
            description: 'Transaction metadata could link to external payment identities.',
            mitigations: ['Tokenization of payment data', 'Pseudonymous identifiers']
        },
        {
            title: 'Behavioral Detectability',
            category: 'Detectability',
            description: 'Timing and frequency of calls could reveal transaction behaviors.',
            mitigations: ['Uniform API call patterns', 'Noise injection in timings']
        },
        {
            title: 'Third-Party Sharing Unawareness',
            category: 'Unawareness',
            description: 'Users may not understand that data is shared with payment processors.',
            mitigations: ['Clear privacy notices', 'Granular consent']
        },
        {
            title: 'Cross-Border Transfer Non-compliance',
            category: 'Non-compliance',
            description: 'Data potentially flowing through multiple jurisdictions via payment processor.',
            mitigations: ['Data residency controls', 'Standard Contractual Clauses']
        }
    ],
    'Actor': [
        {
            title: 'Identity Spoofing (Privacy Breach)',
            category: 'Identifiability',
            description: 'Adversary identifies a user through behavioral patterns.',
            mitigations: ['Strong Authentication', 'Privacy-preserving telemetry']
        }
    ],
    // --- NEW ROBUST LINDDUN MAPPINGS ---
    'LLM Model': [
        {
            title: 'Model Inversion / Reconstruction',
            category: 'Identifiability',
            description: 'Reconstructing sensitive attributes or identities from model outputs.',
            mitigations: ['Differential Privacy', 'Avoid training on PII', 'Output generalization']
        },
        {
            title: 'Training Data Memorization',
            category: 'Disclosure of Information',
            description: 'Model memorizes unique PII sequences and regurgitates them.',
            mitigations: ['Data Deduplication', 'PII Scrubbing before training', 'Machine Unlearning']
        },
        {
            title: 'Inference Attacks',
            category: 'Disclosure of Information',
            description: 'Attackers could deduce sensitive info (health, relationships) from AI responses.',
            mitigations: ['Output filtering', 'Sanitization', 'Privacy impact assessments']
        },
        {
            title: 'Linkability via Query Patterns',
            category: 'Linkability',
            description: 'AI queries may contain patterns linkable to specific users.',
            mitigations: ['Pseudonymous identifiers', 'Differential privacy in training']
        },
        {
            title: 'Recommendation Non-repudiation',
            category: 'Non-repudiation',
            description: 'Users may deny accepting or acting on AI advice; lack of records.',
            mitigations: ['User acknowledgment mechanisms', 'Immutable audit trails']
        },
        {
            title: 'Training Data Unawareness',
            category: 'Unawareness',
            description: 'Users may not understand how their data trains the AI.',
            mitigations: ['Explainable AI', 'Privacy dashboard usages', 'Clear notices']
        }
    ],
    'AI Agent': [
        {
            title: 'Goal Misalignment / Hallucination',
            category: 'Tampering',
            description: 'Agent takes unintended destructive actions based on faulty logic or hallucinations.',
            mitigations: ['Strict Permission Scoping', 'Action Confirmation Dialogs', 'Sandboxed Execution Environment']
        },
        {
            title: 'Inference of Sensitive Attributes',
            category: 'Disclosure of Information',
            description: 'Agent infers non-financial sensitive info from interactions.',
            mitigations: ['Purpose limitation', 'Regular privacy reviews']
        }
    ],
    'IoT Device': [
        {
            title: 'Location Tracking',
            category: 'Identifiability',
            description: 'Device metadata or signal strength reveals user location history.',
            mitigations: ['Location fuzzing', 'Local processing of raw sensor data', 'Randomized MAC addresses']
        },
        {
            title: 'Surveillance / Eavesdropping',
            category: 'Unawareness',
            description: 'Always-on sensors record user activity without explicit ongoing consent.',
            mitigations: ['Hardware Mute Switches', 'Status LEDs', 'Periodic Re-consent']
        }
    ],

};

export const createThreatModelsRouter = (t: any, clientProcedure: any) => {
    return t.router({
        create: clientProcedure
            .input(z.object({
                clientId: z.coerce.number(),
                devProjectId: z.coerce.number().optional(),
                projectId: z.coerce.number().optional(),
                name: z.string(),
                methodology: z.string().default('STRIDE'),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();

                const [newModel] = await db.insert(threatModels)
                    .values({
                        clientId: input.clientId,
                        devProjectId: input.devProjectId,
                        projectId: input.projectId,
                        name: input.name,
                        methodology: input.methodology,
                        status: 'active'
                    } as any)
                    .returning();

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "create",
                    entityType: "threat_model",
                    entityId: newModel.id,
                    details: { name: newModel.name }
                });

                return newModel;
            }),

        get: clientProcedure
            .input(z.object({
                id: z.coerce.number(),
                clientId: z.coerce.number()
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const [model] = await db.select().from(threatModels).where(and(eq(threatModels.id, input.id), eq(threatModels.clientId, input.clientId)));

                if (!model) throw new TRPCError({ code: 'NOT_FOUND', message: 'Threat model not found' });

                const components = await db.select().from(threatModelComponents).where(eq(threatModelComponents.threatModelId, input.id));
                const flows = await db.select().from(threatModelDataFlows).where(eq(threatModelDataFlows.threatModelId, input.id));

                // Fetch identified risks and their mitigations
                const risks = await db.select().from(riskScenarios).where(eq(riskScenarios.threatModelId, input.id));
                const risksWithMitigations = await Promise.all(risks.map(async (risk) => {
                    const treatments = await db.select().from(riskTreatments).where(eq(riskTreatments.riskScenarioId, risk.id));
                    return {
                        ...risk,
                        mitigations: treatments.map(t => t.strategy).filter(Boolean) as string[]
                    };
                }));

                return { ...model, components, flows, risks: risksWithMitigations };
            }),

        addComponent: clientProcedure
            .input(z.object({
                threatModelId: z.coerce.number(),
                name: z.string(),
                type: z.string(),
                description: z.string().optional(),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const [component] = await db.insert(threatModelComponents)
                    .values(input as any)
                    .returning();
                return component;
            }),

        removeComponent: clientProcedure
            .input(z.object({
                id: z.number(),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.delete(threatModelComponents).where(eq(threatModelComponents.id, input.id));
                // Also delete related flows
                await db.delete(threatModelDataFlows).where(or(
                    eq(threatModelDataFlows.sourceComponentId, input.id),
                    eq(threatModelDataFlows.targetComponentId, input.id)
                ));
                return { success: true };
            }),

        updateComponentPosition: clientProcedure
            .input(z.object({
                id: z.coerce.number(),
                x: z.number(),
                y: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.update(threatModelComponents)
                    .set({ x: input.x, y: input.y })
                    .where(eq(threatModelComponents.id, input.id));
                return { success: true };
            }),

        saveFlow: clientProcedure
            .input(z.object({
                threatModelId: z.number(),
                sourceComponentId: z.number(),
                targetComponentId: z.number(),
                protocol: z.string().optional(),
                description: z.string().optional(),
                isEncrypted: z.boolean().optional()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const [flow] = await db.insert(threatModelDataFlows)
                    .values(input as any)
                    .returning();
                return flow;
            }),

        updateFlow: clientProcedure
            .input(z.object({
                id: z.number(),
                protocol: z.string().optional(),
                description: z.string().optional(),
                isEncrypted: z.boolean().optional()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.update(threatModelDataFlows)
                    .set({
                        protocol: input.protocol,
                        description: input.description,
                        isEncrypted: input.isEncrypted
                    })
                    .where(eq(threatModelDataFlows.id, input.id));
                return { success: true };
            }),


        removeFlow: clientProcedure
            .input(z.object({
                id: z.number(),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.delete(threatModelDataFlows).where(eq(threatModelDataFlows.id, input.id));
                return { success: true };
            }),

        generateRisks: clientProcedure
            .input(z.object({
                threatModelId: z.coerce.number(),
            }))
            .mutation(async ({ input }: any) => {
                try {
                    const db = await getDb();

                    if (isNaN(input.threatModelId)) {
                        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid Threat Model ID' });
                    }

                    // Fetch the model to get methodology
                    const [model] = await db.select().from(threatModels).where(eq(threatModels.id, input.threatModelId));
                    if (!model) throw new TRPCError({ code: 'NOT_FOUND', message: 'Threat model not found' });

                    const methodology = (model.methodology || 'STRIDE').toUpperCase();

                    // Determine which mappings to run
                    let mappingsToRun = [];
                    if (methodology === 'COMBINED' || methodology === 'STRIDE+LINDDUN') {
                        mappingsToRun.push({ map: STRIDE_MAPPING, prefix: 'STRIDE Security' });
                        mappingsToRun.push({ map: LINDDUN_MAPPING, prefix: 'LINDDUN Privacy' });
                        mappingsToRun.push({ map: PASTA_MAPPING, prefix: 'PASTA Business Impact' });
                    } else if (methodology === 'LINDDUN') {
                        mappingsToRun.push({ map: LINDDUN_MAPPING, prefix: 'LINDDUN Privacy' });
                    } else if (methodology === 'PASTA') {
                        mappingsToRun.push({ map: PASTA_MAPPING, prefix: 'PASTA Business Impact' });
                        mappingsToRun.push({ map: STRIDE_MAPPING, prefix: 'STRIDE Technical' });
                    } else {
                        mappingsToRun.push({ map: STRIDE_MAPPING, prefix: 'STRIDE Security' });
                    }

                    const components = await db.select().from(threatModelComponents).where(eq(threatModelComponents.threatModelId, input.threatModelId));
                    const flows = await db.select().from(threatModelDataFlows).where(eq(threatModelDataFlows.threatModelId, input.threatModelId));

                    const suggestedRisks = [];
                    const seenTitles = new Set(); // Avoid dupes

                    // 1. Component Analysis Loop
                    for (const { map, prefix } of mappingsToRun) {
                        for (const comp of components) {
                            if (!comp.name) continue;
                            const rules = map[comp.type] || [];
                            if (!Array.isArray(rules)) continue;

                            for (const rule of rules) {
                                const uniqueKey = `${comp.name}-${rule.title}`;
                                if (!seenTitles.has(uniqueKey)) {
                                    suggestedRisks.push({
                                        title: `${rule.title} on ${comp.name}`,
                                        description: (rule.description || '').replace(/App/g, comp.name).replace(/Device/g, comp.name).replace(/Service/g, comp.name).replace(/Model/g, comp.name).replace(/Agent/g, comp.name) + ` (detected on ${comp.type})`,
                                        category: rule.category,
                                        componentName: comp.name,
                                        componentType: comp.type,
                                        source: `Automated ${prefix}`,
                                        mitigations: rule.mitigations || []
                                    });
                                    seenTitles.add(uniqueKey);
                                }
                            }
                        }
                    }

                    // 2. Flow Analysis Loop
                    for (const flow of flows) {
                        const sourceComp = components.find(c => c.id === flow.sourceComponentId);
                        const targetComp = components.find(c => c.id === flow.targetComponentId);
                        const source = sourceComp?.name || 'Unknown';
                        const target = targetComp?.name || 'Unknown';
                        const sourceType = sourceComp?.type || '';
                        const targetType = targetComp?.type || '';

                        // Rule 1: Trust Boundary Violation
                        if (sourceType === 'External Service' && targetType === 'Microservice') {
                            const uniqueKey = `Trust-Boundary-${flow.id}`;
                            if (!seenTitles.has(uniqueKey)) {
                                suggestedRisks.push({
                                    title: `Trust Boundary Violation: Direct External Access to ${target}`,
                                    description: `External Service (${source}) interacts directly with internal Microservice (${target}) without an API Gateway or WAF.`,
                                    category: 'PASTA: Blueprinting',
                                    componentName: `${source} -> ${target}`,
                                    componentType: 'Data Flow',
                                    source: 'Architecture Analysis',
                                    mitigations: ['Place an API Gateway in front', 'Implement strict whitelist', 'Zero Trust Validation']
                                });
                                seenTitles.add(uniqueKey);
                            }
                        }

                        // Rule 2: Client Direct DB Access
                        if ((sourceType.includes('Client') || sourceType.includes('Mobile')) && targetType === 'Database') {
                            const uniqueKey = `Client-DB-Access-${flow.id}`;
                            if (!seenTitles.has(uniqueKey)) {
                                suggestedRisks.push({
                                    title: `Insecure Architecture: Client-Side Database Access`,
                                    description: `${source} is directly connecting to ${target}. This exposes credentials and allows arbitrary queries.`,
                                    category: 'PASTA: Attack Surface',
                                    componentName: `${source} -> ${target}`,
                                    componentType: 'Data Flow',
                                    source: 'Architecture Analysis',
                                    mitigations: ['Remove direct DB access', 'Use a backend API layer', 'Implement stored procedures with strict permissions']
                                });
                                seenTitles.add(uniqueKey);
                            }
                        }

                        if (!flow.isEncrypted) {
                            const uniqueKey = `Flow-Unencrypted-${flow.id}`;
                            if (!seenTitles.has(uniqueKey)) {
                                suggestedRisks.push({
                                    title: `Unencrypted Data Flow (${source} -> ${target})`,
                                    description: `Data transmitted over ${flow.protocol || 'network'} without encryption. Sensitive data (PII/Credentials) may be intercepted.`,
                                    category: 'Information Disclosure',
                                    componentName: `${source} -> ${target}`,
                                    componentType: 'Data Flow',
                                    source: 'Automated Flow Analysis',
                                    mitigations: ['Implement TLS 1.2+', 'Encrypt payload', 'ASVS V9: Communications Security']
                                });
                                seenTitles.add(uniqueKey);
                            }
                        }

                        if (['HTTP', 'FTP', 'Telnet'].includes((flow.protocol || '').toUpperCase())) {
                            const uniqueKey = `Flow-Insecure-${flow.id}`;
                            if (!seenTitles.has(uniqueKey)) {
                                suggestedRisks.push({
                                    title: `Insecure Protocol Usage (${flow.protocol})`,
                                    description: `${flow.protocol} is known to be insecure and should be replaced.`,
                                    category: 'Tampering',
                                    componentName: `${source} -> ${target}`,
                                    componentType: 'Data Flow',
                                    source: 'Automated Flow Analysis',
                                    mitigations: ['Upgrade to HTTPS/SFTP/SSH', 'Disable insecure protocols']
                                });
                                seenTitles.add(uniqueKey);
                            }
                        }
                    }

                    return suggestedRisks;
                } catch (error: any) {
                    console.error("Error generating risks:", error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Failed to generate risks: ${error.message}`
                    });
                }
            }),


        commitRisks: clientProcedure
            .input(z.object({
                clientId: z.number(),
                devProjectId: z.number(),
                threatModelId: z.number(),
                risks: z.array(z.object({
                    title: z.string(),
                    description: z.string(),
                    likelihood: z.number().min(1).max(5),
                    impact: z.number().min(1).max(5),
                    privacyImpact: z.boolean().optional(),
                    category: z.string().optional(),
                    selectedMitigations: z.array(z.string()).optional()
                }))
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const results = [];

                for (const risk of input.risks) {
                    const inherentScore = risk.likelihood * risk.impact;
                    const inherentRisk = scoreToRiskLevel(inherentScore);

                    // 1. Create Risk Scenario (Project Level)
                    const [savedScenario] = await db.insert(riskScenarios).values({
                        clientId: input.clientId,
                        devProjectId: input.devProjectId,
                        threatModelId: input.threatModelId,
                        assessmentType: 'project',
                        title: risk.title,
                        description: risk.description,
                        likelihood: String(risk.likelihood),
                        impact: String(risk.impact),
                        inherentScore,
                        inherentRisk,
                        privacyImpact: risk.privacyImpact || false,
                        category: risk.category || 'General',
                        status: 'draft',
                        updatedAt: new Date()
                    } as any).returning();

                    // 2. Create Global Risk Assessment (Enterprise Level - "The Register")
                    const [savedAssessment] = await db.insert(riskAssessments).values({
                        clientId: input.clientId,
                        assessmentId: `TM-${input.threatModelId}-${Date.now()}-${results.length + 1}`, // Unique ID per risk
                        title: risk.title,
                        threatDescription: risk.description, // Map description here
                        likelihood: String(risk.likelihood),
                        impact: String(risk.impact),
                        inherentScore,
                        inherentRisk,
                        riskId: savedScenario.id, // Link back to scenario
                        projectId: input.devProjectId, // CRITICAL: Link to project for filtering
                        privacyImpact: risk.privacyImpact || false, // CRITICAL: Link for privacy dashboard
                        category: risk.category || 'General',
                        status: 'draft',
                        contextSnapshot: {
                            source: 'Threat Model',
                            projectId: input.devProjectId,
                            threatModelId: input.threatModelId
                        },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    } as any).returning();

                    // 3. Add Mitigations as Treatments (Linked to BOTH)
                    if (risk.selectedMitigations && risk.selectedMitigations.length > 0) {
                        for (const mitigation of risk.selectedMitigations) {
                            await db.insert(riskTreatments).values({
                                clientId: input.clientId,
                                riskScenarioId: savedScenario.id,
                                riskAssessmentId: savedAssessment.id, // Critical for global dashboard visibility
                                treatmentType: 'mitigate',
                                strategy: mitigation,
                                status: 'planned',
                                updatedAt: new Date()
                            } as any);
                        }
                    }

                    results.push(savedAssessment);
                }

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "update",
                    entityType: "threat_model",
                    entityId: input.threatModelId,
                    details: { action: "committed_risks", count: results.length }
                });

                return results;
            }),

        exportToThreatDragon: clientProcedure
            .input(z.object({
                id: z.number(),
                clientId: z.number()
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const [model] = await db.select().from(threatModels).where(and(eq(threatModels.id, input.id), eq(threatModels.clientId, input.clientId)));
                if (!model) throw new TRPCError({ code: 'NOT_FOUND', message: 'Model not found' });

                const components = await db.select().from(threatModelComponents).where(eq(threatModelComponents.threatModelId, input.id));
                const flows = await db.select().from(threatModelDataFlows).where(eq(threatModelDataFlows.threatModelId, input.id));

                const cells = [];

                // Map Components
                components.forEach((c: any) => {
                    cells.push({
                        id: String(c.id),
                        shape: c.type === 'Actor' ? 'actor' : c.type === 'Store' ? 'store' : 'process', // Simple mapping
                        data: {
                            name: c.name,
                            type: c.type,
                            description: c.description
                        },
                        position: { x: c.x, y: c.y },
                        size: { width: 160, height: 80 },
                        zIndex: 10
                    });
                });

                // Map Flows
                flows.forEach((f: any) => {
                    cells.push({
                        id: String(f.id),
                        shape: 'flow',
                        source: { cell: String(f.sourceComponentId) },
                        target: { cell: String(f.targetComponentId) },
                        data: {
                            name: f.protocol || 'Flow',
                            protocol: f.protocol,
                            isEncrypted: f.isEncrypted
                        },
                        zIndex: 20
                    });
                });

                return {
                    summary: {
                        title: model.name,
                        owner: "ComplianceOS User",
                        description: "Exported from ComplianceOS"
                    },
                    detail: {
                        diagrams: [
                            {
                                title: "Main Diagram",
                                cells: cells
                            }
                        ]
                    }
                };
            }),

        importFromThreatDragon: clientProcedure
            .input(z.object({
                clientId: z.number(),
                devProjectId: z.number(),
                json: z.string() // The raw JSON string
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                let data;
                try {
                    data = JSON.parse(input.json);
                } catch (e) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON' });
                }

                const modelName = data.summary?.title || "Imported Threat Dragon Model";

                // Create Model
                const [newModel] = await db.insert(threatModels)
                    .values({
                        clientId: input.clientId,
                        devProjectId: input.devProjectId,
                        name: modelName,
                        methodology: 'STRIDE',
                        status: 'active'
                    } as any)
                    .returning();

                // Import Diagram (Assuming first diagram)
                const diagram = data.detail?.diagrams?.[0];
                if (!diagram) return newModel;

                const componentMap = new Map(); // Old ID -> New ID

                // 1. Import Components (Nodes)
                const nodes = diagram.cells.filter((c: any) => c.shape !== 'flow');
                for (const node of nodes) {
                    // Map TD shape to our Type
                    let type = 'Process';
                    if (node.shape === 'actor') type = 'Actor';
                    if (node.shape === 'store') type = 'Store';
                    // Fallback to name-based heuristic if shape is generic
                    if (node.data?.type) type = node.data.type;

                    const [comp] = await db.insert(threatModelComponents).values({
                        threatModelId: newModel.id,
                        name: node.data?.name || 'Unnamed',
                        type: type,
                        description: node.data?.description || '',
                        x: node.position?.x || 0,
                        y: node.position?.y || 0
                    } as any).returning();
                    componentMap.set(node.id, comp.id);
                }

                // 2. Import Flows (Edges)
                const edges = diagram.cells.filter((c: any) => c.shape === 'flow');
                for (const edge of edges) {
                    const sourceId = componentMap.get(edge.source?.cell);
                    const targetId = componentMap.get(edge.target?.cell);

                    if (sourceId && targetId) {
                        await db.insert(threatModelDataFlows).values({
                            threatModelId: newModel.id,
                            sourceComponentId: sourceId,
                            targetComponentId: targetId,
                            protocol: edge.data?.protocol || 'HTTP',
                            isEncrypted: edge.data?.isEncrypted || false,
                            description: edge.data?.name || ''
                        } as any);
                    }
                }

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "import",
                    entityType: "threat_model",
                    entityId: newModel.id,
                    details: { name: modelName, components: nodes.length }
                });

                return newModel;
            }),

        list: clientProcedure
            .input(z.object({
                clientId: z.coerce.number(),
                devProjectId: z.coerce.number().optional(),
                projectId: z.coerce.number().optional(),
                relaxedProjectSearch: z.boolean().optional(),
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();

                // Base condition: Client ID match
                const conditions = [eq(threatModels.clientId, input.clientId)];

                if (input.relaxedProjectSearch && input.projectId) {
                    // Search for ID in EITHER projectId OR devProjectId
                    const clause = or(
                        eq(threatModels.projectId, input.projectId),
                        eq(threatModels.devProjectId, input.projectId)
                    );
                    if (clause) conditions.push(clause);
                } else {
                    // Standard strict filtering
                    if (input.devProjectId) {
                        conditions.push(eq(threatModels.devProjectId, input.devProjectId));
                    }
                    if (input.projectId) {
                        conditions.push(eq(threatModels.projectId, input.projectId));
                    }
                }

                return await db.select().from(threatModels).where(and(...conditions));
            })
    });
};
