# Compliance Agent Setup Guide

The Compliance Agent is an AI assistant that manages your GRCompliance platform.
It auto-collects evidence, answers compliance questions, and alerts you about gaps.

## How It Works

When you deploy ComplianceOS, the agent boots automatically as a Docker sidecar.
It connects to the GRCompliance API internally over the Docker network.

```
complianceos (web app) ←→ hermes-agent (AI agent) ←→ postgres + redis
```

## Chat Interface

Open your ComplianceOS web app. A chat bubble (💬) appears in the bottom-right corner.
Click it to start a conversation with your Compliance Agent.

**Try these:**
- "Are we NIS2 ready?"
- "Show me compliance gaps"
- "Scan for expiring evidence"
- "Generate readiness report"

## Telegram Setup (Pro+)

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Copy the bot token
3. Add to your `.env`:
   ```
   GATEWAY_ENABLED=true
   TELEGRAM_BOT_TOKEN=your-token-here
   CISO_TELEGRAM_ID=your-user-id
   ```
4. Restart: `docker compose restart hermes-agent`
5. Message your bot: `/start`

**Available commands:**
- `/status` — Show compliance health summary
- `/gaps` — List compliance gaps by severity
- `/scan` — Trigger evidence collection
- `/report` — Generate NIS2 readiness report
- `/expiring` — Show evidence expiring within 7 days

## Slack Setup (Pro+)

1. Create a Slack app at https://api.slack.com/apps
2. Enable Bot Tokens and Event Subscriptions
3. Add to your `.env`:
   ```
   GATEWAY_ENABLED=true
   SLACK_BOT_TOKEN=xoxb-...
   SLACK_SIGNING_SECRET=...
   SLACK_COMPLIANCE_CHANNEL=#compliance
   ```
4. Restart: `docker compose restart hermes-agent`

## CISOvault Integration (Optional)

If you run CISOvault for domain security scanning, the agent can automatically
import findings into your GRCompliance risk register:

1. Add to your `.env`:
   ```
   CISOVAULT_API_URL=http://cisovault:3099
   CISOVAULT_API_KEY=your-key
   ```
2. Restart: `docker compose restart hermes-agent`
3. The bridge runs every 30 minutes, creating risks for HIGH/CRITICAL findings

## Customization

- **Scan intervals** — Modify cron YAML files at `skills/compliance-agent/cron/`
- **Evidence sources** — Add scripts to `scripts/` directory
- **Agent personality** — Edit `SOUL.md` in the agent profile
- **API key** — Set `COMPLIANCE_API_KEY` to secure agent → API communication

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Chat bubble shows "Agent Offline" | Check `docker compose logs hermes-agent` |
| Telegram bot not responding | Verify `TELEGRAM_BOT_TOKEN` is correct |
| Evidence collection fails | Check `COMPLIANCE_API_KEY` matches in both containers |
| CISOvault bridge silent | Verify `CISOVAULT_API_URL` is reachable from agent container |
