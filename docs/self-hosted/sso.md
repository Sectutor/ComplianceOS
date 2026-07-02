# Enterprise SSO / OIDC Integration (Phase 4.2)

## Overview
ComplianceOS supports Single Sign-On (SSO) for self-host Enterprise customers. Two approaches:

**A. Direct OIDC** (handled by ComplianceOS)
**B. Reverse proxy header auth** (Traefik/Nginx — recommended for most deployments)

---

## Approach A: Direct OIDC (built-in)

When `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET` are set, ComplianceOS redirects unauthenticated users to your IdP.

**Supported providers:**
- Keycloak
- Authentik
- Azure AD / Entra ID
- Google Workspace
- Okta
- Any OpenID Connect 2.0 compliant IdP

**Environment variables:**
```bash
OIDC_ISSUER=https://idp.example.com/realms/complianceos
OIDC_CLIENT_ID=complianceos
OIDC_CLIENT_SECRET=***
OIDC_SCOPES=openid,email,profile
OIDC_ROLE_CLAIM=groups
```

**Auth flow:** Login → redirect to IdP → callback → JWT issued → session.

---

## Approach B: Reverse Proxy Header Auth (recommended)

Place ComplianceOS behind Traefik, Nginx, or Caddy. The proxy authenticates the user and sets the `X-Forwarded-User` header.

**Nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name complianceos.example.com;

    # Authentik / Keycloak auth request
    auth_request /auth;

    location /auth {
        internal;
        proxy_pass http://authentik-server:9000/outpost/go/api/v1/;
    }

    location / {
        proxy_set_header X-Forwarded-User $remote_user;
        proxy_set_header X-Forwarded-Email $remote_user@example.com;
        proxy_pass http://complianceos:3002;
    }
}
```

Set `PROXY_AUTH_HEADER=X-Forwarded-User` and `PROXY_AUTH_ENABLED=true` in ComplianceOS.
