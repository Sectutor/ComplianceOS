## Overview
We will restart both the frontend Vite dev server and the backend Express server used by this project. Frontend serves on `http://localhost:5173` (default). Backend listens on `http://localhost:3000` (or `PORT` env). The Vite dev server proxies `'/api'` to the backend.

## What I Found
- Scripts in `package.json`: `dev` → `vite`, `build` → `vite build`, `preview` → `vite preview`, `server` → `tsx index.ts`.
- Backend entry: `index.ts` with `const PORT = process.env.PORT || 3000` and `app.listen(PORT, ...)` when not production.
- Vite config (`vite.config.ts`): default port (5173); `server.proxy['/api']` → `http://localhost:3000`.

## Steps to Restart
1. Stop any running dev/backend processes if present.
2. Start backend:
   - In a terminal at `d:\OneDrive - Intellfence\WebDev\ComplianceOS`, run `npm run server`.
   - Expect listening on `http://localhost:3000` (or on `PORT` if set).
3. Start frontend:
   - In a second terminal at the same path, run `npm run dev`.
   - Expect `Local: http://localhost:5173` in output.
4. Verify routing:
   - Open `http://localhost:5173` and ensure the app loads.
   - Hit an API endpoint such as `http://localhost:5173/api/health` (proxied to backend) to confirm 200 OK.
5. Optional production preview:
   - `npm run build` then `npm run preview` to serve the built site.

## Error Handling
- If port 3000 is in use, set a different port: PowerShell `\$env:PORT=4000; npm run server`.
- If `NETLIFY` or `NODE_ENV=production` is set, backend may skip `listen`; ensure `NODE_ENV=development` for local dev.

## Deliverables
- Frontend running at `http://localhost:5173` with live reload.
- Backend running at `http://localhost:3000`.
- Verified proxy between frontend and backend via `/api`.