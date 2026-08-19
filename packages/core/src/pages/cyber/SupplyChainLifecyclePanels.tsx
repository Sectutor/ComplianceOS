/**
 * NIS2 Supplier Security Lifecycle — panels
 * ==========================================
 * Four cards rendering the `supplyChain.*` contract (see
 * `packages/core/src/pages/supplyChainApi.ts`):
 *
 *   1. Supplier criticality classifier        → supplyChain.classifySupplier
 *   2. Security posture scorecard             → supplyChain.scorePosture
 *   3. Supplier incident notification tracker → supplyChain.trackIncident
 *   4. Security SLA monitor                   → supplyChain.monitorSla (demo-mode §17)
 *
 * Every card follows UI-STANDARD §16 graceful degradation: skeleton while
 * loading, EmptyState ("Connect the supplyChain.<proc> API") on error, and
 * token-only colors (§2) — no raw slate/sky hexes, dark-mode safe.
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
import { Button } from "@complianceos/ui/ui/button";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  Loader2,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  useClassifySupplier,
  useScorePosture,
  useTrackIncident,
  useMonitorSla,
  SUPPLIER_CRITICALITY_META,
  POSTURE_READINESS_META,
  INCIDENT_STATUS_META,
  SLA_STATUS_META,
  POSTURE_QUESTION_LABELS,
  POSTURE_QUESTION_ORDER,
  DEMO_SUPPLIER_SLA_ITEMS,
  DEMO_SUPPLIER_NAME,
  buildDemoSlaMonitor,
  type ClassifySupplierInput,
  type ScorePostureInput,
  type TrackIncidentInput,
  type MonitorSlaInput,
  type NetworkAccessLevel,
  type PostureQuestionId,
} from "@/pages/supplyChainApi";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Score bar (UI-STANDARD §18) — token colors via .progress-* classes. */
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

/** Result-area degradation helper: skeleton → EmptyState → children. */
function ResultArea({
  isLoading,
  hasData,
  isError,
  procedure,
  icon,
  emptyHint,
  children,
}: {
  isLoading: boolean;
  hasData: boolean;
  isError: boolean;
  procedure: string;
  icon: LucideIcon;
  emptyHint: string;
  children: React.ReactNode;
}) {
  if (isLoading && !hasData) {
    return (
      <div className="space-y-3 border-t border-border pt-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }
  if (isError || !hasData) {
    return (
      <div className="border-t border-border pt-4">
        <EmptyState
          icon={icon}
          title={`Connect the ${procedure} API`}
          description={
            isError
              ? `The ${procedure} endpoint is not live yet. It appears once the supplyChain router is deployed.`
              : emptyHint
          }
        />
      </div>
    );
  }
  return <div className="space-y-3 border-t border-border pt-4">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Card 1 — Supplier criticality classifier                            */
/* ------------------------------------------------------------------ */

export function SupplierCriticalityCard({ clientId }: { clientId: number }) {
  const [supplierName, setSupplierName] = useState("");
  const [essential, setEssential] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [networkAccess, setNetworkAccess] = useState<NetworkAccessLevel>("restricted");
  const [subcontractor, setSubcontractor] = useState(false);
  const [spendEur, setSpendEur] = useState("");
  const [input, setInput] = useState<ClassifySupplierInput | null>(null);

  const query = useClassifySupplier(clientId, input);
  const result = query.data;
  const meta = result ? SUPPLIER_CRITICALITY_META[result.criticality] : null;

  const canClassify = supplierName.trim().length > 0;

  const handleClassify = () => {
    if (!canClassify) return;
    const spend = spendEur.trim() ? Number(spendEur) : undefined;
    setInput({
      supplierName: supplierName.trim(),
      servicesEssentialToCriticalFunctions: essential,
      processesSensitiveData: sensitive,
      networkAccessLevel: networkAccess,
      isSubcontractor: subcontractor,
      annualSpendEur: spend && spend >= 0 ? spend : undefined,
      now: new Date(),
    });
  };

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Scale className="h-5 w-5 text-muted-foreground" />
          Supplier criticality classifier
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Art. 21(2)(d) — classify a third-party provider&apos;s criticality to set the review cadence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Supplier name</Label>
          <Input
            className="h-9"
            placeholder="e.g. Acme Cloud GmbH"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Checkbox
              id="essential-functions"
              checked={essential}
              onCheckedChange={(v) => setEssential(v === true)}
            />
            <Label htmlFor="essential-functions" className="text-sm text-foreground">
              Essential to critical functions
            </Label>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Checkbox
              id="sensitive-data"
              checked={sensitive}
              onCheckedChange={(v) => setSensitive(v === true)}
            />
            <Label htmlFor="sensitive-data" className="text-sm text-foreground">
              Processes sensitive data
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Network access level</Label>
            <Select value={networkAccess} onValueChange={(v) => setNetworkAccess(v as NetworkAccessLevel)}>
              <SelectTrigger className="h-9 rounded-md border-border bg-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="broad">Broad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Annual spend (EUR, optional)
            </Label>
            <Input
              className="h-9"
              type="number"
              min={0}
              placeholder="e.g. 250000"
              value={spendEur}
              onChange={(e) => setSpendEur(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Checkbox
            id="subcontractor"
            checked={subcontractor}
            onCheckedChange={(v) => setSubcontractor(v === true)}
          />
          <Label htmlFor="subcontractor" className="text-sm text-foreground">
            Is a subcontractor (tier-2 provider)
          </Label>
        </div>

        <Button onClick={handleClassify} disabled={!canClassify || query.isLoading} className="w-full">
          {query.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
          Classify supplier
        </Button>

        <ResultArea
          isLoading={query.isLoading}
          hasData={!!result}
          isError={query.isError}
          procedure="supplyChain.classifySupplier"
          icon={Scale}
          emptyHint="Run the classifier to see the criticality verdict."
        >
          {result && meta ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                <Badge variant="outline">{result.reviewFrequency} review</Badge>
                {result.nextReviewDate ? (
                  <Badge variant="secondary">
                    Next review: {result.nextReviewDate}
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Criticality score
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {result.criticalityScore}/100
                  </span>
                </div>
                <ScoreBar value={result.criticalityScore} barClass={meta.barClass} />
              </div>
              {result.rationale.length > 0 ? (
                <ul className="space-y-1 pl-6 list-disc">
                  {result.rationale.map((reason, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </ResultArea>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 2 — Security posture scorecard                                 */
/* ------------------------------------------------------------------ */

export function PostureScorecardCard({ clientId }: { clientId: number }) {
  const [supplierName, setSupplierName] = useState("");
  const [answers, setAnswers] = useState<Partial<Record<PostureQuestionId, boolean>>>({});
  const [input, setInput] = useState<ScorePostureInput | null>(null);

  const query = useScorePosture(clientId, input);
  const result = query.data;
  const meta = result ? POSTURE_READINESS_META[result.readiness] : null;

  const answeredCount = POSTURE_QUESTION_ORDER.filter((id) => answers[id] !== undefined).length;
  const canScore = supplierName.trim().length > 0 && answeredCount > 0;

  const toggleAnswer = (id: PostureQuestionId, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleScore = () => {
    if (!canScore) return;
    setInput({ supplierName: supplierName.trim(), answers: { ...answers } });
  };

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          Security posture scorecard
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          ENISA Measure 5.1 — score the 8 contractual security areas for the provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Supplier name</Label>
          <Input
            className="h-9"
            placeholder="e.g. Acme Cloud GmbH"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contract areas met
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {POSTURE_QUESTION_ORDER.map((id) => (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                  answers[id] === true
                    ? "border-[var(--success)]/25 bg-[var(--success-bg)]/60"
                    : answers[id] === false
                      ? "border-border bg-muted/30"
                      : "border-border bg-muted/20"
                )}
              >
                <Checkbox
                  id={`posture-${id}`}
                  checked={answers[id] === true}
                  onCheckedChange={(v) => toggleAnswer(id, v === true)}
                />
                <Label htmlFor={`posture-${id}`} className="text-xs text-foreground">
                  {POSTURE_QUESTION_LABELS[id]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleScore} disabled={!canScore || query.isLoading} className="w-full">
          {query.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Score posture
        </Button>

        <ResultArea
          isLoading={query.isLoading}
          hasData={!!result}
          isError={query.isError}
          procedure="supplyChain.scorePosture"
          icon={ClipboardCheck}
          emptyHint="Answer at least one contract area and run the scorecard."
        >
          {result && meta ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {result.score}/100
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Posture score
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{result.score}/100</span>
                </div>
                <ScoreBar value={result.score} barClass={meta.barClass} />
              </div>
              {result.gaps.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unmet areas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.gaps.map((gap, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {result.recommendedActions.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommended actions
                  </div>
                  <ul className="space-y-1 pl-6 list-disc">
                    {result.recommendedActions.map((action, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </ResultArea>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 3 — Supplier incident notification tracker                     */
/* ------------------------------------------------------------------ */

export function SupplierIncidentCard({ clientId }: { clientId: number }) {
  const [supplierName, setSupplierName] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [detectedAt, setDetectedAt] = useState("");
  const [significant, setSignificant] = useState(false);
  const [reportedAt, setReportedAt] = useState("");
  const [acknowledgedAt, setAcknowledgedAt] = useState("");
  const [input, setInput] = useState<TrackIncidentInput | null>(null);

  const query = useTrackIncident(clientId, input);
  const result = query.data;
  const meta = result ? INCIDENT_STATUS_META[result.status] : null;

  const canTrack =
    supplierName.trim().length > 0 && incidentTitle.trim().length > 0 && detectedAt.length > 0;

  const handleTrack = () => {
    if (!canTrack) return;
    setInput({
      supplierName: supplierName.trim(),
      incidentTitle: incidentTitle.trim(),
      detectedAt: new Date(detectedAt),
      significant,
      reportedToEntityAt: reportedAt ? new Date(reportedAt) : undefined,
      acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt) : undefined,
      now: new Date(),
    });
  };

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <BellRing className="h-5 w-5 text-muted-foreground" />
          Supplier incident notification tracker
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Art. 21(2)(d) — track the reporting SLA for a significant supplier incident.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Supplier name</Label>
          <Input
            className="h-9"
            placeholder="e.g. Acme Cloud GmbH"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Incident title</Label>
          <Input
            className="h-9"
            placeholder="e.g. Ransomware on managed file share"
            value={incidentTitle}
            onChange={(e) => setIncidentTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Detected at</Label>
            <Input
              className="h-9"
              type="datetime-local"
              value={detectedAt}
              onChange={(e) => setDetectedAt(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 mt-5">
            <Checkbox
              id="significant-incident"
              checked={significant}
              onCheckedChange={(v) => setSignificant(v === true)}
            />
            <Label htmlFor="significant-incident" className="text-sm text-foreground">
              Significant incident
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Reported to entity (optional)
            </Label>
            <Input
              className="h-9"
              type="datetime-local"
              value={reportedAt}
              onChange={(e) => setReportedAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Acknowledged by us (optional)
            </Label>
            <Input
              className="h-9"
              type="datetime-local"
              value={acknowledgedAt}
              onChange={(e) => setAcknowledgedAt(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleTrack} disabled={!canTrack || query.isLoading} className="w-full">
          {query.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Track notification
        </Button>

        <ResultArea
          isLoading={query.isLoading}
          hasData={!!result}
          isError={query.isError}
          procedure="supplyChain.trackIncident"
          icon={BellRing}
          emptyHint="Fill the incident details and run the tracker."
        >
          {result && meta ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                {result.significant ? <Badge variant="error">Significant</Badge> : <Badge variant="secondary">Not significant</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notification deadline
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {result.notificationDeadline
                      ? format(new Date(result.notificationDeadline), "MMM d, yyyy HH:mm")
                      : "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Days remaining
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      result.daysRemaining !== null && result.daysRemaining < 0
                        ? "text-[var(--error-foreground)]"
                        : "text-foreground"
                    )}
                  >
                    {result.daysRemaining !== null ? `${result.daysRemaining} days` : "—"}
                  </div>
                </div>
              </div>
              {result.note ? (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {result.note}
                </p>
              ) : null}
            </>
          ) : null}
        </ResultArea>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 4 — Security SLA monitor (demo-mode §17)                       */
/* ------------------------------------------------------------------ */

export function SecuritySlaMonitorCard({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  const slaInput = useMemo<MonitorSlaInput | null>(() => {
    if (!demoMode) return null;
    return {
      supplierName: DEMO_SUPPLIER_NAME,
      items: DEMO_SUPPLIER_SLA_ITEMS,
      now: new Date(),
    };
  }, [demoMode]);

  const query = useMonitorSla(clientId, slaInput);
  // Demo wins when enabled; fall back to the local demo view-model when the
  // pure endpoint is not live yet (endpoint computes from the same rows).
  const data = demoMode ? (query.data ?? buildDemoSlaMonitor(DEMO_SUPPLIER_NAME)) : query.data;
  const summary = data?.summary;

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              Security SLA monitor
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Verification cadence for vendor contract controls (Art. 21(2)(d)).
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDemoMode((v) => !v)}
            className={cn(demoMode && "border-amber-500/40 text-amber-700 dark:text-amber-400")}
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            {demoMode ? "Exit Demo Mode" : "Demo Mode"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo mode banner — never hides behind real data (§17) */}
        {demoMode && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span>
              <strong>Demo mode:</strong> showing sample data. Connect the{" "}
              <code className="text-xs">supplyChain.monitorSla</code> API to see live vendor rows.
            </span>
          </div>
        )}

        {!demoMode ? (
          <EmptyState
            icon={CalendarClock}
            title="Connect the supplyChain.monitorSla API"
            description="SLA items originate from vendor contracts. The endpoint is not live yet — preview the lifecycle with sample data."
            action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
          />
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 text-left font-semibold">Verification item</th>
                    <th className="px-4 text-left font-semibold">Cadence</th>
                    <th className="px-4 text-left font-semibold">Last verified</th>
                    <th className="px-4 text-right font-semibold">Due in</th>
                    <th className="px-4 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => {
                    const slaMeta = SLA_STATUS_META[item.status];
                    return (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4 text-sm text-foreground">{item.title}</td>
                        <td className="p-4 text-sm tabular-nums text-muted-foreground">
                          {item.cadenceDays} days
                        </td>
                        <td className="p-4 text-sm tabular-nums text-muted-foreground">
                          {item.lastVerifiedAt
                            ? format(new Date(item.lastVerifiedAt), "MMM d, yyyy")
                            : "Never"}
                        </td>
                        <td
                          className={cn(
                            "p-4 text-sm tabular-nums text-right",
                            item.daysUntilDue < 0 ? "text-[var(--error-foreground)]" : "text-foreground"
                          )}
                        >
                          {item.daysUntilDue < 0 ? `${Math.abs(item.daysUntilDue)}d overdue` : `${item.daysUntilDue}d`}
                        </td>
                        <td className="p-4 text-right">
                          <Badge variant={slaMeta.badgeVariant}>{slaMeta.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
                  <div className="text-xl font-bold tabular-nums text-[var(--success-foreground)]">
                    {summary.compliant}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Compliant
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
                  <div className="text-xl font-bold tabular-nums text-[var(--warning-foreground)]">
                    {summary.atRisk}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    At risk
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
                  <div className="text-xl font-bold tabular-nums text-[var(--error-foreground)]">
                    {summary.breached}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Breached
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
                  <div className="text-xl font-bold tabular-nums text-foreground">
                    {summary.notTested}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Not tested
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export function SupplierSecurityLifecycleSection({ clientId }: { clientId: number }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            NIS2 Supplier Security Lifecycle
          </h2>
          <p className="text-sm text-muted-foreground">
            Art. 21(2)(d) / ENISA Measure 5.1 — classify, score, notify and verify your third-party providers.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupplierCriticalityCard clientId={clientId} />
        <PostureScorecardCard clientId={clientId} />
        <SupplierIncidentCard clientId={clientId} />
        <SecuritySlaMonitorCard clientId={clientId} />
      </div>
    </section>
  );
}
