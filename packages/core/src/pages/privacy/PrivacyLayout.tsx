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
    Users,
    Home,
    ChevronRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@complianceos/ui/ui/breadcrumb";

interface PrivacyLayoutProps {
    clientId: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function PrivacyLayout({ clientId, children, fullWidth = false }: PrivacyLayoutProps) {
    const [location] = useLocation();
    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: clientId > 0 });

    const navItems = [
        {
            label: "Overview",
            href: `/clients/${clientId}/privacy/overview`,
            icon: ShieldCheck,
            badge: null
        },
        {
            label: "Program Guide",
            href: `/clients/${clientId}/privacy/guide`,
            icon: FileText,
            badge: "Manual"
        },
        {
            label: "ROPA (Art. 30)",
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
            label: "DPIA Manager",
            href: `/clients/${clientId}/privacy/dpia`,
            icon: Scale,
            badge: null
        },
        {
            label: "Data Transfers (TIA)",
            href: `/clients/${clientId}/privacy/transfers`,
            icon: Globe,
            badge: null
        },
        {
            label: "DSAR Portal",
            href: `/clients/${clientId}/privacy/dsar`,
            icon: Users,
            badge: null
        },
        {
            label: "Data Breaches",
            href: `/clients/${clientId}/privacy/breaches`,
            icon: AlertTriangle,
            badge: null
        },
        {
            label: "Alignment",
            href: `/clients/${clientId}/privacy/alignment-guide`,
            icon: Globe,
            badge: null
        }
    ];

    const isActive = (href: string) => {
        if (location === href) return true;
        if (href.endsWith('/privacy/guide') && location.includes('/privacy/program-guide')) return true;
        if (href.endsWith('/privacy/program-guide') && location.includes('/privacy/guide')) return true;
        if (!href.endsWith('/privacy/overview') && location.startsWith(href)) return true;
        return false;
    };

    const activeItem = navItems.find(item => isActive(item.href));

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Clients", href: "/clients" },
        { label: client?.name || "Client", href: `/clients/${clientId}` },
        { label: "Privacy Program", href: `/clients/${clientId}/privacy/overview` }
    ];

    if (activeItem && activeItem.label !== "Overview") {
        breadcrumbItems.push({ label: activeItem.label, href: activeItem.href });
    }

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent">
                <div className="bg-transparent border-b border-slate-200 py-3 sticky top-0 z-30 shadow-none space-y-3">
                    {/* Breadcrumb Section */}
                    <Breadcrumb className="mb-0">
                        <BreadcrumbList>
                            {breadcrumbItems.map((item, idx) => {
                                const isLast = idx === breadcrumbItems.length - 1;
                                return (
                                    <React.Fragment key={idx}>
                                        <BreadcrumbItem>
                                            {isLast ? (
                                                <BreadcrumbPage className="font-bold text-brand">
                                                    {item.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink asChild>
                                                    <Link href={item.href || "#"} className="flex items-center gap-1.5 hover:text-brand-bright transition-colors">
                                                        {item.icon && <item.icon className="h-3.5 w-3.5" />}
                                                        {item.label}
                                                    </Link>
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                        {!isLast && (
                                            <BreadcrumbSeparator>
                                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                            </BreadcrumbSeparator>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>

                    {/* Navigation Pills */}
                    <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1" aria-label="Tabs">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all flex items-center whitespace-nowrap text-xs sm:text-sm font-semibold shadow-xs shrink-0 cursor-pointer",
                                        active
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/20 font-bold"
                                            : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 font-medium"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 transition-transform duration-200",
                                        active ? "scale-105 text-primary-foreground" : "text-muted-foreground"
                                    )} />
                                    <span>{item.label}</span>
                                    {!!item.badge && (
                                        <span className={cn(
                                            "ml-2 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0",
                                            active
                                                ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                                : "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex-1 w-full py-6">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
