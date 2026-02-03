
import { Sparkles } from 'lucide-react';
import { Button } from "@complianceos/ui/ui/button";
import { useAdvisor } from '@/contexts/AdvisorContext';
import { useEffect } from 'react';

interface CopilotButtonProps {
    clientId?: number; // Optional - if not provided, context uses global/0
}

export function CopilotButton({ clientId }: CopilotButtonProps) {
    const { isOpen, toggleChat, setClientId } = useAdvisor();

    // Sync clientId from props to AdvisorContext
    useEffect(() => {
        if (clientId !== undefined) {
            setClientId(clientId);
        }
    }, [clientId, setClientId]);

    // If chat is open, we hide the floating button? Or keep it as a toggle?
    // Let's keep it but maybe change icon or style. For now, just a toggle.
    if (isOpen) return null;

    return (
        <Button
            onClick={toggleChat}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 z-40 transition-transform hover:scale-105 active:scale-95"
            title="Open AI Compliance Advisor"
        >
            <Sparkles className="w-6 h-6 text-white" />
        </Button>
    );
}
