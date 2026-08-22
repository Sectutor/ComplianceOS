/**
 * Vector Policy & Framework Control Semantic Retrieval Engine
 * Indexes company master ISMS policies, SOC 2 Common Criteria, ISO 27001 Annex A,
 * NIS2 Article 21, and GDPR controls for deep RAG context augmentation.
 */

export interface PolicyDocument {
  id: string;
  framework: "SOC 2" | "ISO 27001" | "NIS2" | "GDPR" | "Internal ISMS" | "DORA";
  controlId: string;
  title: string;
  content: string;
  tags: string[];
}

export interface RagSearchResult {
  document: PolicyDocument;
  relevanceScore: number;
  snippet: string;
}

export class PolicyVectorRag {
  private documents: PolicyDocument[] = [
    {
      id: "soc2_cc6_1",
      framework: "SOC 2",
      controlId: "CC6.1",
      title: "Logical and Physical Access Controls",
      content: "The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity's commitments and system requirements.",
      tags: ["access", "mfa", "iam", "rbac", "passwords", "uar"],
    },
    {
      id: "soc2_cc6_6",
      framework: "SOC 2",
      controlId: "CC6.6",
      title: "Data Boundary & Boundary Protection",
      content: "The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software and protect network boundaries with firewalls, security groups, and encryption in transit (TLS 1.3).",
      tags: ["network", "firewall", "encryption", "tls", "s3", "cloud"],
    },
    {
      id: "soc2_cc7_1",
      framework: "SOC 2",
      controlId: "CC7.1",
      title: "Vulnerability Management & Threat Monitoring",
      content: "To meet its commitments and system requirements, the entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities (Critical <14d, High <30d SLAs).",
      tags: ["vulnerability", "cve", "dependabot", "snyk", "patching", "sla"],
    },
    {
      id: "soc2_cc9_2",
      framework: "SOC 2",
      controlId: "CC9.2",
      title: "Vendor & Third-Party Risk Management (TPRM)",
      content: "The entity assesses and manages risks associated with vendors and business partners. Obtains annual SOC 2 Type II reports, reviews exceptions, and enforces security terms in vendor contracts.",
      tags: ["vendor", "tprm", "third-party", "soc2", "contracts", "supply chain"],
    },
    {
      id: "iso_a5_24",
      framework: "ISO 27001",
      controlId: "A.5.24",
      title: "Information Security Incident Management Planning",
      content: "The organization plans and prepares for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities.",
      tags: ["incident", "breach", "response", "timeline", "csirt", "forensics"],
    },
    {
      id: "iso_a8_8",
      framework: "ISO 27001",
      controlId: "A.8.8",
      title: "Management of Technical Vulnerabilities",
      content: "Information about technical vulnerabilities of information systems in use must be obtained, evaluated, and addressed with timely patches and configuration hardening.",
      tags: ["vulnerability", "patch", "cve", "appsec"],
    },
    {
      id: "nis2_art21",
      framework: "NIS2",
      controlId: "Article 21",
      title: "Mandatory Cybersecurity Risk-Management Measures",
      content: "Essential and Important Entities must implement 10 mandatory measures: policy risk analysis, incident handling, business continuity/backups, supply chain security, network acquisition security, cybersecurity training, cryptography/encryption, and MFA.",
      tags: ["nis2", "essential", "important", "measures", "backups", "mfa"],
    },
    {
      id: "nis2_art23",
      framework: "NIS2",
      controlId: "Article 23",
      title: "Strict Incident Reporting Timelines",
      content: "24-Hour Early Warning to national CSIRT; 72-Hour Incident Notification; 1-Month Final Comprehensive Root Cause Analysis Report.",
      tags: ["nis2", "incident", "early warning", "24h", "72h", "csirt", "timelines"],
    },
    {
      id: "gdpr_art30",
      framework: "GDPR",
      controlId: "Article 30",
      title: "Record of Processing Activities (ROPA)",
      content: "Each controller shall maintain a record of processing activities under its responsibility covering categories of data subjects, personal data categories, recipients, international transfers, and time limits for erasure.",
      tags: ["gdpr", "ropa", "privacy", "data flow", "retention"],
    },
    {
      id: "gdpr_dsar",
      framework: "GDPR",
      controlId: "Articles 15-20",
      title: "Data Subject Access Requests (DSAR)",
      content: "Data subjects have the right to access, rectify, port, or erase their personal data within 30 calendar days from the receipt of request.",
      tags: ["dsar", "privacy", "erasure", "access request", "30 days"],
    },
    {
      id: "isms_crypto_policy",
      framework: "Internal ISMS",
      controlId: "SEC-POL-04",
      title: "Master Cryptography & Key Management Policy v3.2",
      content: "All data at rest in AWS S3 and PostgreSQL RDS must be encrypted with customer-managed KMS keys with annual automatic rotation enabled. Data in transit must mandate TLS 1.3.",
      tags: ["kms", "encryption", "s3", "tls", "policy", "internal"],
    },
  ];

  /**
   * Performs semantic keyword & tag ranking search across policy documents
   */
  public search(query: string, maxResults = 3): RagSearchResult[] {
    if (!query || typeof query !== "string") return [];

    const queryWords = query.toLowerCase().split(/\W+/).filter(Boolean);

    const scored = this.documents.map((doc) => {
      let score = 0;

      // Exact control ID match
      if (query.toLowerCase().includes(doc.controlId.toLowerCase())) {
        score += 10;
      }

      // Framework match
      if (query.toLowerCase().includes(doc.framework.toLowerCase())) {
        score += 3;
      }

      // Keyword / Tag match
      for (const word of queryWords) {
        if (doc.tags.some((t) => t.includes(word) || word.includes(t))) {
          score += 2;
        }
        if (doc.title.toLowerCase().includes(word)) {
          score += 1.5;
        }
        if (doc.content.toLowerCase().includes(word)) {
          score += 0.5;
        }
      }

      return {
        document: doc,
        relevanceScore: score,
        snippet: doc.content.slice(0, 200) + "...",
      };
    });

    return scored
      .filter((res) => res.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  /**
   * Formats RAG results as a system prompt knowledge injection
   */
  public formatContextForPrompt(results: RagSearchResult[]): string {
    if (results.length === 0) return "";
    return `
### 📚 Relevant Internal ISMS Policies & Framework Controls:
${results
  .map(
    (r) =>
      `* **[${r.document.framework} - ${r.document.controlId}] ${r.document.title}:** ${r.document.content}`
  )
  .join("\n")}
`.trim();
  }
}

export const policyVectorRag = new PolicyVectorRag();
