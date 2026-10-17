#!/usr/bin/env python3
"""
ComplianceOS - Stripe products & prices setup
=============================================
Creates (or finds) the Stripe products and prices for the confirmed ComplianceOS
pricing (grcompliance.com/pricing), then prints the env vars config.ts reads.

Plans (USD):
  - Community          $0, free forever (no Stripe price)
  - Professional       $1,990/yr          -> STRIPE_PRICE_PROFESSIONAL_YEARLY
                       $1,592/yr founding -> STRIPE_PRICE_PROFESSIONAL_YEARLY_FOUNDING
  - Lifetime           $4,990 one-time    -> STRIPE_PRICE_LIFETIME
                       $3,992 founding    -> STRIPE_PRICE_LIFETIME_FOUNDING
  - Lifetime support   $490/yr after year 1 -> STRIPE_PRICE_LIFETIME_SUPPORT_YEARLY
  - Enterprise         from $9,990/yr, contact sales (no Stripe price)

There are no monthly plans, no MSSP plan and no "Self-Host Pro $499/yr".

The script is idempotent: each price has a lookup key, and existing prices with
that key are reused instead of duplicated. It never deletes or archives anything.

Usage:
  export STRIPE_SECRET_KEY=sk_test_...      # test mode first
  python scripts/setup-stripe.py
  python scripts/setup-stripe.py --live     # required to run against an sk_live_ key

Only the Python standard library is needed.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.stripe.com/v1"

PRODUCTS = {
    "professional": {
        "name": "ComplianceOS Professional",
        "description": "Self-hosted ComplianceOS Professional licence. Unlimited workspaces and users. 1 year of updates and support.",
    },
    "lifetime": {
        "name": "ComplianceOS Lifetime",
        "description": "Self-hosted ComplianceOS Lifetime licence. One-time payment, lifetime updates, 1 year of priority support.",
    },
    "lifetime_support": {
        "name": "ComplianceOS Lifetime Support Renewal",
        "description": "Optional priority support renewal for ComplianceOS Lifetime licences, after year 1.",
    },
}

PRICES = [
    # (env var, lookup key, product key, amount in cents, recurring interval or None, nickname)
    ("STRIPE_PRICE_PROFESSIONAL_YEARLY", "complianceos_professional_yearly", "professional", 199000, "year",
     "Professional yearly ($1,990/yr)"),
    ("STRIPE_PRICE_PROFESSIONAL_YEARLY_FOUNDING", "complianceos_professional_yearly_founding", "professional", 159200, "year",
     "Professional yearly founding ($1,592/yr, 20% off, locked while active)"),
    ("STRIPE_PRICE_LIFETIME", "complianceos_lifetime", "lifetime", 499000, None,
     "Lifetime one-time ($4,990)"),
    ("STRIPE_PRICE_LIFETIME_FOUNDING", "complianceos_lifetime_founding", "lifetime", 399200, None,
     "Lifetime founding one-time ($3,992, 20% off)"),
    ("STRIPE_PRICE_LIFETIME_SUPPORT_YEARLY", "complianceos_lifetime_support_yearly", "lifetime_support", 49000, "year",
     "Lifetime support renewal ($490/yr)"),
]


def secret_key() -> str:
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not key:
        sys.exit("STRIPE_SECRET_KEY is not set. Export it first (sk_test_... for test mode).")
    if key.startswith("sk_live_") and "--live" not in sys.argv:
        sys.exit("Refusing to run against a LIVE key without --live.")
    return key


def stripe(method: str, path: str, params: list[tuple[str, str]] | None = None) -> dict:
    url = f"{API}{path}"
    data = urllib.parse.urlencode(params or []).encode() if params else None
    if method == "GET" and params:
        url, data = f"{url}?{urllib.parse.urlencode(params)}", None
    req = urllib.request.Request(url, data=data, method=method)
    token = base64.b64encode(f"{secret_key()}:".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = json.loads(e.read() or b"{}")
        sys.exit(f"Stripe API error ({e.code}): {body.get('error', {}).get('message', body)}")


def find_or_create_product(key: str) -> str:
    query = f"metadata['complianceos_product']:'{key}' AND active:'true'"
    found = stripe("GET", "/products/search", [("query", query)]).get("data", [])
    if found:
        print(f"  product exists  {found[0]['id']}  {found[0]['name']}")
        return found[0]["id"]
    p = PRODUCTS[key]
    created = stripe("POST", "/products", [
        ("name", p["name"]),
        ("description", p["description"]),
        ("metadata[app]", "complianceos"),
        ("metadata[complianceos_product]", key),
    ])
    print(f"  product created {created['id']}  {created['name']}")
    return created["id"]


def main() -> None:
    key = secret_key()
    print(f"Stripe mode: {'LIVE' if key.startswith('sk_live_') else 'TEST'}\n")

    lookups = [("lookup_keys[]", p[1]) for p in PRICES]
    existing = {p["lookup_key"]: p for p in stripe("GET", "/prices", lookups + [("limit", "20")]).get("data", [])}

    product_ids: dict[str, str] = {}
    env: dict[str, str] = {}
    for env_var, lookup, product_key, amount, interval, nickname in PRICES:
        if lookup in existing:
            price = existing[lookup]
            print(f"  price exists    {price['id']}  {nickname}")
        else:
            if product_key not in product_ids:
                product_ids[product_key] = find_or_create_product(product_key)
            params = [
                ("product", product_ids[product_key]),
                ("currency", "usd"),
                ("unit_amount", str(amount)),
                ("nickname", nickname),
                ("lookup_key", lookup),
                ("tax_behavior", "exclusive"),
                ("metadata[app]", "complianceos"),
            ]
            if interval:
                params.append(("recurring[interval]", interval))
            price = stripe("POST", "/prices", params)
            print(f"  price created   {price['id']}  {nickname}")
        env[env_var] = price["id"]

    print("\nAdd these to packages/core/.env (and to the server env for deployments):\n")
    for k, v in env.items():
        print(f"{k}={v}")
    print("\nOptional: FOUNDING_OFFER_ENDS_AT=<ISO date> ends the 20% founding prices for new checkouts.")


if __name__ == "__main__":
    main()
