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
import { Input } from '@complianceos/ui/ui/input';
import { Label } from '@complianceos/ui/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@complianceos/ui/ui/select';
import { Skeleton } from '@complianceos/ui/ui/skeleton';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Cloud,
  Shield,
  Link,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  Settings,
  Folder,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Breadcrumb } from '@/components/Breadcrumb';

const ADDON_CONFIG_HELP: Record<string, { fields: string[] }> = {
  'cloud-scanner': {
    fields: [
      'AWS account credentials (access key + secret) for each account to scan',
      'Azure subscription ID and tenant ID',
      'GCP project ID and service account key',
      'Which compliance frameworks to check against (NIST CSF 2.0, SOC 2, etc.)',
      'Scan schedule: daily, weekly, or monthly',
    ],
  },
  'endpoint-siem': {
    fields: [
      'Wazuh manager connection details (host, port, protocol)',
      'Alert severity threshold (which alerts become incidents)',
      'Compliance rulesets to enable (PCI DSS, NIST 800-53, CIS)',
      'Agent deployment script for endpoints',
    ],
  },
  'dep-scanner': {
    fields: [
      'Repository URLs and branches to scan (e.g. https://github.com/org/repo)',
      'Local directory paths to scan for dependency files',
      'SBOM file paths in SPDX or CycloneDX format',
      'Minimum CVE severity to report (CRITICAL/HIGH/MEDIUM/LOW)',
      'Scan schedule: weekly or monthly',
    ],
  },
};

const DEFAULT_SETTINGS: Record<string, Record<string, any>> = {
  'cloud-scanner': {
    awsAccounts: [],
    azureSubscriptions: [],
    gcpProjects: [],
    frameworks: ['nist_csf_2.0', 'soc2'],
    schedule: 'weekly',
  },
  'endpoint-siem': {
    managerHost: '',
    managerPort: 55000,
    protocol: 'https',
    alertLevel: 5,
    rulesets: ['pci_dss', 'nist_800_53'],
    autoDeploy: false,
  },
  'dep-scanner': {
    repos: [],
    directories: ['./'],
    sbomFiles: [],
    minSeverity: 'MEDIUM',
    scanType: 'fs',
    schedule: 'weekly',
    timeout: 120,
  },
};

export default function AddonSettings() {
  const [, setLocation] = useLocation();
  const match = window.location.pathname.match(
    /\/addons\/([^/]+)\/settings/,
  );
  const slug = match ? match[1] : null;

  const { data: addon, isLoading: loadingAddon } = trpc.addons.getAddon.useQuery(
    { slug: slug || '' },
    { enabled: !!slug },
  );
  const { data: subscription, isLoading: loadingSub } =
    trpc.addons.getSubscription.useQuery(
      { slug: slug || '' },
      { enabled: !!slug },
    );

  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [awsAccounts, setAwsAccounts] = useState<any[]>([]);

  const updateMutation = trpc.addons.updateSettings.useMutation({
    onSuccess: () => {
      toast.success('Settings saved');
      setIsDirty(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const trialMutation = trpc.addons.startTrial.useMutation({
    onSuccess: () => {
      toast.success('Trial started! You can now configure this addon.');
      window.location.reload();
    },
    onError: (err) => toast.error(err.message),
  });

  const isLoading = loadingAddon || loadingSub;
  const hasAccess =
    subscription?.status === 'active' || subscription?.status === 'trial';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!addon) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
          <h2 className="text-xl font-semibold">Addon Not Found</h2>
          <Button variant="outline" onClick={() => setLocation('/addons')}>
            Back to Marketplace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
          <Shield className="h-12 w-12 text-muted-foreground opacity-20" />
          <h2 className="text-xl font-semibold">
            Subscription Required
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            You need an active subscription or trial to configure this addon.
          </p>
          <Button onClick={() => trialMutation.mutate({ slug: addon.slug })}>
            Start 14-Day Free Trial
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentSettings = subscription?.settings ?? DEFAULT_SETTINGS[slug ?? ''] ?? {};
  const help = ADDON_CONFIG_HELP[slug ?? ''] ?? { fields: [] };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ slug: slug!, settings: subscription?.settings ?? {} });
    } finally {
      setIsSaving(false);
    }
  };

  const addAwsAccount = () => {
    const updated = { ...currentSettings };
    updated.awsAccounts = [
      ...(updated.awsAccounts || []),
      { name: '', accessKeyId: '', secretAccessKey: '', regions: ['us-east-1'] },
    ];
    // Trigger update via save
    handleDirty(updated);
  };

  const removeAwsAccount = (index: number) => {
    const updated = { ...currentSettings };
    updated.awsAccounts = (updated.awsAccounts || []).filter(
      (_: any, i: number) => i !== index,
    );
    handleDirty(updated);
  };

  const handleDirty = (updated: Record<string, any>) => {
    setIsDirty(true);
    // In a real form, we'd use react-hook-form or controlled inputs.
    // For now, overwrite subscription.settings reference.
    Object.assign(subscription, { settings: updated });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Back + Breadcrumb */}
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
              { label: 'Settings' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configure {addon.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Set up your cloud accounts, endpoints, and scan preferences.
            </p>
          </div>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Settings form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Cloud Scanner settings */}
            {slug === 'cloud-scanner' && (
              <>
                {/* AWS Accounts */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          AWS Accounts
                        </CardTitle>
                        <CardDescription>
                          Add AWS accounts to scan for compliance violations.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addAwsAccount}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Account
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(currentSettings.awsAccounts ?? []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Cloud className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No AWS accounts configured. Add one to start scanning.
                      </div>
                    ) : (
                      (currentSettings.awsAccounts ?? []).map(
                        (acct: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 rounded-lg border space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                Account {i + 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500"
                                onClick={() => removeAwsAccount(i)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">
                                  Account Name
                                </Label>
                                <Input
                                  placeholder="Production AWS"
                                  defaultValue={acct.name}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">
                                  Regions
                                </Label>
                                <Input
                                  placeholder="us-east-1,us-west-2"
                                  defaultValue={acct.regions?.join(',') ?? ''}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">
                                  Access Key ID
                                </Label>
                                <div className="relative">
                                  <Input
                                    type={
                                      showKeys[`aws-${i}-key`]
                                        ? 'text'
                                        : 'password'
                                    }
                                    placeholder="AKIA..."
                                    defaultValue={acct.accessKeyId ?? ''}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-6 w-6"
                                    onClick={() =>
                                      setShowKeys({
                                        ...showKeys,
                                        [`aws-${i}-key`]:
                                          !showKeys[`aws-${i}-key`],
                                      })
                                    }
                                  >
                                    {showKeys[`aws-${i}-key`] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">
                                  Secret Access Key
                                </Label>
                                <div className="relative">
                                  <Input
                                    type={
                                      showKeys[`aws-${i}-secret`]
                                        ? 'text'
                                        : 'password'
                                    }
                                    placeholder="••••••••"
                                    defaultValue={
                                      acct.secretAccessKey ?? ''
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-6 w-6"
                                    onClick={() =>
                                      setShowKeys({
                                        ...showKeys,
                                        [`aws-${i}-secret`]:
                                          !showKeys[`aws-${i}-secret`],
                                      })
                                    }
                                  >
                                    {showKeys[`aws-${i}-secret`] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Scan Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scan Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Compliance Frameworks</Label>
                        <Select
                          defaultValue={
                            currentSettings.frameworks?.[0] ??
                            'nist_csf_2.0'
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nist_csf_2.0">
                              NIST CSF 2.0
                            </SelectItem>
                            <SelectItem value="soc2">SOC 2</SelectItem>
                            <SelectItem value="iso_27001">
                              ISO 27001
                            </SelectItem>
                            <SelectItem value="hipaa">HIPAA</SelectItem>
                            <SelectItem value="pci_dss">PCI DSS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Schedule</Label>
                        <Select
                          defaultValue={currentSettings.schedule ?? 'weekly'}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Dep Scanner settings */}
            {slug === 'dep-scanner' && (
              <>
                {/* Repository URLs */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Repository URLs
                        </CardTitle>
                        <CardDescription>
                          Git repos to scan for dependency vulnerabilities.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = { ...currentSettings };
                          updated.repos = [
                            ...(updated.repos || []),
                            { url: '', branch: 'main' },
                          ];
                          handleDirty(updated);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Repo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(currentSettings.repos ?? []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Link className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No repositories configured. Directory scan will be used instead.
                      </div>
                    ) : (
                      (currentSettings.repos ?? []).map(
                        (repo: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 rounded-lg border space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                Repository {i + 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500"
                                onClick={() => {
                                  const updated = { ...currentSettings };
                                  updated.repos = (
                                    updated.repos || []
                                  ).filter((_: any, j: number) => j !== i);
                                  handleDirty(updated);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">URL</Label>
                                <Input
                                  placeholder="https://github.com/org/repo"
                                  defaultValue={repo.url}
                                  onChange={(e) => {
                                    const updated = { ...currentSettings };
                                    updated.repos = [...(updated.repos || [])];
                                    updated.repos[i] = { ...updated.repos[i], url: e.target.value };
                                    handleDirty(updated);
                                  }}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Branch</Label>
                                <Input
                                  placeholder="main"
                                  defaultValue={repo.branch}
                                  onChange={(e) => {
                                    const updated = { ...currentSettings };
                                    updated.repos = [...(updated.repos || [])];
                                    updated.repos[i] = { ...updated.repos[i], branch: e.target.value };
                                    handleDirty(updated);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Directory Paths */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Directory Paths
                        </CardTitle>
                        <CardDescription>
                          Local directories to scan for dependency files.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = { ...currentSettings };
                          updated.directories = [
                            ...(updated.directories || []),
                            '',
                          ];
                          handleDirty(updated);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Directory
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(currentSettings.directories ?? []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Folder className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No directories configured.
                      </div>
                    ) : (
                      (currentSettings.directories ?? []).map(
                        (dir: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg border"
                          >
                            <Input
                              className="flex-1"
                              placeholder="/path/to/project"
                              defaultValue={dir}
                              onChange={(e) => {
                                const updated = { ...currentSettings };
                                updated.directories = [...(updated.directories || [])];
                                updated.directories[i] = e.target.value;
                                handleDirty(updated);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 shrink-0"
                              onClick={() => {
                                const updated = { ...currentSettings };
                                updated.directories = (
                                  updated.directories || []
                                ).filter((_: any, j: number) => j !== i);
                                handleDirty(updated);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                </Card>

                {/* SBOM Files */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          SBOM Files
                        </CardTitle>
                        <CardDescription>
                          SPDX or CycloneDX SBOM files to analyze.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = { ...currentSettings };
                          updated.sbomFiles = [
                            ...(updated.sbomFiles || []),
                            '',
                          ];
                          handleDirty(updated);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add SBOM
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(currentSettings.sbomFiles ?? []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No SBOM files configured.
                      </div>
                    ) : (
                      (currentSettings.sbomFiles ?? []).map(
                        (file: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg border"
                          >
                            <Input
                              className="flex-1"
                              placeholder="/path/to/bom.json"
                              defaultValue={file}
                              onChange={(e) => {
                                const updated = { ...currentSettings };
                                updated.sbomFiles = [...(updated.sbomFiles || [])];
                                updated.sbomFiles[i] = e.target.value;
                                handleDirty(updated);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 shrink-0"
                              onClick={() => {
                                const updated = { ...currentSettings };
                                updated.sbomFiles = (
                                  updated.sbomFiles || []
                                ).filter((_: any, j: number) => j !== i);
                                handleDirty(updated);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Scan Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scan Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Min Severity</Label>
                        <Select
                          defaultValue={currentSettings.minSeverity ?? 'MEDIUM'}
                          onValueChange={(val) => {
                            const updated = { ...currentSettings };
                            updated.minSeverity = val;
                            handleDirty(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                            <SelectItem value="HIGH">HIGH</SelectItem>
                            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                            <SelectItem value="LOW">LOW</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Scan Type</Label>
                        <Select
                          defaultValue={currentSettings.scanType ?? 'fs'}
                          onValueChange={(val) => {
                            const updated = { ...currentSettings };
                            updated.scanType = val;
                            handleDirty(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fs">Filesystem</SelectItem>
                            <SelectItem value="sbom">SBOM</SelectItem>
                            <SelectItem value="repo">Repository</SelectItem>
                            <SelectItem value="image">Container Image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Schedule</Label>
                        <Select
                          defaultValue={currentSettings.schedule ?? 'weekly'}
                          onValueChange={(val) => {
                            const updated = { ...currentSettings };
                            updated.schedule = val;
                            handleDirty(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Timeout (seconds)</Label>
                        <Input
                          type="number"
                          placeholder="120"
                          defaultValue={currentSettings.timeout ?? 120}
                          onChange={(e) => {
                            const updated = { ...currentSettings };
                            updated.timeout = parseInt(e.target.value) || 120;
                            handleDirty(updated);
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* endpoint-siem settings */}
            {slug === 'endpoint-siem' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuration</CardTitle>
                  <CardDescription>
                    Configure this addon's settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(help.fields ?? []).map((field: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {field}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Full configuration form coming soon. For now, configure via
                    API or contact support.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Generic placeholder for other unconfigured addons */}
            {slug !== 'cloud-scanner' &&
              slug !== 'dep-scanner' &&
              slug !== 'endpoint-siem' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure this addon's settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(help.fields ?? []).map((field: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {field}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Full configuration form coming soon. For now, configure via
                    API or contact support.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge
                    variant={hasAccess ? 'default' : 'secondary'}
                    className={
                      hasAccess
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : ''
                    }
                  >
                    {subscription?.status ?? 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="text-xs">
                    {subscription?.lastSyncAt
                      ? new Date(
                          subscription.lastSyncAt,
                        ).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                {subscription?.nextScheduledRun && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Next Run
                    </span>
                    <span className="text-xs">
                      {new Date(
                        subscription.nextScheduledRun,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Setup Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(help.fields ?? []).map((field: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
