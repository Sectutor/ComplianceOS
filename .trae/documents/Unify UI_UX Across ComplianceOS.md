## Core Findings
- Stack: React + Vite, routing via `wouter`, shadcn-style UI on Radix + Tailwind v4 tokens, TRPC + React Query.
- Routes centralized and lazy-loaded in `App.tsx:189-551` with `ProtectedRoute` loader `PageLoader` (`App.tsx:181-187`).
- Global shell with sticky header and resizable sidebar in `components/DashboardLayout.tsx:431-560`; header surface `DashboardLayout.tsx:541-553`.
- Design tokens defined in `index.css:69-160` (light) and `index.css:162-229` (dark); extensive card utilities `index.css:284-415`.
- Theme toggling handled by `contexts/ThemeContext.tsx:23-63` via `html` classes.
- Button variants already standardized in `components/ui/button.tsx:6-33`.

## Design System
- Color tokens: keep OKLCH-based tokens; introduce semantic aliases (e.g., `--color-success`, `--color-warning`, `--color-info`) mapped to status colors for consistency across badges, toasts, charts.
- Contrast: audit tokens to meet WCAG AA (≥4.5:1 for text). Adjust `--primary` and `--accent` pairs if any page fails contrast, especially on gradient cards `index.css:320-338`.
- Neutrals: define a predictable neutral scale for backgrounds/borders (e.g., `--surface-50..900`) mapped through Tailwind tokens to avoid ad‑hoc grays.
- Spacing/radius: lock base radius and spacing scale in tokens; use `--radius` tiers already present (`index.css:99, 485-524`) universally.
- Status set: unify positive/warning/error/info across components and charts using the same tokens; deprecate hard-coded hex in CSS utilities (`index.css:307-417`).

## Typography & Readability
- Type scale: adopt a consistent scale (e.g., 12/14/16/18/24/32/40) with fixed weights. Use `text-sm` for meta, `text-base` for body, `text-xl/2xl` for titles (`components/ui/card.tsx:36-44`).
- Page headers: create a reusable `PageHeader` component with title, subtitle, actions, and optional breadcrumbs, used at the top of every screen below the app bar.
- Content width: standardize `container` usage (`index.css:254-282`), keep readable line length (~70–90 chars); avoid edge-to-edge body text on desktop.
- Links/buttons: ensure consistent focus styles and hover states via Tailwind tokens; keep underline for inline links.

## Layout & Navigation
- Global header: expose current section title from active route and place primary page actions to the right (`DashboardLayout.tsx:541-553`).
- Sidebar: simplify group labels, ensure active state and submenu patterns are consistent (`DashboardLayout.tsx:625-671`, `676-737`).
- Page structure: standard sections using `Card` blocks (`components/ui/card.tsx:8-17`), each with header, content, and consistent padding (`CardHeader/CardContent`).
- Empty states: standardize visuals and copy; provide call-to-action and “Learn more” links.

## Mobile Friendliness
- Sidebar: rely on off-canvas `Sheet` on mobile already (`components/ui/sidebar.tsx:191-208`); ensure tap targets ≥44px and keep keyboard toggle accessible.
- Headers: keep sticky app bar (`DashboardLayout.tsx:541-553`) with search hidden behind an icon on narrow screens; surface key actions in a kebab menu.
- Tables/lists: introduce responsive patterns—column priority, stacking, or horizontal scroll with visible affordances.
- Forms: single-column layout, clear grouping, bottom fixed action bar when appropriate.

## Components Standardization
- Buttons: use existing `buttonVariants`; define page-level action tiers (primary, secondary, tertiary) and apply consistently (`components/ui/button.tsx:6-33`).
- Inputs/selects: unify sizing (`h-10`) and spacing; ensure error/help text patterns are shared.
- Dialogs/drawers: standard headers, close affordances, and consistent max widths.
- Badges/tags: map strictly to status tokens; remove inline color classes.
- Loader/skeleton: standardize loader (`App.tsx:107-123`) and skeleton blocks for lists/cards.

## Theming & Dark Mode
- Keep `ThemeProvider` behavior (`contexts/ThemeContext.tsx:23-63`); add a theme switcher in the user menu.
- Harmonize dark tokens for equal contrast; avoid bright gradients on dark surfaces (`index.css:200-229`, `320-338`).
- Charts: align chart palette with status/brand tokens (`index.css:88-97, 210-219`).

## Accessibility
- Focus rings: consistent, visible ring using `--ring` (`index.css:231-252, 526-534`).
- Keyboard: ensure all interactive elements are reachable; verify shortcuts don’t conflict (`components/ui/sidebar.tsx:95-109`).
- ARIA: add labels for menu buttons and collapse controls; ensure `Tooltip` hidden states don’t trap focus (`components/ui/sidebar.tsx:555-566`).
- Skip link: add a “Skip to content” link at top for keyboard users.

## Implementation Roadmap
- Phase 1: Foundations
  - Add `PageHeader` and `Container` components; document usage.
  - Consolidate status/color utilities in `index.css` under semantic tokens.
- Phase 2: Navigation & Header
  - Wire dynamic section title/actions from route context into the app bar.
  - Simplify and standardize sidebar groupings and submenu patterns.
- Phase 3: Screen Templates
  - Introduce standard templates for list, detail, editor, and dashboard pages; refactor high-traffic pages (Clients, Policies, Risk) first.
- Phase 4: Mobile Pass
  - Apply responsive patterns to tables/forms; verify tap targets; optimize header actions.
- Phase 5: Accessibility Pass
  - Contrast audits, focus order, ARIA improvements, skip links.
- Phase 6: Visual QA and Docs
  - Create a short design guide, verify key journeys, and tune tokens.

## Deliverables
- New components: `components/PageHeader.tsx`, `components/layout/Container.tsx`.
- Token updates: consolidate in `index.css` (semantic status tokens, refined neutrals).
- Patterns: templates for list/detail/editor pages; standardized empty states.
- Docs: a living `docs/design-guide.md` for designers/devs.

## Success Criteria
- All pages exhibit consistent headers, spacing, and action placement.
- Contrast and focus meet WCAG AA; mobile flows are fully usable.
- No hard-coded colors remain in screens; all map to tokens.
- Reduced bespoke CSS; components handle most visuals consistently.
