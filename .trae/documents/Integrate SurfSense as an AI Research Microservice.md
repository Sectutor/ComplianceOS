I have researched SurfSense and your current application structure. SurfSense is a powerful Python-based AI research assistant that uses **FastAPI**, **PostgreSQL (pgvector)**, and **Redis**. Your application (`ComplianceOS`) is a **Node.js/TypeScript** application with its own internal RAG system (`lib/advisor`).

Since SurfSense is a standalone application with a different technology stack (Python vs Node.js), "building it into" your app is best achieved by running it as a **microservice** alongside your current app and integrating via API. This avoids a massive rewrite while giving you all of SurfSense's "AI heavy lifting" capabilities (Web Search, Connectors, GraphRAG).

Here is the integration plan:

### Phase 1: Infrastructure Setup
1.  **Create `docker-compose.surfsense.yml`**: Set up SurfSense (Backend, Frontend, Redis, Postgres) to run locally alongside your app.
2.  **Configure Environment**: Add necessary API keys (Tavily, OpenAI/Anthropic) to SurfSense configuration.

### Phase 2: API Integration (`lib/surfsense`)
1.  **Create `SurfSenseClient`**: A TypeScript wrapper in `lib/surfsense/client.ts` to communicate with the SurfSense backend.
    *   `chat(message, sources)`: To send queries to SurfSense.
    *   `upload(file)`: To ingest documents.
2.  **Add "Research Mode" to Advisor**:
    *   Modify `lib/advisor/service.ts` to allow switching between the internal RAG and SurfSense.
    *   When "Web Search" or "External Research" is requested, route the query to SurfSense.

### Phase 3: Data Synchronization (Optional but Recommended)
1.  **Sync Script**: Create `scripts/sync-to-surfsense.ts` to periodically export high-level ComplianceOS data (Policies, Risks) to SurfSense so it can answer questions using both *external* web data and *internal* compliance data in one view.

### Phase 4: Frontend UI
1.  **Update `AdvisorWorkbench`**: Add a toggle or specialized UI for "Deep Research" that utilizes the SurfSense integration.
2.  **Display Citations**: Render SurfSense's rich citations (Web links, Slack threads) in your existing chat interface.

This approach gives you the best of both worlds: your tailored internal compliance RAG and SurfSense's powerful external research engine, working together.
