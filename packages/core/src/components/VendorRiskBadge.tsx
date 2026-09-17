import React from 'react';
import { Badge } from '@complianceos/ui/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VendorRiskBadgeProps {
  /** Numeric risk score (0-100) */
  score: number;
  /** Risk tier: 'low' | 'medium' | 'high' | 'critical' */
  tier: string;
  /** Whether to show the label text alongside the badge (default: true) */
  showLabel?: boolean;
  /** Size variant (default: 'sm') */
  size?: 'sm' | 'md' | 'lg';
}

// ── Style map ──────────────────────────────────────────────────────────────────

const tierStyles: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; ring: string }> = {
  low: {
    variant: 'secondary',
    ring: 'ring-green-500/30 bg-green-50 text-green-700 hover:bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800',
  },
  medium: {
    variant: 'secondary',
    ring: 'ring-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800',
  },
  high: {
    variant: 'outline',
    ring: 'ring-orange-500/30 bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800',
  },
  critical: {
    variant: 'destructive',
    ring: 'ring-red-500/30 bg-red-50 text-red-700 hover:bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800',
  },
};

const sizeClasses: Record<string, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

const iconMap: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

const labelMap: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function VendorRiskBadge({
  score,
  tier,
  showLabel = true,
  size = 'sm',
}: VendorRiskBadgeProps) {
  const normalizedTier = tier.toLowerCase();
  const style = tierStyles[normalizedTier] ?? tierStyles.low;
  const icon = iconMap[normalizedTier] ?? '🟢';
  const label = labelMap[normalizedTier] ?? 'Unknown';

  return (
    <Badge
      variant={style.variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full ring-1',
        sizeClasses[size],
        style.ring,
      )}
      title={`Risk Score: ${score}/100 — ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{score}</span>
      {showLabel && <span className="hidden sm:inline">{label}</span>}
    </Badge>
  );
}
