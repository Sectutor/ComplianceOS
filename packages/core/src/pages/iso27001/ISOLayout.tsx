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

                    <nav className="flex space-x-2 overflow-x-auto no-scrollbar py-1" aria-label="ISO 27001 Navigation">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center whitespace-nowrap shrink-0 min-w-max px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm border",
                                        active
                                            ? "bg-brand-bright text-white border-brand-bright"
                                            : "bg-brand text-white border-brand hover:bg-brand-bright hover:border-brand-bright"
                                    )}
                                >
                                    <item.icon className="mr-2.5 h-4 w-4" />
                                    {item.label}
                                    {item.badge && (
                                        <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-md bg-white/20 text-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className={cn(
                    "flex-1 w-full py-8 px-0"
                )}>
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
