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
import { PLAN_PRICING, FOUNDING_DISCOUNT_PERCENT, SALES_MAILTO, type CheckoutPlan } from '@/lib/billingPlans';

interface BillingTabProps {
  clientId: number;
  clientName?: string;
}

export function BillingTab({ clientId, clientName }: BillingTabProps) {
  const [, setLocation] = useLocation();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const { data: client, isLoading, refetch } = trpc.clients.get.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );

  const { billingEnabled } = useBilling();
  const createCheckout = trpc.billing.createCheckout.useMutation();
  const createPortal = trpc.billing.createPortal.useMutation();
  const { data: checkoutOptions } = trpc.licenses.getCheckoutOptions.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const founding = checkoutOptions?.foundingOfferActive ?? true;

  const currentTier = client?.planTier || 'core';
  const isEnterprise = currentTier === 'enterprise';
  const isPro = currentTier === 'consultant' || currentTier === 'pro';
  const isCore = !isEnterprise && !isPro;

  const handleCheckout = async (tier: CheckoutPlan) => {
    setIsProcessingCheckout(true);
    try {
      const { url } = await createCheckout.mutateAsync({
        clientId,
        tier,
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
                      ? "ComplianceOS Enterprise"
                      : isPro
                      ? "ComplianceOS Professional"
                      : "ComplianceOS Community"}
                  </span>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  {isEnterprise
                    ? "Custom deployment with air-gapped options, a named support contact and executive board reporting."
                    : isPro
                    ? "The complete GRC platform with unlimited workspaces and users, all frameworks, updates and priority support."
                    : "Free, open-source core GRC modules with standard framework controls and one workspace."}
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
                {isEnterprise || isPro ? "Unlimited Workspaces" : "1 Workspace"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Compliance Frameworks</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {isEnterprise || isPro ? "All Frameworks" : "Standard Controls"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Autonomous AI Copilot</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Enabled
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Support</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {isEnterprise ? "Named Contact" : isPro ? "Priority" : "Community"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection Matrix */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Available Plans & Capabilities
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scale compliance capabilities as your audit requirements and customer RFPs increase.
          </p>
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
                  Free
                </Badge>
                {isCore && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">{PLAN_PRICING.community.name}</CardTitle>
              <p className="mt-1">
                <span className="text-2xl font-black text-foreground">{PLAN_PRICING.community.label}</span>
                <span className="text-xs text-muted-foreground"> {PLAN_PRICING.community.cadence}</span>
              </p>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Open-source core for solo security researchers and developers (AGPLv3).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3 flex-1">
              <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">Includes:</p>
              <PlanFeature text="Core GRC modules (Risks & Policies)" />
              <PlanFeature text="Standard framework controls" />
              <PlanFeature text="Single-command Docker deploy" />
              <PlanFeature text="Bring-your-own AI API keys" />
              <PlanFeature text="1 workspace" />
              <PlanFeature text="Community GitHub support" />
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
                  Yearly
                </Badge>
                {isPro && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">{PLAN_PRICING.professional.name}</CardTitle>
              <p className="mt-1">
                {founding && (
                  <span className="text-sm text-muted-foreground line-through mr-1.5">{PLAN_PRICING.professional.label}</span>
                )}
                <span className="text-2xl font-black text-foreground">
                  {founding ? PLAN_PRICING.professional.foundingLabel : PLAN_PRICING.professional.label}
                </span>
                <span className="text-xs text-muted-foreground"> {PLAN_PRICING.professional.cadence}</span>
              </p>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {founding
                  ? `${FOUNDING_DISCOUNT_PERCENT}% founding rate, locked while your subscription stays active. `
                  : ''}
                Complete GRC platform, same price for everyone.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3 flex-1">
              <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">
                Everything in Community, plus:
              </p>
              <PlanFeature text="Unlimited workspaces & users" highlight />
              <PlanFeature text="All frameworks: SOC 2, ISO 27001, HIPAA, GDPR, NIST" highlight />
              <PlanFeature text="AI policy generator & security questionnaire responder" highlight />
              <PlanFeature text="Vendor risk management & security reviews" />
              <PlanFeature text="White-label reports & evidence export binders" />
              <PlanFeature text="Priority support & update channel" />
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
                <div className="w-full space-y-2">
                  <Button
                    onClick={() => handleCheckout('professional')}
                    disabled={isProcessingCheckout}
                    className="w-full text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-2"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {isProcessingCheckout ? "Connecting to Stripe..." : "Upgrade to Professional"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleCheckout('lifetime')}
                    disabled={isProcessingCheckout}
                    className="w-full text-xs font-medium rounded-xl"
                  >
                    Or pay once: Lifetime {founding ? PLAN_PRICING.lifetime.foundingLabel : PLAN_PRICING.lifetime.label}
                    {founding ? ` (was ${PLAN_PRICING.lifetime.label})` : ''}
                  </Button>
                </div>
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
                  Custom
                </Badge>
                {isEnterprise && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">{PLAN_PRICING.enterprise.name}</CardTitle>
              <p className="mt-1">
                <span className="text-2xl font-black text-foreground">{PLAN_PRICING.enterprise.label}</span>
                <span className="text-xs text-muted-foreground"> {PLAN_PRICING.enterprise.cadence}</span>
              </p>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                For large organizations: tailored deployment, priced per year.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-3 flex-1">
              <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider mb-2">
                Enterprise Capabilities:
              </p>
              <PlanFeature text="Everything in Professional" highlight />
              <PlanFeature text="Air-gapped deployments" highlight />
              <PlanFeature text="Named support contact" highlight />
              <PlanFeature text="Executive board reporting dashboards" />
            </CardContent>

            <CardFooter className="p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = SALES_MAILTO;
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
