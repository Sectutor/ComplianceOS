# SPA Routing Fix — Express + wouter (2026-07-07)

## Problem

Clicking sidebar menu items triggered a full page reload instead of SPA navigation. Root cause: subscription/auth `useEffect` blocks used `window.location.href = '/path'` instead of wouter's `setLocation('/path')`.

## Diagnosis

1. The Express server already had proper SPA fallback:
   ```ts
   app.get('*', (req, res, next) => {
     if (req.path.startsWith('/api')) return next();
     res.sendFile(path.join(distPath, 'index.html'));
   });
   ```
2. The sidebar used `setLocation(path)` correctly (from wouter's `useLocation()`)
3. But `useEffect` blocks for subscription redirects, auth flows, and payment checks used `window.location.href` — which causes full page reload

## Fix

Replace `window.location.href` with `setLocation()` in all non-auth `useEffect` redirects:

```ts
// ❌ BEFORE
window.location.href = '/complete-subscription';
window.location.reload();

// ✅ AFTER
setLocation('/complete-subscription');
setLocation(window.location.pathname);
```

### Auth redirects (keep as window.location.href)

Login/logout flows **should** use `window.location.href` because auth state (Supabase session, local tokens) needs a full page reload to reinitialize:

```ts
window.location.href = getLoginUrl();
```

## Finding the culprits

```bash
grep -rn "window.location.href" packages/core/src/components/ | grep -v "getLoginUrl"
grep -rn "window.location.reload" packages/core/src/components/
```

## Verifying the fix

```bash
# Check no more full-page reload redirects remain
grep -rn "window.location.href" packages/core/src/components/DashboardLayout.tsx
# Only login/logout should remain:
#   window.location.href = getLoginUrl();
```
