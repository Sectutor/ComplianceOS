/**
 * ComplianceOS commercial plans: single source of truth for prices shown in the app.
 *
 * Confirmed pricing (grcompliance.com/pricing, 17 Oct 2026):
 *   - Community      $0, free forever (AGPLv3)
 *   - Professional   $1,990/yr  ($1,592/yr founding, locked while the subscription stays active)
 *   - Lifetime       $4,990 one-time ($3,992 founding); 1 year of priority support included,
 *                    optional support renewal $490/yr after year 1
 *   - Enterprise     from $9,990/yr, custom: contact sales (no self-serve checkout)
 *   - 14-day free SaaS trial, no credit card required
 *
 * There are no monthly plans, no MSSP plan and no "Self-Host Pro $499/yr".
 * Stripe price IDs live in server env vars (see lib/config.ts and .env.example).
 */

/** Plans that can be bought through Stripe Checkout. */
export type CheckoutPlan = 'professional' | 'lifetime' | 'lifetime_support';

/** Plans shown in the upgrade UI (Enterprise is contact-sales only). */
export type DisplayPlan = CheckoutPlan | 'enterprise';

export const PUBLIC_PRICING_URL = 'https://grcompliance.com/pricing';
export const SALES_EMAIL = 'sales@grcompliance.com';
export const SALES_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent('ComplianceOS Enterprise inquiry')}`;

export const FREE_TRIAL_DAYS = 14;
export const FOUNDING_DISCOUNT_PERCENT = 20;

export const PLAN_PRICING = {
  community: { name: 'Community', amount: 0, label: '$0', cadence: 'free forever' },
  professional: {
    name: 'Professional',
    amount: 1990,
    foundingAmount: 1592,
    label: '$1,990',
    foundingLabel: '$1,592',
    cadence: '/ year',
  },
  lifetime: {
    name: 'Lifetime',
    amount: 4990,
    foundingAmount: 3992,
    label: '$4,990',
    foundingLabel: '$3,992',
    cadence: 'one-time',
  },
  lifetime_support: {
    name: 'Lifetime support renewal',
    amount: 490,
    label: '$490',
    cadence: '/ year after year 1',
  },
  enterprise: { name: 'Enterprise', fromAmount: 9990, label: 'From $9,990', cadence: '/ year' },
} as const;

/** Map legacy tier names that older clients may still send to the current plan. */
export function normalizeCheckoutPlan(tier: string | undefined | null): CheckoutPlan | 'enterprise' | null {
  switch ((tier || '').toLowerCase()) {
    case 'professional':
    case 'pro':
    case 'consultant':
    case 'guided':
    case 'business':
      return 'professional';
    case 'lifetime':
      return 'lifetime';
    case 'lifetime_support':
      return 'lifetime_support';
    case 'enterprise':
    case 'managed':
      return 'enterprise';
    default:
      return null;
  }
}
