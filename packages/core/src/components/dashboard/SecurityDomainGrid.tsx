/**
 * Security Domain Grid Widget
 * 
 * Displays 8 key security domains with status indicators
 * Simplified version without external queries
 */

import React from "react";
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
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation } from "wouter";

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

// Sample data - in production this would come from TRPC queries
const SAMPLE_DOMAIN_DATA: Record<string, { status: string; metrics: { label: string; value: string | number }[] }> = {
  risk: { status: "warning", metrics: [{ label: "Critical", value: 3 }, { label: "Total", value: 12 }] },
  incident: { status: "good", metrics: [{ label: "Open", value: 0 }, { label: "This Month", value: 2 }] },
  bcp: { status: "neutral", metrics: [{ label: "Plans", value: 2 }, { label: "Tests Due", value: 1 }] },
  supply_chain: { status: "warning", metrics: [{ label: "Vendors", value: 24 }, { label: "Overdue", value: 5 }] },
  asset: { status: "good", metrics: [{ label: "Assets", value: 156 }, { label: "Coverage", value: "98%" }] },
  training: { status: "good", metrics: [{ label: "Completion", value: "85%" }, { label: "Overdue", value: 3 }] },
  access: { status: "neutral", metrics: [{ label: "MFA", value: "92%" }, { label: "Review Due", value: 1 }] },
  policy: { status: "good", metrics: [{ label: "Approved", value: 12 }, { label: "Draft", value: 3 }] },
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

export function SecurityDomainGrid() {
  const { selectedClientId } = useClientContext();
  const [, setLocation] = useLocation();

  // Use selectedClientId directly - component only renders when effectiveClientId exists in Dashboard
  const clientId = selectedClientId;

  const handleDomainClick = (domainId: string, route: string) => {
    // Only navigate if we have a valid clientId
    if (!clientId) return;
    setLocation(`/clients/${clientId}${route}`);
  };

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
          const data = SAMPLE_DOMAIN_DATA[domain.id] || { status: "neutral", metrics: [{ label: "Status", value: "N/A" }] };
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
