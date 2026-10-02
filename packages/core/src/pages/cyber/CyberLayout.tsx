import React, { PropsWithChildren } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation, useParams } from "wouter";
import { Button } from "@complianceos/ui/ui/button";
import {
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    Lock,
    FileText,
    Server,
    Zap,
    BookOpen,
    Target,
    Layers,
    ArrowLeft
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { NavTabsWithMore } from "@/components/NavTabsWithMore";

/**
 * Tabs that always stay on the bar. Every other tab folds into the "More" menu,
 * so the bar keeps a predictable width no matter how many sections the module
 * grows. Reorder or extend this list to change the split.
 */
const PRIMARY_TAB_PATHS = [
    '/cyber',
    '/cyber/assessment',
    '/cyber/incidents',
    '/cyber/vulnerabilities',
    '/cyber/supply-chain',
];

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

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent">
                {/* One navigation line: the tab strip. The breadcrumb was removed —
                    the chrome bar names the section, the client switcher names the
                    client, and the active tab shows where you are. */}
                <div className="bg-muted border-b border-border py-3 sticky top-14 z-30">
                    <div className="flex items-center gap-3">
                        <NavTabsWithMore
                            ariaLabel="Cyber Resilience Navigation"
                            tabs={tabs.map((t) => ({ label: t.name, path: t.path, icon: t.icon, badge: t.badge }))}
                            primaryPaths={PRIMARY_TAB_PATHS}
                            isActive={isActive}
                            className="min-w-0 flex-1"
                        />

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
