# Compliance Agent — Commands Reference

## Natural Language Queries

These are queries your Compliance Agent understands. Type them in the web chat
or send them to your Telegram/Slack bot.

### Compliance Status
| Query | What It Does |
|-------|-------------|
| "Are we NIS2 ready?" | Shows NIS2 pass rate, gaps, expiring evidence |
| "Show ISO 27001 status" | ISO 27001 readiness with control breakdown |
| "DORA compliance health" | DORA posture with regulatory mapping |
| "Overall compliance score" | Aggregate score across all active frameworks |
| "How did we change this quarter?" | Trend analysis across frameworks |

### Evidence Management
| Query | What It Does |
|-------|-------------|
| "Scan for evidence gaps" | Identifies controls without evidence |
| "Collect evidence now" | Runs automated evidence collection scripts |
| "Show expiring evidence" | Lists evidence expiring within 30 days |
| "What evidence is expired?" | Lists expired evidence needing refresh |

### Risk Management
| Query | What It Does |
|-------|-------------|
| "Show open risks" | Lists all open risks by severity |
| "Create risk for..." | Creates a new risk item in the register |
| "What are our critical risks?" | Filters to CRITICAL severity only |
| "Vendor risk summary" | Vendor assessment status |

### Reporting
| Query | What It Does |
|-------|-------------|
| "Generate NIS2 report" | Full readiness report for NIS2 |
| "Generate audit report" | Evidence pack for upcoming audit |
| "Executive summary" | Board-ready one-page summary |
| "Gap analysis report" | Detailed gaps with recommendations |

### MSSP Operations
| Query | What It Does |
|-------|-------------|
| "Show all client statuses" | Overview of all MSSP clients |
| "Client X compliance health" | Single client drill-down |
| "Onboard new client [name]" | Creates and scans a new client tenant |

### Emergency Response
| Query | What It Does |
|-------|-------------|
| "Log4j zero-day — are we exposed?" | Scans repos, cloud, vendors for the vulnerability |
| "Critical CVE check" | Checks dependency vulnerabilities across all repos |
| "Check our exposure to [threat]" | Targeted threat impact assessment |

## Slash Commands (Telegram/Slack)

| Command | Description |
|---------|-------------|
| `/status` | Compliance health summary |
| `/gaps` | Gaps by severity |
| `/scan` | Trigger evidence collection |
| `/report` | Generate NIS2 report |
| `/expiring` | Evidence expiring soon |
| `/help` | Available commands |

## Daily Automation

The agent runs these automatically:

| Schedule | Job | Description |
|----------|-----|-------------|
| 6:00 AM daily | Evidence scan | Collects automated evidence, POSTs to API |
| 8:00 AM daily | Expiry alert | Checks evidence expiring within 30 days |
| Monday 9:00 AM | Weekly report | Generates full gap report with trends |
| Every 30 min | CISOvault bridge | Polls CISOvault, creates risks for findings |
