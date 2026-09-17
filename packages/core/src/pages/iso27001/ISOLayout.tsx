import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@complianceos/ui/ui/button";
import { useClientContext } from "@/contexts/ClientContext";
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
    ChevronRight,
    ArrowLeft
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
    clientId?: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function ISOLayout({ clientId: propClientId, children, fullWidth = false }: ISOLayoutProps) {
    const [location, setLocation] = useLocation();
    const params = useParams<{ id?: string; clientId?: string }>();
    const { selectedClientId } = useClientContext();
    const urlMatch = location.match(/\/clients\/(\d+)/);
    const idParam = propClientId || params?.id || params?.clientId || (urlMatch ? urlMatch[1] : undefined);
    const clientId = typeof idParam === "number" ? idParam : parseInt(idParam || "0", 10) || selectedClientId || 0;

    const [startHereOrigin, setStartHereOrigin] = React.useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here')) return returnTo;
            const stored = sessionStorage.getItem(`iso27001_start_here_origin_${clientId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.url && parsed.url.includes('/start-here')) return parsed.url;
            }
            const startHereStored = sessionStorage.getItem(`start_here_origin_${clientId}`);
            if (startHereStored) {
                const parsed = JSON.parse(startHereStored);
                if (parsed?.url && parsed.url.includes('/start-here') && (Date.now() - (parsed.timestamp || 0)) < 2 * 60 * 60 * 1000) {
                    return parsed.url;
                }
            }
        } catch {}
        return null;
    });

    // Keep origin synced if query param is passed
    React.useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here') && clientId > 0) {
                const payload = JSON.stringify({ url: returnTo, timestamp: Date.now() });
                sessionStorage.setItem(`iso27001_start_here_origin_${clientId}`, payload);
                setStartHereOrigin(returnTo);
            }
        } catch {}
    }, [clientId, location]);

    const handleReturnToStartHere = () => {
        try {
            sessionStorage.removeItem(`iso27001_start_here_origin_${clientId}`);
            sessionStorage.removeItem(`start_here_origin_${clientId}`);
        } catch {}
        const target = startHereOrigin || `/clients/${clientId}/start-here`;
        setStartHereOrigin(null);
        setLocation(target);
    };

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
                    {/* Breadcrumb & Navigation Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                        {startHereOrigin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReturnToStartHere}
                                className="h-8 px-3 text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs gap-1.5 shrink-0 self-start sm:self-auto"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to Start Here
                            </Button>
                        )}
                    </div>

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
                <div className="flex-1 w-full min-w-0 max-w-full py-2 px-0">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
