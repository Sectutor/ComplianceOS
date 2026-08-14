import React from 'react';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header: title (2xl/3xl, foreground) + muted subtitle on the
 * left, optional action cluster on the right. Collapses to a column on mobile.
 * Per UI-STANDARD §3 / §4.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => {
  return (
    <div className={cn(
      'flex flex-col md:flex-row justify-between items-start md:items-center gap-4',
      className
    )}>
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
};
