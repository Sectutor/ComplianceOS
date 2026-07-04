import { useState } from 'react';
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
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Cloud,
  Shield,
  Link,
  ExternalLink,
  Play,
  Settings,
  XCircle,
  Zap,
  Server,
  Users,
  BarChart3,
  AlertTriangle,
  FileText,
  Terminal,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Breadcrumb } from '@/components/Breadcrumb';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  scanner: <Cloud className="h-4 w-4" />,
  siem: <Shield className="h-4 w-4" />,
  dependency: <Link className="h-4 w-4" />,
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'Multi-cloud support': <Cloud className="h-4 w-4 text-blue-400" />,
  'Real-time endpoint event collection': <Server className="h-4 w-4 text-purple-400" />,
  'Multi-language dependency scanning': <Terminal className="h-4 w-4 text-emerald-400" />,
};

export default function AddonDetail() {
  const [, setLocation] = useLocation();
  const match = window.location.pathname.match(/\/addons\/([^/]+)/);
  const slug = match ? match[1] : null;

  const [scanResult, setScanResult] = useState<any>(null);
  const { selectedClientId } = useClientContext();

  const { data: addon, isLoading } = trpc.addons.getAddon.useQuery(
    { slug: slug || '' },
    { enabled: !!slug },
  );
  const { data: subscription, refetch: refetchSub } =
    trpc.addons.getSubscription.useQuery(
      { slug: slug || '' },
      { enabled: !!slug },
    );
  const { data: runHistory, refetch: refetchRuns } =
    trpc.addons.getRunHistory.useQuery(
      { slug: slug || '', limit: 5 },
      { enabled: !!slug },
    );

  const trialMutation = trpc.addons.startTrial.useMutation({
    onSuccess: () => {
      toast.success('14-day trial started!');
      refetchSub();
    },
    onError: (err) => toast.error(err.message),
  });

  const runMutation = trpc.addons.runNow.useMutation({
    onSuccess: (data) => {
      setScanResult(data);
      toast.success(
        `Scan complete — ${data.findingsCount} findings (${data.summary?.failed || 0} high)`,
      );
      refetchRuns();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.addons.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success('Subscription cancelled');
      refetchSub();
    },
    onError: (err) => toast.error(err.message),
  });

  const isActive = subscription?.status === 'active';
  const isTrial = subscription?.status === 'trial';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!addon) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
          <XCircle className="h-12 w-12 text-muted-foreground opacity-20" />
          <h2 className="text-xl font-semibold">Addon Not Found</h2>
          <Button
            variant="outline"
            onClick={() => setLocation('/addons')}
          >
            Back to Marketplace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusBadge = isActive ? (
    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
      <CheckCircle className="h-3 w-3 mr-1" /> Active
    </Badge>
  ) : isTrial ? (
    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
      <Clock className="h-3 w-3 mr-1" /> Trial
    </Badge>
  ) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Back + Breadcrumb */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/addons')}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb
            items={[
              { label: 'Addon Marketplace', href: '/addons' },
              { label: addon.name },
            ]}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              {CATEGORY_ICONS[addon.category] ?? <Shield className="h-8 w-8" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{addon.name}</h1>
                {statusBadge}
              </div>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {addon.description}
              </p>
              {addon.replaces && (
                <p className="text-xs text-muted-foreground mt-1">
                  Replaces{' '}
                  <span className="line-through">{addon.replaces}</span>
                  {' '}
                  <span className="text-emerald-500 font-medium">
                    saves {addon.replacesCost}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold">
              ${(addon.price / 100).toFixed(0)}
              <span className="text-base text-muted-foreground font-normal">
                /mo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              14-day free trial • No credit card
            </p>
          </div>
        </div>

        {/* Main content: Full description + Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Full description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About This Addon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {addon.fullDescription}
                </p>
              </CardContent>
            </Card>

            {/* Scan Results (shown after Run Now) */}
            {scanResult && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Last Scan Results
                      </div>
                    </CardTitle>
                    <Badge
                      className={
                        scanResult.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-red-500/10 text-red-500'
                      }
                    >
                      {scanResult.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary bar */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <div className="text-2xl font-bold">{scanResult.findingsCount}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 text-center">
                      <div className="text-2xl font-bold text-red-500">{scanResult.summary?.errors ?? 0}</div>
                      <div className="text-xs text-red-500/70">Critical</div>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                      <div className="text-2xl font-bold text-orange-500">{scanResult.summary?.failed ?? 0}</div>
                      <div className="text-xs text-orange-500/70">High</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 text-center">
                      <div className="text-2xl font-bold text-amber-500">{scanResult.summary?.total - scanResult.summary?.failed - scanResult.summary?.errors ?? 0}</div>
                      <div className="text-xs text-amber-500/70">Medium/Low</div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Completed in {scanResult.durationSeconds ?? '—'}s
                      {scanResult.evidenceArtifacts?.length > 0 &&
                        ` • ${scanResult.evidenceArtifacts.length} evidence artifact(s) pushed`}
                      {scanResult.summary && ' • Risks written to database'}
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() =>
                        setLocation(
                          selectedClientId
                            ? `/clients/${selectedClientId}/risks`
                            : '/risks',
                        )
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View in Risk Register
                    </Button>
                  </div>

                  {/* Findings table */}
                  {scanResult.findings && scanResult.findings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Vulnerabilities Detected</h4>
                      <div className="border rounded-lg divide-y">
                        {scanResult.findings.map((f: any, i: number) => (
                          <div key={i} className="p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  className={
                                    f.severity === 'critical'
                                      ? 'bg-red-500/10 text-red-500 shrink-0'
                                      : f.severity === 'high'
                                      ? 'bg-orange-500/10 text-orange-500 shrink-0'
                                      : f.severity === 'medium'
                                      ? 'bg-amber-500/10 text-amber-500 shrink-0'
                                      : 'bg-muted text-muted-foreground shrink-0'
                                  }
                                >
                                  {f.severity}
                                </Badge>
                                <span className="text-sm font-medium truncate">
                                  {f.title}
                                </span>
                              </div>
                            </div>
                            {f.description && (
                              <p className="text-xs text-muted-foreground ml-0 pl-0">
                                {f.description}
                              </p>
                            )}
                            {f.remediation && (
                              <p className="text-xs text-emerald-500 ml-0 pl-0">
                                Fix: {f.remediation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {/* All features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(addon.features ?? []).map((f: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {FEATURE_ICONS[f] ?? (
                        <CheckCircle className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                      )}
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tools used */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open-Source Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(addon.tools ?? []).map((tool: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:text-primary inline-flex items-center gap-1"
                        >
                          {tool.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        Open Source
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Run history (if has runs) */}
            {runHistory && runHistory.runs && runHistory.runs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {runHistory.runs.slice(0, 5).map((run: any) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              run.status === 'completed' ? 'default' : 'secondary'
                            }
                            className={
                              run.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : run.status === 'failed'
                                ? 'bg-red-500/10 text-red-500'
                                : ''
                            }
                          >
                            {run.status}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {new Date(run.startedAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {run.findingsCount ?? 0} findings
                          {run.durationSeconds
                            ? ` • ${run.durationSeconds}s`
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isActive || isTrial ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() =>
                        setLocation(`/addons/${addon.slug}/settings`)
                      }
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => runMutation.mutate({ slug: addon.slug })}
                      disabled={runMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {runMutation.isPending ? 'Running...' : 'Run Now'}
                    </Button>
                    {isActive && (
                      <Button
                        variant="ghost"
                        className="w-full text-red-500 hover:text-red-600"
                        onClick={() => cancelMutation.mutate({ slug: addon.slug })}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => trialMutation.mutate({ slug: addon.slug })}
                    disabled={trialMutation.isPending}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start 14-Day Free Trial
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pricing info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="font-medium">
                    ${(addon.price / 100).toFixed(0)}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free Trial</span>
                  <span>14 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline" className="text-xs">
                    {addon.category}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>v{addon.version}</span>
                </div>
              </CardContent>
            </Card>

            {/* Infrastructure */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Server className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{addon.requiredInfrastructure}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
