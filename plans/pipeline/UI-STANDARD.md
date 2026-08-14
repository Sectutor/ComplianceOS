# ComplianceOS UI Standard — Vanta-Grade Design System

**Owner:** UI Engineering · **Applies to:** `packages/core/src/pages/**`, `packages/ui/src/**`, `packages/core/src/index.css`
**Rule of thumb:** If a class hard-codes a color (slate-*, gray-*, white/*, indigo-*, hex) it is WRONG — use a token.

---

## 1. Design principles

1. **Calm surfaces, loud data.** Cards are quiet; numbers and status are the focal point.
2. **Token-only color.** Never hard-code `text-slate-900`, `bg-white/60`, `border-slate-200`, `bg-indigo-600` in JSX.
3. **Density over decoration.** More rows per screen, less shadow/glow.
4. **Dark mode is first-class.** Every page must render correctly under `.dark` with zero extra effort.

---

## 2. Color tokens (defined in `packages/core/src/index.css`)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | near-white `oklch(1 0 0)` | slate-900 `oklch(0.145)` | Page canvas |
| `--foreground` | slate-900 `oklch(0.145)` | `oklch(0.985)` | Body text, headings |
| `--card` / `--card-foreground` | white / slate-900 | slate-800 / near-white | Surfaces |
| `--muted` / `--muted-foreground` | slate-100 / slate-500 | slate-700 / slate-400 | Secondary text, subtle fills |
| `--border` / `--input` | `oklch(0.922)` | `white/10` / `white/15` | Rules, field outlines |
| `--ring` | slate-400 | slate-500 | Focus rings |
| `--sidebar` / `--sidebar-accent` | `#002a40` / `#0ea5e9` | `#0c1929` / `#0ea5e9` | Navigation |
| `--success/--warning/--error/--info` | `#059669/#d97706/#dc2626/#0284c7` | same | Status semantics |

**Rules:**
- Text on surfaces: `text-foreground`, `text-muted-foreground`, `text-foreground/70`. Never raw slate hexes.
- Surfaces: `bg-card`, `bg-muted`, `bg-background`, `bg-card/60` (translucent panels).
- Translucent color accents: `bg-blue-500/10 text-blue-600 dark:text-blue-400` (icon tints, pills).
- Status → use `Badge` variants (`success|warning|error|info`) or `.status-*` classes. Do not invent colors.

---

## 3. Spacing scale (4px base)

| Token | px | Use |
|---|---|---|
| `gap-2` / `space-y-2` | 8 | Micro groups (icon+label) |
| `gap-4` / `space-y-4` | 16 | Form fields, list items |
| `gap-6` / `space-y-6` | 24 | Card grids, page sections |
| `gap-8` / `space-y-8` | 32 | Major page sections |
| `p-6` | 24 | Card padding (header + content) |
| Page padding | `p-4 md:p-6 lg:p-8` | DashboardLayout inset |

**Page rhythm:** `space-y-6` wrapper → Breadcrumb → header row → filters → content. Keep it identical across pages.

---

## 4. Typography

- **Body:** `Inter` (`--font-body`). **Headings:** `Outfit` (`--font-heading`), `letter-spacing: -0.02em` (set globally).
- Page title: `text-2xl md:text-3xl font-bold tracking-tight` + `text-muted-foreground` subtitle under it.
- Card title: `text-lg font-semibold tracking-tight`. Card description: `text-sm text-muted-foreground`.
- Labels/eyebrows: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`.
- Numbers/hero metrics: `text-2xl font-bold tabular-nums`.

---

## 5. Border radius (`--radius: 0.625rem`)

- Buttons / inputs / selects: `rounded-md` (`--radius-sm`).
- Cards / tables / panels: `rounded-xl` (`--radius-lg`).
- Badges / pills / avatars: `rounded-full`.
- Large hero panels: `rounded-2xl` max — no `rounded-3xl` on standard cards.

---

## 6. Elevation

- Cards: `shadow-sm` rest, `hover:shadow-md` (via `.card-interactive` or Card component).
- Floating/popover: `shadow-lg`.
- Never stack shadows (`shadow-sm ... shadow-2xl`) or use glow on every element.

---

## 7. Button patterns

- **Primary CTA:** `Button variant="default"` (brand navy `#0F2C59` → hover blue). Reserve for ONE action per view.
- **Secondary:** `variant="outline"`. Ghost: `variant="ghost"` (hover `bg-accent`). Destructive: `variant="destructive"`.
- Icon + label: `gap-2` with `h-4 w-4` icon.
- Focus: ring built-in (`focus-visible:ring-2 ring-offset-2`). Do not override with custom hexes.

---

## 8. Input patterns

- `Input`: `h-10 rounded-md border-input bg-background text-sm` + built-in focus ring.
- Search fields: wrap in `relative`, icon `absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground`, input `pl-8`.
- Labels: `Label` component, `text-sm font-medium`, `gap-2` from field.

---

## 9. Card patterns

- Structure: `CardHeader (p-6 pb-2)` → `CardContent (p-6 pt-0)` → optional `CardFooter`.
- Equal heights in grids: card root `h-full flex flex-col`; push footer with `mt-auto pt-4 border-t`.
- Interactive cards: `.card-interactive` (+ `card-accent-left` for status accent). Focusable cards get `focus-visible:ring-2 ring-ring`.

---

## 10. Table density

- Head: `h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground`.
- Cells: `p-4 text-sm`; rows `border-b border-border hover:bg-muted/50`.
- Align numbers right, text left. Use `whitespace-nowrap` on action columns only.

---

## 11. Responsive

- Breakpoints: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280.
- Card grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- Header rows: `flex flex-col md:flex-row justify-between items-start md:items-center gap-4`.
- Tables: keep inside `overflow-x-auto` wrapper; filters collapse under the title on mobile.

---

## 12. Empty states

Use `EmptyState` (`packages/ui/src/ui/EmptyState.tsx`): `icon + title + description + optional action`.
- Icon in `rounded-full bg-muted` circle, `text-muted-foreground` icon.
- Fallback pattern (when EmptyState is not imported): dashed border container
  `flex flex-col items-center justify-center p-12 custom-dashed-border rounded-xl bg-muted/10 text-center`.
- Copy: title states the condition ("No clients found"); description gives the next step; CTA when actionable.

---

## 13. Loading skeletons

- Replace content 1:1: same grid/table shape with `<Skeleton className="h-[200px] w-full" />`.
- Never show skeleton AND spinner; never flash empty state while loading (`isLoading` checked before `length === 0`).

---

## 14. Accessibility

- All interactive elements: visible `focus-visible` ring (`ring-2 ring-ring ring-offset-2`).
- Icon-only buttons: `title` + `aria-label`.
- Status conveyed with color must also have text (never color-only).
- Contrast: body text ≥ 4.5:1; muted text ≥ 3:1 on its surface.

---

## 15. Do / Don't quick list

- ✅ `text-muted-foreground` · ✅ `bg-card/60` · ✅ `border-border` · ✅ `bg-muted` · ✅ `hover:bg-muted/50`
- ❌ `text-slate-900/500/600` · ❌ `bg-white/60` · ❌ `border-slate-200` · ❌ `bg-indigo-600` · ❌ `bg-gray-50`
