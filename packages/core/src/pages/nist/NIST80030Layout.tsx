
import React, { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import {
    Target,
    ShieldAlert,
    BarChart3,
    LayoutGrid,
    Search,
    Zap
} from "lucide-react";

export default function NIST80030Layout({ children }: PropsWithChildren) {
    const [location] = useLocation();
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");

    const tabs = [
        { name: "Back to Hub", path: `/clients/${clientId}/nist`, icon: LayoutGrid },
        { name: "Risk Assessment", path: `/clients/${clientId}/nist/800-30`, icon: Target },
        { name: "Threat Modeling", path: `/clients/${clientId}/nist/800-30/threats`, icon: ShieldAlert },
        { name: "Impact Analysis", path: `/clients/${clientId}/nist/800-30/impact`, icon: BarChart3 },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen">
                <div className="border-b bg-background sticky top-0 z-10 px-4 md:px-8">
                    <div className="flex h-16 items-center">
                        <nav className="flex items-center space-x-4 lg:space-x-8 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => (
                                <Link key={tab.path} href={tab.path}>
                                    <span className={cn(
                                        "flex items-center text-sm font-medium transition-colors hover:text-primary whitespace-nowrap py-4 border-b-2 cursor-pointer",
                                        location === tab.path
                                            ? "text-primary border-primary"
                                            : "text-muted-foreground border-transparent hover:border-muted"
                                    )}>
                                        <tab.icon className="mr-2 h-4 w-4" />
                                        {tab.name}
                                    </span>
                                </Link>
                            ))}
                        </nav>
                        <div className="ml-auto flex items-center gap-4">
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-2">
                                <Zap className="w-3 h-3 fill-blue-700" />
                                NIST 800-30 Methodology
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 px-4 md:px-8 py-8">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
