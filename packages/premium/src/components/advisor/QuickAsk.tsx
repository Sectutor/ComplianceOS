
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAdvisor } from '@/contexts/AdvisorContext';
import { Button } from '@/components/ui/button'; // Assuming standard button

interface QuickAskProps {
    clientId: number;
    placeholder?: string;
    context?: {
        type: 'control' | 'policy' | 'evidence' | 'regulation';
        id: string;
    };
    label?: string;
    variant?: "default" | "secondary" | "outline" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export default function QuickAsk({
    clientId,
    placeholder = "Ask AI...",
    context,
    label,
    variant = "outline",
    size = "sm",
    className
}: QuickAskProps) {
    const { openChat } = useAdvisor();

    const handleClick = () => {
        openChat(placeholder, context);
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={`gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 ${className || ''}`}
        >
            <Sparkles className="h-3.5 w-3.5" />
            {label || placeholder}
        </Button>
    );
}
