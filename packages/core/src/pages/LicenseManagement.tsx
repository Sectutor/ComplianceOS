/**
 * License Management Page
 * 
 * Allows users to view their current license status, upgrade plans, activate license keys,
 * or upload air-gapped sovereign cryptographic .lic files.
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@complianceos/ui/ui/card';
import { 
  Button 
} from '@complianceos/ui/ui/button';
import { 
  Input 
} from '@complianceos/ui/ui/input';
import { 
  Badge 
} from '@complianceos/ui/ui/badge';
import { 
  CheckCircle, 
  Key, 
  RefreshCw,
  Copy,
  Sparkles,
  Upload,
  Cpu,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { UpgradeModal } from '@/components/license/UpgradeModal';
import DashboardLayout from '@/components/DashboardLayout';
import { PageHeader } from '@complianceos/ui/ui/PageHeader';

export const LicenseManagement: React.FC = () => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const { data: licenseStatus, refetch } = trpc.licenses.getStatus.useQuery();
  const { data: machineInfo } = trpc.licenses.getMachineFingerprint.useQuery();

  const activateKeyMutation = trpc.licenses.activateKey.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'License activated successfully!');
      setLicenseKeyInput('');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to activate license');
    }
  });

  const activateOfflineMutation = trpc.licenses.activateOfflineFile.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'Air-gapped license activated successfully!');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to verify license file');
    }
  });

  const deactivateMutation = trpc.licenses.deactivate.useMutation({
    onSuccess: (data) => {
      toast.info(data.message || 'Reverted to Community Edition');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deactivate license');
    }
  });

  const handleActivateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      toast.error('Please enter a license key');
      return;
    }
    activateKeyMutation.mutate({ licenseKey: licenseKeyInput.trim() });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      activateOfflineMutation.mutate({ fileContent: text });
    };
    reader.readAsText(file);
  };

  const handleCopyFingerprint = () => {
    if (!machineInfo?.fingerprint) return;
    navigator.clipboard.writeText(machineInfo.fingerprint)
      .then(() => toast.success('Machine fingerprint copied to clipboard'))
      .catch(() => toast.error('Failed to copy fingerprint'));
  };

  const isEnterprise = licenseStatus?.isEnterprise || licenseStatus?.tier === 'enterprise';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="License & Subscriptions"
          subtitle="Manage edition tiers, activations, machine binding, and capability entitlements"
          actions={
            <div className="flex items-center gap-2">
              <UpgradeModal
                open={isUpgradeModalOpen}
                onOpenChange={setIsUpgradeModalOpen}
                trigger={
                  <Button className="gap-2 font-semibold shadow-sm">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    {isEnterprise ? 'Manage Enterprise Plan' : 'Upgrade to Enterprise'}
                  </Button>
                }
              />
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Edition Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Current Edition</CardTitle>
                <Badge 
                  variant={isEnterprise ? 'default' : 'outline'}
                  className={isEnterprise ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}
                >
                  {licenseStatus?.tier?.toUpperCase() || 'COMMUNITY'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {isEnterprise ? 'Commercial license active with full capability suite' : 'Open-Source standalone community core'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/50 text-xs">
                <span className="text-muted-foreground">License Key:</span>
                <span className="font-mono font-medium truncate max-w-[160px]">{licenseStatus?.licenseKey || 'COMMUNITY-CORE-FREE'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50 text-xs">
                <span className="text-muted-foreground">Max Workspaces:</span>
                <span className="font-semibold">{licenseStatus?.maxClients ? (licenseStatus.maxClients > 100 ? 'Unlimited (MSP)' : licenseStatus.maxClients) : 2}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50 text-xs">
                <span className="text-muted-foreground">Expires:</span>
                <span>{licenseStatus?.expiresAt ? new Date(licenseStatus.expiresAt).toLocaleDateString() : 'Never (Perpetual Core)'}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              {isEnterprise ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deactivateMutation.mutate({})}
                  disabled={deactivateMutation.isPending}
                >
                  Revert to Community Edition
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs gap-1.5"
                  onClick={() => setIsUpgradeModalOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> View Enterprise Features
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Machine Fingerprint & Air-Gapped Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Hardware Fingerprint</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription className="text-xs">
                Deterministic hash for air-gapped sovereign license issuance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-2.5 rounded bg-muted/50 border border-border font-mono text-[11px] break-all select-all text-muted-foreground">
                {machineInfo?.fingerprint || 'Computing machine fingerprint...'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Host: <span className="font-mono text-foreground">{machineInfo?.hostname}</span> ({machineInfo?.platform})
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={handleCopyFingerprint}>
                <Copy className="h-3.5 w-3.5" /> Copy Fingerprint
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Activation Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Instant Activation</CardTitle>
                <Key className="h-4 w-4 text-primary" />
              </div>
              <CardDescription className="text-xs">
                Enter an enterprise key or upload sovereign .lic file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleActivateKey} className="space-y-2">
                <Input
                  placeholder="COMP-ENT-XXXX-XXXX"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  className="font-mono text-xs uppercase"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="w-full text-xs font-semibold gap-1.5"
                  disabled={activateKeyMutation.isPending}
                >
                  {activateKeyMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Activate Key
                </Button>
              </form>
            </CardContent>
            <CardFooter className="pt-0 border-t border-border/50 flex justify-between items-center pt-3">
              <span className="text-[11px] text-muted-foreground">Air-gapped file:</span>
              <label className="inline-flex">
                <input type="file" accept=".lic,.json" onChange={handleFileUpload} className="hidden" />
                <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 text-primary cursor-pointer" asChild>
                  <span><Upload className="h-3.5 w-3.5" /> Upload .lic</span>
                </Button>
              </label>
            </CardFooter>
          </Card>
        </div>

        {/* Feature Comparison Matrix */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold">Capabilities & Tier Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Review features unlocked under your current plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> Core Compliance
                </div>
                <p className="text-muted-foreground">ISO 27001, SOC 2, HIPAA, GDPR, standard risk heatmap and continuous evidence repository.</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {isEnterprise ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  Federal & Defense Standards
                </div>
                <p className="text-muted-foreground">FedRAMP Moderate/High, CMMC Level 2/3, and full NIST SP 800-53 catalog.</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {isEnterprise ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  Hermes Autonomous Agent & Threat Intel
                </div>
                <p className="text-muted-foreground">MITRE ATT&CK adversary intelligence feeds, automated evidence sweeps, and AI gap analyses.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LicenseManagement;
