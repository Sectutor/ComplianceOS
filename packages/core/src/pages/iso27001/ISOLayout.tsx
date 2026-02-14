import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ClipboardList,
    ShieldCheck,
    AlertTriangle,
    FileText,
    Activity,
    Users,
    Key,
    Database,
    Binary
} from "lucide-react";

interface ISOLayoutProps {
    clientId: number;
    children: React.ReactNode;
}

export function ISOLayout({ clientId, children }: ISOLayoutProps) {
    const [location] = useLocation();

    const navItems = [
        {
            label: "Dashboard",
            href: `/clients/${clientId}/iso27001`,
            icon: LayoutDashboard,
        },
        {
            label: "SoA",
            href: `/clients/${clientId}/iso27001/soa`,
            icon: ClipboardList,
        },
        {
            label: "Risk Management",
            href: `/clients/${clientId}/iso27001/risks`,
            icon: ShieldCheck,
        },
        {
            label: "Assets",
            href: `/clients/${clientId}/iso27001/assets`,
            icon: Database,
        },
        {
            label: "Audit",
            href: `/clients/${clientId}/iso27001/audit`,
            icon: Binary,
        },
        {
            label: "Documents",
            href: `/clients/${clientId}/iso27001/documents`,
            icon: FileText,
        },
        {
            label: "Governance",
            href: `/clients/${clientId}/iso27001/governance`,
            icon: Users,
        },
        {
            label: "Mgmt Review",
            href: `/clients/${clientId}/iso27001/management-review`,
            icon: ClipboardList,
        }
    ];

    const isActive = (href: string) => {
        if (location === href) return true;
        if (href !== `/clients/${clientId}/iso27001` && location.startsWith(href)) return true;
        return false;
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen bg-slate-50/50">
                <div className="border-b bg-white px-6 sticky top-0 z-30 shadow-sm">
                    <nav className="flex space-x-8 overflow-x-auto no-scrollbar" aria-label="ISO 27001 Navigation">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition-all duration-200",
                                    isActive(item.href)
                                        ? "border-indigo-600 text-indigo-600 shadow-[0_2px_0_0_rgba(79,70,229,0.1)]"
                                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                                )}
                            >
                                <item.icon className={cn(
                                    "mr-2.5 h-4 w-4 transition-colors",
                                    isActive(item.href) ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                                )} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex-1">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
