import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, ChevronRight, Globe, Search, ShieldAlert, Users, Target, Layers, ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@complianceos/ui/ui/breadcrumb";

interface TPRMLayoutProps {
    clientId: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function TPRMLayout({ clientId, children, fullWidth }: TPRMLayoutProps) {
    const [location] = useLocation();
    const params = useParams<{ vendorId: string }>();
    const vendorId = params.vendorId ? parseInt(params.vendorId) : null;

    const { data: stats } = trpc.vendors.getStats.useQuery({ clientId }, { enabled: !!clientId && !isNaN(clientId) });
    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: !!clientId });
    const { data: vendor } = trpc.vendors.get.useQuery({ id: vendorId! }, { enabled: !!vendorId && !isNaN(vendorId) });

    const navItems = [
        {
            label: "Overview",
            href: `/clients/${clientId}/vendors/overview`,
            icon: Globe,
            badge: null
        },
        {
            label: "Discovery",
            href: `/clients/${clientId}/vendors/discovery`,
            icon: Search,
            badge: stats?.needsReview || 0
        },

        {
            label: "All vendors",
            href: `/clients/${clientId}/vendors/all`,
            icon: Users,
            badge: stats?.totalVendors || 0
        },
        {
            label: "Subprocessors",
            href: `/clients/${clientId}/evaluations/subprocessors`,
            icon: Layers,
            badge: null
        },
        {
            label: "Assessment Templates",
            href: `/clients/${clientId}/vendors/templates`,
            icon: Target,
            badge: null
        },

        {
            label: "Vendor Catalog",
            href: `/clients/${clientId}/vendors/catalog`,
            icon: Globe,
            badge: null
        },
        {
            label: "Assessment Projects",
            href: `/clients/${clientId}/vendors/reviews`,
            icon: ShieldAlert,
            badge: stats?.inProgress || 0
        }
    ];

    const isActive = (href: string) => location.includes(href);
    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Clients", href: "/clients" },
        { label: client?.name || "Client", href: `/clients/${clientId}` },
        { label: "Vendors", href: `/clients/${clientId}/vendors/overview` }
    ];

    if (vendor) {
        breadcrumbItems.push({ label: vendor.name, href: `/clients/${clientId}/vendors/${vendorId}` });
    } else {
        const activeItem = navItems.find(item => isActive(item.href) && item.label !== "Overview");
        if (activeItem) {
            breadcrumbItems.push({ label: activeItem.label, href: activeItem.href });
        }
    }

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-muted/50">
                <div className="bg-card border-b border-border py-3 sticky top-0 z-30 shadow-sm space-y-3 px-4 md:px-8">
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
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                            </BreadcrumbSeparator>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>

                    {/* Navigation Pills */}
                    <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1" aria-label="TPRM Navigation">
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
                <div className="flex-1 w-full py-2">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
