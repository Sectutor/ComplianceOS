# GTM AUTOMATION STACK — MCP + AI ARCHITECTURE
## Companion to `50K-IN-30-DAYS-PLAN.md`

> Goal: automate ~70% of the plan's mechanical work (sourcing, drafting, triage,
> follow-up, reporting) so the founder's 3-4 hrs/day goes to approval, calls, and
> closing. The 30% that stays human is where deals actually close — don't fight that.

---

## 0. THE DESIGN PRINCIPLE

**Agents draft, humans approve, software sends.**

Every pipeline below ends in an approval gate (one click per batch, ~15 min/day).
Nothing is fully autonomous for two reasons:
1. **Deliverability + brand:** GRC buyers are conservative; one AI-slop email thread
   visible on LinkedIn costs more than a week of outreach.
2. **It's a 20-touch/day plan, not 500.** At this volume human review is cheap and
   materially raises reply rates. Full autonomy is a scale problem you don't have yet.

Also: you sell compliance. Your outbound must survive a compliance audit (GDPR /
ePrivacy for EU B2B, unsubscribe links, legitimate-interest basis for role-based
addresses, no scraped personal emails, DPA-ready list sources). Practice it —
"our cold outreach is GDPR-clean" is itself a sales line.

---

## 1. REFERENCE ARCHITECTURE

```
            ┌─────────────────────────────────────────────────┐
            │  n8n (self-hosted on Coolify — 1-click app)     │
            │  = the spine: schedules, webhooks, AI Agent node│
            │    (n8n AI Agent node acts as MCP CLIENT)       │
            └───────┬─────────┬─────────┬─────────┬───────────┘
                    │         │         │         │
     ┌──────────────┴──┐ ┌────┴─────┐ ┌─┴──────┐ ┌┴──────────────┐
     │ DATA / SOURCING │ │ LLM      │ │ CRM    │ │ SENDING       │
     │ Apollo MCP      │ │ OpenAI/  │ │ HubSpot│ │ Smartlead /   │
     │ Firecrawl MCP   │ │ Anthropic│ │ MCP    │ │ Gmail via n8n │
     │ Exa/Tavily MCP  │ │ (1 key,  │ │ (mcp.  │ │ (warmup, seq) │
     │ Reddit API      │ │  routed) │ │ hubspot│ │               │
     │ HN Algolia API  │ └──────────┘ │  .com) │ │ X API /       │
     └─────────────────┘              └────────┘ │ LinkedIn      │
                                                 │ (approve+post)│
                                                 └───────────────┘
```

**Component choices (all real as of Sept 2026):**
- **Orchestration: n8n, self-hosted on your Coolify.** You already drive Coolify
  through MCP from this workspace; n8n deploys as a one-click app. Its AI Agent node
  is an MCP client, so every MCP server below plugs in as a tool. Free, self-hosted
  (matches the product's own sovereignty story), no per-task pricing.
- **Prospecting: Apollo official MCP server** (launched Feb 2026, OAuth, 45 tools,
  included in paid plans) — list filters, contact enrichment, engagement data.
- **Enrichment/scraping: Firecrawl MCP** (prospect sites → "what they sell, what
  frameworks they'd need") and **Exa/Tavily MCP** (semantic search for trigger
  events, news, funding announcements).
- **LLM: one API key** (Anthropic or OpenAI, or OpenRouter to swap) used by every
  n8n workflow. Your product's multi-provider LLM router idea, applied to your own GTM.
- **CRM: HubSpot free tier + official remote MCP server** (GA April 2026,
  mcp.hubspot.com, OAuth, 40+ tools). Alternative if you want zero new SaaS: a
  `prospects` table in the Postgres you already run — but HubSpot MCP is faster to
  wire and the free tier is fine.
- **Sending: Smartlead** (~$39/mo, dedicated deliverability infra, rotation, warmup)
  for cold sequences; **Gmail via n8n** for warm-network and 1:1 replies.
  Community Smartlead/Instantly MCP servers exist if you want agents driving it.
- **Calendar: Cal.com** (open source) — reply-triage auto-inserts booking links.
- **Social: X API pay-per-use** (plain post $0.015; post with URL $0.20 — 20 posts/day
  ≈ $120/mo worst case, or use the free tier for text-only). LinkedIn has no
  sanctioned DM automation — see §4. Reddit: API for listening, human for posting.
- **Zero-new-infra alternative for the daily loop:** ZCode workspace automations
  (cron) can run the trigger-event listener + digest drafting directly in this
  repo/workspace using web search + fetch, writing a daily `gtm/digest.md`. Good
  enough to start before n8n is wired.

---

## 2. THE SIX PIPELINES (mapped to the plan's daily non-negotiables)

### P1 — Trigger-Event Listener (replaces hunting for prospects)
- **Trigger:** hourly/daily schedule.
- **What it does:** polls Reddit API (r/startups, r/msp, r/ciso, r/ISO27001,
  r/SOC2 — keyword rules: "Vanta pricing", "SOC 2 required", "recommend GRC",
  "NIS2", "ISO 27001 tool"), HN Algolia (free, no auth: "SOC 2", "compliance
  startup"), and Exa (funding announcements, enterprise-deal press, EU NIS2
  sector news). LLM scores each hit 0-3 for buying intent + drafts a reply/DM.
- **Output:** daily `digest.md` (or Slack/WhatsApp message): ranked list of
  trigger events, each with a drafted, personalized reply **you post yourself**.
- **Human touchpoint:** 10 min/day picking and posting.
- This is the automation with the highest ROI: replies to people publicly asking
  for GRC tooling are the warmest outbound that exists.

### P2 — List Builder + Enrichment (builds the 20/day)
- **Trigger:** daily 6am.
- **What it does:** Apollo MCP pulls new companies matching each ICP filter
  (headcount 10-50, B2B SaaS/fintech/healthtech, SOC 2 mentions in job posts —
  Apollo has technographic/job-post filters) → Firecrawl scrapes each homepage →
  LLM writes: ICP fit score, likely framework (they sell to hospitals → HIPAA;
  EU mid-size → NIS2), one personalization line, suggested offer (sprint vs
  license vs MSP by profile), email + LinkedIn URL.
- **Output:** an approval queue (Notion/HubSpot/n8n form) with 25 scored leads;
  you approve 20 in ~10 min.
- **Human touchpoint:** the 10-min approval pass.

### P3 — Outreach Sending + Sequencing
- **Trigger:** approval event from P2.
- **What it does:** Smartlead sends touch 1, sequences 2-4 automatically
  (day 3 bump, day 7 value piece, day 14 breakup — all pre-written templates with
  LLM slotting in the P2 personalization). Warmup rotation handled by Smartlead.
  Warm-network email goes through Gmail via n8n (better deliverability for 1:1).
- **The Day-24/28/30 deadline sequence** to all non-responders is a one-time n8n
  workflow — build it in week 1, it fires while you're on closing calls.
- **Human touchpoint:** the daily 20-slot approval (P2) — nothing sends unapproved.

### P4 — Reply Triage (the inbox agent)
- **Trigger:** new email reply / LinkedIn notification webhook.
- **What it does:** LLM classifies every reply: HOT (asks for price/call) /
  WARM (question/objection) / NOT-NOW (revisit date → auto-scheduled follow-up) /
  REFERRAL / UNSUB (suppress list immediately). HOT → phone push + auto-sent
  Cal.com link + pre-drafted response for 1-click send. Objections → drafted
  rebuttals from the sales playbook (`SALES-PLAYBOOK.md`).
- **Human touchpoint:** replies to humans are 1-click-approved; calls are you.

### P5 — Content Factory (1 proof piece/day)
- **Trigger:** daily 5pm.
- **What it does:** pulls live numbers (cash collected from Stripe API, calls
  booked from Cal.com, leads in pipeline) → LLM drafts tomorrow's post from a
  template bank (build-in-public update, trigger-event commentary, framework
  checklist, teardown of a compliance headache) → renders platform variants
  (LinkedIn long, X short thread, HN-style for Show HN follow-ups).
- **Output:** 3 drafts in a queue. You approve one, post LinkedIn natively, X via
  API (or n8n → X). Reddit stays manual per §4.
- **Also automates:** retargeting audience sync (launch-week visitors → LinkedIn
  audience) and the Day-30 "numbers post" from real data.

### P6 — Scorecard (the one number that matters)
- **Trigger:** daily 8am.
- **What it does:** Stripe API → cash collected MTD; HubSpot → calls booked,
  pipeline by offer (sprint/license/MSP); computes variance vs the plan's weekly
  goals ($5k D7, $12-18k D14, $30k D21, $50k D30) and posts the daily digest with
  yesterday's three actions done/not done. Kill-criteria alerts: "Day 7: <5 calls
  booked → pivot rule fires."
- **Human touchpoint:** reading it over coffee. This replaces the manual tracker.

**Supporting wire:** connect the product's own waitlist router
(`packages/core/src/server/routers/waitlist.ts`) to n8n via webhook → every
landing-page signup lands in HubSpot with lead score + enters the trial-nurture
sequence automatically.

---

## 3. BUILD ORDER (fits inside the plan's Days 1-3 funnel-fix window)

| Day | Build | Time | Why this order |
|---|---|---|---|
| 1 | P6 scorecard + P4 reply triage | 2-3 hrs | You need the number and the inbox clean from the first send |
| 2 | P1 trigger-event listener | 2-3 hrs | Produces replies/warm leads while you build the rest |
| 3 | P2 list builder + P3 sequences | 4-5 hrs | Outbound engine live by the time the warm email goes out |
| 4 | Deadline sequence (one-time) | 1 hr | Fires Day 24+ |
| 5 | P5 content factory | 2 hrs | Nice-to-have; the engine comes first |
| 5+ | n8n → HubSpot/Cal.com wiring | 2 hrs | Once volume justifies it |

ZCode-side stopgap (before/instead of n8n): a scheduled workspace automation that
runs P1's keyword sweep daily and writes `gtm/digest.md` — say the word and it
gets created; the n8n build then replaces it in week 1.

**Monthly cost of the whole stack:**
| Item | Cost |
|---|---|
| n8n self-hosted (on existing Coolify) | $0 |
| Apollo (basic paid plan, incl. MCP) | ~$49-99 |
| Smartlead | ~$39 |
| LLM API (all agents) | ~$20-50 |
| X API pay-per-use / free tier | $0-120 |
| HubSpot free tier, HN Algolia, Reddit API, Cal.com | $0 |
| **Total** | **~$110-310/mo** |

---

## 4. WHAT NOT TO AUTOMATE (and what it costs if you do)

| Don't | Why |
|---|---|
| LinkedIn DMs/connections via bots or browser automation | LinkedIn actively suspends; official API has no DM send. Automate research + drafting; send DMs yourself (it's 10/day). Company-page posting via API is fine. |
| Posting to Reddit via bot | Detection is good, self-promo rules are strict, and r/msp burns marketers publicly. Listen via API; post as yourself. |
| Discovery calls, negotiation, closing | The entire $50k is collected here. AI-prepped (brief per call auto-generated from P2/P4 data), never AI-done. |
| Product Hunt / HN launch-day comments | Real-time, judgment-heavy, platform penalties for automation. |
| Fully-autonomous cold email | Even at 20/day, unreviewed AI email is how you end up in spam folders and LinkedIn screenshots. Approve the batch. |

---

## 5. WHAT THIS FREES UP

The plan needs ~3-4 hrs/day of founder time. The stacks moves the mechanical
weight: ~45 min/day of sourcing → digest reading, ~45 min of drafting → approval
clicks, reply admin → triage, tracking → automated scorecard. The founder keeps:
approvals (25 min), community replies (15 min), calls (2-3 hrs), closing (the rest).

That's the point: **automation doesn't remove the founder from the loop — it removes
everything except the parts of the loop that close deals.**
