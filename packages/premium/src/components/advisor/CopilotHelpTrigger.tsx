import { HelpCircle } from "lucide-react";
import { useAdvisor } from "@/contexts/AdvisorContext";
import { Button } from "@complianceos/ui/ui/button";

export function CopilotHelpTrigger() {
    const { openChat, activeContext } = useAdvisor();

    const handleHelpClick = () => {
        const pageName = activeContext?.pageTitle || "this page";
        openChat(`Can you help me understand ${pageName}?`);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleHelpClick}
            className="rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            title="Get AI Assistance for this page"
        >
            <HelpCircle className="w-5 h-5" />
        </Button>
    );
}
