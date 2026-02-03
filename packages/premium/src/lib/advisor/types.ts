/**
 * Type definitions for AI Advisor system
 */

// ==================== Citations ====================

export interface Citation {
    type: 'catalog' | 'internal' | 'external' | 'control' | 'policy' | 'evidence';
    id?: string;
    url?: string;
    title?: string;
    excerpt?: string;
}

// ==================== Technology Catalog ====================

export interface TechnologyReference {
    url: string;
    title: string;
}

export interface Technology {
    id: string;
    vendor: string;
    service: string;
    description: string;
    pros: string[];
    cons: string[];
    implementation_effort: 'low' | 'medium' | 'high';
    maturity_level: 'emerging' | 'mainstream' | 'mature';
    references: TechnologyReference[];
}

export interface ControlTechMapping {
    code: string;
    name: string;
    category: string;
    technologies: Technology[];
}

export interface TechCatalog {
    version: string;
    framework: string;
    last_updated: string;
    controls: ControlTechMapping[];
}

// ==================== Advisor Requests ====================

export interface SuggestTechnologiesRequest {
    clientId: number;
    controlId: number;
    vendorPreference?: string;
    budgetConstraint?: 'low' | 'medium' | 'high';
}

export interface TechnologySuggestion {
    techId: string;
    name: string;
    vendor: string;
    description: string;
    pros: string[];
    cons: string[];
    effort: 'low' | 'medium' | 'high';
    sources: Citation[];
    confidence: number; // 0-1
}

export interface SuggestTechnologiesResponse {
    suggestions: TechnologySuggestion[];
    contextSummary: string;
}

export interface ImplementationPlanRequest {
    clientId: number;
    controlId: number;
    selectedTech?: string;
}

export interface ImplementationStep {
    order: number;
    title: string;
    description: string;
    owner?: string;
    dueDate?: string;
    estimatedDuration?: string;
}

export interface ImplementationPlanResponse {
    steps: ImplementationStep[];
    prerequisites: string[];
    estimatedDuration: string;
    sources: Citation[];
}

export interface ExplainMappingRequest {
    clientId: number;
    regulationId: string;
    articleId: string;
}

export interface ExplainMappingResponse {
    explanation: string;
    mappedControls: Array<{
        controlId: string;
        controlName: string;
        status: string;
    }>;
    evidenceLinks: Array<{
        evidenceId: string;
        description: string;
        status: string;
    }>;
    gaps: string[];
    sources: Citation[];
}

export interface AskQuestionRequest {
    clientId: number;
    question: string;
    context?: {
        type: 'control' | 'policy' | 'evidence' | 'regulation' | 'risk' | 'vendor' | 'gapanalysis' | 'page';
        id: string; // e.g. "control_5.1"
        data?: any; // Additional transient data like control description for the prompt
    };
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

export interface AskQuestionResponse {
    answer: string;
    sources: Citation[];
    confidence: number;
}

export interface VendorMitigationPlanRequest {
    clientId: number;
    vendorId: number;
    scanId?: number;
}

export interface VendorMitigationPlanResponse {
    vendorName: string;
    riskScore: number;
    mitigationSteps: MitigationStep[];
    estimatedTimeline: string;
    criticalVulnerabilities: number;
    cveAnalysis?: string; // AI generated summary
}

export interface MitigationStep {
    id: string;
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    estimatedEffort: string;
    assignedTo?: string; // Role suggestion
}

export interface AnalyzeRiskRequest {
    clientId: number;
    threat: string;
    vulnerability: string;
    assets: string[];
}

// ==================== BCP Generation ====================

export interface GenerateBcpContentRequest {
    clientId: number;
    planId: number;
    sectionKey: 'intro' | 'scope' | 'assumptions' | 'activation' | 'roles' | 'strategies' | 'scenarios' | 'exercises';
    context?: string; // Existing content to improve, or specific instructions
    mode: 'draft' | 'improve' | 'expand';
}

export interface GenerateBcpContentResponse {
    content: string;
    suggestions?: string[];
}

export interface AnalyzeRiskResponse {
    likelihood: 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Almost Certain';
    impact: 'Low' | 'Medium' | 'High' | 'Very High';
    inherentRisk: 'Low' | 'Medium' | 'High' | 'Very High';
    reasoning: string;
}

// ==================== Retrieval ====================

export interface RetrievalContext {
    clientId: number;
    query: string;
    filters?: {
        docType?: string[];
        framework?: string;
        tags?: string[];
    };
    topK?: number;
}

export interface RetrievalResult {
    docId: string;
    docType: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
}

// ==================== Prompt Templates ====================

export interface PromptContext {
    clientName: string;
    industry?: string;
    framework?: string;
    controlCode?: string;
    controlName?: string;
    controlStatus?: string;
    existingEvidence?: string[];
    retrievedContext?: RetrievalResult[];
}

export interface SystemPromptConfig {
    role: string;
    instructions: string[];
    outputFormat?: string;
}

// ==================== Conversation ====================

export interface ConversationMessage {
    id?: number;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Citation[];
    metadata?: {
        model?: string;
        provider?: string;
        tokens?: number;
    };
    createdAt?: Date;
}

export interface Conversation {
    id?: number;
    userId: number;
    clientId?: number;
    conversationId: string;
    title?: string;
    messages?: ConversationMessage[];
    createdAt?: Date;
    updatedAt?: Date;
}

// ==================== Comprehensive Implementation Planning ====================

export type FrameworkType = 'ISO27001' | 'SOC2' | 'GDPR' | 'NIST' | 'PCI_DSS' | 'HIPAA' | 'CUSTOM';

export type PlanPhase = 'plan' | 'do' | 'check' | 'act' | 'certification';

export interface ComprehensivePlanRequest {
    clientId: number;
    framework: FrameworkType;
    scope: {
        businessUnits: string[];
        locations: string[];
        systems: string[];
        exclusions?: string[];
    };
    timeline: {
        targetMonths: number;
        startDate?: string;
        aggressiveTimeline?: boolean;
    };
    resources: {
        teamSize: number;
        budgetRange: 'low' | 'medium' | 'high';
        externalConsultants: boolean;
    };
    currentState: {
        maturityLevel: 'reactive' | 'developing' | 'defined' | 'managed' | 'optimized';
        existingControls: number;
        existingPolicies: number;
        previousCertifications?: string[];
    };
}

export interface PlanStep {
    id: string;
    phase: PlanPhase;
    order: number;
    title: string;
    description: string;
    keyActivities: string[];
    deliverables: string[];
    estimatedDuration: string; // e.g., "2-4 weeks"
    tips: string[];
    prerequisites: string[];
    risks: string[];
    ownerRole: string;
    dependencies?: string[]; // IDs of other steps
}

export interface PhaseSummary {
    phase: PlanPhase;
    title: string;
    description: string;
    duration: string;
    steps: PlanStep[];
    totalSteps: number;
    keyDeliverables: string[];
}

export interface ResourceAllocation {
    role: string;
    responsibilities: string[];
    estimatedTimeCommitment: string;
    skillsRequired: string[];
}

export interface RiskIntegration {
    riskId?: number;
    riskTitle: string;
    relatedSteps: string[]; // Step IDs
    mitigationStrategy: string;
    owner: string;
}

export interface CertificationMilestone {
    id: string;
    title: string;
    description: string;
    targetDate: string;
    status: 'pending' | 'in_progress' | 'completed' | 'delayed';
    evidenceRequired: string[];
    responsibleParty: string;
}

export interface ComprehensivePlanResponse {
    planId: string;
    framework: FrameworkType;
    executiveSummary: string;
    totalDuration: string;
    totalSteps: number;
    phases: PhaseSummary[];
    resourceAllocations: ResourceAllocation[];
    riskIntegrations: RiskIntegration[];
    certificationMilestones: CertificationMilestone[];
    assumptions: string[];
    successFactors: string[];
    generatedAt: string;
}
