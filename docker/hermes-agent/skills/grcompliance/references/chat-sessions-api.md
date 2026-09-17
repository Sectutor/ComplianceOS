# Chat Session Persistence (2026-07-07)

## Architecture

The ComplianceOS chat on `/agent` now persists conversations to the PostgreSQL database instead of localStorage-only.

### Backend

Three Express endpoints on port 3005:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/agent-sessions` | List all sessions (ordered by updatedAt desc) |
| `POST` | `/api/agent-sessions` | Create or update a session (upsert by id) |
| `DELETE` | `/api/agent-sessions/:id` | Delete a session |

**Body for POST:**
```json
{
  "id": null,           // null for create, number for update
  "title": "Chat title",
  "messages": [{ "role": "user|agent", "content": "...", "timestamp": 123 }],
  "conversationId": "conv_xxx",
  "pinned": false
}
```

### Schema (`chat_sessions` table)

- `id` — serial primary key
- `user_id` — nullable, for future user scoping
- `title` — varchar(255)
- `messages` — jsonb array of {role, content, timestamp}
- `conversation_id` — varchar(255), links to Hermes agent conversation
- `message_count` — integer, default 0
- `pinned` — boolean, default false
- `created_at`, `updated_at` — timestamps

### Frontend (AgentPage.tsx)

The `useAgentChat` hook at `src/hooks/useAgentChat.ts` calls `/api/agent-chat` which proxies to the Hermes sidecar on port 9090. The AgentPage syncs conversations by calling:

- `GET /api/agent-sessions` on mount → populates sidebar
- `POST /api/agent-sessions` on every message change → saves
- `DELETE /api/agent-sessions/:id` on delete → removes

### Adding the schema

```bash
docker exec complianceos-app-1 npx drizzle-kit push:pg
```

This adds the `chat_sessions` table to the existing PostgreSQL DB without affecting other tables.

### Frontend rebuild note

The AgentPage source changes only take effect after rebuilding the frontend. To rebuild:
```bash
docker compose build app
docker compose up -d app
```
Or use `npm run build:community` inside the container if `vite` is available.
