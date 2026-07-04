import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useClientContext } from '@/contexts/ClientContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import { Skeleton } from '@complianceos/ui/ui/skeleton';
import {
  Shield,
  Cloud,
  Wifi,
  Link,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Play,
  Settings,
  Star,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Breadcrumb } from '@/components/Breadcrumb';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  scanner: <Cloud className="h-8 w-8" />,
  siem: <Shield className="h-8 w-8" />,
  dependency: <Link className="h-8 w-8" />,
};

const CATEGORY_BG: Record<string, string> = {
  scanner: 'bg-blue-500/10 text-blue-500',
  siem: 'bg-purple-500/10 text-purple-500',
  dependency: 'bg-emerald-500/10 text-emerald-500',
};

interface SubscriptionInfo {
  id: number;
  addonSlug: string;
  status: string;
  trialEndsAt: string | null;
}

export default function AddonMarketplace() {
  const [, setLocation] = useLocation();
  const { selectedClientId } = useClientContext();

  const { data: marketplace, isLoading: loadingMarket } =
    trpc.addons.listMarketplace.useQuery();
  const {
    data: mySubscriptions,
    isLoading: loadingSubs,
    refetch: refetchSubs,
  } = trpc.addons.listMySubscriptions.useQuery(undefined);

  const trialMutation = trpc.addons.startTrial.useMutation({
    onSuccess: (data) => {
      toast.success(`Trial started! ${data.status === 'active' ? 'Addon is now active.' : 'Enjoy your 14-day free trial.'}`);
      refetchSubs();
      // Navigate to config page so the user can set up the addon immediately
      setLocation(`/addons/${data.addon_slug}/settings`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start trial');
    },
  });

  const isLoading = loadingMarket || loadingSubs;

  const getSubscription = (slug: string): SubscriptionInfo | undefined => {
    return mySubscriptions?.find((s: SubscriptionInfo) => s.addonSlug === slug);
  };

  const getStatusBadge = (sub?: SubscriptionInfo) => {
    if (!sub) return null;
    const status = sub.status;
    if (status === 'active') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          <CheckCircle className="h-3 w-3 mr-1" /> Active
        </Badge>
      );
    }
    if (status === 'trial') {
      const daysLeft = sub.trialEndsAt
        ? Math.ceil(
            (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000,
          )
        : 14;
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" /> Trial ({daysLeft}d left)
        </Badge>
      );
    }
    if (status === 'expired' || status === 'cancelled') {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Inactive
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-lg mb-2" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const addons = marketplace?.addons ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb
              items={[{ label: 'Addon Marketplace' }]}
            />
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              Addon Marketplace
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Extend GRCompliance with automated security scanning, SIEM, and
              more. Start a free 14-day trial on any addon.
            </p>
          </div>
          {mySubscriptions && mySubscriptions.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setLocation('/addons/my')}
            >
              <Star className="h-4 w-4 mr-2" />
              My Addons ({mySubscriptions.length})
            </Button>
          )}
        </div>

        {/* Addon Grid */}
        {addons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <Sparkles className="h-12 w-12 text-muted-foreground opacity-20" />
              <h2 className="text-xl font-semibold">No Addons Available</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Addons are being prepared. Check back soon for security scanning
                integrations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon: any) => {
              const sub = getSubscription(addon.slug);
              const statusBadge = getStatusBadge(sub);
              const hasAccess =
                sub?.status === 'active' || sub?.status === 'trial';

              return (
                <Card
                  key={addon.slug}
                  className="group hover:shadow-lg transition-all duration-200 relative overflow-hidden"
                >
                  {/* Category color bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      CATEGORY_BG[addon.category]?.replace('text-', 'bg-').replace('/10', '/30') ?? 'bg-muted'
                    }`}
                  />

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-lg ${
                            CATEGORY_BG[addon.category] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {CATEGORY_ICONS[addon.category] ?? (
                            <Shield className="h-8 w-8" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {addon.name}
                          </CardTitle>
                          <CardDescription>
                            {addon.replaces && (
                              <span className="text-xs">
                                Replaces{' '}
                                <span className="line-through">
                                  {addon.replaces}
                                </span>{' '}
                                <span className="text-emerald-500 font-medium">
                                  {addon.replacesCost}
                                </span>
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {addon.description}
                    </p>

                    {/* Key features (first 3) */}
                    <div className="space-y-1.5">
                      {(addon.features ?? []).slice(0, 3).map((f: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <CheckCircle className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status + Price row */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {statusBadge}
                        <span className="text-sm font-bold">
                          ${(addon.price / 100).toFixed(0)}
                          <span className="text-xs text-muted-foreground font-normal">
                            /mo
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {hasAccess ? (
                        <>
                          <Button
                            className="flex-1"
                            onClick={() =>
                              setLocation(`/addons/${addon.slug}`)
                            }
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setLocation(`/addons/${addon.slug}/dashboard`)
                            }
                          >
                            Dashboard
                          </Button>
                        </>
                      ) : sub?.status === 'expired' ? (
                        <Button className="flex-1">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Subscribe — ${(addon.price / 100).toFixed(0)}/mo
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          onClick={() => trialMutation.mutate({ slug: addon.slug })}
                          disabled={trialMutation.isPending}
                        >
                          {trialMutation.isPending ? (
                            <span className="animate-spin">⟳</span>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Start Free Trial
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info section */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex items-start gap-4 p-6">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How Addons Work</p>
              <p>
                Each addon connects GRCompliance to an open-source security
                tool. Start a free trial — no credit card required. After 14
                days, choose to subscribe or the addon deactivates. Your data
                is preserved either way.
              </p>
              <p className="text-xs mt-2">
                External tools (Prowler, Wazuh, OSV-Scanner) run as Docker
                containers on your infrastructure or ours. Addon settings let
                you configure cloud accounts, endpoints, and scan schedules.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
