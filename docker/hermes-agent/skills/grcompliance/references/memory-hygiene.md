# Memory Hygiene — Preventing Bloat

## The Problem

Memory is injected into every conversation turn. When it fills up with **operational trivia** (bridge config, Docker SHAs, skill version logs, timestamps), two things happen:

1. **Memory dwarfs the actual task** — the model sees more context about infrastructure than about the user's question
2. **Model echoes memory** — the easiest (laziest) response is to repeat what it already sees, producing an answer from stale notes instead of reasoning fresh

This manifests as the agent answering: "Bridge timeout: 240s, content_hash fix applied, grcompliance v1.2.0 updated..." when the user asked about risks or controls.

## What Belongs Where

| Category | Goes in | Why |
|---|---|---|
| User preferences (style, tone, format corrections) | **Memory** | Stable across sessions, needed every turn |
| Stable environment facts (API base URL, auth method) | **Memory** | Rarely changes, needed every turn |
| API endpoints, workflows, query patterns | **Skill SKILL.md** | Loaded on demand, verbose | 
| Bridge architecture, deployment, troubleshooting | **Skill references/** | Debugging context, not daily use |
| Task logs ("deployed X", "fixed bug Y", "tested Z") | **/dev/null** | Transient by definition |
| Tool/workflow corrections ("never use X, use Y instead") | **Skill SKILL.md** (pitfalls) | The skill governs the workflow |
| Docker compose structure, image names | **docker-compose.yml** | Already committed to repo |
| Feature changelogs, version numbers | **SKILL.md frontmatter** only | Metadata, not body content |

## Symptoms of Bloat

1. **Agent quotes specific numbers** from memory (Docker SHAs, test counts, timeout values) in answers
2. **Agent opens with old task context** instead of answering the current question
3. **Memory char usage is >90%** of the limit (check memory tool output)
4. **Multiple entries** on the same topic with conflicting details

## Memory Hygiene Checklist

Run this when you suspect bloat:

```
[ ] Do any memory entries contain: bridge config, Docker commands, SHAs, image names?
[ ] Do any memory entries contain: skill version numbers, changelogs, feature lists?
[ ] Do any memory entries contain: timestamps, test results, deployment logs?
[ ] Do any memory entries contain: tool commands that belong in a skill?
```

If YES to any → move that content to the relevant skill/reference, remove from memory.

## How to Clean Memory

```bash
# 1. View current memory (look for operational trivia)
# Via the memory tool: list all entries with memory(action='list')
# Or check files directly:
#   ~/AppData/Local/hermes/profiles/<profile>/memories/MEMORY.md
#   ~/AppData/Local/hermes/profiles/<profile>/memories/USER.md

# 2. Remove stale entries using memory(action='remove', target='memory', old_text='...')
#    Keep only: user preferences + stable environment facts

# 3. Start a /new session so the cleaned memory loads fresh
#    (The old session has the stale context baked into its prompt cache.)
```

## Prevention (for the agent)

When saving to memory, ask: **"Will this fact still be true in 30 days?"**
- "User prefers concise responses" → Yes (save to memory)
- "Bridge timeout is 240s" → No (belongs in skill reference)
- "Docker image sha:94774650a33f" → No (transient build artifact)
- "User wants bold numbers in output" → Yes (save to memory)

When memory is near full, consolidate: remove 2-3 stale entries per new entry added.
