## Overview
- Restart the frontend Vite dev server and backend Express API in the project root `d:\OneDrive - Intellfence\WebDev\ComplianceOS`.
- Frontend runs with `vite` (default port `5173`) and proxies `/api` to `http://localhost:3000`.
- Backend runs via `tsx index.ts` (port `process.env.PORT || 3000`) and only auto-starts when `NODE_ENV !== 'production'` and `NETLIFY` is not set.

## Commands
- Frontend (Vite dev): `npm run dev`
- Backend (Express API): `npm run server`
- If a process is already running in a terminal, stop it (Ctrl+C) and re-run the above commands.

## Environment Notes
- Ensure `NETLIFY` is not set in your local environment; otherwise `index.ts` will skip `app.listen(...)`.
- Optionally set `PORT` if you want a non-default API port, e.g., `set PORT=4000` before `npm run server` on Windows.

## Validation
- Frontend: confirm console shows Vite with Local URL (likely `http://localhost:5173/`).
- Backend: confirm log shows `Server listening on http://localhost:3000` (or your chosen `PORT`).
- Browser check: open `http://localhost:5173/` for the app; API calls under `/api/*` should proxy to `http://localhost:3000`.

## Optional Checks
- If a port appears busy, free it or change `PORT`. You can verify with `netstat -ano | findstr :3000` in PowerShell, then stop the owning process as needed.

## Result
- After running the two commands, the app should be live on `5173` with API on `3000`, and the `/api` proxy should function as expected.