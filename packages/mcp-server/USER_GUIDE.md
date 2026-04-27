# ComplianceOS MCP Service: User Guide

Welcome to the **ComplianceOS MCP (Model Context Protocol)** service! This premium feature allows you to link your ComplianceOS workspace directly to AI agents like **Claude Desktop**, **Cursor**, or any other MCP-compliant client.

With this integration, your AI assistant gains the ability to:
*   List your workspaces and projects.
*   Summarize your current compliance status.
*   Automatically add new risk scenarios.
*   Map security controls to projects.

---

## 1. Prerequisites
*   **ComplianceOS Premium/Enterprise License**: This service is only available for premium subscribers.
*   **Personal Access Token (PAT)**: You must generate a secret token in ComplianceOS.
*   **MCP Client**: An application that supports standard input/output (stdio) MCP servers (e.g., Claude Desktop).

---

## 2. Generating your Personal Access Token (PAT)
1.  Log in to ComplianceOS.
2.  Go to **Settings** > **Security**.
3.  Scroll down to the **Personal Access Tokens** section.
4.  Click **Generate New Token**.
5.  Give it a name (e.g., "My Claude Assistant").
6.  **CRITICAL**: Copy the token immediately. For your security, it will only be displayed once.

---

## 3. Configuration

### For Claude Desktop (Windows)
Open your `claude_desktop_config.json` file (usually found at `%APPDATA%\Claude\claude_desktop_config.json`) and add the following entry under `mcpServers`:

```json
{
  "mcpServers": {
    "compliance-os": {
      "command": "node",
      "args": [
        "C:/path/to/ComplianceOS/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "COMPLIANCE_OS_PAT": "cos_your_secret_token_here",
        "COMPLIANCE_OS_API_URL": "https://app.grcompliance.com/api/trpc"
      }
    }
  }
}
```

*Replace `C:/path/to/...` with the actual path to the built MCP server file.*
*Replace `cos_your_secret_token_here` with your actual PAT.*

---

## 4. Available Tools

Your AI assistant will now have access to the following tools:

| Tool | Usage |
| :--- | :--- |
| `list_workspaces` | "List all workspaces I have access to." (Use this first to find IDs) |
| `list_projects` | "Show me all my current projects in Client ID 1." |
| `check_compliance` | "Give me a summary of my compliance status." |
| `add_risk_scenario` | "Add a new High Likelihood risk for Ransomware in Project 5." |
| `map_controls` | "Map controls 12, 45, and 88 to my Production workspace." |

---

## 5. Security & Privacy
*   **Premium Gating**: If your subscription expires, the tools will return a "Premium Required" error.
*   **Audit Logging**: Every action taken by the AI via these tools is logged in your ComplianceOS Audit Trail with the prefix `[MCP]`.
*   **Scoped Access**: The AI can only see and modify data that your user account has permissions for.

---

*For support, contact support@grcompliance.com or visit our documentation portal.*
