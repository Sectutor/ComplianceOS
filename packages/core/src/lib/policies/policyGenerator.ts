import { getDb } from "../../db";
import { clientPolicies } from "../../schema";

export interface GeneratedPolicyDocument {
  title: string;
  category: string;
  content: string;
  framework: string;
  version: string;
}

export async function generateCustomPolicyDocument(
  clientId: number,
  companyName: string,
  policyType: "Access Control" | "Incident Response" | "Cryptography" | "Vendor Security" | "Data Privacy",
  framework = "SOC 2 & ISO 27001"
): Promise<{ success: boolean; policyId?: number; document: GeneratedPolicyDocument }> {
  const db = await getDb();
  const dateStr = new Date().toISOString().split("T")[0];

  let title = `${companyName} - Information Security Policy`;
  let category = "General";
  let content = "";

  if (policyType === "Access Control") {
    title = `${companyName} - Access Control & Authentication Policy`;
    category = "Security Operations";
    content = `# ${title}\n\n**Effective Date:** ${dateStr}\n**Framework Alignment:** ${framework}\n**Document Owner:** Chief Information Security Officer\n\n## 1. Purpose\nThis policy establishes mandatory access control principles to protect ${companyName}'s networks, cloud environments, and sensitive customer data against unauthorized access.\n\n## 2. Scope\nApplies to 100% of workforce members, contractors, and automated system accounts accessing ${companyName} infrastructure.\n\n## 3. Policy Statements\n- **Role-Based Access Control (RBAC):** Access privileges are granted strictly based on least privilege and explicit job responsibilities.\n- **Multi-Factor Authentication (MFA):** FIDO2 or Hardware/App-based MFA is mandatory for 100% of internal and administrative logins.\n- **Password Policy:** Minimum 16 characters with automated breach scanning and mandatory password manager usage.\n- **Offboarding SLA:** All access entitlements must be revoked within 24 hours of employee departure.`;
  } else if (policyType === "Incident Response") {
    title = `${companyName} - Incident Response & Disaster Recovery Plan`;
    category = "Business Continuity";
    content = `# ${title}\n\n**Effective Date:** ${dateStr}\n**Framework Alignment:** ${framework}\n**Document Owner:** Incident Response Commander\n\n## 1. Purpose\nDefines procedures for detecting, containing, eradicating, and recovering from cybersecurity incidents.\n\n## 2. Severity Classification\n- **P1 Critical:** System-wide outage, data breach of PII/ePHI, or active ransomware attack (1-hour response SLA).\n- **P2 High:** Individual server compromise or isolated malware infection (4-hour response SLA).\n\n## 3. Response Plan Phases\n1. Detection & Identification\n2. Containment (Network Isolation)\n3. Eradication & Remediation\n4. Recovery & Verification\n5. Post-Mortem & Regulatory Notification (72-hour GDPR/NIS2 SLA)`;
  } else {
    title = `${companyName} - ${policyType} Security Policy`;
    category = "Information Security";
    content = `# ${title}\n\n**Effective Date:** ${dateStr}\n**Framework Alignment:** ${framework}\n\n## 1. Purpose & Scope\nMandatory security controls established for ${companyName} under ${framework} baseline requirements.\n\n## 2. Core Security Controls\n- All data at rest must be encrypted using AES-256.\n- All data in transit must be encrypted using TLS 1.3.\n- Annual third-party penetration testing and continuous vulnerability scanning are strictly required.`;
  }

  // Insert into client_policies
  const [inserted] = await db
    .insert(clientPolicies)
    .values({
      clientId,
      name: title,
      content,
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return {
    success: true,
    policyId: inserted.id,
    document: {
      title,
      category,
      content,
      framework,
      version: "v1.0",
    },
  };
}
