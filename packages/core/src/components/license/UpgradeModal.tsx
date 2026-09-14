import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@complianceos/ui/ui/dialog';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Badge } from '@complianceos/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@complianceos/ui/ui/tabs';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  Lock,
  Upload,
  CreditCard,
  Key,
  ExternalLink,
  Building2,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface UpgradeModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  featureName?: string;
  defaultTier?: 'pro' | 'enterprise';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  featureName = 'Enterprise Feature',
  defaultTier = 'enterprise',
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const [selectedTier, setSelectedTier] = useState<'pro' | 'enterprise'>(defaultTier);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [offlineFileContent, setOfflineFileContent] = useState('');
  const [activeTab, setActiveTab] = useState<'checkout' | 'key' | 'offline'>('checkout');

  const { data: licenseStatus, refetch: refetchLicense } = trpc.licenses.getStatus.useQuery();
  const { data: machineInfo } = trpc.licenses.getMachineFingerprint.useQuery();

  const checkoutMutation = trpc.licenses.createCheckoutSession.useMutation();
  const activateKeyMutation = trpc.licenses.activateKey.useMutation();
  const activateOfflineMutation = trpc.licenses.activateOfflineFile.useMutation();

  const handleStartCheckout = async () => {
    try {
      const res = await checkoutMutation.mutateAsync({
        tier: selectedTier,
        interval: billingInterval,
      });
      if (res.url) {
        window.open(res.url, '_blank');
        toast.info('Checkout opened in a new tab. Enter your license key once completed!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize checkout');
    }
  };

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      toast.error('Please enter your license key');
      return;
    }

    try {
      const res = await activateKeyMutation.mutateAsync({
        licenseKey: licenseKeyInput.trim(),
      });
      toast.success(res.message || 'License activated successfully!');
      setOpen(false);
      refetchLicense();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate license');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setOfflineFileContent(text);
      try {
        const res = await activateOfflineMutation.mutateAsync({
          fileContent: text,
        });
        toast.success(res.message || 'Air-gapped license activated successfully!');
        setOpen(false);
        refetchLicense();
      } catch (err: any) {
        toast.error(err.message || 'Failed to verify license file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl p-0 overflow-hidden border border-border bg-background">
        {/* Header Hero */}
        <div className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Upgrade ComplianceOS
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  Unlock advanced automation, federal frameworks & unlimited workspaces
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs px-2.5 py-1 uppercase tracking-wider font-semibold border-primary/30 text-primary">
              {featureName}
            </Badge>
          </div>
        </div>

        {/* Tabs Body */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-6">
              <TabsTrigger value="checkout" className="gap-2 font-medium">
                <CreditCard className="h-4 w-4" /> Self-Serve Stripe
              </TabsTrigger>
              <TabsTrigger value="key" className="gap-2 font-medium">
                <Key className="h-4 w-4" /> License Key
              </TabsTrigger>
              <TabsTrigger value="offline" className="gap-2 font-medium">
                <Upload className="h-4 w-4" /> Air-Gapped (.lic)
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Self-Serve Stripe Checkout */}
            <TabsContent value="checkout" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Professional Tier */}
                <div
                  onClick={() => setSelectedTier('pro')}
                  className={`cursor-pointer rounded-xl border p-5 transition-all relative flex flex-col justify-between ${
                    selectedTier === 'pro'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-base">Professional</h4>
                      <Badge variant="secondary" className="text-xs">Growing Teams</Badge>
                    </div>
                    <div className="text-2xl font-bold mb-4">
                      $299 <span className="text-xs font-normal text-muted-foreground">/ month</span>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Up to 5 Workspaces
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> SOC 2 & ISO 27001 Auto-Evidence
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Automated Gap Analysis
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Enterprise / MSP Tier */}
                <div
                  onClick={() => setSelectedTier('enterprise')}
                  className={`cursor-pointer rounded-xl border p-5 transition-all relative flex flex-col justify-between ${
                    selectedTier === 'enterprise'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="absolute -top-2.5 right-4">
                    <span className="bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                      Recommended
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-base">Enterprise MSP</h4>
                      <Badge variant="secondary" className="text-xs">Full Sovereignty</Badge>
                    </div>
                    <div className="text-2xl font-bold mb-4">
                      $799 <span className="text-xs font-normal text-muted-foreground">/ month</span>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Unlimited Workspaces (MSP)
                      </li>
                      <li className="flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> FedRAMP, CMMC & NIST 800-53
                      </li>
                      <li className="flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Threat Intel & MITRE Workbench
                      </li>
                      <li className="flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Hermes Autonomous AI Agent
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Instant digital delivery • Cancel anytime</span>
                </div>
                <Button
                  onClick={handleStartCheckout}
                  disabled={checkoutMutation.isPending}
                  className="gap-2 font-semibold"
                >
                  {checkoutMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Proceed to Stripe Checkout
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Manual Key Activation */}
            <TabsContent value="key" className="space-y-4">
              <form onSubmit={handleActivateKey} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Enterprise License Key
                  </label>
                  <Input
                    placeholder="COMP-ENT-XXXX-XXXX-XXXX"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    className="font-mono text-sm uppercase tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Keys are emailed upon purchase or provided via your enterprise contract / PO.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-primary" /> Machine Binding Identifier
                  </div>
                  <div className="font-mono text-muted-foreground select-all break-all">
                    {machineInfo?.fingerprint || 'Computing fingerprint...'}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="submit"
                    disabled={activateKeyMutation.isPending}
                    className="gap-2 font-semibold"
                  >
                    {activateKeyMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Activate License
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Tab 3: Air-Gapped .lic File Upload */}
            <TabsContent value="offline" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h4 className="font-semibold text-sm mb-1">Upload Sovereign .lic File</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                  For isolated or air-gapped environments. Upload your cryptographically signed Ed25519 lease file.
                </p>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept=".lic,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                    <span>Browse .lic File</span>
                  </Button>
                </label>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1.5">
                <div className="font-semibold text-foreground">Air-Gapped Instructions</div>
                <p className="text-muted-foreground">
                  Send your system machine fingerprint to <span className="font-mono text-primary">license@complianceos.com</span> to receive a sovereign offline lease file.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
