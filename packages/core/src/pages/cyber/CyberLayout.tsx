
import { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";

export default function CyberLayout({ children, fullWidth = false }: PropsWithChildren<{ fullWidth?: boolean }>) {
    const [location] = useLocation();
    const { selectedClientId } = useClientContext();

    const tabs = [
        { name: "NIS2 & Cyber Resilience", path: `/clients/${selectedClientId}/cyber`, icon: ShieldCheck },
        { name: "NIS2 Workbook", path: `/clients/${selectedClientId}/cyber/workbook`, icon: ShieldCheck },
        { name: "Control Mapping", path: `/clients/${selectedClientId}/cyber/mapping`, icon: ShieldCheck },
    ];

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent pt-4">
                <div className="bg-transparent border-b border-slate-200 py-4 sticky top-16 z-30 shadow-none space-y-3">
                    <nav className="flex space-x-2 overflow-x-auto no-scrollbar py-1" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const active = location === tab.path;
                            return (
                                <Link
                                    key={tab.path}
                                    href={tab.path}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-lg whitespace-nowrap shrink-0 min-w-max transition-all duration-300 font-bold text-sm shadow-sm border",
                                        active
                                            ? "bg-[#3ABEF9] text-white border-[#3ABEF9] shadow-lg shadow-sky-200"
                                            : "bg-[#1C4D8D] text-white border-[#1C4D8D] hover:bg-[#3ABEF9] hover:border-[#3ABEF9]"
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex-1 w-full px-0 py-8 bg-transparent">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-full">
                        {children}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
