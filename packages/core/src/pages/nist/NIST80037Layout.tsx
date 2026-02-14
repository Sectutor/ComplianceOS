
import React, { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation, useParams } from "wouter";
import { cn } from "@/lib/utils";
import {
    Activity,
    ClipboardList,
    ShieldCheck,
    Lock,
    Eye,
    Zap,
    LayoutGrid,
    Settings,
    FileCheck
} from "lucide-react";

export default function NIST80037Layout({ children }: PropsWithChildren) {
    const [location] = useLocation();
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");

    const steps = [
        { name: "Framework Hub", path: `/clients/${clientId}/nist`, icon: LayoutGrid },
        { name: "RMF Dashboard", path: `/clients/${clientId}/nist/rmf`, icon: Activity },
        { name: "1. Categorize", path: `/clients/${clientId}/nist/rmf/categorize`, icon: Settings },
        { name: "2. Select", path: `/clients/${clientId}/nist/rmf/select`, icon: ShieldCheck },
        { name: "3. Implement", path: `/clients/${clientId}/nist/rmf/implement`, icon: Lock },
        { name: "4. Assess", path: `/clients/${clientId}/nist/rmf/assess`, icon: ClipboardList },
        { name: "5. Authorize", path: `/clients/${clientId}/nist/rmf/authorize`, icon: FileCheck },
        { name: "6. Monitor", path: `/clients/${clientId}/nist/rmf/monitor`, icon: Eye },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen">
                <div className="border-b bg-background sticky top-0 z-10 px-4 md:px-8 overflow-x-auto no-scrollbar">
                    <div className="flex h-16 items-center min-w-max">
                        <nav className="flex items-center space-x-4 lg:space-x-8">
                            {steps.map((step) => (
                                <Link key={step.path} href={step.path}>
                                    <span className={cn(
                                        "flex items-center text-sm font-medium transition-colors hover:text-primary whitespace-nowrap py-4 border-b-2 cursor-pointer",
                                        location === step.path
                                            ? "text-primary border-primary"
                                            : "text-muted-foreground border-transparent hover:border-muted"
                                    )}>
                                        <step.icon className="mr-2 h-4 w-4" />
                                        {step.name}
                                    </span>
                                </Link>
                            ))}
                        </nav>
                        <div className="ml-8 flex items-center gap-4">
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                                <Zap className="w-3 h-3 fill-emerald-700" />
                                NIST RMF Lifecycle
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
