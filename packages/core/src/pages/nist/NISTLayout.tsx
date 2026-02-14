import React, { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { ShieldCheck, BarChart3, FileText, Target, ListTodo, Activity, LayoutDashboard, LayoutGrid } from "lucide-react";

export default function NISTLayout({ children, fullWidth = false }: PropsWithChildren<{ fullWidth?: boolean }>) {
    const [location] = useLocation();
    const { selectedClientId } = useClientContext();

    const tabs = [
        { name: "Ecosystem Hub", path: `/clients/${selectedClientId}/nist`, icon: LayoutGrid },
        { name: "Dashboard", path: `/clients/${selectedClientId}/nist/dashboard`, icon: LayoutDashboard },
        { name: "CSF Assessment", path: `/clients/${selectedClientId}/nist/assessment`, icon: ShieldCheck },
        { name: "Target Profiles", path: `/clients/${selectedClientId}/nist/profiles`, icon: Target },
        { name: "POAM & Remediation", path: `/clients/${selectedClientId}/nist/poam`, icon: ListTodo },
        { name: "Documents", path: `/clients/${selectedClientId}/nist/documents`, icon: FileText },
    ];

    return (
        <DashboardLayout>
            <div className={cn("flex flex-col min-h-screen", fullWidth && "-m-6")}>
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
                    {fullWidth ? <div className="-m-8">{children}</div> : children}
                </div>
            </div>
        </DashboardLayout>
    );
}
