# ComplianceOS — Stripe Purchase Quickstart

Get from zero to taking payments in **5 steps**.

---

## 1. Create a Stripe Account

Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register) and sign up.  
You'll get a **test mode** environment automatically — all API calls and card numbers in test mode are free.

> If you already have an account, you can use Test Mode keys without touching live data.

---

## 2. Set the Webhook Endpoint

In Stripe Dashboard → **Developers → Webhooks**, click **Add endpoint**:

| Field | Value |
|-------|-------|
| Endpoint URL | `https://your-domain.com/api/webhooks/stripe` |
| Events | `checkout.session.completed`, `customer.subscription.deleted` |

For local development, use the **Stripe CLI**:

```bash
# Install: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Stripe will print a `whsec_...` signing secret — save it for the next step.

---

## 3. Get Keys → Put in .env

From Stripe Dashboard → **Developers → API keys**, copy these into `.env.local`:

```bash
# ── Stripe API Keys ──────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarjtT1zdp7dc    # from Developers > API keys
STRIPE_WEBHOOK_SECRET=whsec_abc123...                    # from your webhook endpoint
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...            # publishable key

# ── Enable billing ──────────────────────────────────────────
VITE_ENABLE_BILLING=true
ENABLE_BILLING=true
```

After adding these, **restart your dev server**.

---

## 4. Run the Setup Script

Create the Stripe products and prices automatically:

```bash
# Stripe SDK is optional — the script falls back to curl
pip install stripe 2>/dev/null

export STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarjtT1zdp7dc
python scripts/setup-stripe.py
```

The script creates:

| Product | Monthly | Yearly |
|---------|---------|--------|
| ComplianceOS Self-Host Pro | $49/mo | $499/yr |
| ComplianceOS MSSP | $99/mo | $999/yr |
| ComplianceOS Enterprise | — | $4,990/yr |

It prints the price IDs. Copy and paste them into `.env.local`:

```bash
# ── Stripe Price IDs ────────────────────────────────────────
STRIPE_PRICE_STARTUP_MONTHLY=price_1ABC...    # Pro monthly
STRIPE_PRICE_STARTUP_YEARLY=price_1DEF...     # Pro yearly
STRIPE_PRICE_GUIDED_MONTHLY=price_1GHI...     # MSSP monthly
STRIPE_PRICE_GUIDED_YEARLY=price_1JKL...      # MSSP yearly
STRIPE_PRICE_MANAGED=price_1MNO...            # Enterprise annual
```

> **Manual alternative**: Create products and prices in Stripe Dashboard → Products,  
> then copy each price ID into the corresponding env var above.

---

## 5. Test with 4242 4242 4242 4242

### Option A: Stripe CLI (recommended)

```bash
# Forward webhooks to your local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# In another terminal, trigger a test purchase
stripe trigger checkout.session.completed
```

### Option B: Scripted test

```bash
export STRIPE_WEBHOOK_SECRET=whsec_abc123...
export TIER=pro
./scripts/test-stripe-webhook.sh
```

### Option C: Real checkout in browser

1. Navigate to your app's billing/settings page
2. Click **Upgrade to Pro** or **Upgrade to Enterprise**
3. You'll be redirected to Stripe's test Checkout page
4. Enter card number: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code
5. Complete the purchase
6. Check server logs for:
   ```
   [Stripe] License purchase completed
   ```

### Verify

- **Server logs** show `[Stripe] License purchase completed` with the generated license key
- **License cache** is written to disk (visible in app's license status)
- **Database** has the subscription recorded if applicable

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Stripe not initialized` | `STRIPE_SECRET_KEY` is missing or empty |
| `Invalid signature` | `STRIPE_WEBHOOK_SECRET` doesn't match the webhook endpoint |
| `No price configured` | Price IDs missing from `.env.local` — run the setup script |
| Checkout page shows error | The price ID in env doesn't exist — run `python scripts/setup-stripe.py` |
| 4242 card declined | Use a different test card: `4000 0025 0000 3155` (3D Secure) |

---

**Related docs:** [`docs/stripe-setup.md`](stripe-setup.md) — detailed product-by-product guide  
**Code:** [`packages/core/src/server/webhooks/purchase.ts`](https://github.com/intellfence/complianceos/blob/main/packages/core/src/server/webhooks/purchase.ts)
