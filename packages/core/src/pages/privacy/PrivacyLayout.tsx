import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";
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
import { NavTabsWithMore } from "@/components/NavTabsWithMore";

/**
 * Tabs that stay on the bar; every other tab folds into the "More" menu so the
 * bar keeps a predictable width. Reorder or extend to change the split.
 */
const PRIMARY_TAB_PATHS = [
    '/privacy',
    '/privacy/ropa',
    '/privacy/inventory',
    '/privacy/dsar',
    '/privacy/breaches',
];

interface PrivacyLayoutProps {
    clientId: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function PrivacyLayout({ clientId, children, fullWidth = false }: PrivacyLayoutProps) {
    const [location] = useLocation();

    const navItems = [
        {
            label: "Overview",
            href: `/clients/${clientId}/privacy`,
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
        // Module root (the dashboard) and the /gdpr alias
        if (location === `/clients/${clientId}/privacy` || location === `/clients/${clientId}/gdpr`) {
            return href.endsWith('/privacy');
        }
        if (location === href) return true;
        if (href.endsWith('/privacy/guide') && location.includes('/privacy/program-guide')) return true;
        // Overview's href ('/privacy') is a prefix of every page — exact-match only for it
        if (!href.endsWith('/privacy') && location.startsWith(href)) return true;
        return false;
    };

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-transparent">
                {/* One navigation line: the tab strip. The breadcrumb was removed —
                    the chrome bar names the section, the client switcher names the
                    client, and the active tab shows where you are. */}
                <div className="bg-muted border-b border-border py-3 sticky top-14 z-30">
                    <NavTabsWithMore
                        ariaLabel="Privacy Navigation Tabs"
                        tabs={navItems.map((i) => ({ label: i.label, path: i.href, icon: i.icon, badge: i.badge }))}
                        primaryPaths={PRIMARY_TAB_PATHS}
                        isActive={isActive}
                        className="min-w-0"
                    />
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
