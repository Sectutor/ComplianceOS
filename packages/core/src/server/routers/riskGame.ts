import { z } from "zod";
import { router, clientProcedure } from "../trpc";

// Risk Game Types
export interface RiskScenario {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'operational' | 'compliance' | 'reputation' | 'security';
  difficulty: 'easy' | 'medium' | 'hard';
  options: RiskOption[];
  correctOptionId: string;
  explanation: string;
}

export interface RiskOption {
  id: string;
  text: string;
  impact: number; // -100 to 100
  probability: number; // 0 to 100
}

export interface GameProgress {
  clientId: number;
  currentScenario: number;
  totalScore: number;
  completedScenarios: string[];
  lastPlayed: Date;
}

// Sample Risk Game Scenarios
const RISK_SCENARIOS: RiskScenario[] = [
  {
    id: 'scenario-1',
    title: 'Vendor Data Breach',
    description: 'Your critical vendor has reported a data breach affecting 50,000 records. What do you do?',
    category: 'security',
    difficulty: 'medium',
    options: [
      { id: 'a', text: 'Immediately terminate contract and switch vendors', impact: -30, probability: 20 },
      { id: 'b', text: 'Conduct thorough audit before making decisions', impact: 20, probability: 70 },
      { id: 'c', text: 'Wait for vendor to fix the issue', impact: -50, probability: 40 },
      { id: 'd', text: 'Implement enhanced monitoring but continue relationship', impact: 10, probability: 60 },
    ],
    correctOptionId: 'b',
    explanation: 'A thorough audit helps understand the scope before taking action. Premature termination can cause more harm.',
  },
  {
    id: 'scenario-2',
    title: 'Regulatory Audit',
    description: 'You received notice of an upcoming compliance audit. Your controls documentation is incomplete.',
    category: 'compliance',
    difficulty: 'easy',
    options: [
      { id: 'a', text: 'Rush to create fake documentation', impact: -80, probability: 10 },
      { id: 'b', text: 'Request extension and honestly assess gaps', impact: 30, probability: 85 },
      { id: 'c', text: 'Ignore the notice', impact: -100, probability: 5 },
      { id: 'd', text: 'Hire consultants to quickly patch gaps', impact: 15, probability: 75 },
    ],
    correctOptionId: 'b',
    explanation: 'Honesty with regulators builds trust. Requesting extension shows good faith effort.',
  },
  {
    id: 'scenario-3',
    title: 'New Product Launch',
    description: 'Your company wants to launch an AI product, but data privacy regulations are unclear.',
    category: 'operational',
    difficulty: 'hard',
    options: [
      { id: 'a', text: 'Launch anyway - regulations will catch up', impact: -60, probability: 30 },
      { id: 'b', text: 'Delay launch until regulations are clear', impact: -20, probability: 60 },
      { id: 'c', text: 'Launch with robust privacy safeguards and transparency', impact: 40, probability: 80 },
      { id: 'd', text: 'Abandon AI features entirely', impact: -40, probability: 40 },
    ],
    correctOptionId: 'c',
    explanation: 'Proactive privacy protection can be a competitive advantage while managing risk.',
  },
  {
    id: 'scenario-4',
    title: 'Employee Security Incident',
    description: 'An employee clicked on a phishing link. Malware may be on their workstation.',
    category: 'security',
    difficulty: 'easy',
    options: [
      { id: 'a', text: 'Fire the employee immediately', impact: -20, probability: 15 },
      { id: 'b', text: 'Isolate the workstation and investigate', impact: 40, probability: 90 },
      { id: 'c', text: 'Do nothing - it might be fine', impact: -70, probability: 10 },
      { id: 'd', text: 'Shut down all company systems', impact: -50, probability: 25 },
    ],
    correctOptionId: 'b',
    explanation: 'Quick isolation contains damage while investigation proceeds. Training is more effective than punishment.',
  },
  {
    id: 'scenario-5',
    title: 'Market downturn',
    description: 'Economic downturn affects your industry. Budget cuts are required.',
    category: 'financial',
    difficulty: 'medium',
    options: [
      { id: 'a', text: 'Cut all security and compliance budgets', impact: -90, probability: 5 },
      { id: 'b', text: 'Maintain current spending - security is essential', impact: 20, probability: 70 },
      { id: 'c', text: 'Prioritize critical controls and defer non-essentials', impact: 35, probability: 85 },
      { id: 'd', text: 'elay all vendor payments', impact: -30, probability: 40 },
    ],
    correctOptionId: 'c',
    explanation: 'Smart prioritization maintains protection while managing costs. Complete cuts expose the organization.',
  },
  {
    id: 'scenario-6',
    title: 'Negative Media Coverage',
    description: 'A data incident has made headlines. Social media is buzzing.',
    category: 'reputation',
    difficulty: 'medium',
    options: [
      { id: 'a', text: 'Issue a vague statement and hope it passes', impact: -40, probability: 20 },
      { id: 'b', text: 'Be transparent, explain steps taken, offer remediation', impact: 50, probability: 85 },
      { id: 'c', text: 'Deny everything', impact: -80, probability: 10 },
      { id: 'd', text: 'Launch counter-campaign blaming competitors', impact: -60, probability: 15 },
    ],
    correctOptionId: 'b',
    explanation: 'Transparency builds trust. Customers appreciate honest communication during crises.',
  },
];

export function createRiskGameRouter(t: any, clientProc: any) {
  return router({
    // Get all available scenarios
    getScenarios: clientProc.query(() => {
      return RISK_SCENARIOS;
    }),

    // Get a specific scenario
    getScenario: clientProc
      .input(z.object({ scenarioId: z.string() }))
      .query(({ input }) => {
        const scenario = RISK_SCENARIOS.find(s => s.id === input.scenarioId);
        if (!scenario) {
          throw new Error("Scenario not found");
        }
        return scenario;
      }),

    // Submit an answer
    submitAnswer: clientProc
      .input(z.object({
        scenarioId: z.string(),
        selectedOptionId: z.string(),
        clientId: z.number(),
      }))
      .mutation(({ input }) => {
        const scenario = RISK_SCENARIOS.find(s => s.id === input.scenarioId);
        if (!scenario) {
          throw new Error("Scenario not found");
        }

        const selectedOption = scenario.options.find(o => o.id === input.selectedOptionId);
        if (!selectedOption) {
          throw new Error("Invalid option");
        }

        const isCorrect = input.selectedOptionId === scenario.correctOptionId;
        
        // Calculate score based on impact and probability
        const riskScore = isCorrect 
          ? Math.round((selectedOption.impact + 100) / 2 + (selectedOption.probability / 4))
          : Math.round((selectedOption.impact + 100) / 4);

        return {
          isCorrect,
          correctOptionId: scenario.correctOptionId,
          explanation: scenario.explanation,
          score: Math.max(0, Math.min(100, riskScore)),
          impact: selectedOption.impact,
          probability: selectedOption.probability,
        };
      }),

    // Get game progress for a client
    getProgress: clientProc
      .input(z.object({ clientId: z.number() }))
      .query(({ input }) => {
        // In a real app, this would fetch from database
        // For now, return mock progress
        return {
          clientId: input.clientId,
          currentScenario: 0,
          totalScore: 0,
          completedScenarios: [],
          lastPlayed: new Date(),
        };
      }),

    // Save game progress
    saveProgress: clientProc
      .input(z.object({
        clientId: z.number(),
        scenarioId: z.string(),
        score: z.number(),
      }))
      .mutation(({ input }) => {
        // In a real app, this would save to database
        console.log(`Saving progress for client ${input.clientId}: scenario ${input.scenarioId}, score ${input.score}`);
        
        return {
          success: true,
          totalScore: input.score, // Would be cumulative in real app
        };
      }),

    // Get leaderboard
    getLeaderboard: clientProc
      .input(z.object({ limit: z.number().default(10) }))
      .query(({ input }) => {
        // In a real app, this would fetch from database
        return [
          { rank: 1, clientName: 'Acme Corp', score: 485 },
          { rank: 2, clientName: 'TechStart Inc', score: 452 },
          { rank: 3, clientName: 'Global Finance', score: 428 },
          { rank: 4, clientName: 'HealthPlus', score: 395 },
          { rank: 5, clientName: 'Retail Giants', score: 372 },
        ].slice(0, input.limit);
      }),
  });
}
