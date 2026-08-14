import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '../lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center p-8 bg-muted/30 rounded-xl border-2 border-dashed border-border transition-colors hover:bg-muted/40",
            className
        )}>
            <div className="p-4 rounded-full bg-card shadow-sm border border-border mb-4 animate-in zoom-in duration-500">
                <Icon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground leading-tight tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto lining-nums">{description}</p>
            {action && (
                <Button
                    variant="outline"
                    className="mt-6 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] px-6"
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};
