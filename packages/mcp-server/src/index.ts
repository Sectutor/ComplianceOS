/**
 * ComplianceOS MCP Server
 * 
 * Provides GRC tools to AI assistants for Premium users.
 * 
 * @license Commercial (ComplianceOS Premium)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables (for PAT and API URL)
dotenv.config();

const API_URL = process.env.COMPLIANCE_OS_API_URL || "http://localhost:3002/api/trpc";
const PAT_TOKEN = process.env.COMPLIANCE_OS_PAT;

/**
 * Initialize the MCP Server
 */
const server = new McpServer({
  name: "ComplianceOS Assistant",
  version: "1.0.0",
});

/**
 * Helper: Perform a gated request to the ComplianceOS Backend
 */
async function callComplianceApi(procedure: string, type: 'query' | 'mutation', input?: any) {
  if (!PAT_TOKEN) {
    throw new Error("COMPLIANCE_OS_PAT is missing. Please provide a valid Personal Access Token in your environment.");
  }

  const superjsonBody = JSON.stringify({ '0': { json: input ?? {} } });

  if (type === 'query') {
    // tRPC batched GETs carry input as a URL-encoded superjson envelope
    const url = `${API_URL}/${procedure}?batch=1&input=${encodeURIComponent(`{"0":{"json":${JSON.stringify(input ?? {})}}}`)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'x-mcp-client': 'true',
      },
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 412) {
        throw new Error("PREMIUM_REQUIRED: This feature requires a ComplianceOS Premium subscription.");
      }
      throw new Error(`ComplianceOS API Error: ${response.statusText} (${response.status})`);
    }
    return unwrapBatch(await response.json());
  }

  const url = `${API_URL}/${procedure}?batch=1`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT_TOKEN}`,
      'x-mcp-client': 'true',
    },
    body: superjsonBody,
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 412) {
        throw new Error("PREMIUM_REQUIRED: This feature requires a ComplianceOS Premium subscription.");
    }
    throw new Error(`ComplianceOS API Error: ${response.statusText} (${response.status})`);
  }

  return unwrapBatch(await response.json());
}

/** Unwrap a tRPC batch response: [{ result: { data: { json: ... } } }] -> payload */
function unwrapBatch(data: any) {
  const first = data?.[0];
  if (first?.error) {
    throw new Error(`Backend Error: ${first.error.message}`);
  }
  const payload = first?.result?.data;
  // Superjson wraps payloads as { json: <payload> }; plain JSON responses pass through
  return payload && typeof payload === 'object' && 'json' in payload ? payload.json : payload;
}

/**
 * Tool: list_workspaces
 * Discover which Client IDs (Workspaces) you have access to.
 */
server.tool(
  "list_workspaces",
  "Lists all organizations and workspaces you belong to. Use this first to find the clientId for other tools.",
  {},
  async () => {
    try {
      const clients = await callComplianceApi('mcp.listClients', 'query');
      return {
        content: [{ type: "text", text: `You have access to ${clients.length} workspaces:\n${JSON.stringify(clients, null, 2)}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error listing workspaces: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: list_projects
 */
server.tool(
  "list_projects",
  "Fetch all GRC projects within a specific workspace.",
  {
    clientId: z.number().describe("The ID of the workspace (found via list_workspaces)"),
  },
  async ({ clientId }: { clientId: number }) => {
    try {
      const projects = await callComplianceApi('mcp.listProjects', 'query', { clientId });
      return {
        content: [{ type: "text", text: `Found ${projects.length} projects in workspace ${clientId}:\n${JSON.stringify(projects, null, 2)}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: check_compliance
 */
server.tool(
  "check_compliance",
  "Get the overall compliance percentage and status for a workspace.",
  {
    clientId: z.number().describe("The ID of the workspace"),
  },
  async ({ clientId }: { clientId: number }) => {
    try {
      const status = await callComplianceApi('mcp.getComplianceStatus', 'query', { clientId });
      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: add_risk_scenario
 */
server.tool(
  "add_risk_scenario",
  "Add a new risk scenario to the risk register.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    projectId: z.number().describe("Target Project ID"),
    title: z.string().describe("Descriptive title of the risk"),
    likelihood: z.number().min(1).max(5).describe("Likelihood (1-5)"),
    impact: z.number().min(1).max(5).describe("Impact (1-5)"),
    threatDescription: z.string().optional().describe("Detailed description of the threat"),
  },
  async (input: { 
    clientId: number, 
    projectId: number, 
    title: string, 
    likelihood: number, 
    impact: number, 
    threatDescription?: string 
  }) => {
    try {
      const result = await callComplianceApi('mcp.addRiskScenario', 'mutation', input);
      return {
        content: [{ type: "text", text: `Risk created successfully! Assessment ID: ${result.assessmentId}. Inherent Level: ${result.level}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: map_controls
 */
server.tool(
  "map_controls",
  "Link specific security controls to a project for compliance monitoring.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    projectId: z.number().describe("Target Project ID"),
    controlIds: z.array(z.number()).describe("List of internal Control IDs to map"),
  },
  async (input: { clientId: number, projectId: number, controlIds: number[] }) => {
    try {
      const result = await callComplianceApi('mcp.mapControls', 'mutation', input);
      return {
        content: [{ type: "text", text: `Successfully mapped ${result.mappedCount} controls to project.` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: list_governance_tasks
 * Read the governance workbench task feed.
 */
server.tool(
  "list_governance_tasks",
  "List governance workbench tasks for a workspace. Use to review pending compliance operations, overdue items, and task status.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("Filter by task status"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Filter by priority"),
    limit: z.number().min(1).max(200).default(50).describe("Max tasks to return"),
  },
  async (input: { clientId: number, status?: string, priority?: string, limit?: number }) => {
    try {
      const result = await callComplianceApi('mcp.listGovernanceTasks', 'query', input);
      const tasks = result?.tasks || [];
      return {
        content: [{
          type: "text",
          text: `Found ${result?.total ?? tasks.length} governance tasks in workspace ${input.clientId}:\n${JSON.stringify(tasks, null, 2)}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: create_governance_task
 * Create a work item in the governance workbench.
 */
server.tool(
  "create_governance_task",
  "Create a new governance task (work item) in a workspace, e.g. policy reviews, control assessments, risk reviews, vendor assessments or corrective actions.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    title: z.string().describe("Short descriptive title of the task"),
    description: z.string().optional().describe("Longer description / instructions"),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium").describe("Task priority"),
    type: z.enum(["policy_review", "control_assessment", "risk_review", "vendor_assessment", "review", "approval", "evidence_collection"]).default("review").describe("Kind of governance task"),
    dueDate: z.string().optional().describe("Due date as ISO string, e.g. 2026-09-30"),
  },
  async (input: any) => {
    try {
      const result = await callComplianceApi('mcp.createGovernanceTask', 'mutation', input);
      return {
        content: [{
          type: "text",
          text: `Governance task created successfully! Task ID: ${result.taskId}, Status: ${result.status}, Priority: ${result.priority}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: update_governance_task
 * Update status/priority/assignment of an existing governance task.
 */
server.tool(
  "update_governance_task",
  "Update an existing governance task: change its status (e.g. mark completed), adjust priority, or reassign it.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    taskId: z.number().describe("ID of the governance task to update"),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("New status"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("New priority"),
    assignedToUserId: z.number().nullable().optional().describe("User ID to assign, or null to unassign"),
  },
  async (input: any) => {
    try {
      const result = await callComplianceApi('mcp.updateGovernanceTask', 'mutation', input);
      return {
        content: [{
          type: "text",
          text: `Task ${result.taskId} updated. Status: ${result.status}, Priority: ${result.priority}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: run_autopilot
 * Trigger the AI Autopilot engine for a workspace.
 */
server.tool(
  "run_autopilot",
  "Trigger the AI Autopilot engine for a workspace. It collects evidence, runs control health checks, detects gaps and creates remediation tasks. Returns real run outcomes.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
  },
  async (input: { clientId: number }) => {
    try {
      const result = await callComplianceApi('mcp.runAutopilot', 'mutation', input);
      return {
        content: [{
          type: "text",
          text: `Autopilot run ${result.runId} finished.\n- Tasks created: ${result.totalCreated}\n- Evidence collected: ${result.evidenceCollected}\n- Health issues found: ${result.healthIssuesFound}\n- Gaps detected: ${result.gapsDetected}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_program_guide_progress
 * Read program-guide step assignments and owners.
 */
server.tool(
  "get_program_guide_progress",
  "Get program guide progress for a workspace: which governance program steps have owners assigned and their target dates.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    guideType: z.string().default("governance").describe("Program guide type, e.g. 'governance' or 'ai-governance'"),
  },
  async (input: { clientId: number, guideType?: string }) => {
    try {
      const result = await callComplianceApi('mcp.getProgramGuideProgress', 'query', input);
      return {
        content: [{
          type: "text",
          text: `Program guide '${result.guideType}': ${result.assignedSteps} step(s) with assignments.\n${JSON.stringify(result.assignments, null, 2)}`,
        }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: list_risks
 */
server.tool(
  "list_risks",
  "List the risk register for a workspace, highest inherent score first. Filter by risk level or approval status.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    inherentRisk: z.enum(["low", "medium", "high", "critical", "extreme"]).optional().describe("Filter by inherent risk level"),
    status: z.enum(["draft", "approved", "reviewed"]).optional().describe("Filter by assessment status"),
    limit: z.number().min(1).max(200).default(50).describe("Max risks to return"),
  },
  async (input: any) => {
    try {
      const result = await callComplianceApi('mcp.listRisks', 'query', input);
      const risks = result?.risks || [];
      return {
        content: [{
          type: "text",
          text: `Found ${result?.total ?? risks.length} risks in workspace ${input.clientId}:\n${JSON.stringify(risks, null, 2)}`,
        }],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

/**
 * Tool: get_risk_summary
 */
server.tool(
  "get_risk_summary",
  "Get aggregated risk posture for a workspace: totals by risk level, count scoring high-or-above, and how many critical risks have no treatment attached.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
  },
  async (input: { clientId: number }) => {
    try {
      const r = await callComplianceApi('mcp.getRiskSummary', 'query', input);
      return {
        content: [{
          type: "text",
          text: `Risk posture for workspace ${input.clientId}:\n- Total risks: ${r.totalRisks}\n- High or above: ${r.highOrAbove}\n- Unmitigated critical: ${r.unmitigatedCriticalRisks}\n- By level: ${JSON.stringify(r.byLevel)}`,
        }],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

/**
 * Tool: add_risk_treatment
 */
server.tool(
  "add_risk_treatment",
  "Attach a treatment plan to an existing risk: mitigate, transfer, accept or avoid, with a justification and optional owner/due date.",
  {
    clientId: z.number().describe("Your Workspace/Client ID"),
    riskAssessmentId: z.number().describe("ID of the risk to treat (from list_risks)"),
    strategy: z.enum(["mitigate", "transfer", "accept", "avoid"]).describe("Treatment strategy"),
    justification: z.string().describe("Why this strategy was chosen / what will be done"),
    owner: z.string().optional().describe("Person accountable for the treatment"),
    dueDate: z.string().optional().describe("Target completion date, ISO e.g. 2026-09-30"),
  },
  async (input: any) => {
    try {
      const r = await callComplianceApi('mcp.addRiskTreatment', 'mutation', input);
      return {
        content: [{
          type: "text",
          text: `Treatment ${r.treatmentId} (${r.strategy}) attached to risk ${r.riskAssessmentId}.`,
        }],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
);

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ComplianceOS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
