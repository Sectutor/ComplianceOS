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

  const url = `${API_URL}/${procedure}?batch=1`;
  const response = await fetch(url, {
    method: type === 'mutation' ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT_TOKEN}`,
      'x-mcp-client': 'true',
    },
    body: type === 'mutation' ? JSON.stringify({ '0': input }) : undefined,
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 412) {
        throw new Error("PREMIUM_REQUIRED: This feature requires a ComplianceOS Premium subscription.");
    }
    throw new Error(`ComplianceOS API Error: ${response.statusText} (${response.status})`);
  }

  const data = (await response.json()) as any[];
  const result = data[0]?.result?.data;
  
  if (data[0]?.error) {
    throw new Error(`Backend Error: ${data[0].error.message}`);
  }
  
  return result;
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
