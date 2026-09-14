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

interface ISOLayoutProps {
    clientId: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function ISOLayout({ clientId, children, fullWidth = false }: ISOLayoutProps) {
    const [location] = useLocation();

    const navItems = [
        {
            label: "Dashboard",
            href: `/clients/${clientId}/iso27001`,
            icon: LayoutDashboard,
        },
        {
            label: "Program Guide",
            href: `/clients/${clientId}/iso27001/guide`,
            icon: FileText,
            badge: "Manual"
        },
        {
            label: "Organization Context",
            href: `/clients/${clientId}/iso27001/governance`,
            icon: Users,
        },
        {
            label: "SoA (Annex A)",
            href: `/clients/${clientId}/iso27001/soa`,
            icon: ClipboardList,
        },
        {
            label: "Risk Register",
            href: `/clients/${clientId}/iso27001/risks`,
            icon: ShieldCheck,
        },
        {
            label: "Asset Inventory",
            href: `/clients/${clientId}/iso27001/assets`,
            icon: Database,
        },
        {
            label: "Documents",
            href: `/clients/${clientId}/iso27001/documents`,
            icon: FileText,
        },
        {
            label: "Internal Audit",
            href: `/clients/${clientId}/iso27001/audit`,
            icon: Activity,
        },
        {
            label: "Mgmt Review",
            href: `/clients/${clientId}/iso27001/management-review`,
            icon: ClipboardList,
        }
    ];

    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: clientId > 0 });

    const isActive = (href: string) => {
        if (location === href) return true;
        if (href !== `/clients/${clientId}/iso27001` && location.startsWith(href)) return true;
        return false;
    };

    const activeItem = navItems.find(item => isActive(item.href));

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Clients", href: "/clients" },
        { label: client?.name || "Client", href: `/clients/${clientId}` },
        { label: "ISO 27001", href: `/clients/${clientId}/iso27001` }
    ];

    if (activeItem && activeItem.label !== "Dashboard") {
        breadcrumbItems.push({ label: activeItem.label, href: activeItem.href });
    }

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent">
                <div className="bg-transparent border-b border-border/70 pb-4 mb-4 space-y-3">
                    {/* Breadcrumb Section */}
                    <Breadcrumb className="mb-0">
                        <BreadcrumbList>
                            {breadcrumbItems.map((item, idx) => {
                                const isLast = idx === breadcrumbItems.length - 1;
                                return (
                                    <React.Fragment key={idx}>
                                        <BreadcrumbItem>
                                            {isLast ? (
                                                <BreadcrumbPage className="font-bold text-foreground">
                                                    {item.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink asChild>
                                                    <Link href={item.href || "#"} className="flex items-center gap-1.5 hover:text-primary transition-colors">
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
                    <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1" aria-label="ISO 27001 Navigation">
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
                                    {item.badge && (
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
                <div className="flex-1 w-full py-2 px-0">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
