import React, { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@complianceos/ui/ui/button";
import {
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    Activity,
    Lock,
    FileText,
    Server,
    Zap,
    BookOpen,
    Target,
    Layers,
    Home,
    ChevronRight,
    ArrowLeft
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from "@/lib/trpc";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@complianceos/ui/ui/breadcrumb";

interface CyberLayoutProps {
    clientId?: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export default function CyberLayout({ children, fullWidth = false, clientId: propClientId }: PropsWithChildren<CyberLayoutProps>) {
    const [location, setLocation] = useLocation();
    const params = useParams();
    const { selectedClientId } = useClientContext();
    
    const clientId = propClientId || parseInt(params.id || params.clientId || "0") || selectedClientId;
    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: clientId > 0 });

    const [startHereOrigin, setStartHereOrigin] = React.useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here')) return returnTo;
            const stored = sessionStorage.getItem(`cyber_start_here_origin_${clientId}`);
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

    React.useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here')) {
                setStartHereOrigin(returnTo);
            }
        } catch {}
    }, [location]);

    const handleReturnToStartHere = () => {
        try {
            sessionStorage.removeItem(`cyber_start_here_origin_${clientId}`);
            sessionStorage.removeItem(`start_here_origin_${clientId}`);
        } catch {}
        setStartHereOrigin(null);
        setLocation(startHereOrigin || `/clients/${clientId}/start-here`);
    };

    const tabs = [
        { name: "Overview & Dashboard", path: `/clients/${clientId}/cyber`, icon: ShieldCheck, badge: null },
        { name: "Program Guide", path: `/clients/${clientId}/cyber/guide`, icon: BookOpen, badge: "Manual" },
        { name: "NIS2 Assessment", path: `/clients/${clientId}/cyber/assessment`, icon: Target, badge: "Art. 21" },
        { name: "Incident Reporting", path: `/clients/${clientId}/cyber/incidents`, icon: Zap, badge: "24h/72h" },
        { name: "Vulnerability Register", path: `/clients/${clientId}/cyber/vulnerabilities`, icon: AlertTriangle, badge: null },
        { name: "Threat Intelligence", path: `/clients/${clientId}/cyber/threat-intel`, icon: ShieldAlert, badge: null },
        { name: "Supply Chain Risk", path: `/clients/${clientId}/cyber/supply-chain`, icon: Lock, badge: null },
        { name: "Security Testing", path: `/clients/${clientId}/cyber/security-testing`, icon: Activity, badge: null },
        { name: "Continuous Monitoring", path: `/clients/${clientId}/cyber/monitoring`, icon: Server, badge: null },
        { name: "Documentation Hub", path: `/clients/${clientId}/cyber/documents`, icon: FileText, badge: null },
        { name: "Control Mapping", path: `/clients/${clientId}/cyber/mapping`, icon: Layers, badge: null },
    ];

    const isActive = (path: string) => {
        if (location === path) return true;
        if (path.endsWith('/cyber/guide') && location.includes('/cyber/program-guide')) return true;
        if (path.endsWith('/cyber/program-guide') && location.includes('/cyber/guide')) return true;
        if (path !== `/clients/${clientId}/cyber` && location.startsWith(path)) return true;
        return false;
    };

    const activeItem = tabs.find(tab => isActive(tab.path));

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Clients", href: "/clients" },
        { label: client?.name || "Client", href: `/clients/${clientId}` },
        { label: "Cyber Resilience & NIS2", href: `/clients/${clientId}/cyber` }
    ];

    if (activeItem && activeItem.name !== "Overview & Dashboard") {
        breadcrumbItems.push({ label: activeItem.name, href: activeItem.path });
    }

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent">
                <div className="bg-transparent border-b border-slate-200 py-3 sticky top-0 z-30 shadow-none space-y-3">
                    {/* Breadcrumb Section with Origin Back Button */}
                    <div className="flex items-center justify-between gap-4">
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

                        {startHereOrigin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReturnToStartHere}
                                className="h-8 px-3 text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs gap-1.5 shrink-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to Start Here
                            </Button>
                        )}
                    </div>

                    {/* Navigation Pills */}
                    <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const active = isActive(tab.path);
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.path}
                                    href={tab.path}
                                    className={cn(
                                        "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all flex items-center whitespace-nowrap text-xs sm:text-sm font-semibold shadow-xs shrink-0 cursor-pointer",
                                        active
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/20 font-bold"
                                            : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 font-medium"
                                    )}
                                >
                                    <Icon className={cn(
                                        "mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 transition-transform duration-200",
                                        active ? "scale-105 text-primary-foreground" : "text-muted-foreground"
                                    )} />
                                    <span>{tab.name}</span>
                                    {!!tab.badge && (
                                        <span className={cn(
                                            "ml-2 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0",
                                            active
                                                ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                                : "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {tab.badge}
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
