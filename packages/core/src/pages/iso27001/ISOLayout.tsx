import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation, useParams } from "wouter";
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
    ArrowLeft
} from "lucide-react";
import { NavTabsWithMore } from "@/components/NavTabsWithMore";

/**
 * Tabs that stay on the bar; every other tab folds into the "More" menu so the
 * bar keeps a predictable width. Reorder or extend to change the split.
 */
const PRIMARY_TAB_PATHS = [
    '/iso27001',
    '/iso27001/soa',
    '/iso27001/risks',
    '/iso27001/assets',
    '/iso27001/audit',
];

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

    const isActive = (href: string) => {
        if (location === href) return true;
        if (href !== `/clients/${clientId}/iso27001` && location.startsWith(href)) return true;
        return false;
    };

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent">
                {/* One navigation line: the tab strip. The breadcrumb was removed —
                    the chrome bar names the section, the client switcher names the
                    client, and the active tab shows where you are. */}
                <div className="bg-muted border-b border-border py-3 mb-4">
                    <div className="flex items-center gap-3">
                        <NavTabsWithMore
                            ariaLabel="ISO 27001 Navigation"
                            tabs={navItems.map((i) => ({ label: i.label, path: i.href, icon: i.icon, badge: i.badge }))}
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
                <div className="flex-1 w-full min-w-0 max-w-full py-2 px-0">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
