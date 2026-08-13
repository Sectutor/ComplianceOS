import { getDb } from "../../db";
import { riskAssessments, clientControls, controls } from "../../schema";
import { eq, and } from "drizzle-orm";

export interface CisaKevVulnerability {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  mappedControlCategory: string;
  cvssScore: number;
}

export const CISA_KEV_CATALOG: CisaKevVulnerability[] = [
  {
    cveId: "CVE-2021-44228",
    vendorProject: "Apache",
    product: "Log4j2",
    vulnerabilityName: "Apache Log4j2 Remote Code Execution Vulnerability",
    dateAdded: "2021-12-10",
    shortDescription: "Apache Log4j2 JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints.",
    requiredAction: "Upgrade to Log4j v2.17.1 or apply vendor mitigations immediately.",
    mappedControlCategory: "Configuration Management",
    cvssScore: 10.0,
  },
  {
    cveId: "CVE-2023-34362",
    vendorProject: "Progress",
    product: "MOVEit Transfer",
    vulnerabilityName: "Progress MOVEit Transfer SQL Injection Vulnerability",
    dateAdded: "2023-06-02",
    shortDescription: "MOVEit Transfer contains a SQL injection vulnerability that could allow an unauthenticated attacker to gain access to MOVEit Transfer's database.",
    requiredAction: "Apply vendor patches or disable HTTP/HTTPS access to MOVEit environment.",
    mappedControlCategory: "Access Control",
    cvssScore: 9.8,
  },
  {
    cveId: "CVE-2023-4966",
    vendorProject: "Citrix",
    product: "NetScaler ADC and NetScaler Gateway",
    vulnerabilityName: "Citrix NetScaler Sensitive Information Disclosure (Citrix Bleed)",
    dateAdded: "2023-10-18",
    shortDescription: "Citrix NetScaler ADC and Gateway contain a buffer overflow vulnerability allowing sensitive information disclosure and session hijacking.",
    requiredAction: "Update to latest firmware version and terminate active sessions.",
    mappedControlCategory: "System and Communications Protection",
    cvssScore: 9.4,
  },
  {
    cveId: "CVE-2024-21626",
    vendorProject: "runc",
    product: "runc container runtime",
    vulnerabilityName: "runc Container Breakout Vulnerability",
    dateAdded: "2024-01-31",
    shortDescription: "runc allows container breakout via file descriptor leak allowing unauthorized access to host file system.",
    requiredAction: "Upgrade runc to v1.1.12 or higher across all Kubernetes nodes.",
    mappedControlCategory: "Boundary Protection",
    cvssScore: 8.6,
  },
];

/**
 * Scan client against CISA Known Exploited Vulnerabilities catalog.
 */
export async function evaluateCisaKevThreats(clientId: number) {
  const db = await getDb();

  let risksCreated = 0;
  const identifiedThreats: CisaKevVulnerability[] = [];

  for (const kev of CISA_KEV_CATALOG) {
    // Check if risk already exists in client risk register
    const existingRisk = await db
      .select()
      .from(riskAssessments)
      .where(and(eq(riskAssessments.clientId, clientId), eq(riskAssessments.title, `[CISA KEV] ${kev.cveId}: ${kev.vulnerabilityName}`)));

    if (existingRisk.length === 0) {
      await db.insert(riskAssessments).values({
        clientId,
        assessmentId: `RA-${kev.cveId}-${Date.now().toString().substring(8)}`,
        title: `[CISA KEV] ${kev.cveId}: ${kev.vulnerabilityName}`,
        category: kev.mappedControlCategory,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      risksCreated++;
    }
    identifiedThreats.push(kev);
  }

  return {
    clientId,
    totalCatalogEvaluated: CISA_KEV_CATALOG.length,
    threatsIdentified: identifiedThreats.length,
    newRisksRecorded: risksCreated,
    timestamp: new Date().toISOString(),
  };
}
