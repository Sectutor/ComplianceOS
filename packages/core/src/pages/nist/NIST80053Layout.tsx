
import React, { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import {
    Shield,
    LayoutGrid,
    FileText,
    Settings,
    Activity,
    ClipboardList,
    Layers,
    History
} from "lucide-react";

import { useParams } from "wouter";

export default function NIST80053Layout({ children }: PropsWithChildren) {
    const [location] = useLocation();
    const { selectedClientId } = useClientContext();
    const { packageId, systemId } = useParams<{ packageId?: string; systemId?: string }>();

    const getCatalogPath = () => {
        if (packageId) return `/clients/${selectedClientId}/fedramp/${packageId}/nist/800-53`;
        if (systemId) return `/clients/${selectedClientId}/fisma/${systemId}/nist/800-53`;
        return `/clients/${selectedClientId}/nist/800-53`;
    };

    const tabs = [
        { name: "Back to Hub", path: `/clients/${selectedClientId}/nist`, icon: LayoutGrid },
        { name: "Control Catalog", path: getCatalogPath(), icon: Shield },
        { name: "Baselines", path: `/clients/${selectedClientId}/nist/800-53/baselines`, icon: Layers },
        { name: "Inheritance", path: `/clients/${selectedClientId}/nist/800-53/inheritance`, icon: Settings },
        { name: "Assessments", path: `/clients/${selectedClientId}/nist/800-53/assessments`, icon: ClipboardList },
        { name: "Continuous Monitoring", path: `/clients/${selectedClientId}/nist/800-53/monitoring`, icon: Activity },
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
                    </div>
                </div>
                <div className="flex-1 px-4 md:px-8 py-8">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
