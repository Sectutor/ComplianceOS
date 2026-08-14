/**
 * Framework library — static catalog manifest + presentational panel.
 * ===================================================================
 * Pure presentational section: lists the standards ComplianceOS ships with
 * (control counts + availability status chips). Explicitly does NOT depend on
 * any backend endpoint (UI-STANDARD.md §16) — this is a curated snapshot that
 * the backend `frameworkSeed` work can later supersede.
 *
 * Control counts are representative public figures (Annex A 2022, TSC 2022,
 * NIST CSF 2.0, PCI DSS v4.0, etc.).
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  Fingerprint,
  FileLock2,
  Landmark,
  Lock,
  Shield,
  ShieldCheck,
  ScrollText,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";

export type FrameworkAvailability = "available" | "beta" | "planned";

export interface FrameworkLibraryEntry {
  id: string;
  name: string;
  shortName: string;
  category: "Security" | "Privacy" | "Resilience" | "Financial";
  description: string;
  /** Representative control count (public figures, not a live query). */
  controlCount: number;
  controlCountNote: string;
  status: FrameworkAvailability;
  icon: LucideIcon;
}

/** Curated catalog — snapshot, no backend dependency. */
export const FRAMEWORK_LIBRARY: FrameworkLibraryEntry[] = [
  {
    id: "iso-27001",
    name: "ISO/IEC 27001",
    shortName: "ISO 27001",
    category: "Security",
    description: "ISMS standard — Annex A 2022 control set with 4 themes: organisational, people, physical, technological.",
    controlCount: 93,
    controlCountNote: "Annex A 2022",
    status: "available",
    icon: ShieldCheck,
  },
  {
    id: "soc-2",
    name: "SOC 2",
    shortName: "SOC 2",
    category: "Security",
    description: "AICPA Trust Services Criteria across five categories: security, availability, processing integrity, confidentiality, privacy.",
    controlCount: 66,
    controlCountNote: "TSC 2022 criteria",
    status: "available",
    icon: Shield,
  },
  {
    id: "nist-csf",
    name: "NIST CSF 2.0",
    shortName: "NIST CSF",
    category: "Security",
    description: "Cybersecurity framework organised into six functions: Govern, Identify, Protect, Detect, Respond, Recover.",
    controlCount: 106,
    controlCountNote: "6 functions · 22 categories",
    status: "available",
    icon: Gauge,
  },
  {
    id: "pci-dss",
    name: "PCI DSS",
    shortName: "PCI DSS",
    category: "Security",
    description: "Payment Card Industry Data Security Standard v4.0 — twelve requirements protecting cardholder data.",
    controlCount: 64,
    controlCountNote: "v4.0 requirements",
    status: "available",
    icon: Lock,
  },
  {
    id: "hipaa",
    name: "HIPAA",
    shortName: "HIPAA",
    category: "Security",
    description: "HIPAA Security Rule — administrative, physical and technical safeguards for electronic protected health information (ePHI).",
    controlCount: 164,
    controlCountNote: "Security Rule specs",
    status: "available",
    icon: Fingerprint,
  },
  {
    id: "gdpr",
    name: "GDPR",
    shortName: "GDPR",
    category: "Privacy",
    description: "EU General Data Protection Regulation — 11 chapters of obligations from lawful processing to data subject rights.",
    controlCount: 99,
    controlCountNote: "99 articles",
    status: "available",
    icon: FileLock2,
  },
  {
    id: "nis2",
    name: "NIS2",
    shortName: "NIS2",
    category: "Resilience",
    description: "EU Network and Information Security Directive — cybersecurity risk-management measures across 10 essential categories.",
    controlCount: 68,
    controlCountNote: "Annex I measures",
    status: "beta",
    icon: Building2,
  },
  {
    id: "sox",
    name: "SOX",
    shortName: "SOX",
    category: "Financial",
    description: "Sarbanes-Oxley — financial reporting controls focused on ITGCs supporting sections 302 and 404 attestation.",
    controlCount: 14,
    controlCountNote: "Key sections (302/404)",
    status: "planned",
    icon: Landmark,
  },
  {
    id: "dora",
    name: "DORA",
    shortName: "DORA",
    category: "Resilience",
    description: "EU Digital Operational Resilience Act — ICT risk management, incident reporting and third-party oversight for financial entities.",
    controlCount: 30,
    controlCountNote: "5 pillars",
    status: "planned",
    icon: ScrollText,
  },
];

const STATUS_META: Record<FrameworkAvailability, { variant: "success" | "info" | "outline"; label: string }> = {
  available: { variant: "success", label: "Available" },
  beta: { variant: "info", label: "Beta" },
  planned: { variant: "outline", label: "Planned" },
};

export function FrameworkStatusChip({ status }: { status: FrameworkAvailability }) {
  const meta = STATUS_META[status] ?? STATUS_META.planned;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const CATEGORY_ICONS: Record<FrameworkLibraryEntry["category"], LucideIcon> = {
  Security: Shield,
  Privacy: Fingerprint,
  Resilience: Building2,
  Financial: Landmark,
};

/**
 * "Framework library" — presentational catalog of shipped standards with
 * control counts and availability chips. No data fetching.
 */
export function FrameworkLibraryPanel({ title = "Framework library" }: { title?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>
          Standards ComplianceOS ships with. Control counts are representative public figures — the live
          catalog syncs as framework seeds land.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {FRAMEWORK_LIBRARY.map((fw) => {
            const CategoryIcon = CATEGORY_ICONS[fw.category] ?? BookOpen;
            const Icon = fw.icon;
            return (
              <li
                key={fw.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{fw.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CategoryIcon className="h-3 w-3" /> {fw.category}
                      </p>
                    </div>
                  </div>
                  <FrameworkStatusChip status={fw.status} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{fw.description}</p>
                <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                  <span className="font-bold tabular-nums text-foreground">{fw.controlCount}</span>
                  {fw.controlCountNote}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
