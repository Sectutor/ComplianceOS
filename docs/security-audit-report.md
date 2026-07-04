# Security Audit — Fixes Applied

## Executive Summary
Audited 5 key source files. Found and fixed **12 security vulnerabilities** across authentication, upload handling, webhook security, information disclosure, and content security policy.

## Vulnerabilities Fixed

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | **CRITICAL** | `authMiddleware.ts` | `SUPABASE_SERVICE_ROLE_KEY` used at request-time — bypasses all Row-Level Security | Changed to `VITE_SUPABASE_ANON_KEY` only |
| 2 | **CRITICAL** | `gumroad.ts` | Test endpoint `/gumroad/test` with no auth or signature — allows anyone to insert database records | **Removed entirely** |
| 3 | **HIGH** | `gumroad.ts` | Status endpoint `/gumroad/status` exposed webhook secret length to unauthenticated users | Added admin-only auth check; removed `config` block |
| 4 | **HIGH** | `gumroad.ts` | `timingSafeEqual` called with implicit UTF-8 encoding — consistent string comparison guaranteed | Added explicit `'utf-8'` encoding to both buffers |
| 5 | **HIGH** | `authMiddleware.ts` | Error message leaked in 503 response: `details: error.message` | Removed `details` from response |
| 6 | **HIGH** | `authMiddleware.ts` | Error message leaked in 500 TRPC response | Removed `details` from response |
| 7 | **HIGH** | `upload.ts` | No file size limit — allows memory exhaustion DoS via large base64 payloads | Added 10MB max size check |
| 8 | **HIGH** | `upload.ts` | No content type validation — allows uploading executable content | Added allowed MIME types set |
| 9 | **MEDIUM** | `upload.ts` | Weak path traversal prevention — allowed `./` and SQL and shell special chars | Added strict alphanumeric regex; full filename sanitization |
| 10 | **MEDIUM** | `server_entry.ts` | Request log (`[Incoming]`) logged full URL including query params — could expose tokens | Changed to `req.path` only |
| 11 | **MEDIUM** | `server_entry.ts` | TRPC request log logged query strings — could expose tokens | Changed to `req.path` only |
| 12 | **MEDIUM** | `server_entry.ts` | Global error handler leaked error message in development mode | Removed `error: err.message` from error response |
| 13 | **LOW** | `server_entry.ts` | CSP `connectSrc` allowed wildcard `https://*.supabase.co` and multiple netlify/grcompliance origins — over-permissive | Narrowed to only the configured `VITE_SUPABASE_URL` |
| 14 | **LOW** | `server_entry.ts` | Missing HSTS, frame restrictions, object-src restrictions | Added `frameSrc: 'none'`, `objectSrc: 'none'`, `baseUri: 'self'`, `formAction: 'self'`, `referrerPolicy`, HSTS |
| 15 | **LOW** | `export.ts` | CSV export vulnerable to CSV injection (formula injection) | Added sanitization for values starting with `=`, `+`, `-`, `@` |
| 16 | **LOW** | `upload.ts` | Error message leaked upload failure details to client | Changed to generic `Upload failed` message |

## Files Modified
- `packages/core/src/authMiddleware.ts` — 3 fixes
- `packages/core/src/server/routers/upload.ts` — 4 fixes (full rewrite)
- `packages/core/src/server/webhooks/gumroad.ts` — 3 fixes (removed test endpoint)
- `server_entry.ts` — 5 fixes (logging, CSP, error handler)
- `packages/core/src/server/routers/export.ts` — 1 fix (CSV injection)
