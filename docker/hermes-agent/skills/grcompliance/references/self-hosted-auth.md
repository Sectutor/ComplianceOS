# Self-Hosted Auth on GRCompliance

## Architecture

The app uses LOCAL auth mode (no Supabase). Authentication:

1. **Server**: `local-auth.ts` stores users in `local-users.json` (SHA256(salt + password))
2. **Client**: `AuthContext.tsx` fetches POST /api/auth/local-login, stores token in localStorage
3. **Middleware**: `authMiddleware` checks session on each request

## Removing Supabase

1. **AuthContext.tsx**: Strip all supabase.auth calls (signInWithPassword, signOut, getSession, onAuthStateChange). Use only fetch('/api/auth/local-login') for login and localStorage.clear() for logout.

2. **server_entry.ts**: Move `/api/agent-chat` route BEFORE `app.use(authMiddleware)` so unauthenticated requests reach the agent.

3. **docker-compose.yml**: Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) can stay — they're not called after Supabase is removed from AuthContext.

## Default Credentials

admin@complianceos.local / demo1234

## Password Hash

Algorithm: SHA256(salt + password) — simple concatenation, not PBKDF2 or bcrypt. Salt is 32 random bytes as hex.
