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
  Cloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Play,
  Settings,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Breadcrumb } from '@/components/Breadcrumb';

export default function AddonDashboard() {
  const [, setLocation] = useLocation();
  const match = window.location.pathname.match(
    /\/addons\/([^/]+)\/dashboard/,
  );
  const slug = match ? match[1] : null;

  const { data: addon, isLoading: loadingAddon } = trpc.addons.getAddon.useQuery(
    { slug: slug || '' },
    { enabled: !!slug },
  );
  const { data: subscription } = trpc.addons.getSubscription.useQuery(
    { slug: slug || '' },
    { enabled: !!slug },
  );
  const { data: runHistory, refetch: refetchRuns } =
    trpc.addons.getRunHistory.useQuery(
      { slug: slug || '', limit: 20 },
      { enabled: !!slug },
    );

  const runMutation = trpc.addons.runNow.useMutation({
    onSuccess: () => {
      toast.success('Scan triggered');
      setTimeout(() => refetchRuns(), 2000);
    },
    onError: (err) => toast.error(err.message),
  });

  const isLoading = loadingAddon;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!addon || !slug) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <Shield className="h-12 w-12 text-muted-foreground opacity-20" />
          <h2 className="text-xl font-semibold mt-4">Addon Not Found</h2>
        </div>
      </DashboardLayout>
    );
  }

  const runs = runHistory?.runs ?? [];
  const latestRun = runs[0];
  const totalRuns = runHistory?.total ?? 0;
  const totalFindings = runs.reduce(
    (sum: number, r: any) => sum + (r.findingsCount ?? 0),
    0,
  );
  const passRate = latestRun?.summary?.total
    ? Math.round(
        ((latestRun.summary.total - latestRun.summary.failed) /
          latestRun.summary.total) *
          100,
      )
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Back */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/addons/${slug}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb
            items={[
              { label: 'Addon Marketplace', href: '/addons' },
              { label: addon.name, href: `/addons/${slug}` },
              { label: 'Dashboard' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{addon.name} Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Scan results, posture scores, and run history.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/addons/${slug}/settings`)}
            >
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Button>
            <Button
              onClick={() => runMutation.mutate({ slug })}
              disabled={runMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {runMutation.isPending ? 'Scanning...' : 'Run Now'}
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Posture Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold">
                  {passRate !== null ? `${passRate}%` : '—'}
                </div>
                {passRate !== null && passRate >= 80 ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : passRate !== null && passRate >= 50 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : passRate !== null ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : null}
              </div>
              {latestRun && (
                <p className="text-xs text-muted-foreground mt-1">
                  {latestRun.summary?.passed ?? 0} passed of{' '}
                  {latestRun.summary?.total ?? 0} checks
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRuns}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {runs.filter((r: any) => r.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalFindings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all scans
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Open Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {runs.reduce(
                  (sum: number, r: any) => sum + (r.risksCreated ?? 0),
                  0,
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Created from findings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Run history */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Run History</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRuns()}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Cloud className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No runs yet. Click "Run Now" to start.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((run: any) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          run.status === 'completed' ? 'default' : 'secondary'
                        }
                        className={
                          run.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : run.status === 'failed'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : run.status === 'running'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : ''
                        }
                      >
                        {run.status}
                      </Badge>
                      <div>
                        <div className="text-sm">
                          {new Date(run.startedAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Trigger: {run.trigger}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {run.findingsCount ?? 0} findings
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {run.durationSeconds
                          ? `${run.durationSeconds}s`
                          : ''}
                        {run.risksCreated
                          ? ` • ${run.risksCreated} risks`
                          : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
