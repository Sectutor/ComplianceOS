# ComplianceOS MCP Server

This micro-service provides a Model Context Protocol (MCP) interface for AI agents (like Claude Desktop or Cursor) to interact with ComplianceOS GRC data securely.

## Features

- **Premium-Gated**: Requires a valid Personal Access Token (PAT) from a Premium account.
- **Secure**: Uses `stdio` transport, meaning it only communicates locally with your AI client.
- **Actionable**: AI agents can list projects, check compliance status, add risks, and map controls.

## Installation for Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "compliance-os": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": {
        "COMPLIANCE_OS_PAT": "your_personal_access_token_here",
        "COMPLIANCE_OS_API_URL": "https://your-compliance-os-instance.com/api/trpc"
      }
    }
  }
}
```

## Available Tools

- `list_projects`: Get a list of all workspaces and projects.
- `check_compliance`: Get real-time compliance metrics.
- `add_risk_scenario`: Programmatically add risks to the register.
- `map_controls`: Link controls to projects for monitoring.

## Development

To run in development mode with auto-reload:
```bash
npm run dev -w @complianceos/mcp-server
```
