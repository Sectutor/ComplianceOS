import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single-row navigation strip that never wraps.
 *
 * When the items overflow, the strip gets edge fades and scroll buttons so the
 * off-screen items stay discoverable — a hidden scrollbar alone gives the user
 * no signal that more navigation exists. Buttons and fades only appear in the
 * direction there is actually something to scroll to.
 *
 * The gradient is painted with `from-muted` to sit on the tinted page-nav bar;
 * pass `fadeFrom` if the strip is placed on a different surface.
 */
export function ScrollableNavStrip({
  children,
  ariaLabel,
  className,
  navClassName,
  fadeFrom = "from-muted",
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  /** Extra classes for the inner <nav>, e.g. a pill-group container style. */
  navClassName?: string;
  fadeFrom?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update, { passive: true });

    // Observe the scroller and its content: the content's width changes when
    // items are added or a badge appears, which the scroller's own box misses.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // 85% of the visible width: one click clears a typical overflow while
    // keeping a sliver of overlap so the user does not lose their place.
    el.scrollBy({
      left: direction * Math.max(220, el.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  const buttonClass =
    "absolute top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground";

  return (
    <div className={cn("relative", className)}>
      {canScrollLeft && (
        <>
          <div className={cn("pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r to-transparent", fadeFrom)} />
          <button
            type="button"
            aria-label="Scroll navigation left"
            onClick={() => scrollByPage(-1)}
            className={cn(buttonClass, "left-0")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}

      <div ref={scrollerRef} className="no-scrollbar w-full overflow-x-auto">
        <nav className={cn("inline-flex items-center gap-1.5 sm:gap-2", navClassName)} aria-label={ariaLabel}>
          {children}
        </nav>
      </div>

      {canScrollRight && (
        <>
          <div className={cn("pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l to-transparent", fadeFrom)} />
          <button
            type="button"
            aria-label="Scroll navigation right"
            onClick={() => scrollByPage(1)}
            className={cn(buttonClass, "right-0")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
