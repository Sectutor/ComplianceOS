# Stripe Product Setup Guide

ComplianceOS sells two self-serve licences through Stripe Checkout. Prices match
[grcompliance.com/pricing](https://grcompliance.com/pricing) and live in one place in
code: `packages/core/src/lib/billingPlans.ts` (display) and `packages/core/src/lib/config.ts`
(Stripe price IDs from env).

| Plan | Price (USD) | Stripe price | Env var |
|------|-------------|--------------|---------|
| Community | $0, free forever | none | none |
| Professional | $1,990/yr | recurring yearly | `STRIPE_PRICE_PROFESSIONAL_YEARLY` |
| Professional (founding) | $1,592/yr, 20% off, locked while the subscription is active | recurring yearly | `STRIPE_PRICE_PROFESSIONAL_YEARLY_FOUNDING` |
| Lifetime | $4,990 one-time | one-time | `STRIPE_PRICE_LIFETIME` |
| Lifetime (founding) | $3,992 one-time | one-time | `STRIPE_PRICE_LIFETIME_FOUNDING` |
| Lifetime support renewal | $490/yr, optional after year 1 | recurring yearly | `STRIPE_PRICE_LIFETIME_SUPPORT_YEARLY` |
| Enterprise | from $9,990/yr, custom | none: contact sales (sales@grcompliance.com) | none |

There are no monthly plans, no MSSP plan and no "Self-Host Pro $499/yr". The hosted SaaS
has a 14-day free trial with no card; that trial is not a Stripe object.

## Founding offer

The founding prices apply during the launch window (the first 30 days). While
`FOUNDING_OFFER_ENDS_AT` is unset, or is in the future, new checkouts use the founding
prices and the upgrade UI shows the regular price struck through. After that date, new
checkouts use the regular prices. Founding Professional subscriptions keep their
$1,592/yr price because they stay on the founding price.

## Step 1: Create the products and prices

```bash
export STRIPE_SECRET_KEY=sk_test_...
python scripts/setup-stripe.py          # add --live to run against an sk_live_ key
```

The script is idempotent (each price has a lookup key such as
`complianceos_professional_yearly`) and never deletes or archives anything. It prints the
env vars to copy into `packages/core/.env` and into the server environment.

## Step 2: Keys and env

```bash
STRIPE_SECRET_KEY=sk_live_...           # sk_test_... for test mode
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_...
STRIPE_PRICE_PROFESSIONAL_YEARLY_FOUNDING=price_...
STRIPE_PRICE_LIFETIME=price_...
STRIPE_PRICE_LIFETIME_FOUNDING=price_...
STRIPE_PRICE_LIFETIME_SUPPORT_YEARLY=price_...
# FOUNDING_OFFER_ENDS_AT=YYYY-MM-DDTHH:MM:SSZ
ENABLE_BILLING=true
VITE_ENABLE_BILLING=true
```

Without `STRIPE_SECRET_KEY` or the price IDs, the in-app upgrade button opens
`PUBLIC_PRICING_URL` (default `https://grcompliance.com/pricing`) instead of Stripe Checkout.

## Step 3: Webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Signing secret → `STRIPE_WEBHOOK_SECRET`

Checkout sessions carry `metadata.plan` = `professional`, `lifetime` or `lifetime_support`.
Professional is a yearly subscription (licence valid 1 year, renewed by Stripe); Lifetime is
a one-time payment (licence does not expire); a support renewal issues no new licence key.

## Step 4: Test

1. Use an `sk_test_...` key and the test price IDs.
2. Open **Settings → License & Plans → Upgrade plan**, pick Professional or Lifetime.
3. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Check server logs for `[Stripe] License purchase completed`.

## Alternative: Paddle (for EU VAT)

If you need automatic EU VAT handling, use Paddle instead:
- Create the same products in Paddle Dashboard
- Point the webhook to `/api/webhooks/paddle`
- Paddle handles EU VAT compliance automatically
- Higher fees (5% + $0.50 vs Stripe's 2.9% + $0.30)
