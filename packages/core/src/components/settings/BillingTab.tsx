import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
  CreditCard,
  Check,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  Receipt,
  KeyRound,
  Mail,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { trpc } from '@/lib/trpc';
import { useBilling } from '@/hooks/useBilling';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface BillingTabProps {
  clientId: number;
  clientName?: string;
}

export function BillingTab({ clientId, clientName }: BillingTabProps) {
  const [, setLocation] = useLocation();
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const { data: client, isLoading, refetch } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );

  const { billingEnabled } = useBilling();
  const createCheckout = trpc.billing.createCheckout.useMutation();
  const createPortal = trpc.billing.createPortal.useMutation();

  const currentTier = client?.planTier || 'core';
  const isEnterprise = currentTier === 'enterprise';
  const isPro = currentTier === 'consultant' || currentTier === 'pro';
  const isCore = !isEnterprise && !isPro;

  const handleCheckout = async (tier: 'consultant' | 'enterprise') => {
    setIsProcessingCheckout(true);
    try {
      const { url } = await createCheckout.mutateAsync({
        clientId,
        tier,
        interval: billingPeriod,
        successUrl: `${window.location.origin}/clients/${clientId}/settings?tab=billing&checkout=success`,
        cancelUrl: `${window.location.origin}/clients/${clientId}/settings?tab=billing&checkout=cancel`,
      });
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate checkout");
      setIsProcessingCheckout(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      const { url } = await createPortal.mutateAsync({
        clientId,
        returnUrl: `${window.location.origin}/clients/${clientId}/settings?tab=billing`,
      });
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted/50 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-80 bg-muted/40 animate-pulse rounded-2xl" />
          <div className="h-80 bg-muted/40 animate-pulse rounded-2xl" />
          <div className="h-80 bg-muted/40 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* Current Subscription & Entitlement Overview */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-24 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Active Subscription
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-medium">
                  Client ID #{clientId} ({client?.name || clientName || 'Organization'})
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                  <span>
                    {isEnterprise
                      ? "ComplianceOS Enterprise (Managed)"
                      : isPro
                      ? "ComplianceOS Growth (vCISO Guided)"
                      : "ComplianceOS Core (Self-Service)"}
                  </span>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  {isEnterprise
                    ? "Full-service compliance orchestration with dedicated advisory, custom controls, and audit defense."
                    : isPro
                    ? "AI-assisted autonomous compliance with weekly guided roadmap and multi-tenant scaling."
                    : "Foundational compliance platform with core frameworks, automated evidence collection, and gap assessment."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {client?.stripeCustomerId ? (
                <Button
                  onClick={handleOpenPortal}
                  disabled={createPortal.isPending}
                  className="bg-card hover:bg-muted text-foreground border border-border shadow-xs text-xs font-semibold h-9 px-4 rounded-xl gap-2"
                >
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  {createPortal.isPending ? "Opening Portal..." : "Billing & Invoices"}
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={() => setLocation(`/clients/${clientId}/license`)}
                className="border-border text-xs font-semibold h-9 px-4 rounded-xl gap-2"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                License Key Details
              </Button>
            </div>
          </div>

          {/* Allocation & Resource Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/60">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Organization Capacity</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {isEnterprise ? "Unlimited" : isPro ? "Up to 10 Workspaces" : "1 Organization"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Compliance Frameworks</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {isEnterprise ? "All 40+ Standards" : isPro ? "SOC 2, ISO, HIPAA, NIST" : "SOC 2 & Core"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Autonomous AI Copilot</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Enabled
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Audit Defense Guarantee</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {isEnterprise ? "100% Guaranteed" : "Included in Enterprise"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection Matrix */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Select or Upgrade Your Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scale compliance capabilities as your audit requirements and customer RFPs increase.
            </p>
          </div>

          {/* Monthly / Annual Billing Toggle */}
          <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border/70 shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => setBillingPeriod('month')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingPeriod === 'month'
                  ? 'bg-card text-foreground shadow-2xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod('year')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingPeriod === 'year'
                  ? 'bg-card text-foreground shadow-2xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-md">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* 1. Core / Self-Service Plan */}
          <Card
            className={`border rounded-2xl flex flex-col justify-between transition-all duration-200 bg-card/60 backdrop-blur-md ${
              isCore ? 'border-primary/60 shadow-sm ring-1 ring-primary/20' : 'border-border/70 hover:border-border'
            }`}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-muted text-foreground">
                  Startup & Core
                </Badge>
                {isCore && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">Self-Service</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Foundational automated compliance for startups preparing for their first audit.
              </CardDescription>

              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    ${billingPeriod === 'month' ? '29' : '19'}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    / month {billingPeriod === 'year' ? '(billed annually)' : ''}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3 flex-1">
              <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">Includes:</p>
              <PlanFeature text="1 Dedicated Organization Workspace" />
              <PlanFeature text="SOC 2 Type I & II and ISO 27001 readiness" />
              <PlanFeature text="Continuous Automated Evidence Collection" />
              <PlanFeature text="Pre-built Security & Privacy Policy Library" />
              <PlanFeature text="Vendor Risk & Asset Inventory Registers" />
              <PlanFeature text="Community & Documentation Support" />
            </CardContent>

            <CardFooter className="p-6 pt-0">
              {isCore ? (
                <Button variant="outline" disabled className="w-full text-xs font-semibold rounded-xl border-border">
                  Active Plan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/clients/${clientId}/settings?tab=general`)}
                  className="w-full text-xs font-semibold rounded-xl border-border"
                >
                  Current Tier Included
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* 2. Pro / Guided Plan (Featured) */}
          <Card
            className={`border rounded-2xl flex flex-col justify-between transition-all duration-200 bg-card/80 backdrop-blur-md relative overflow-hidden ${
              isPro
                ? 'border-primary shadow-md ring-2 ring-primary/20'
                : 'border-primary/50 hover:border-primary shadow-sm'
            }`}
          >
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Most Popular
            </div>

            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2 py-0.5">
                  vCISO Guided
                </Badge>
                {isPro && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">ComplianceOS Growth</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Guided compliance with AI Copilot automation and weekly security advisory roadmap.
              </CardDescription>

              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    ${billingPeriod === 'month' ? '69' : '49'}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    / month {billingPeriod === 'year' ? '(billed annually)' : ''}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3 flex-1">
              <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">
                Everything in Core, plus:
              </p>
              <PlanFeature text="Up to 10 Client Organization Workspaces" highlight />
              <PlanFeature text="Autonomous AI Questionnaire Auto-Completer (SIG, CAIQ)" highlight />
              <PlanFeature text="Weekly Advisor-Led Compliance Action Plan" highlight />
              <PlanFeature text="Multi-Framework Harmonization & Crosswalk Mapping" />
              <PlanFeature text="Real-time Compliance Drift & Incident Alerts" />
              <PlanFeature text="Priority 24/7 Support with 1-hour SLA" />
            </CardContent>

            <CardFooter className="p-6 pt-0">
              {isPro ? (
                <Button
                  onClick={client?.stripeCustomerId ? handleOpenPortal : () => toast.info("Managed in Stripe Portal")}
                  className="w-full text-xs font-semibold rounded-xl bg-primary text-primary-foreground"
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => handleCheckout('consultant')}
                  disabled={isProcessingCheckout}
                  className="w-full text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-2"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {isProcessingCheckout ? "Connecting to Stripe..." : "Upgrade to Growth"}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* 3. Enterprise / Managed Plan */}
          <Card
            className={`border rounded-2xl flex flex-col justify-between transition-all duration-200 bg-card/60 backdrop-blur-md ${
              isEnterprise
                ? 'border-primary/60 shadow-sm ring-1 ring-primary/20'
                : 'border-border/70 hover:border-border'
            }`}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                  Full Service
                </Badge>
                {isEnterprise && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">Fully Managed Enterprise</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Full white-glove compliance outsourcing, dedicated compliance officer, and audit liaison.
              </CardDescription>

              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-foreground">Custom</span>
                  <span className="text-xs font-medium text-muted-foreground">/ annual agreement</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3 flex-1">
              <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">
                Enterprise Capabilities:
              </p>
              <PlanFeature text="Unlimited Organizations & Custom Frameworks" highlight />
              <PlanFeature text="Dedicated Fractional CISO & Compliance Manager" highlight />
              <PlanFeature text="Direct Auditor Representation during Type II Audits" highlight />
              <PlanFeature text="On-Premise / Air-Gapped Deployment License" />
              <PlanFeature text="Custom SLA & Executive Board Reporting Studio" />
              <PlanFeature text="Audit Defense & Guarantee Package" />
            </CardContent>

            <CardFooter className="p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = "mailto:enterprise@complianceos.com?subject=ComplianceOS%20Enterprise%20Inquiry";
                }}
                className="w-full text-xs font-semibold rounded-xl border-border gap-2"
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                Contact Enterprise Sales
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Enterprise Licensing & Procurement Assistance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Card className="border border-border/70 bg-card/50 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground text-sm">Air-Gapped & Self-Hosted License Key</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Operating in a private cloud or sovereign data center without external internet egress? Enter or refresh your cryptographic offline license key.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/clients/${clientId}/license`)}
                  className="text-xs font-semibold rounded-xl border-border gap-2"
                >
                  Manage Offline License <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-border/70 bg-card/50 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground text-sm">Enterprise Procurement & Invoicing</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need vendor onboarding forms, W-9, VAT exemption, or payment via Net-30 invoice, ACH, or Wire Transfer? Our finance team responds within 24 hours.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = "mailto:billing@complianceos.com?subject=Invoice%20%26%20Procurement%20Request";
                  }}
                  className="text-xs font-semibold rounded-xl border-border gap-2"
                >
                  Request Invoice / W-9 <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlanFeature({ text, highlight = false }: { text: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        highlight ? 'bg-primary/20 text-primary' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      }`}>
        <Check className="h-2.5 w-2.5" />
      </div>
      <span className={highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
        {text}
      </span>
    </div>
  );
}
