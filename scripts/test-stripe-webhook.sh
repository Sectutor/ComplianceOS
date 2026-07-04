#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# ComplianceOS — Stripe Webhook Test Script
# ──────────────────────────────────────────────────────────────────────────────
# Sends a simulated checkout.session.completed event to your local webhook.
#
# Prerequisites:
#   • Your app is running locally (e.g. http://localhost:3001)
#   • STRIPE_WEBHOOK_SECRET is set in .env
#   • curl + jq are installed
#
# Usage:
#   export STRIPE_WEBHOOK_SECRET=whsec_xxxxx
#   ./scripts/test-stripe-webhook.sh
#
# To test against a live Stripe endpoint, change the URL below.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3001/api/webhooks/stripe}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
TIMESTAMP=$(date +%s)

# ── Check pre-reqs ──────────────────────────────────────────────────────────
if ! command -v curl &>/dev/null; then
  echo "❌  curl is required but not installed."
  exit 1
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  echo "❌  STRIPE_WEBHOOK_SECRET is not set."
  echo "    Export it or set it in your .env:"
  echo "        export STRIPE_WEBHOOK_SECRET=whsec_xxxxx"
  exit 1
fi

# ── Build a realistic test event ────────────────────────────────────────────
SESSION_ID="cs_test_$(openssl rand -hex 16)"
SUBSCRIPTION_ID="sub_test_$(openssl rand -hex 8)"
PRICE_ID="${STRIPE_PRICE_ID:-price_placeholder_pro_yearly}"
CUSTOMER_ID="cus_test_$(openssl rand -hex 8)"
CUSTOMER_EMAIL="test-${TIMESTAMP}@complianceos-test.com"

echo "╔══════════════════════════════════════════════╗"
echo "║  ComplianceOS — Stripe Webhook Test          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Target:     $WEBHOOK_URL"
echo "Session:    $SESSION_ID"
echo "Customer:   $CUSTOMER_EMAIL"
echo "Tier:       ${TIER:-pro}"
echo ""

# Build the payload JSON
PAYLOAD=$(cat <<EOF
{
  "id": "evt_test_$(openssl rand -hex 16)",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "${SESSION_ID}",
      "object": "checkout.session",
      "mode": "subscription",
      "status": "complete",
      "payment_status": "paid",
      "customer": "${CUSTOMER_ID}",
      "customer_details": {
        "email": "${CUSTOMER_EMAIL}"
      },
      "metadata": {
        "tier": "${TIER:-pro}",
        "clientId": "${CLIENT_ID:-42}",
        "userId": "${USER_ID:-1}"
      },
      "subscription": "${SUBSCRIPTION_ID}",
      "amount_total": ${AMOUNT:-49900},
      "currency": "usd",
      "created": ${TIMESTAMP}
    }
  },
  "created": ${TIMESTAMP},
  "livemode": false,
  "pending_webhooks": 1,
  "request": null,
  "api_version": "2024-06-20"
}
EOF
)

# ── Sign the payload (Stripe-style HMAC-SHA256) ─────────────────────────────
# Stripe signs webhook payloads with HMAC-SHA256 using the webhook secret.
# We simulate the same signature so the app can verify it.
SIGNED_PAYLOAD="${TIMESTAMP}.$(echo -n "${PAYLOAD}" | tr -d '\n')"
EXPECTED_SIG=$(echo -n "${SIGNED_PAYLOAD}" | openssl sha256 -hmac "${STRIPE_WEBHOOK_SECRET}" -binary | base64 -w 0)
STRIPE_SIGNATURE="t=${TIMESTAMP},v1=${EXPECTED_SIG}"

# ── Send the webhook ────────────────────────────────────────────────────────
echo "Sending webhook event…"
echo ""

HTTP_CODE=$(curl -s -o /tmp/stripe-webhook-response.txt -w "%{http_code}" \
  -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: ${STRIPE_SIGNATURE}" \
  -d "${PAYLOAD}")

echo "HTTP Status: ${HTTP_CODE}"
echo "Response:"
cat /tmp/stripe-webhook-response.txt 2>/dev/null || echo "(empty)"
echo ""

# ── Result ──────────────────────────────────────────────────────────────────
if [ "${HTTP_CODE}" = "200" ]; then
  echo "✅  Webhook delivered successfully!"
  echo "    Check your server logs for:"
  echo "      [Stripe] License purchase completed"
  echo "      License key: COM-..."
else
  echo "⚠️  Webhook returned ${HTTP_CODE} (not 200)."
  echo "    Common issues:"
  echo "      • Server is not running at ${WEBHOOK_URL}"
  echo "      • STRIPE_WEBHOOK_SECRET in .env does not match the test secret"
  echo "      • The price ID in the payload doesn't exist in Stripe"
  echo ""
  echo "    To use a real Stripe-signed event instead:"
  echo "      stripe trigger checkout.session.completed"
  echo "      # (requires Stripe CLI: https://stripe.com/docs/stripe-cli)"
fi

# ── Helpful info ────────────────────────────────────────────────────────────
echo ""
echo "── Debug ──"
echo "Payload was written to: /tmp/stripe-webhook-payload.json"
echo -n "${PAYLOAD}" > /tmp/stripe-webhook-payload.json
echo "To inspect:  cat /tmp/stripe-webhook-payload.json | jq ."
echo ""
echo "To test with Stripe CLI instead:"
echo "  stripe listen --forward-to localhost:3001/api/webhooks/stripe"
echo "  # Then in another terminal:"
echo "  stripe trigger checkout.session.completed"
