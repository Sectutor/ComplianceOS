/**
 * NIS2 Policy Center - panels
 * ===========================
 * Renders the `policyTemplatesNis2.*` contract (see
 * `packages/core/src/pages/policyTemplatesNis2Api.ts`) as a policy-center
 * section for NIS2 Implementation Plan Phase 6 Task 6.1:
 *
 *   1. Template library         <- policyTemplatesNis2.templates
 *   2. ISO gap analysis         <- policyTemplatesNis2.gapAnalysis
 *   3. Approval workflow        <- policyTemplatesNis2.approvalWorkflow
 *   4. Version history          <- policyTemplatesNis2.versionHistory
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the policyTemplatesNis2.<proc> API") on error or missing endpoint,
 * token-only colors (2) - no raw slate/hex surfaces, dark-mode safe. Demo
 * mode (17) renders a persistent amber banner whenever sample data is shown
 * and is OFF by default (toggled by the user or via the EmptyState CTA);
 * live endpoint data always wins over demo data.
 */

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Switch } from "@complianceos/ui/ui/switch";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { StatCard } from "@complianceos/ui/ui/StatCard";
import { Input } from "@complianceos/ui/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  History,
  GitPullRequest,
  Library,
  Search,
  ShieldCheck,
  Target,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import {
  APPROVAL_STATUS_META,
  APPROVAL_VERDICT_META,
  ARTICLE21_CATEGORY_META,
  ARTICLE21_CATEGORY_ORDER,
  buildDemoNis2Approval,
  buildDemoNis2ApprovalInput,
  buildDemoNis2GapAnalysis,
  buildDemoNis2GapAnalysisInput,
  buildDemoNis2Templates,
  buildDemoNis2TemplatesInput,
  buildDemoNis2VersionHistory,
  buildDemoNis2VersionHistoryInput,
  formatDaysInReview,
  formatPolicyDate,
  GAP_STATUS_META,
  getApprovalStatusClass,
  getGapStatusClass,
  getVersionStatusClass,
  nis2CoverageBarClass,
  useNis2PolicyApproval,
  useNis2PolicyGapAnalysis,
  useNis2PolicyTemplates,
  useNis2PolicyVersionHistory,
  VERSION_STATUS_META,
  type Nis2ApprovalResponse,
  type Nis2Article21Category,
  type Nis2BadgeVariant,
  type Nis2GapAnalysisResponse,
  type Nis2TemplatesInput,
  type Nis2TemplatesResponse,
  type Nis2VersionResponse,
} from "@/pages/policyTemplatesNis2Api";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/**
 * Degradation helper (UI-STANDARD 13/16): skeleton -> EmptyState -> children.
 * `isLoading` is always checked before "empty" so nothing flashes.
 */
function Degrade({
  isLoading,
  hasData,
  isError,
  procedure,
  icon,
  emptyHint,
  onEnableDemo,
  skeleton,
  children,
}: {
  isLoading: boolean;
  hasData: boolean;
  isError: boolean;
  procedure: string;
  icon: LucideIcon;
  emptyHint: string;
  onEnableDemo?: () => void;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading && !hasData) {
    return <div className="space-y-3">{skeleton}</div>;
  }
  if (isError || !hasData) {
    return (
      <EmptyState
        icon={icon}
        title={`Connect the ${procedure} API`}
        description={
          isError
            ? `The ${procedure} endpoint is not live yet. It appears once the policyTemplatesNis2 router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

/** Score bar (UI-STANDARD 18) - token colors via .progress-* classes. */
function ScoreBar({
  value,
  barClass,
}: {
  value: number;
  barClass: "progress-success" | "progress-warning" | "progress-error";
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", barClass)}>
      <div
        data-slot="progress-indicator"
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Small stat chip (token-based, dark-mode safe). */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
      {children}
    </span>
  );
}

/** Reviewer decision -> badge label/variant. */
const REVIEWER_STATUS_META: Record<
  "approved" | "rejected" | "changes_requested" | "pending",
  { label: string; badgeVariant: Nis2BadgeVariant }
> = {
  approved: { label: "Approved", badgeVariant: "success" },
  rejected: { label: "Rejected", badgeVariant: "error" },
  changes_requested: { label: "Changes requested", badgeVariant: "warning" },
  pending: { label: "Pending", badgeVariant: "secondary" },
};

/* ------------------------------------------------------------------ */
/* Template library panel                                              */
/* ------------------------------------------------------------------ */

function TemplateLibraryPanel({
  templates,
  demoMode,
  onEnableDemo,
}: {
  templates: Nis2TemplatesResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filterInput = useMemo<Nis2TemplatesInput>(
    () => ({
      category: category === "all" ? null : (category as Nis2Article21Category),
      search: search.trim() ? search.trim() : null,
    }),
    [search, category]
  );

  const query = useNis2PolicyTemplates(demoMode ? buildDemoNis2TemplatesInput() : filterInput);
  const data: Nis2TemplatesResponse | undefined = demoMode
    ? (query.data ?? buildDemoNis2Templates(filterInput))
    : (templates ?? query.data);

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Library className="h-5 w-5 text-muted-foreground" />
          Template library
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          NIS2 Art. 21 policy templates mapped to ENISA measures (1.1-12.1) and ISO 27001 controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="policyTemplatesNis2.templates"
          icon={Library}
          emptyHint="The template library appears once the policyTemplatesNis2 router is deployed. Enable demo mode to preview the library."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-5 w-12 rounded-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          }
        >
          {data ? (
            <div className="space-y-4">
              {/* Search + Art. 21 category filter */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search templates..."
                    className="h-10 pl-8"
                    aria-label="Search policy templates"
                  />
                </div>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Filter by Article 21 category"
                >
                  <option value="all">All categories</option>
                  {ARTICLE21_CATEGORY_ORDER.map((letter) => (
                    <option key={letter} value={letter}>
                      {ARTICLE21_CATEGORY_META[letter].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template cards */}
              {data.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 px-6 py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    No templates match the current filters
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search term or Article 21 category.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.items.map((template) => (
                    <li
                      key={template.id}
                      className="flex flex-col rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-snug text-foreground">
                            {template.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {template.article21Title}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 tabular-nums">
                          ENISA {template.enisaMeasureId}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {template.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="uppercase tracking-wider"
                          title={ARTICLE21_CATEGORY_META[template.article21Category].title}
                        >
                          Art. 21 {template.article21Category}
                        </Badge>
                        {template.isoControls.map((control) => (
                          <Badge key={control} variant="outline" className="tabular-nums">
                            {control}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Every {template.reviewCadenceDays} days
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          {template.ownerRole}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {template.requiredSections.length} sections
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Applies to: {template.applicability.join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-muted-foreground tabular-nums">
                {data.items.length} of {data.total} templates shown
              </p>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* ISO gap analysis panel                                              */
/* ------------------------------------------------------------------ */

function IsoGapAnalysisPanel({
  gapAnalysis,
  demoMode,
  onEnableDemo,
}: {
  gapAnalysis: Nis2GapAnalysisResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const query = useNis2PolicyGapAnalysis(demoMode ? buildDemoNis2GapAnalysisInput() : {});
  const data: Nis2GapAnalysisResponse | undefined = demoMode
    ? (query.data ?? buildDemoNis2GapAnalysis())
    : (gapAnalysis ?? query.data);

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Target className="h-5 w-5 text-muted-foreground" />
          ISO gap analysis
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          NIS2 Art. 21 template coverage vs implemented ISO 27001 controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="policyTemplatesNis2.gapAnalysis"
          icon={Target}
          emptyHint="The gap analysis appears once the policyTemplatesNis2 router is deployed. Enable demo mode to preview the coverage view."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </>
          }
        >
          {data ? (
            <div className="space-y-5">
              {/* Coverage bar + counts */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Template coverage</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {data.coverageRate.toFixed(1)}%
                  </span>
                </div>
                <ScoreBar value={data.coverageRate} barClass={nis2CoverageBarClass(data.coverageRate)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label="Covered"
                  value={<span className="tabular-nums">{data.coveredCount}</span>}
                  icon={CheckCircle2}
                  tone={data.coveredCount > 0 ? "green" : "amber"}
                >
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    of {data.totalTemplates} templates
                  </p>
                </StatCard>
                <StatCard
                  label="Gaps"
                  value={<span className="tabular-nums">{data.gapCount}</span>}
                  icon={AlertTriangle}
                  tone={data.gapCount > 0 ? "red" : "green"}
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">Uncovered templates</p>
                </StatCard>
                <StatCard
                  label="Policies"
                  value={<span className="tabular-nums">{data.totalImplementedPolicies}</span>}
                  icon={FileText}
                  tone="blue"
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">Implemented policies</p>
                </StatCard>
              </div>

              {/* Gap list */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gaps
                </h3>
                {data.gaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 px-6 py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-[var(--success-foreground)]" />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      No coverage gaps detected
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      All template ISO controls are implemented by at least one policy.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {data.gaps.map((gap) => (
                      <li
                        key={gap.templateId}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{gap.title}</span>
                          <Badge variant="outline" className="tabular-nums">
                            ENISA {gap.enisaMeasureId}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {gap.isoControls.map((control) => (
                            <Badge key={control} variant="error" className="tabular-nums">
                              {control}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{gap.recommendation}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* By-ISO-control rollup */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  By ISO 27001 control
                </h3>
                {data.byIsoControl.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No controls tracked yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 text-left font-semibold">Control</th>
                          <th className="px-4 text-left font-semibold">Implemented</th>
                          <th className="px-4 text-right font-semibold">Templates</th>
                          <th className="px-4 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byIsoControl.map((row) => (
                          <tr key={row.isoControl} className="border-b border-border hover:bg-muted/50">
                            <td className="p-4 text-sm font-semibold tabular-nums text-foreground">
                              {row.isoControl}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {row.implemented ? "Yes" : "No"}
                            </td>
                            <td className="p-4 text-right text-sm tabular-nums text-foreground">
                              {row.templateCount}
                            </td>
                            <td className="p-4 text-right">
                              <Badge variant={getGapStatusClass(row.status)}>
                                {GAP_STATUS_META[row.status].label}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {data.recommendations.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommendations
                  </h3>
                  <ul className="space-y-1.5">
                    {data.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-[var(--warning-foreground)]" aria-hidden="true">
                          ●
                        </span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Approval workflow panel                                             */
/* ------------------------------------------------------------------ */

function ApprovalWorkflowPanel({
  approval,
  demoMode,
  onEnableDemo,
}: {
  approval: Nis2ApprovalResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const query = useNis2PolicyApproval(demoMode ? buildDemoNis2ApprovalInput() : {});
  const data: Nis2ApprovalResponse | undefined = demoMode
    ? (query.data ?? buildDemoNis2Approval())
    : (approval ?? query.data);

  const stepDotClass: Record<string, string> = {
    done: "bg-[var(--success-foreground)]",
    current: "bg-[var(--info-foreground)]",
    pending: "bg-muted-foreground",
  };
  const stepPillClass: Record<string, string> = {
    done: "border-border bg-muted/40 text-foreground",
    current: "border-[var(--info-foreground)]/30 bg-[var(--info-bg)]/40 text-[var(--info-foreground)]",
    pending: "border-border bg-muted/20 text-muted-foreground",
  };

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GitPullRequest className="h-5 w-5 text-muted-foreground" />
          Approval workflow
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Review pipeline, reviewer decisions and SLA status for the current policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="policyTemplatesNis2.approvalWorkflow"
          icon={GitPullRequest}
          emptyHint="The approval workflow appears once the policyTemplatesNis2 router is deployed. Enable demo mode to preview the review pipeline."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </>
          }
        >
          {data ? (
            <div className="space-y-5">
              {/* Verdict + status header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {data.policyTitle || "Policy"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{data.nextAction}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    <span>In review: {formatDaysInReview(data.daysInReview)}</span>
                    <span>{data.approvalCount} approved / {data.changesRequestedCount} changes / {data.pendingCount} pending</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {data.overdue && (
                    <Badge variant="error" className="gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Overdue
                    </Badge>
                  )}
                  <Badge variant={APPROVAL_STATUS_META[data.currentStatus].badgeVariant}>
                    {APPROVAL_STATUS_META[data.currentStatus].label}
                  </Badge>
                  <Badge variant={APPROVAL_VERDICT_META[data.verdict].badgeVariant}>
                    {APPROVAL_VERDICT_META[data.verdict].label}
                  </Badge>
                </div>
              </div>

              {/* Steps */}
              <ol className="flex flex-wrap items-center gap-2">
                {data.steps.map((step, index) => (
                  <li key={step.label} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                        stepPillClass[step.status]
                      )}
                      title={step.detail ?? undefined}
                    >
                      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", stepDotClass[step.status])} />
                      {step.label}
                    </span>
                    {index < data.steps.length - 1 && (
                      <span aria-hidden="true" className="h-px w-4 bg-border" />
                    )}
                  </li>
                ))}
              </ol>

              {/* Review progress */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Review progress</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {data.reviewProgress.toFixed(1)}%
                  </span>
                </div>
                <ScoreBar value={data.reviewProgress} barClass={nis2CoverageBarClass(data.reviewProgress)} />
              </div>

              {/* Reviewers */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reviewers
                </h3>
                {data.reviewers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviewers assigned yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.reviewers.map((reviewer) => (
                      <li
                        key={String(reviewer.id)}
                        className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium text-foreground">
                              {reviewer.name}
                            </span>
                          </div>
                          {reviewer.comment ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              &ldquo;{reviewer.comment}&rdquo;
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {reviewer.decidedAt ? (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatPolicyDate(reviewer.decidedAt)}
                            </span>
                          ) : null}
                          <Badge variant={REVIEWER_STATUS_META[reviewer.status].badgeVariant}>
                            {REVIEWER_STATUS_META[reviewer.status].label}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Version history panel                                               */
/* ------------------------------------------------------------------ */

function VersionHistoryPanel({
  versionHistory,
  demoMode,
  onEnableDemo,
}: {
  versionHistory: Nis2VersionResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const query = useNis2PolicyVersionHistory(demoMode ? buildDemoNis2VersionHistoryInput() : {});
  const data: Nis2VersionResponse | undefined = demoMode
    ? (query.data ?? buildDemoNis2VersionHistory())
    : (versionHistory ?? query.data);

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <History className="h-5 w-5 text-muted-foreground" />
          Version history
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Published, superseded and draft versions with change summaries.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="policyTemplatesNis2.versionHistory"
          icon={History}
          emptyHint="Version history appears once the policyTemplatesNis2 router is deployed. Enable demo mode to preview the version table."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </>
          }
        >
          {data ? (
            <div className="space-y-5">
              {/* Stat chips */}
              <div className="flex flex-wrap gap-2">
                <Chip>
                  Total <span className="tabular-nums text-foreground">{data.totalVersions}</span>
                </Chip>
                <Chip>
                  Latest <span className="tabular-nums text-foreground">{data.latestVersion || "—"}</span>
                </Chip>
                <Chip>
                  Current <span className="tabular-nums text-foreground">{data.currentVersion || "—"}</span>
                </Chip>
                <Chip>
                  Drafts <span className="tabular-nums text-foreground">{data.draftCount}</span>
                </Chip>
                <Chip>
                  Approved <span className="tabular-nums text-foreground">{data.approvedCount}</span>
                </Chip>
                <Chip>
                  Superseded <span className="tabular-nums text-foreground">{data.supersededCount}</span>
                </Chip>
              </div>

              {/* Version table */}
              {data.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 text-left font-semibold">Version</th>
                        <th className="px-4 text-left font-semibold">Published</th>
                        <th className="px-4 text-left font-semibold">Status</th>
                        <th className="px-4 text-left font-semibold">Change summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.versions.map((row) => (
                        <tr key={row.version} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4 text-sm font-semibold tabular-nums text-foreground">
                            {row.version}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground tabular-nums">
                            {formatPolicyDate(row.createdAt)}
                          </td>
                          <td className="p-4">
                            <Badge variant={getVersionStatusClass(row.status)}>
                              {VERSION_STATUS_META[row.status].label}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-foreground/70">
                            {row.changeSummary || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Changelog */}
              {data.changes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Changelog
                  </h3>
                  <ul className="space-y-1.5">
                    {data.changes.map((change, index) => (
                      <li key={index} className="text-xs text-muted-foreground">
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export interface PolicyCenterPanelsProps {
  /** Live template-library response (optional - demo mode previews when absent). */
  templates?: Nis2TemplatesResponse | null;
  /** Live gap-analysis response (optional). */
  gapAnalysis?: Nis2GapAnalysisResponse | null;
  /** Live approval-workflow response (optional). */
  approval?: Nis2ApprovalResponse | null;
  /** Live version-history response (optional). */
  versionHistory?: Nis2VersionResponse | null;
}

export function PolicyCenterPanels({
  templates = null,
  gapAnalysis = null,
  approval = null,
  versionHistory = null,
}: PolicyCenterPanelsProps) {
  // Demo mode is OFF by default (UI-STANDARD 17) - enabled via the toggle or
  // the EmptyState CTA when the policyTemplatesNis2.* endpoints are not live.
  const [demoMode, setDemoMode] = useState(false);

  return (
    <section className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Policy Center
            </h2>
            <p className="text-sm text-muted-foreground">
              Phase 6 Task 6.1 - policy templates, ISO gap analysis, approvals and version history
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
          <FlaskConical className="h-4 w-4" />
          Demo data
          <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Toggle demo data" />
        </label>
      </div>

      {/* Demo banner - persistent while sample data is shown (UI-STANDARD 17) */}
      {demoMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>
            <strong>Demo mode:</strong> showing sample data. Connect the{" "}
            <code className="text-xs">policyTemplatesNis2.*</code> APIs to see live policy data.
          </span>
        </div>
      )}

      {/* Template library */}
      <TemplateLibraryPanel
        templates={templates}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* ISO gap analysis + approval workflow side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IsoGapAnalysisPanel
          gapAnalysis={gapAnalysis}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
        <ApprovalWorkflowPanel
          approval={approval}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
      </div>

      {/* Version history */}
      <VersionHistoryPanel
        versionHistory={versionHistory}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Template library, ISO gap analysis, approval workflow and version history support NIS2
        Art. 21(2) policy documentation (Phase 6 Task 6.1).
      </p>
    </section>
  );
}

export default PolicyCenterPanels;
