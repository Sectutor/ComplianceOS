import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { cn } from '../lib/utils';

type StatTone = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'brand';

const toneIconClasses: Record<StatTone, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  brand: 'bg-[#5844ED] text-white',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Calm stat card: muted uppercase label, loud tabular-nums value, tinted icon
 * tile. Per UI-STANDARD §1 / §4 (calm surfaces, loud data).
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  className,
  children,
}) => {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardContent className="p-6 flex items-center gap-5">
        <div className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
          toneIconClasses[tone]
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {label}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-tight">
            {value}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
};
