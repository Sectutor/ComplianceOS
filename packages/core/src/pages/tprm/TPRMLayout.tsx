import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { NavTabsWithMore } from "@/components/NavTabsWithMore";
import { Link, useLocation } from "wouter";
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

/**
 * Tabs that stay on the bar; every other tab folds into the "More" menu so the
 * bar keeps a predictable width. Reorder or extend to change the split.
 */
const PRIMARY_TAB_PATHS = [
    '/vendors/overview',
    '/vendors/discovery',
    '/vendors/all',
    '/vendors/reviews',
];

interface TPRMLayoutProps {
    clientId: number;
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function TPRMLayout({ clientId, children, fullWidth }: TPRMLayoutProps) {
    const [location] = useLocation();
    const params = useParams<{ vendorId: string }>();
    const vendorId = params.vendorId ? parseInt(params.vendorId) : null;
    // On a vendor detail page the vendor's own tabs are the primary navigation,
    // so the global pill row is collapsed to a single back affordance.
    const isVendorDetail = !!vendorId && !isNaN(vendorId);

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
            // Deliberately no badge: an inventory total is not a call to action,
            // and showing one here trains users to ignore the badges that are.
            badge: null
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

    // Rendered only on vendor detail pages, where the breadcrumb is the one
    // element that names the record you are inside. On section pages the tab
    // strip carries navigation, so a breadcrumb would just duplicate the chrome
    // bar's page title and the client switcher's client name.
    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Clients", href: "/clients" },
        { label: client?.name || "Client", href: `/clients/${clientId}` },
        { label: "Vendors", href: `/clients/${clientId}/vendors/all` }
    ];
    if (vendor) {
        breadcrumbItems.push({ label: vendor.name, href: `/clients/${clientId}/vendors/${vendorId}` });
    }

    return (
        <DashboardLayout fullWidth={fullWidth}>
            <div className="flex flex-col min-h-screen bg-muted/50">
                {/* Page-level sub-navigation. Deliberately tinted (not white like the
                    app chrome above) and parked directly under the h-14 top bar, so the
                    chrome / page-nav / content layers stay visually distinct. */}
                <div className="bg-muted border-b border-border py-3 sticky top-14 z-30 px-4 md:px-8">
                    {isVendorDetail ? (
                        /* Detail pages: the breadcrumb is the only element that names
                           the record you are inside, and its "Vendors" crumb is the way
                           back to the list. */
                        <Breadcrumb className="mb-0">
                            <BreadcrumbList>
                                {breadcrumbItems.map((item, idx) => {
                                    const isLast = idx === breadcrumbItems.length - 1;
                                    return (
                                        <React.Fragment key={idx}>
                                            <BreadcrumbItem>
                                                {isLast ? (
                                                    <BreadcrumbPage className="font-medium text-foreground">
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
                    ) : (
                        /* Section pages: one navigation line. Tabs in
                           PRIMARY_TAB_PATHS stay on the bar; the rest fold into the
                           "More" menu so the bar keeps a predictable width. */
                        <NavTabsWithMore
                            ariaLabel="TPRM Navigation"
                            tabs={navItems.map((i) => ({ label: i.label, path: i.href, icon: i.icon, badge: i.badge }))}
                            primaryPaths={PRIMARY_TAB_PATHS}
                            isActive={isActive}
                            className="min-w-0"
                        />
                    )}
                </div>
                <div className="flex-1 w-full py-2">
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
