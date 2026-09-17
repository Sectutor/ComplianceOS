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
                <div className="bg-background/80 backdrop-blur-md border-b border-border/60 py-3 sticky top-0 z-30 space-y-3">
                    {/* Breadcrumb Section */}
                    <Breadcrumb className="mb-0">
                        <BreadcrumbList>
                            {breadcrumbItems.map((item, idx) => {
                                const isLast = idx === breadcrumbItems.length - 1;
                                return (
                                    <React.Fragment key={idx}>
                                        <BreadcrumbItem>
                                            {isLast ? (
                                                <BreadcrumbPage className="font-semibold text-foreground">
                                                    {item.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink asChild>
                                                    <Link href={item.href || "#"} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                                                        {item.icon && <item.icon className="h-3.5 w-3.5" />}
                                                        {item.label}
                                                    </Link>
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                        {!isLast && (
                                            <BreadcrumbSeparator>
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                                            </BreadcrumbSeparator>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>

                    {/* Navigation Bar / Tabs */}
                    <div className="w-full overflow-x-auto pb-0.5 no-scrollbar">
                        <nav className="inline-flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 backdrop-blur-sm border border-border/60 rounded-xl" aria-label="Privacy Navigation Tabs">
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "relative px-3.5 py-1.5 rounded-lg transition-all duration-200 flex items-center whitespace-nowrap text-xs sm:text-sm font-medium shrink-0 cursor-pointer select-none",
                                            active
                                                ? "bg-card text-foreground font-semibold shadow-xs border border-border/60 dark:bg-card/95"
                                                : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "mr-2 h-4 w-4 shrink-0 transition-colors",
                                            active ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <span>{item.label}</span>
                                        {!!item.badge && (
                                            <span className={cn(
                                                "ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border shrink-0",
                                                active
                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                    : "bg-background/80 text-muted-foreground border-border/60"
                                            )}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
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
