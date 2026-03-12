/**
 * Security Domain Grid Widget
 * 
 * Displays 8 key security domains with status indicators
 * Queries real client-specific data from TRPC
 */

import React, { useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  Activity,
  Building2,
  Network,
  Database,
  GraduationCap,
  Lock,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const SECURITY_DOMAINS = [
  { id: "risk", title: "Risk Management", icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200", route: "/risks" },
  { id: "incident", title: "Incident Response", icon: Shield, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200", route: "/cyber/incidents" },
  { id: "bcp", title: "Business Continuity", icon: Building2, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200", route: "/business-continuity" },
  { id: "supply_chain", title: "Supply Chain", icon: Network, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200", route: "/vendors" },
  { id: "asset", title: "Asset Management", icon: Database, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200", route: "/cyber/assets" },
  { id: "training", title: "Training", icon: GraduationCap, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", route: "/training" },
  { id: "access", title: "Access Control", icon: Lock, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200", route: "/controls" },
  { id: "policy", title: "Security Policies", icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", route: "/policies" },
];

// Default sample data (used as fallback)
const DEFAULT_DOMAIN_DATA: Record<string, { status: string; metrics: { label: string; value: string | number }[] }> = {
  risk: { status: "neutral", metrics: [{ label: "Critical", value: "—" }, { label: "Total", value: "—" }] },
  incident: { status: "neutral", metrics: [{ label: "Open", value: "—" }, { label: "This Month", value: "—" }] },
  bcp: { status: "neutral", metrics: [{ label: "Plans", value: "—" }, { label: "Tests Due", value: "—" }] },
  supply_chain: { status: "neutral", metrics: [{ label: "Vendors", value: "—" }, { label: "Overdue", value: "—" }] },
  asset: { status: "neutral", metrics: [{ label: "Assets", value: "—" }, { label: "Coverage", value: "—" }] },
  training: { status: "neutral", metrics: [{ label: "Modules", value: "—" }, { label: "Status", value: "—" }] },
  access: { status: "neutral", metrics: [{ label: "Controls", value: "—" }, { label: "Status", value: "—" }] },
  policy: { status: "neutral", metrics: [{ label: "Approved", value: "—" }, { label: "Draft", value: "—" }] },
};

interface SecurityDomainCardProps {
  domain: typeof SECURITY_DOMAINS[0];
  status: string;
  metrics: { label: string; value: string | number }[];
  onClick?: () => void;
}

function SecurityDomainCard({ domain, status, metrics, onClick }: SecurityDomainCardProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "critical": return { indicator: "bg-red-500", badge: "bg-red-100 text-red-700", badgeText: "CRITICAL" };
      case "warning": return { indicator: "bg-amber-500", badge: "bg-amber-100 text-amber-700", badgeText: "ATTENTION" };
      case "good": return { indicator: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", badgeText: "HEALTHY" };
      default: return { indicator: "bg-slate-400", badge: "bg-slate-100 text-slate-600", badgeText: "NEUTRAL" };
    }
  };

  const styles = getStatusStyles();
  const Icon = domain.icon;

  return (
    <Card className={`cursor-pointer hover:shadow-md transition-all duration-200 border-2 ${domain.borderColor}`} onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${domain.bgColor}`}>
            <Icon className={`h-4 w-4 ${domain.color}`} />
          </div>
          <Badge className={`${styles.badge} border-0 text-[10px] font-bold`}>{styles.badgeText}</Badge>
        </div>
        <CardTitle className="text-sm font-bold mt-2">{domain.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics.map((metric, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{metric.label}</span>
              <span className="text-sm font-bold text-slate-900">{metric.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SecurityDomainGridProps {
  clientId: number | undefined;
}

export function SecurityDomainGrid({ clientId }: SecurityDomainGridProps) {
  const [, setLocation] = useLocation();

  // Query real data for each security domain using verified TRPC methods
  // Training - verified: trpc.training.list
  const { data: trainingData, isLoading: trainingLoading } = trpc.training.list.useQuery(
    { clientId: clientId || 0, includeInactive: true },
    { enabled: !!clientId }
  );

  // Vendors - verified: trpc.vendors.list  
  const { data: vendorsData, isLoading: vendorsLoading } = trpc.vendors.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  // Compute domain data from real queries
  const domainData = useMemo(() => {
    if (!clientId) {
      return DEFAULT_DOMAIN_DATA;
    }

    // Training
    const trainingModules = trainingData?.length || 0;
    const trainingStatus = trainingModules > 0 ? "good" : "neutral";

    // Supply Chain - Vendors
    const totalVendors = vendorsData?.length || 0;
    const supplyChainStatus = totalVendors > 0 ? "good" : "neutral";

    return {
      risk: DEFAULT_DOMAIN_DATA.risk,
      incident: DEFAULT_DOMAIN_DATA.incident,
      bcp: DEFAULT_DOMAIN_DATA.bcp,
      supply_chain: { 
        status: supplyChainStatus, 
        metrics: [{ label: "Vendors", value: totalVendors }, { label: "Status", value: totalVendors > 0 ? "Active" : "None" }] 
      },
      asset: DEFAULT_DOMAIN_DATA.asset,
      training: { 
        status: trainingStatus, 
        metrics: [{ label: "Modules", value: trainingModules }, { label: "Status", value: trainingModules > 0 ? "Active" : "None" }] 
      },
      access: DEFAULT_DOMAIN_DATA.access,
      policy: DEFAULT_DOMAIN_DATA.policy,
    };
  }, [clientId, trainingData, vendorsData, trainingLoading, vendorsLoading]);

  const isLoading = trainingLoading || vendorsLoading;

  const handleDomainClick = (domainId: string, route: string) => {
    // Only navigate if we have a valid clientId
    if (!clientId) return;
    setLocation(`/clients/${clientId}${route}`);
  };

  // Loading state
  if (isLoading || !clientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Security Domains</h3>
            <p className="text-sm text-slate-500">Loading security data...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Security Domains</h3>
            <p className="text-sm text-slate-500">Key security areas requiring monitoring</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SECURITY_DOMAINS.map((domain) => {
          const data = domainData[domain.id] || DEFAULT_DOMAIN_DATA[domain.id];
          return (
            <SecurityDomainCard
              key={domain.id}
              domain={domain}
              status={data.status}
              metrics={data.metrics}
              onClick={() => handleDomainClick(domain.id, domain.route)}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span>Critical</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span>Warning</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span>Healthy</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /><span>Neutral</span></div>
      </div>
    </div>
  );
}

export default SecurityDomainGrid;
