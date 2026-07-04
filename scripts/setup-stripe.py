#!/usr/bin/env python3
"""
ComplianceOS — Stripe Products & Prices Setup Script
=====================================================
Creates Stripe products and prices for the ComplianceOS billing tiers.

Tiers:
  - Community (free, no price needed)
  - Pro       $49/mo  or  $499/yr
  - MSSP      $99/mo  or  $999/yr
  - Enterprise $4,990/yr (annual only, contact sales or self-checkout)

Usage:
  1. Export your Stripe secret key:
       export STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

  2. Run:
       python scripts/setup-stripe.py

  3. Copy the printed env vars into .env.local

If you don't have the Stripe Python SDK installed, this script falls
back to raw curl calls against the Stripe REST API.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

STRIPE_API_BASE = "https://api.stripe.com/v1"

PRODUCTS = [
    {
        "name": "ComplianceOS Self-Host Pro",
        "description": "Self-hosted compliance platform for small teams. Includes AI drafting, risk triage, and evidence collection.",
        "metadata": {"tier": "pro"},
        "prices": [
            {"nickname": "Pro Monthly", "interval": "month", "unit_amount": 4900,  "currency": "usd"},
            {"nickname": "Pro Yearly",  "interval": "year",  "unit_amount": 49900, "currency": "usd"},
        ],
    },
    {
        "name": "ComplianceOS MSSP",
        "description": "Managed Security Service Provider tier. Multi-tenant, white-label, dedicated support.",
        "metadata": {"tier": "mssp"},
        "prices": [
            {"nickname": "MSSP Monthly", "interval": "month", "unit_amount": 9900,  "currency": "usd"},
            {"nickname": "MSSP Yearly",  "interval": "year",  "unit_amount": 99900, "currency": "usd"},
        ],
    },
    {
        "name": "ComplianceOS Enterprise",
        "description": "Full-service compliance operations. Unlimited clients, dedicated compliance engineer, SLA-backed.",
        "metadata": {"tier": "enterprise"},
        "prices": [
            {"nickname": "Enterprise Annual", "interval": "year", "unit_amount": 499000, "currency": "usd"},
        ],
    },
]


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def get_secret_key() -> str:
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not key:
        print("❌  STRIPE_SECRET_KEY is not set.")
        print("    Export it first:")
        print("        export STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx")
        sys.exit(1)
    return key


def stripe_request(method: str, path: str, data: dict | None = None) -> dict:
    """Make a raw REST call to the Stripe API via curl."""
    secret = get_secret_key()
    url = f"{STRIPE_API_BASE}{path}"
    args = ["curl", "-s", "-u", f"{secret}:", "-X", method, url]
    if data:
        for key, val in data.items():
            if isinstance(val, str):
                args.extend(["-d", f"{key}={val}"])
            elif isinstance(val, list):
                for v in val:
                    if isinstance(v, dict):
                        for vk, vv in v.items():
                            args.extend(
                                ["-d", f"{key}[][{vk}]={vv}"]
                            )
                    else:
                        args.extend(["-d", f"{key}[]={v}"])
            elif isinstance(val, dict):
                for vk, vv in val.items():
                    args.extend(["-d", f"{key}[{vk}]={vv}"])

    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"⚠️  curl error (exit {result.returncode}): {result.stderr.strip()}")
            return {}
        decoded = json.loads(result.stdout)
        if "error" in decoded:
            print(f"❌  Stripe API error: {decoded['error']['message']}")
            return {}
        return decoded
    except json.JSONDecodeError as e:
        print(f"⚠️  Could not parse Stripe response: {e}")
        print(f"   Raw output: {result.stdout[:500]}")
        return {}
    except subprocess.TimeoutExpired:
        print("⚠️  Stripe API request timed out after 30s")
        return {}


def try_import_stripe():
    """Try to import the official Stripe library."""
    try:
        import stripe
        return stripe
    except ImportError:
        return None


# ---------------------------------------------------------------------------
#  Product + Price creation via official SDK (preferred)
# ---------------------------------------------------------------------------

def create_via_sdk():
    import stripe
    secret = get_secret_key()
    stripe.api_key = secret

    results = {}
    for prod_def in PRODUCTS:
        print(f"\n─── {prod_def['name']} ───")

        # Create product
        try:
            product = stripe.Product.create(
                name=prod_def["name"],
                description=prod_def.get("description", ""),
                metadata=prod_def.get("metadata", {}),
            )
            print(f"  ✅ Product created: {product.id}  ({product.name})")
        except Exception as e:
            print(f"  ❌ Failed to create product: {e}")
            continue

        # Create prices
        price_ids = {}
        for price_def in prod_def["prices"]:
            try:
                price = stripe.Price.create(
                    product=product.id,
                    nickname=price_def["nickname"],
                    unit_amount=price_def["unit_amount"],
                    currency=price_def["currency"],
                    recurring={"interval": price_def["interval"]},
                )
                print(f"  ✅ Price created: {price.id}  ({price_def['nickname']})")
                price_ids[price_def["interval"]] = price.id
            except Exception as e:
                print(f"  ❌ Failed to create price: {e}")

        results[prod_def["metadata"]["tier"]] = {
            "product_id": product.id,
            "prices": price_ids,
        }

    return results


# ---------------------------------------------------------------------------
#  Product + Price creation via curl (fallback)
# ---------------------------------------------------------------------------

def create_via_curl():
    results = {}
    for prod_def in PRODUCTS:
        print(f"\n─── {prod_def['name']} ───")

        # Create product
        prod_data = {
            "name": prod_def["name"],
            "description": prod_def.get("description", ""),
        }
        for mk, mv in prod_def.get("metadata", {}).items():
            prod_data[f"metadata[{mk}]"] = mv

        product = stripe_request("POST", "/products", prod_data)
        if not product or "id" not in product:
            print(f"  ❌ Failed to create product: {prod_def['name']}")
            continue
        print(f"  ✅ Product created: {product['id']}  ({product['name']})")

        # Create prices
        price_ids = {}
        for price_def in prod_def["prices"]:
            price_data = {
                "product": product["id"],
                "nickname": price_def["nickname"],
                "unit_amount": str(price_def["unit_amount"]),
                "currency": price_def["currency"],
                "recurring[interval]": price_def["interval"],
            }
            price = stripe_request("POST", "/prices", price_data)
            if not price or "id" not in price:
                print(f"  ❌ Failed to create price: {price_def['nickname']}")
                continue
            print(f"  ✅ Price created: {price['id']}  ({price_def['nickname']})")
            price_ids[price_def["interval"]] = price["id"]

        results[prod_def["metadata"]["tier"]] = {
            "product_id": product["id"],
            "prices": price_ids,
        }

    return results


# ---------------------------------------------------------------------------
#  Print env var block
# ---------------------------------------------------------------------------

def print_env_block(results: dict):
    """Print the env var names and values the project expects in config.ts."""
    print("\n" + "=" * 62)
    print("  ✅  ALL DONE  ✅")
    print("=" * 62)
    print()
    print("Paste these into your .env.local or .env file:\n")

    # The config.ts maps:
    #   STRIPE_PRICE_STARTUP_MONTHLY / STRIPE_PRICE_STARTUP_YEARLY  → pro
    #   STRIPE_PRICE_GUIDED_MONTHLY  / STRIPE_PRICE_GUIDED_YEARLY  → mssp
    #   STRIPE_PRICE_MANAGED                                        → enterprise

    pro = results.get("pro", {})
    mssp = results.get("mssp", {})
    ent = results.get("enterprise", {})

    pro_prices = pro.get("prices", {})
    mssp_prices = mssp.get("prices", {})
    ent_prices = ent.get("prices", {})

    lines = [
        "# ──────────────────────────────────────────────",
        "# Stripe Price IDs  (generated by setup-stripe.py)",
        "# ──────────────────────────────────────────────",
    ]

    if "month" in pro_prices:
        lines.append(f"STRIPE_PRICE_STARTUP_MONTHLY={pro_prices['month']}")
    if "year" in pro_prices:
        lines.append(f"STRIPE_PRICE_STARTUP_YEARLY={pro_prices['year']}")

    if "month" in mssp_prices:
        lines.append(f"STRIPE_PRICE_GUIDED_MONTHLY={mssp_prices['month']}")
    if "year" in mssp_prices:
        lines.append(f"STRIPE_PRICE_GUIDED_YEARLY={mssp_prices['year']}")

    if ent_prices:
        # Use the first (only) enterprise price for STRIPE_PRICE_MANAGED
        first_ent_price = list(ent_prices.values())[0]
        lines.append(f"STRIPE_PRICE_MANAGED={first_ent_price}")

    # Also output the raw tier env vars (for direct use)
    if "year" in pro_prices:
        lines.append(f"# Direct tier reference:")
        lines.append(f"# STRIPE_PRICE_PRO_YEARLY={pro_prices['year']}")
    if "year" in mssp_prices:
        lines.append(f"# STRIPE_PRICE_MSSP_YEARLY={mssp_prices['year']}")
    if ent_prices:
        lines.append(f"# STRIPE_PRICE_ENTERPRISE_YEARLY={first_ent_price}")

    print("\n".join(lines))
    print()

    # Summary table
    print("┌──────────────────────┬──────────────────────────────┬──────────────────────────┐")
    print("│ Tier                 │ Product ID                   │ Price IDs                │")
    print("├──────────────────────┼──────────────────────────────┼──────────────────────────┤")
    for tier_key, tier_label in [("pro", "Pro ($49/mo | $499/yr)"),
                                  ("mssp", "MSSP ($99/mo | $999/yr)"),
                                  ("enterprise", "Enterprise ($4,990/yr)")]:
        r = results.get(tier_key, {})
        pid = r.get("product_id", "—")
        pids_list = list(r.get("prices", {}).values())
        pids_str = ", ".join(pids_list) if pids_list else "—"
        print(f"│ {tier_label:20s} │ {pid:<28s} │ {pids_str:<24s} │")
    print("└──────────────────────┴──────────────────────────────┴──────────────────────────┘")
    print()

    # Tips
    print("Next steps:")
    print("  1. Add the env vars above to your .env.local")
    print("  2. Set your webhook endpoint in Stripe Dashboard:")
    print("       https://dashboard.stripe.com/webhooks")
    print("     Endpoint:  POST /api/webhooks/stripe")
    print("     Events:    checkout.session.completed, customer.subscription.deleted")
    print("  3. Save the webhook signing secret as STRIPE_WEBHOOK_SECRET")
    print("  4. Test with a test-mode checkout using card 4242 4242 4242 4242")


# ---------------------------------------------------------------------------
#  Main
# ---------------------------------------------------------------------------

def main():
    print("╔══════════════════════════════════════════════╗")
    print("║  ComplianceOS — Stripe Products & Prices    ║")
    print("╚══════════════════════════════════════════════╝")
    print()
    print(f"Products to create: {len(PRODUCTS)}")
    for p in PRODUCTS:
        price_count = len(p["prices"])
        print(f"  • {p['name']} ({price_count} price{'s' if price_count > 1 else ''})")
    print()

    # Show mode
    mode = os.environ.get("STRIPE_MODE", "").strip()
    if mode != "live":
        print("⚠️  Running in test mode (default). To run against live keys:")
        print("      export STRIPE_MODE=live")
        print()

    # Try SDK first, fall back to curl
    stripe_lib = try_import_stripe()
    if stripe_lib:
        print("Using Stripe Python SDK…\n")
        results = create_via_sdk()
    else:
        print("Stripe SDK not installed — falling back to curl + REST API.\n")
        print("  Install with:  pip install stripe")
        print()
        results = create_via_curl()

    if not results:
        print("\n❌  No products were created. Check your API key and try again.")
        sys.exit(1)

    print_env_block(results)


if __name__ == "__main__":
    main()
