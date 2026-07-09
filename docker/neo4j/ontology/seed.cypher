// ──────────────────────────────────────────────────────────
// Cybersecurity Knowledge Graph — Ontology Seed
// PREMIUM FEATURE
//
// Run: cat ontology/seed.cypher | cypher-shell -u neo4j -p knowledge123
// Or: docker exec -i complianceos-neo4j-1 cypher-shell -u neo4j -p knowledge123 < seed.cypher
// ──────────────────────────────────────────────────────────

// ── Constraints (unique entity IDs) ───────────────────────
CREATE CONSTRAINT asset_id IF NOT EXISTS FOR (a:Asset) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT control_id IF NOT EXISTS FOR (c:Control) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT framework_id IF NOT EXISTS FOR (f:Framework) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT regulation_id IF NOT EXISTS FOR (r:Regulation) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT threat_id IF NOT EXISTS FOR (t:Threat) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT finding_id IF NOT EXISTS FOR (f:Finding) REQUIRE f.id IS UNIQUE;

// ── Frameworks ───────────────────────────────────────────
MERGE (f:Framework {id: 'nis2', name: 'NIS2', version: '2023'})
  SET f.category = 'EU Directive';

MERGE (f:Framework {id: 'iso27001', name: 'ISO 27001:2022', version: '2022'})
  SET f.category = 'International Standard';

MERGE (f:Framework {id: 'dora', name: 'DORA', version: '2023'})
  SET f.category = 'EU Regulation';

MERGE (f:Framework {id: 'gdpr', name: 'GDPR', version: '2018'})
  SET f.category = 'EU Regulation';

MERGE (f:Framework {id: 'nist-csf', name: 'NIST CSF 2.0', version: '2.0'})
  SET f.category = 'US Framework';

// ── Regulations ──────────────────────────────────────────
MERGE (r:Regulation {id: 'eu-nis2', name: 'NIS2 Directive (EU) 2022/2555'});
MERGE (r:Regulation {id: 'eu-dora', name: 'Digital Operational Resilience Act (EU) 2022/2554'});
MERGE (r:Regulation {id: 'eu-gdpr', name: 'General Data Protection Regulation (EU) 2016/679'});
MERGE (r:Regulation {id: 'iso-27001-reg', name: 'ISO/IEC 27001:2022 Information Security Management'});

// ── Regulations govern Frameworks ────────────────────────
MATCH (r:Regulation {id: 'eu-nis2'}), (f:Framework {id: 'nis2'})
  MERGE (r)-[:GOVERNS]->(f);
MATCH (r:Regulation {id: 'eu-dora'}), (f:Framework {id: 'dora'})
  MERGE (r)-[:GOVERNS]->(f);
MATCH (r:Regulation {id: 'eu-gdpr'}), (f:Framework {id: 'gdpr'})
  MERGE (r)-[:GOVERNS]->(f);
MATCH (r:Regulation {id: 'iso-27001-reg'}), (f:Framework {id: 'iso27001'})
  MERGE (r)-[:GOVERNS]->(f);

// ── Sample Controls ──────────────────────────────────────
MERGE (c:Control {id: 'nis2-1', name: 'Risk Analysis & Information Security Policies',
  description: 'Conduct risk analysis and establish information security policies.',
  framework: 'nis2'});
MERGE (c:Control {id: 'nis2-2', name: 'Incident Handling',
  description: 'Establish incident detection, reporting, and handling procedures.',
  framework: 'nis2'});
MERGE (c:Control {id: 'nis2-3', name: 'Business Continuity',
  description: 'Business continuity, crisis management, and disaster recovery.',
  framework: 'nis2'});
MERGE (c:Control {id: 'nis2-4', name: 'Supply Chain Security',
  description: 'Security requirements for direct suppliers and service providers.',
  framework: 'nis2'});
MERGE (c:Control {id: 'nis2-5', name: 'Access Control',
  description: 'Access control policies, identity management, and authentication.',
  framework: 'nis2'});

// ── Controls map to Frameworks ───────────────────────────
MATCH (c:Control {framework: 'nis2'}), (f:Framework {id: 'nis2'})
  MERGE (c)-[:MAPS_TO]->(f);

// ── Common Threats ───────────────────────────────────────
MERGE (t:Threat {id: 'threat-ransomware', name: 'Ransomware',
  description: 'Encrypts files and demands payment for decryption.',
  mitre: 'T1486'});
MERGE (t:Threat {id: 'threat-phishing', name: 'Phishing & Social Engineering',
  description: 'Deceptive emails or messages to steal credentials.',
  mitre: 'T1566'});
MERGE (t:Threat {id: 'threat-credential-dumping', name: 'Credential Dumping',
  description: 'Extraction of authentication credentials from system memory.',
  mitre: 'T1003'});
MERGE (t:Threat {id: 'threat-c2', name: 'Command & Control',
  description: 'Remote communication with compromised systems.',
  mitre: 'T1071'});
MERGE (t:Threat {id: 'threat-data-exfil', name: 'Data Exfiltration',
  description: 'Unauthorized transfer of data from the organization.',
  mitre: 'T1048'});

// ── Threats mitigated by Controls ────────────────────────
MATCH (t:Threat {id: 'threat-ransomware'}), (c:Control {id: 'nis2-3'})
  MERGE (t)-[:MITIGATED_BY]->(c);
MATCH (t:Threat {id: 'threat-phishing'}), (c:Control {id: 'nis2-1'})
  MERGE (t)-[:MITIGATED_BY]->(c);
MATCH (t:Threat {id: 'threat-credential-dumping'}), (c:Control {id: 'nis2-5'})
  MERGE (t)-[:MITIGATED_BY]->(c);
MATCH (t:Threat {id: 'threat-c2'}), (c:Control {id: 'nis2-2'})
  MERGE (t)-[:MITIGATED_BY]->(c);
MATCH (t:Threat {id: 'threat-data-exfil'}), (c:Control {id: 'nis2-3'})
  MERGE (t)-[:MITIGATED_BY]->(c);

// ── Sample Assets ────────────────────────────────────────
MERGE (a:Asset {id: 'asset-db-prod', name: 'Production Database',
  type: 'database', environment: 'production'});
MERGE (a:Asset {id: 'asset-web-prod', name: 'Production Web Server',
  type: 'server', environment: 'production'});
MERGE (a:Asset {id: 'asset-s3-critical', name: 'Customer Data S3 Bucket',
  type: 'cloud-storage', environment: 'production'});
MERGE (a:Asset {id: 'asset-vpn', name: 'VPN Gateway',
  type: 'network', environment: 'infrastructure'});

// ── Assets protected by Controls ─────────────────────────
MATCH (a:Asset {id: 'asset-db-prod'}), (c:Control {id: 'nis2-5'})
  MERGE (a)-[:PROTECTED_BY]->(c);
MATCH (a:Asset {id: 'asset-s3-critical'}), (c:Control {id: 'nis2-5'})

// ── Indexes for query performance ────────────────────────
CREATE INDEX asset_type_idx IF NOT EXISTS FOR (a:Asset) ON (a.type);
CREATE INDEX control_framework_idx IF NOT EXISTS FOR (c:Control) ON (c.framework);
CREATE INDEX threat_mitre_idx IF NOT EXISTS FOR (t:Threat) ON (t.mitre);

// ── Verification queries ─────────────────────────────────
// Count all entities:
// MATCH (n) RETURN labels(n), count(*) as count ORDER BY count DESC
//
// Find path from Threat to Control:
// MATCH path = (t:Threat)-[:MITIGATED_BY]->(c:Control)-[:MAPS_TO]->(f:Framework)
// RETURN t.name, c.name, f.name LIMIT 20
//
// Find what protects an asset:
// MATCH (a:Asset {name: 'Production Database'})-[:PROTECTED_BY]->(c:Control)
// RETURN c.name, c.description
