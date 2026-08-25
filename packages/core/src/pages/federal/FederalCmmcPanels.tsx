/**
 * CMMC Practice Register — live panels (NIST SP 800-171 Rev 2)
 * ============================================================
 * Trailing section of the Federal Compliance Hub
 * (`pages/federal/FederalHub.tsx`), wired to the typed contract layer
 * `pages/federal/federalWorkflowsApi.ts` over the
 * `federalWorkflows.cmmcPractices` tRPC procedure.
 *
 * Panels shipped:
 *  - Stat strip               → register totals + L1/L2/L3 counts
 *  - Family distribution      → all 14 SP 800-171 families w/ per-level minis
 *  - Filterable practice list → family/level/search filters drive the query;
 *                               rows show id chip, level badge, title,
 *                               line-clamped requirement + objective chips
 *
 * UI-STANDARD compliance:
 *  - §16.2 graceful degradation: the query renders a 1:1 Skeleton while
 *    loading and an EmptyState ("Connect the federalWorkflows.cmmcPractices
 *    API") on error — no spinner-forever, no crash on a missing endpoint.
 *  - §16.3 / §17 demo mode: off by default, gated behind the section-header
 *    "Demo data" switch or the EmptyState CTA; sample data lives in the API
 *    module behind real practice ids and always loses to a live payload;
 *    every demo render shows a persistent amber banner.
 *  - §2 token purity: token-only colors (`text-foreground`, `bg-muted`,
 *    `border-border`, Badge variants), dark-mode safe, no raw slate/gray/
 *    white/indigo surface tokens.
 */

import { useMemo, useState } from "react";
import { FlaskConical, ListChecks, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Switch } from "@complianceos/ui/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import {
  buildDemoCmmcRegister,
  CMMC_REGISTER_EMPTY_TITLE,
  EMPTY_CMMC_REGISTER,
  familyDisplayName,
  familyOrderRank,
  isEmptyCmmcRegister,
  LEVEL_META,
  levelMeta,
  NIST_800_171_FAMILY_ORDER,
  normalizeCmmcRegister,
  useCmmcPractices,
  type CmmcFamilyRollup,
  type CmmcPractice,
  type CmmcPracticeLevel,
  type CmmcRegisterResult,
  type FederalBadgeVariant,
} from "./federalWorkflowsApi";

/* ------------------------------------------------------------------ */
/* Shared building blocks                                               */
/* ------------------------------------------------------------------ */

/** Header pill shared by every state: live / demo / syncing / pending. */
function sectionPill(
  live: boolean,
  showDemo: boolean,
  isLoading: boolean
): { label: string; badgeVariant: FederalBadgeVariant } {
  if (live) return { label: "Live", badgeVariant: "success" };
  if (showDemo) return { label: "Demo data", badgeVariant: "warning" };
  if (isLoading) return { label: "Syncing…", badgeVariant: "outline" };
  return { label: "API pending", badgeVariant: "outline" };
}

/** Demo-data switch in the section header (UI-STANDARD §17). */
function DemoToggle({
  demoMode,
  onToggle,
}: {
  demoMode: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
      <FlaskConical className="h-4 w-4" />
      Demo data
      <Switch checked={demoMode} onCheckedChange={onToggle} aria-label="Toggle CMMC register demo data" />
    </label>
  );
}

/** Persistent amber banner rendered whenever sample data is shown. */
function CmmcDemoBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        <strong>Demo mode:</strong> showing sample data. Connect the{" "}
        <code className="text-xs">federalWorkflows.cmmcPractices</code> API to see the live
        register.
      </span>
    </div>
  );
}

/** Small summary tile reused across the stat strip. */
function RegisterStatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

const LEVEL_FILTER_ALL = "all";

/* ------------------------------------------------------------------ */
/* Family distribution table (all 14 SP 800-171 families)              */
/* ------------------------------------------------------------------ */

function FamilyDistributionTable({ families }: { families: CmmcFamilyRollup[] }) {
  const byFamily = new Map(families.map((row) => [row.family, row]));
  // Canonical axis first (guarantees the full 14-family table), then any
  // non-canonical families the server may add, preserving their order.
  const canonical = NIST_800_171_FAMILY_ORDER.filter(
    (family) => byFamily.has(family)
  ) as readonly string[];
  const extra = families
    .map((row) => row.family)
    .filter((family) => !(NIST_800_171_FAMILY_ORDER as readonly string[]).includes(family));
  const rows = [...canonical, ...extra].sort((a, b) => familyOrderRank(a) - familyOrderRank(b));

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <th scope="col" className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Family
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Practices
            </th>
            {[1, 2, 3].map((level) => (
              <th
                key={level}
                scope="col"
                className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {LEVEL_META[level as CmmcPracticeLevel].shortLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((family) => {
            const row = byFamily.get(family);
            return (
              <tr key={family} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                      {family}
                    </code>
                    <span className="text-sm text-muted-foreground">{familyDisplayName(family)}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">
                  {row?.count ?? 0}
                </td>
                {[1, 2, 3].map((level) => {
                  const count = row?.levels[level as CmmcPracticeLevel] ?? 0;
                  return (
                    <td key={level} className="px-4 py-2 text-right tabular-nums">
                      {count > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                          {count}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Practice row                                                         */
/* ------------------------------------------------------------------ */

function PracticeRow({ practice }: { practice: CmmcPractice }) {
  const level = levelMeta(practice.level);
  return (
    <li className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
          {practice.id || "—"}
        </code>
        <Badge variant={level.badgeVariant} className="text-xs">
          {level.label}
        </Badge>
        <span className="text-sm font-medium text-foreground">{practice.title}</span>
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {practice.requirement}
      </p>
      {practice.objectives.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {practice.objectives.map((objective) => (
            <li
              key={objective}
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
            >
              <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
              {objective}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Section root                                                         */
/* ------------------------------------------------------------------ */

/**
 * "CMMC Practice Register (NIST SP 800-171)" — trailing section of the
 * Federal Hub. One shared demo-mode gate drives the register view
 * (off by default, UI-STANDARD §17).
 */
export function FederalCmmcPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<string>(LEVEL_FILTER_ALL);
  const [levelFilter, setLevelFilter] = useState<string>(LEVEL_FILTER_ALL);
  const [searchText, setSearchText] = useState("");

  const active = clientId > 0;

  /** Local filter state → server-side query input (UI-STANDARD §16). */
  const filterInput = useMemo(() => {
    if (!active) return {};
    return {
      ...(familyFilter !== LEVEL_FILTER_ALL ? { family: familyFilter } : {}),
      ...(levelFilter !== LEVEL_FILTER_ALL
        ? { level: Number(levelFilter) as CmmcPracticeLevel }
        : {}),
      ...(searchText.trim() !== "" ? { search: searchText.trim() } : {}),
    };
  }, [active, familyFilter, levelFilter, searchText]);

  const registerQuery = useCmmcPractices(filterInput);

  const live = registerQuery.data ? normalizeCmmcRegister(registerQuery.data) : null;
  const isLoading = !live && registerQuery.isLoading;
  /** Error + no data → degraded EmptyState (UI-STANDARD §16.2). */
  const isDegraded = !live && !!registerQuery.isError;
  /** Demo view only when the live endpoint has not delivered yet (§17). */
  const showDemo = !live && demoMode;
  const view = live ?? (showDemo ? buildDemoCmmcRegister() : null);
  const pill = sectionPill(live !== null, showDemo, isLoading);

  const safeView = view ?? EMPTY_CMMC_REGISTER;

  /** Strip totals come off the full-register family rollup when present. */
  const levelTotals = useMemo((): Record<CmmcPracticeLevel, number> => {
    if (safeView.families.length > 0) {
      return safeView.families.reduce<Record<CmmcPracticeLevel, number>>(
        (acc, row) => ({ 1: acc[1] + row.levels[1], 2: acc[2] + row.levels[2], 3: acc[3] + row.levels[3] }),
        { 1: 0, 2: 0, 3: 0 }
      );
    }
    return safeView.practices.reduce<Record<CmmcPracticeLevel, number>>(
      (acc, practice) => ({ ...acc, [practice.level]: acc[practice.level] + 1 }),
      { 1: 0, 2: 0, 3: 0 }
    );
  }, [safeView]);

  const clearFilters = () => {
    setFamilyFilter(LEVEL_FILTER_ALL);
    setLevelFilter(LEVEL_FILTER_ALL);
    setSearchText("");
  };

  return (
    <section aria-labelledby="federal-cmmc-register-heading" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2
            id="federal-cmmc-register-heading"
            className="text-xl md:text-2xl font-bold tracking-tight text-foreground"
          >
            CMMC Practice Register (NIST SP 800-171)
          </h2>
          <p className="text-sm text-muted-foreground">
            All practices across the 14 control families, with maturity-level breakdowns and
            filtered browsing over the{" "}
            <code className="text-xs">federalWorkflows.cmmcPractices</code> API.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <DemoToggle demoMode={demoMode} onToggle={setDemoMode} />
        </div>
      </div>

      {!active ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground text-center">
          Select a workspace client to browse the CMMC practice register alongside its artifacts.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary shrink-0" />
              Practice register
            </CardTitle>
            <CardDescription>
              NIST SP 800-171 Rev 2 practices grouped by family and CMMC maturity level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {showDemo && <CmmcDemoBanner />}

            {isLoading ? (
              /* Loading skeleton - replaces content 1:1 (UI-STANDARD §13) */
              <div className="space-y-6" aria-hidden="true">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-[72px] rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ) : isDegraded && !view ? (
              /* Degraded - endpoint not live yet (UI-STANDARD §16.2) */
              <EmptyState
                icon={ListChecks}
                title="Connect the federalWorkflows.cmmcPractices API"
                description="The full NIST SP 800-171 practice register lands with packages/core/src/server/routers/federal-workflows.ts. Preview the panel with sample data meanwhile."
                action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
              />
            ) : (
              <>
                {/* Stat strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <RegisterStatTile label="Total practices" value={safeView.total} />
                  <RegisterStatTile label={LEVEL_META[1].label} value={levelTotals[1]} />
                  <RegisterStatTile label={LEVEL_META[2].label} value={levelTotals[2]} />
                  <RegisterStatTile label={LEVEL_META[3].label} value={levelTotals[3]} />
                </div>

                {/* Family distribution */}
                {safeView.families.length > 0 ? (
                  <FamilyDistributionTable families={safeView.families} />
                ) : (
                  <Skeleton className="h-48 w-full rounded-xl" aria-hidden="true" />
                )}

                {/* Filters — local state feeding the hook input */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_160px_1fr] gap-3">
                  <Select
                    value={familyFilter}
                    onValueChange={(next) => setFamilyFilter(next ?? LEVEL_FILTER_ALL)}
                  >
                    <SelectTrigger aria-label="Filter by family" className="bg-card">
                      <SelectValue placeholder="All families" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LEVEL_FILTER_ALL}>All families</SelectItem>
                      {(NIST_800_171_FAMILY_ORDER as readonly string[]).map((family) => (
                        <SelectItem key={family} value={family}>
                          {family} · {familyDisplayName(family)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={levelFilter}
                    onValueChange={(next) => setLevelFilter(next ?? LEVEL_FILTER_ALL)}
                  >
                    <SelectTrigger aria-label="Filter by maturity level" className="bg-card">
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LEVEL_FILTER_ALL}>All levels</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cmmc-register-search"
                      type="search"
                      placeholder="Search title or requirement…"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      className="pl-9 bg-card"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Practice list */}
                {isEmptyCmmcRegister(safeView) || safeView.practices.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title={CMMC_REGISTER_EMPTY_TITLE}
                    description="Try widening the family or level filter, or clearing the search text."
                    action={{ label: "Clear Filters", onClick: clearFilters }}
                  />
                ) : (
                  <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {safeView.practices.map((practice) => (
                      <PracticeRow key={practice.id} practice={practice} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export default FederalCmmcPanels;
