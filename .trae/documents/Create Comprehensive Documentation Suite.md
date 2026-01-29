I have analyzed the project structure, source code, and existing documentation. Here is the plan to create a comprehensive documentation suite for ComplianceOS.

# Documentation Plan

## 1. Restructure `docs/` Directory

I will organize the documentation into a clear, logical structure.

* `docs/README.md` (New): The main entry point with a Table of Contents and project overview.

* `docs/getting-started.md` (New): Developer setup guide (installation, environment variables, running locally).

* `docs/architecture.md` (New): High-level system architecture (Frontend, Backend, Database, AI Services).

* `docs/api-reference.md` (New): Documentation for REST endpoints (`/api/*`) and tRPC usage.

* `docs/database-schema.md` (New): Overview of the data model (Drizzle ORM schema).

* `docs/deployment.md` (New): Deployment guide (Netlify, Database).

* `docs/features/` (New Folder): To house user guides and feature specifics.

  * Move `governance-workbench-user-guide.md` here.

  * Move `METHODOLOGY.md` here.

  * Move `pricing_*.md` and `sales_talk_track.md` here.

## 2. Content Generation

### **Getting Started (`getting-started.md`)**

* **Prerequisites:** Node.js, PostgreSQL (or Supabase).

* **Installation:** `npm install`.

* **Environment Variables:** Explain key variables (DATABASE\_URL, OPENAI\_API\_KEY, STRIPE\_\*, etc.).

* **Running Locally:**

  * Frontend: `npm run dev`

  * Backend: `npm run server`

  * Database Studio: `npm run db:studio`

### **Architecture (`architecture.md`)**

* **Tech Stack:** React, Vite, Tailwind CSS, Express, tRPC, Drizzle ORM, PostgreSQL.

* **Backend:** Explain the dual-mode server (Local Express + Netlify Functions).

* **AI Integration:** Explain how OpenAI/LLM services are integrated (`lib/llm`, `lib/ai`).

* **Project Structure:** Explain the root folders (`components`, `pages`, `drizzle`, `netlify`, etc.).

### **API Reference (`api-reference.md`)**

* **REST Endpoints:** Document the routes found in `index.ts`:

  * `/api/trpc` (Overview)

  * `/api/upload-evidence-file`

  * `/api/export/soa/:clientId`

  * `/api/export/policy/:id/...` (DOCX, PDF, HTML)

  * `/api/ai/generate-stream` (SSE)

  * `/api/webhook/stripe`

### **Database Schema (`database-schema.md`)**

* **Overview:** Explain the core modules (Users, Clients, Controls, Risks, BCP, TPRM).

* **Key Tables:** Briefly describe the purpose of major tables (e.g., `clients`, `controls`, `risks`, `bc_plans`).

* **Relationships:** Explain how modules link (e.g., Client -> Policies -> Controls).

## 3. Execution Steps

1. Create the new `docs/` structure.
2. Move existing files to `docs/features/`.
3. Write `getting-started.md` and `architecture.md`.
4. Write `api-reference.md` and `database-schema.md`.
5. Create the main `docs/README.md` index.

