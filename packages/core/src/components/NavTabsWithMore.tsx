import type { ComponentType } from "react";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollableNavStrip } from "@/components/ScrollableNavStrip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@complianceos/ui/ui/dropdown-menu";

export type NavTab = {
  label: string;
  path: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: string | number | null;
};

const defaultPillClass = (active: boolean) =>
  cn(
    "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all flex items-center whitespace-nowrap text-xs sm:text-sm font-semibold shadow-xs shrink-0 cursor-pointer",
    active
      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/20 font-bold"
      : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 font-medium"
  );

/**
 * Section navigation for the framework layouts (TPRM / ISO 27001 / Cyber /
 * Privacy).
 *
 * Tabs listed in `primaryPaths` stay on the bar; every other tab folds into a
 * "More" menu. That keeps the bar a predictable width as a module grows, and
 * unlike a pure scroll strip every destination is one click away.
 *
 * Two details matter for usability:
 *  - When the current page lives in the overflow, the trigger shows that page's
 *    name and takes the active styling, so the bar never looks unselected.
 *  - The trigger sits outside the scroll strip, so it cannot scroll out of view.
 */
export function NavTabsWithMore({
  tabs,
  primaryPaths,
  isActive,
  ariaLabel,
  pillClass = defaultPillClass,
  navClassName,
  className,
}: {
  tabs: NavTab[];
  /** Suffix-matched against each tab path; order here is not the render order. */
  primaryPaths: string[];
  isActive: (path: string) => boolean;
  ariaLabel: string;
  pillClass?: (active: boolean) => string;
  navClassName?: string;
  className?: string;
}) {
  const isPrimary = (path: string) => primaryPaths.some((p) => path.endsWith(p));
  const primaryTabs = tabs.filter((t) => isPrimary(t.path));
  const moreTabs = tabs.filter((t) => !isPrimary(t.path));
  const activeMoreTab = moreTabs.find((t) => isActive(t.path));

  const badgeClass = (active: boolean) =>
    cn(
      "ml-2 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0",
      active
        ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
        : "bg-muted text-muted-foreground border-border"
    );

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <ScrollableNavStrip ariaLabel={ariaLabel} className="min-w-0" navClassName={navClassName}>
        {primaryTabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <Link key={tab.path} href={tab.path} className={pillClass(active)}>
              {Icon && (
                <Icon
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4",
                    active ? "scale-105 text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              )}
              <span>{tab.label}</span>
              {!!tab.badge && <span className={badgeClass(active)}>{tab.badge}</span>}
            </Link>
          );
        })}
      </ScrollableNavStrip>

      {moreTabs.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={pillClass(!!activeMoreTab)}>
              {activeMoreTab ? (
                <>
                  {activeMoreTab.icon && (
                    <activeMoreTab.icon className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  )}
                  <span>{activeMoreTab.label}</span>
                </>
              ) : (
                <span>More</span>
              )}
              <ChevronDown
                className={cn(
                  "ml-1.5 h-3.5 w-3.5 shrink-0",
                  activeMoreTab ? "text-primary-foreground" : "text-muted-foreground"
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {moreTabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);
              return (
                <DropdownMenuItem key={tab.path} asChild>
                  <Link
                    href={tab.path}
                    className={cn(
                      "flex cursor-pointer items-center gap-2",
                      active && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="flex-1 truncate">{tab.label}</span>
                    {!!tab.badge && (
                      <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {tab.badge}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
