# Stripe Product Setup Guide

## Overview
The purchase webhook (`/api/webhooks/stripe`) handles `checkout.session.completed` events. You need to create products and prices in Stripe, then configure the webhook endpoint.

## Step 1: Create Products in Stripe Dashboard

### Product 1: Self-Host Pro (Annual)
- Name: `ComplianceOS Self-Host Pro`
- Price: $499/year
- Billing: Annual
- Metadata: `tier=pro`

### Product 2: Token Packs
Create 3 separate products (one-time):

| Name | Price | Metadata |
|------|-------|----------|
| Starter Token Pack | $9 | `pack=starter_pack` |
| Pro Token Pack | $39 | `pack=pro_pack` |
| Enterprise Token Pack | $149 | `pack=enterprise_pack` |

### Product 3: Self-Host Enterprise (annual, custom)
- Name: `ComplianceOS Self-Host Enterprise`
- Price: Custom ($2,499+/yr depending on seats)
- Metadata: `tier=enterprise`

## Step 2: Get Stripe Keys

From Stripe Dashboard → Developers → API keys:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Step 3: Configure Webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Signing secret → set as:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 4: Add to .env

```bash
STRIPE_SECRET_KEY=sk_live_***
STRIPE_WEBHOOK_SECRET=whsec_***
STRIPE_PUBLISHABLE_KEY=pk_live_***
```

## Step 5: Test

Use Stripe's test mode first:
1. Set `STRIPE_SECRET_KEY=sk_test_...`
2. Create a checkout session with `mode=subscription` + metadata `tier=pro`
3. Complete purchase with card `4242 4242 4242 4242`
4. Check server logs: `[Stripe] License purchase completed`
5. Verify `/api/export/full-project/1` returns data

## Alternative: Paddle (for EU VAT)

If you need automatic EU VAT handling, use Paddle instead:
- Create same products in Paddle Dashboard
- Point webhook to `/api/webhooks/paddle`
- Paddle handles EU VAT compliance automatically
- Higher fees (5% + $0.50 vs Stripe's 2.9% + $0.30)
