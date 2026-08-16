import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Database,
    FileText,
    Scale,
    Globe,
    AlertTriangle,
    ShieldCheck,
    Users
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface PrivacyLayoutProps {
    clientId: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function PrivacyLayout({ clientId, children, fullWidth = false }: PrivacyLayoutProps) {
    const [location] = useLocation();

    // We could fetch privacy stats here for badges if needed
    // const { data: stats } = trpc.privacy.getPrivacyStats.useQuery({ clientId });

    const navItems = [
        {
            label: "Overview",
            href: `/clients/${clientId}/privacy/overview`,
            icon: ShieldCheck,
            badge: null
        },
        {
            label: "Alignment",
            href: `/clients/${clientId}/privacy/alignment-guide`,
            icon: Globe,
            badge: null
        },
        {
            label: "Dashboard",
            href: `/clients/${clientId}/privacy`,
            icon: LayoutDashboard,
            badge: null
        },
        {
            label: "ROPA",
            href: `/clients/${clientId}/privacy/ropa`,
            icon: FileText,
            badge: null
        },
        {
            label: "Data Inventory",
            href: `/clients/${clientId}/privacy/inventory`,
            icon: Database,
            badge: null
        },
        {
            label: "DPIA",
            href: `/clients/${clientId}/privacy/dpia`,
            icon: Scale,
            badge: null
        },
        {
            label: "Transfers",
            href: `/clients/${clientId}/privacy/transfers`,
            icon: Globe,
            badge: null
        },
        {
            label: "Documents",
            href: `/clients/${clientId}/privacy/documents`,
            icon: FileText,
            badge: null
        },
        {
            label: "DSAR",
            href: `/clients/${clientId}/privacy/dsar`,
            icon: Users,
            badge: null
        },
        {
            label: "Breaches",
            href: `/clients/${clientId}/privacy/breaches`,
            icon: AlertTriangle,
            badge: null
        }
    ];

    const isActive = (href: string) => {
        if (href.endsWith('/privacy') && location === href) return true;
        if (!href.endsWith('/privacy') && location.startsWith(href)) return true;
        return false;
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 py-4">
                    <nav className="flex space-x-3 overflow-x-auto no-scrollbar py-2" aria-label="Tabs">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-2 rounded-lg transition-all flex items-center whitespace-nowrap text-sm font-bold shadow-sm shrink-0 min-w-max",
                                        active
                                            ? "bg-brand-bright text-white"
                                            : "bg-brand text-white hover:bg-brand-bright"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "mr-2 h-4 w-4 shrink-0 transition-transform duration-300",
                                        active ? "scale-110" : "opacity-80"
                                    )} />
                                    <span className="whitespace-nowrap shrink-0">{item.label}</span>
                                    {!!item.badge && (
                                        <span className={cn(
                                            "ml-2.5 rounded-full py-0.5 px-2 text-[10px] font-bold border backdrop-blur-md shrink-0 whitespace-nowrap",
                                            active
                                                ? "bg-white/20 text-white border-white/30"
                                                : "bg-brand-bright/20 text-white border-brand-bright/30"
                                        )}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex-1 w-full py-8 bg-slate-50/30">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
