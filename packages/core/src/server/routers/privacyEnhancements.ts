import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { consents, consentTemplates, dsarTemplates, dpiaTemplates, dataFlowVisualizations, dataFlowNodes, dataFlowConnections } from "../../schema";
import { logActivity } from "../../lib/audit";
import * as db from "../../db";
import { getDb } from "../../db";
import { eq, and, desc, sql, inArray, like, or } from "drizzle-orm";

const STANDARD_DPIA_TEMPLATES = [
  {
    name: "GDPR Article 35 High-Risk Processing DPIA",
    category: "high_risk",
    description: "Standard comprehensive DPIA assessing EDPB high-risk criteria (systematic evaluation, large-scale processing, matching datasets, vulnerable subjects).",
    templateContent: {
      screeningQuestions: [
        { id: "q1", question: "Does the processing involve systematic and extensive evaluation or scoring, including profiling?", type: "boolean" as const, required: true },
        { id: "q2", question: "Does the processing involve automated decision-making producing legal or similarly significant effects (Art. 22)?", type: "boolean" as const, required: true },
        { id: "q3", question: "Does the processing involve systematic monitoring of publicly accessible areas on a large scale?", type: "boolean" as const, required: true },
        { id: "q4", question: "Does the processing involve special category data (Art. 9) or criminal convictions (Art. 10)?", type: "boolean" as const, required: true },
        { id: "q5", question: "Is the processing conducted on a large scale (volume, number of data subjects, geographic extent)?", type: "boolean" as const, required: true },
        { id: "q6", question: "Are datasets matched or combined originating from two or more distinct processing operations?", type: "boolean" as const, required: true },
        { id: "q7", question: "Does the processing concern vulnerable data subjects (children, employees, patients)?", type: "boolean" as const, required: true },
        { id: "q8", question: "Does the processing use innovative technological or organizational solutions (e.g. biometrics, IoT, AI)?", type: "boolean" as const, required: true },
        { id: "q9", question: "Will personal data be transferred outside the European Economic Area without an adequacy decision?", type: "boolean" as const, required: true },
        { id: "q10", question: "Does the processing prevent data subjects from exercising a right or using a contract?", type: "boolean" as const, required: true },
      ],
      riskFactors: [
        { factor: "Unauthorized disclosure or data breach of high-volume personal data", weight: 5, description: "Risk of exfiltration or unauthorized exposure affecting data subjects." },
        { factor: "Lack of transparency or failure to provide clear privacy notices", weight: 4, description: "Data subjects unaware of the scope or purposes of processing." },
        { factor: "Inability to fulfill data subject rights (access, erasure, objection)", weight: 4, description: "Architecture prevents granular DSAR fulfillment." },
        { factor: "Unlawful secondary use beyond initial purpose limitation", weight: 4, description: "Processing data for unapproved secondary purposes." },
        { factor: "Inaccurate profiling leading to discriminatory outcomes", weight: 5, description: "Algorithms generating biased or unfair decisions against protected classes." },
      ],
      mitigationMeasures: [
        { measure: "End-to-End Encryption (AES-256 at rest, TLS 1.3 in transit)", category: "Technical", description: "Cryptographic protection across all databases and communication channels." },
        { measure: "Granular Role-Based Access Control (RBAC) & Multi-Factor Auth", category: "Technical", description: "Enforcing least privilege and MFA on all administrator accounts." },
        { measure: "Automated Pseudonymization & Tokenization", category: "Technical", description: "Separating direct identifiers from analytical datasets." },
        { measure: "Automated Data Retention & Scheduled Deletion", category: "Technical", description: "Enforcing storage limitation under Article 5(1)(e)." },
        { measure: "Granular Consent Management & Notice Transparency", category: "Governance", description: "Clear, freely given consent collection with instant withdrawal mechanism." },
      ]
    }
  },
  {
    name: "AI & Automated Decision-Making (ADM) DPIA",
    category: "ai_governance",
    description: "Tailored assessment for Machine Learning models, LLMs, and automated scoring systems under EU AI Act and GDPR Article 22.",
    templateContent: {
      screeningQuestions: [
        { id: "ai_q1", question: "Does the AI system process personal data to evaluate, predict, or score human behavior, performance, or attributes?", type: "boolean" as const, required: true },
        { id: "ai_q2", question: "Are automated decisions executed without mandatory human review prior to final effect?", type: "boolean" as const, required: true },
        { id: "ai_q3", question: "Are foundation models or LLMs trained/fine-tuned on customer personal data or user prompt inputs?", type: "boolean" as const, required: true },
        { id: "ai_q4", question: "Is there a human-in-the-loop override mechanism capable of reversing algorithmic outcomes?", type: "boolean" as const, required: true },
        { id: "ai_q5", question: "Has the training and validation dataset been audited for demographic representativeness and bias?", type: "boolean" as const, required: true },
        { id: "ai_q6", question: "Can individuals obtain meaningful information about the logic involved in the automated decision (Art. 13-15)?", type: "boolean" as const, required: true },
      ],
      riskFactors: [
        { factor: "Algorithmic bias and discriminatory output impacting protected classes", weight: 5, description: "System systematically disadvantages specific demographic groups." },
        { factor: "Model hallucinations and processing of inaccurate personal data", weight: 4, description: "LLM generating false factual statements about individuals." },
        { factor: "Model inversion and prompt leakage of training data", weight: 5, description: "Extraction of training personal data via adversarial prompt injection." },
        { factor: "Opaque black-box decisions violating transparency obligations", weight: 4, description: "Inability to provide human-interpretable rationale for decisions." },
      ],
      mitigationMeasures: [
        { measure: "Explainable AI (XAI) feature attribution and decision logging", category: "Technical", description: "Recording input weights and rationale for every automated decision." },
        { measure: "Mandatory human-in-the-loop review for high-impact decisions", category: "Organizational", description: "Human compliance officer sign-off on decisions affecting rights." },
        { measure: "Pre-deployment fairness and demographic parity testing", category: "Technical", description: "Regular bias auditing against protected characteristics." },
        { measure: "Input guardrails and data leakage prevention for LLM prompts", category: "Technical", description: "Filtering PII before sending prompts to external model APIs." },
      ]
    }
  },
  {
    name: "Special Category, Biometric & Health Data DPIA",
    category: "special_category",
    description: "Impact assessment for sensitive data processing under GDPR Article 9 (biometric identification, medical records, genetic data).",
    templateContent: {
      screeningQuestions: [
        { id: "sc_q1", question: "Does the processing involve biometric data for uniquely identifying a natural person (e.g., facial recognition, voiceprint)?", type: "boolean" as const, required: true },
        { id: "sc_q2", question: "Does the processing involve electronic health records (EHR), medical diagnoses, or genetic data?", type: "boolean" as const, required: true },
        { id: "sc_q3", question: "What is the specific Article 9(2) exception relied upon for processing?", type: "select" as const, options: ["Explicit Consent (Art. 9.2.a)", "Employment / Social Security Law (Art. 9.2.b)", "Vital Interests (Art. 9.2.c)", "Healthcare / Medical Diagnosis (Art. 9.2.h)", "Public Health (Art. 9.2.i)", "Scientific / Historical Research (Art. 9.2.j)"], required: true },
        { id: "sc_q4", question: "Are sensitive health/biometric attributes cryptographically segregated from common identifiers?", type: "boolean" as const, required: true },
        { id: "sc_q5", question: "Is privileged access strictly restricted to authorized medical or designated personnel under professional secrecy?", type: "boolean" as const, required: true },
      ],
      riskFactors: [
        { factor: "Irreversible harm and discrimination resulting from biometric or health data compromise", weight: 5, description: "Compromised biometric templates cannot be reset like passwords." },
        { factor: "Invalidation of consent or lack of explicit opt-in for sensitive processing", weight: 5, description: "Failure to meet high threshold of explicit Article 9 consent." },
        { factor: "Unintended inferences of health conditions from behavioral telemetry", weight: 4, description: "Deriving medical conditions from app usage patterns." },
      ],
      mitigationMeasures: [
        { measure: "Hardware Security Module (HSM) key management & zero-knowledge biometric hashing", category: "Technical", description: "Templates stored as irreversible cryptographic hashes in dedicated HSM." },
        { measure: "Strict physical and logical air-gapping of sensitive health databases", category: "Technical", description: "Isolated VPC and database instances with zero direct internet exposure." },
        { measure: "Real-time SIEM audit logging on all access to Article 9 records", category: "Technical", description: "Automated alerting on anomalous bulk queries or after-hours access." },
        { measure: "Mandatory staff confidentiality undertakings and medical secrecy training", category: "Organizational", description: "Binding non-disclosure agreements for all handlers." },
      ]
    }
  },
  {
    name: "Employee Monitoring & Workplace Telemetry DPIA",
    category: "workplace_monitoring",
    description: "Assessment for DLP endpoints, productivity analytics, keystroke logging, and video surveillance in employee environments.",
    templateContent: {
      screeningQuestions: [
        { id: "em_q1", question: "Does the system monitor employee keystrokes, screen activity, or webcam feeds?", type: "boolean" as const, required: true },
        { id: "em_q2", question: "Does monitoring extend to personal devices (BYOD) or remote home working environments?", type: "boolean" as const, required: true },
        { id: "em_q3", question: "What is the primary lawful basis relied upon for monitoring?", type: "select" as const, options: ["Legitimate Interest (Art. 6.1.f) with LIA", "Legal Obligation (Art. 6.1.c)", "Performance of Employment Contract (Art. 6.1.b)"], required: true },
        { id: "em_q4", question: "Have employees and works councils / employee representatives been formally consulted and notified?", type: "boolean" as const, required: true },
        { id: "em_q5", question: "Is the monitoring continuous and pervasive, or triggered solely on security DLP alerts?", type: "select" as const, options: ["Targeted Security Incident Trigger Only", "Periodic Sample Audit", "Continuous Automated Telemetry"], required: true },
      ],
      riskFactors: [
        { factor: "Disproportionate intrusion into employee private life and home environment", weight: 5, description: "Violating reasonable expectation of privacy during remote work." },
        { factor: "Scope creep: using security telemetry for performance or disciplinary evaluations", weight: 4, description: "Using DLP logs outside legitimate cybersecurity purposes." },
        { factor: "Employee mistrust and regulatory complaints to Data Protection Authorities", weight: 3, description: "Friction and labor disputes over opaque surveillance." },
      ],
      mitigationMeasures: [
        { measure: "Comprehensive Employee Monitoring Policy & Transparent Disclosures", category: "Governance", description: "Clear handbook detailing what is monitored and how logs are stored." },
        { measure: "DLP privacy filters ignoring personal email and private banking domains", category: "Technical", description: "Exclusion lists preventing capture of personal web sessions." },
        { measure: "Data aggregation and anonymization in executive reports", category: "Technical", description: "Team-level summaries rather than individualized surveillance." },
        { measure: "Strict 30-90 day log retention limit with automated purging", category: "Technical", description: "Automatic deletion of monitoring records." },
      ]
    }
  },
  {
    name: "Cross-Border Cloud Migration & Vendor Subprocessor DPIA",
    category: "cross_border_cloud",
    description: "Assessment for third-party cloud hosting, international data transfers (Schrems II / TIA), and multi-tenant SaaS vendors.",
    templateContent: {
      screeningQuestions: [
        { id: "cb_q1", question: "Will personal data be transferred to or hosted in third countries outside the EEA/UK?", type: "boolean" as const, required: true },
        { id: "cb_q2", question: "Does the destination country have an EU Adequacy Decision (e.g. EU-US DPF, UK, Japan, Switzerland)?", type: "boolean" as const, required: true },
        { id: "cb_q3", question: "What transfer safeguard is implemented for the cloud provider?", type: "select" as const, options: ["EU-US Data Privacy Framework (DPF)", "Standard Contractual Clauses (SCCs Module 2/3)", "Binding Corporate Rules (BCRs)", "Explicit Consent Derogation (Art. 49.1.a)", "No Transfer Safeguard in Place"], required: true },
        { id: "cb_q4", question: "Has a Transfer Impact Assessment (TIA) evaluating local government surveillance laws been conducted?", type: "boolean" as const, required: true },
        { id: "cb_q5", question: "Are technical supplementary measures (Customer-Managed Encryption Keys, confidential compute) deployed?", type: "boolean" as const, required: true },
      ],
      riskFactors: [
        { factor: "Foreign lawful intercept / surveillance access conflicting with EU fundamental rights", weight: 5, description: "Risk of non-proportional foreign intelligence access (FISA 702)." },
        { factor: "Vendor lock-in and inability to retrieve or purge data upon contract termination", weight: 4, description: "Data retention by vendor after service agreement expires." },
        { factor: "Inadequate subprocessor chain oversight without prior written notice", weight: 4, description: "Unvetted 4th-party vendors in the data flow pipeline." },
      ],
      mitigationMeasures: [
        { measure: "Executed Article 28 Data Processing Agreement (DPA) with SCC appendices", category: "Legal", description: "Legally binding data processing terms and audit commitments." },
        { measure: "Customer-Managed Encryption Keys (CMEK) held within European jurisdiction", category: "Technical", description: "Ensuring cloud vendor cannot decrypt data without customer key." },
        { measure: "Documented Transfer Impact Assessment (TIA) on file with annual review", category: "Governance", description: "Legal assessment of destination country surveillance laws." },
        { measure: "Contractual audit rights and 30-day prior notice for subprocessor changes", category: "Legal", description: "Right to object to new subprocessors." },
      ]
    }
  }
];

export const createPrivacyEnhancementsRouter = (t: any, clientProcedure: any, adminProcedure: any, publicProcedure: any, clientEditorProcedure: any) => {
  return t.router({

    // Consent Management
    consents: t.router({
      list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          const consentsList = await dbConn.select()
            .from(consents)
            .where(eq(consents.clientId, input.clientId))
            .orderBy(desc(consents.createdAt));
          return consentsList;
        }),

      get: clientProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          const consent = await dbConn.select()
            .from(consents)
            .where(eq(consents.id, input.id))
            .limit(1);

          if (!consent.length) throw new TRPCError({ code: "NOT_FOUND" });

          // Permission check
          if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
            const allowed = await db.isUserAllowedForClient(ctx.user.id, consent[0].clientId);
            if (!allowed) throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }

          return consent[0];
        }),

      create: clientEditorProcedure
        .input(z.object({
          clientId: z.number(),
          dataSubjectId: z.string(),
          consentType: z.enum(["marketing", "analytics", "functional", "third_party", "cookie"]),
          purpose: z.string(),
          legalBasis: z.string(),
          granularConsents: z.record(z.boolean()).optional(),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
          consentForm: z.string().optional(),
          expirationDate: z.string().optional(),
          retentionPeriod: z.number().default(2555),
          metadata: z.any().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newConsent] = await dbConn.insert(consents).values({
            clientId: input.clientId,
            dataSubjectId: input.dataSubjectId,
            consentType: input.consentType,
            purpose: input.purpose,
            legalBasis: input.legalBasis,
            granularConsents: input.granularConsents || {},
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            consentForm: input.consentForm,
            expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
            retentionPeriod: input.retentionPeriod,
            metadata: input.metadata || {},
            status: 'active',
          }).returning();

          await logActivity({
            clientId: input.clientId,
            userId: ctx.user?.id,
            action: 'consent_created',
            entityType: 'consent',
            details: `Consent created for data subject ${input.dataSubjectId}`,
          });

          return newConsent;
        }),

      withdraw: clientEditorProcedure
        .input(z.object({
          id: z.number(),
          withdrawalReason: z.string(),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          // Check permission
          const consent = await dbConn.select()
            .from(consents)
            .where(eq(consents.id, input.id))
            .limit(1);

          if (!consent.length) throw new TRPCError({ code: "NOT_FOUND" });

          if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
            const allowed = await db.isUserAllowedForClient(ctx.user.id, consent[0].clientId);
            if (!allowed) throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }

          const [updatedConsent] = await dbConn.update(consents)
            .set({
              status: 'withdrawn',
              withdrawalTimestamp: new Date(),
              withdrawalReason: input.withdrawalReason,
            })
            .where(eq(consents.id, input.id))
            .returning();

          await logActivity({
            clientId: consent[0].clientId,
            userId: ctx.user?.id,
            action: 'withdraw',
            entityType: 'consent',
            details: `Consent withdrawn for ID ${input.id}. Reason: ${input.withdrawalReason}`,
          });

          return updatedConsent;
        }),
    }),

    // Consent Templates
    consentTemplates: t.router({
      list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          const templates = await dbConn.select()
            .from(consentTemplates)
            .where(and(
              eq(consentTemplates.clientId, input.clientId),
              eq(consentTemplates.isActive, true)
            ))
            .orderBy(desc(consentTemplates.createdAt));
          return templates;
        }),

      create: clientEditorProcedure
        .input(z.object({
          clientId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          consentType: z.enum(["marketing", "analytics", "functional", "third_party", "cookie"]),
          templateContent: z.string(),
          granularOptions: z.array(z.object({
            id: z.string(),
            label: z.string(),
            required: z.boolean(),
          })).optional(),
          retentionPeriod: z.number().default(2555),
          version: z.string().default("1.0"),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newTemplate] = await dbConn.insert(consentTemplates).values({
            clientId: input.clientId,
            name: input.name,
            description: input.description,
            consentType: input.consentType,
            templateContent: input.templateContent,
            granularOptions: input.granularOptions || [],
            retentionPeriod: input.retentionPeriod,
            version: input.version,
            createdBy: ctx.user?.id,
          }).returning();

          await logActivity({
            clientId: input.clientId,
            userId: ctx.user?.id,
            action: 'create',
            entityType: 'consent', // Or consent_template if added
            details: `Consent template created: ${input.name}`,
          });

          return newTemplate;
        }),
    }),

    // DSAR Templates
    dsarTemplates: t.router({
      list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          const templates = await dbConn.select()
            .from(dsarTemplates)
            .where(and(
              eq(dsarTemplates.clientId, input.clientId),
              eq(dsarTemplates.isActive, true)
            ))
            .orderBy(desc(dsarTemplates.usageCount));
          return templates;
        }),

      create: clientEditorProcedure
        .input(z.object({
          clientId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          requestType: z.string(),
          templateContent: z.object({
            subject: z.string(),
            description: z.string(),
            verificationSteps: z.array(z.object({
              type: z.string(),
              label: z.string(),
              required: z.boolean(),
            })),
            dataCategories: z.array(z.object({
              category: z.string(),
              included: z.boolean(),
              description: z.string(),
            })),
          }),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newTemplate] = await dbConn.insert(dsarTemplates).values({
            clientId: input.clientId,
            name: input.name,
            description: input.description,
            requestType: input.requestType,
            templateContent: input.templateContent,
            createdBy: ctx.user?.id,
          }).returning();

          await logActivity({
            clientId: input.clientId,
            userId: ctx.user?.id,
            action: 'create',
            entityType: 'dsar_request',
            details: `DSAR template created: ${input.name}`,
          });

          return newTemplate;
        }),

      use: clientProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const template = await dbConn.select()
            .from(dsarTemplates)
            .where(eq(dsarTemplates.id, input.id))
            .limit(1);

          if (!template.length) throw new TRPCError({ code: "NOT_FOUND" });

          await dbConn.update(dsarTemplates)
            .set({ usageCount: sql`${dsarTemplates.usageCount} + 1` })
            .where(eq(dsarTemplates.id, input.id));

          return template[0];
        }),
    }),

    // DPIA Templates
    dpiaTemplates: t.router({
      list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          let templates = await dbConn.select()
            .from(dpiaTemplates)
            .where(and(
              eq(dpiaTemplates.clientId, input.clientId),
              eq(dpiaTemplates.isActive, true)
            ))
            .orderBy(desc(dpiaTemplates.usageCount));

          // Auto-seed standard templates if none exist for this client
          if (templates.length === 0) {
            for (const tpl of STANDARD_DPIA_TEMPLATES) {
              await dbConn.insert(dpiaTemplates).values({
                clientId: input.clientId,
                name: tpl.name,
                description: tpl.description,
                category: tpl.category,
                templateContent: tpl.templateContent,
                createdBy: ctx.user?.id,
              });
            }
            templates = await dbConn.select()
              .from(dpiaTemplates)
              .where(and(
                eq(dpiaTemplates.clientId, input.clientId),
                eq(dpiaTemplates.isActive, true)
              ))
              .orderBy(desc(dpiaTemplates.usageCount));
          }

          return templates;
        }),

      seedStandardTemplates: clientEditorProcedure
        .input(z.object({ clientId: z.number() }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          const created: any[] = [];
          for (const tpl of STANDARD_DPIA_TEMPLATES) {
            const [newTemplate] = await dbConn.insert(dpiaTemplates).values({
              clientId: input.clientId,
              name: tpl.name,
              description: tpl.description,
              category: tpl.category,
              templateContent: tpl.templateContent,
              createdBy: ctx.user?.id,
            }).returning();
            created.push(newTemplate);
          }

          await logActivity({
            clientId: input.clientId,
            userId: ctx.user?.id,
            action: 'dpia_template_created',
            entityType: 'dpia_template',
            details: `Seeded ${created.length} standard DPIA templates`,
          });

          return created;
        }),

      create: clientEditorProcedure
        .input(z.object({
          clientId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          category: z.string(),
          templateContent: z.object({
            screeningQuestions: z.array(z.object({
              id: z.string(),
              question: z.string(),
              type: z.enum(['boolean', 'text', 'select']),
              options: z.array(z.string()).optional(),
              required: z.boolean(),
            })),
            riskFactors: z.array(z.object({
              factor: z.string(),
              weight: z.number(),
              description: z.string(),
            })),
            mitigationMeasures: z.array(z.object({
              measure: z.string(),
              category: z.string(),
              description: z.string(),
            })),
          }),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newTemplate] = await dbConn.insert(dpiaTemplates).values({
            clientId: input.clientId,
            name: input.name,
            description: input.description,
            category: input.category,
            templateContent: input.templateContent,
            createdBy: ctx.user?.id,
          }).returning();

          await logActivity({
            clientId: input.clientId,
            userId: ctx.user?.id,
            action: 'dpia_template_created',
            entityType: 'dpia_template',
            details: `DPIA template created: ${input.name}`,
          });

          return newTemplate;
        }),

      delete: clientEditorProcedure
        .input(z.object({
          clientId: z.number(),
          templateId: z.number()
        }))
        .mutation(async ({ input }: any) => {
          const dbConn = await getDb();
          await dbConn.update(dpiaTemplates)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(
              eq(dpiaTemplates.id, input.templateId),
              eq(dpiaTemplates.clientId, input.clientId)
            ));
          return { success: true };
        }),
    }),

    // Data Flow Visualization
    dataFlows: t.router({
      list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();
          const flows = await dbConn.select()
            .from(dataFlowVisualizations)
            .where(and(
              eq(dataFlowVisualizations.clientId, input.clientId),
              eq(dataFlowVisualizations.isActive, true)
            ))
            .orderBy(desc(dataFlowVisualizations.createdAt));
          return flows;
        }),

      get: clientProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const flow = await dbConn.select()
            .from(dataFlowVisualizations)
            .where(eq(dataFlowVisualizations.id, input.id))
            .limit(1);

          if (!flow.length) throw new TRPCError({ code: "NOT_FOUND" });

          // Get nodes and connections for this flow
          const nodes = await dbConn.select()
            .from(dataFlowNodes)
            .where(eq(dataFlowNodes.flowId, input.id));

          const connections = await dbConn.select()
            .from(dataFlowConnections)
            .where(eq(dataFlowConnections.flowId, input.id));

          return {
            flow: flow[0],
            nodes,
            connections,
          };
        }),

      create: clientEditorProcedure
        .input(z.object({
          clientId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          sourceSystem: z.string(),
          targetSystem: z.string(),
          dataType: z.string(),
          flowType: z.string(),
          processId: z.number().optional(),
          legalBasis: z.string().optional(),
          frequency: z.string().optional(),
          volume: z.string().optional(),
          securityMeasures: z.string().optional(),
          countries: z.array(z.object({
            country: z.string(),
            purpose: z.string(),
          })).optional(),
          flowMetadata: z.object({
            technologies: z.array(z.string()),
            protocols: z.array(z.string()),
            storageDuration: z.string(),
            retentionPeriod: z.string(),
          }).optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newFlow] = await dbConn.insert(dataFlowVisualizations).values({
            clientId: input.clientId,
            name: input.name,
            description: input.description,
            sourceSystem: input.sourceSystem,
            targetSystem: input.targetSystem,
            dataType: input.dataType,
            flowType: input.flowType,
            processId: input.processId,
            legalBasis: input.legalBasis,
            frequency: input.frequency,
            volume: input.volume,
            securityMeasures: input.securityMeasures,
            countries: input.countries || [],
            flowMetadata: input.flowMetadata || {},
          }).returning();

          await logActivity({
            clientId: input.clientId,
            userId: ctx.user?.id,
            action: 'sync',
            entityType: 'data_flow',
            details: `Infrastructure scan triggered: ${input.sourceSystem}`,
          });

          return newFlow;
        }),

      // Auto-discovery automation
      discover: clientProcedure
        .input(z.object({
          clientId: z.number(),
          sourceSystem: z.string(),
          scanType: z.enum(['api', 'database', 'file_system']),
        }))
        .mutation(async ({ input, ctx }: any) => {
          // This is a simplified auto-discovery implementation
          // In production, this would connect to various systems to automatically discover data flows

          const discoveredFlows: any[] = [];

          // Simulate discovery logic based on scan type
          if (input.scanType === 'api') {
            // Mock API endpoint discovery
            discoveredFlows.push({
              name: `Auto-discovered: ${input.sourceSystem} API flows`,
              sourceSystem: input.sourceSystem,
              targetSystem: 'API Gateway',
              dataType: 'user_data',
              flowType: 'external',
              confidence: 0.85,
            });
          } else if (input.scanType === 'database') {
            // Mock database table discovery
            discoveredFlows.push({
              name: `Auto-discovered: ${input.sourceSystem} database connections`,
              sourceSystem: input.sourceSystem,
              targetSystem: 'Database Server',
              dataType: 'personal_data',
              flowType: 'internal',
              confidence: 0.90,
            });
          }

          return {
            discoveredCount: discoveredFlows.length,
            flows: discoveredFlows,
            timestamp: new Date().toISOString(),
          };
        }),
    }),

    dataFlowNodes: t.router({
      create: clientEditorProcedure
        .input(z.object({
          flowId: z.number(),
          nodeType: z.enum(['system', 'process', 'storage', 'person']),
          nodeName: z.string(),
          nodeDescription: z.string().optional(),
          nodeCategory: z.string().optional(),
          positionX: z.number().default(0),
          positionY: z.number().default(0),
          nodeMetadata: z.any().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newNode] = await dbConn.insert(dataFlowNodes).values({
            flowId: input.flowId,
            nodeType: input.nodeType,
            nodeName: input.nodeName,
            nodeDescription: input.nodeDescription,
            nodeCategory: input.nodeCategory,
            positionX: input.positionX,
            positionY: input.positionY,
            nodeMetadata: input.nodeMetadata || {},
          }).returning();

          return newNode;
        }),

      createConnection: clientEditorProcedure
        .input(z.object({
          flowId: z.number(),
          sourceNodeId: z.number(),
          targetNodeId: z.number(),
          connectionType: z.string(),
          dataType: z.string(),
          frequency: z.string().optional(),
          securityControls: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
          const dbConn = await getDb();

          const [newConnection] = await dbConn.insert(dataFlowConnections).values({
            flowId: input.flowId,
            sourceNodeId: input.sourceNodeId,
            targetNodeId: input.targetNodeId,
            connectionType: input.connectionType,
            dataType: input.dataType,
            frequency: input.frequency,
            securityControls: input.securityControls,
          }).returning();

          return newConnection;
        }),
    }),
  });
};