# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** So Thu Chi
**Generated:** 2026-10-06 21:55:41
**Category:** Expense Splitter / Bill Split
**Design Dials:** Variance 3/10 (Centered / Minimal) | Density 5/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#059669` | `--color-primary` |
| On Primary | `#000000` | `--color-on-primary` |
| Secondary | `#10B981` | `--color-secondary` |
| On Secondary | `#000000` | `--color-on-secondary` |
| Accent/CTA | `#DC2626` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#0F172A` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#0F172A` | `--color-card-foreground` |
| Muted | `#F0F8F6` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E1F2ED` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#059669` | `--color-ring` |

**Color Notes:** Balance green + owe red

### Typography

- **Heading Font:** Inter
- **Body Font:** Inter
- **Mood:** flat, clean, system, bold, geometric, cross-platform, icon, poster, minimal, functional, responsive
- **Google Fonts:** [Inter + Inter](https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
```

### Spacing Variables

*Density: 5/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #DC2626;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #0F172A;
  border: 2px solid #059669;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #059669;
  outline: none;
  box-shadow: 0 0 0 3px #05966920;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Product Demo + Features

- **Conversion Strategy:** Use an interactive demo only when it explains value better than static media. Provide captions, transcript, visible play/pause controls, and a non-video fallback; do not autoplay under reduced motion. Pause media when offscreen or hidden and keep the final product state available as static content.
- **CTA Placement:** Video center + CTA right/bottom
- **Section Order:** Hero > Product video/mockup (center) > Feature breakdown per section > Comparison (optional) > CTA

---

## Anti-Patterns (Do NOT Use)

- ❌ Complex shadows
- ❌ 3D effects
- ❌ Muted colors
- ❌ Low energy

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

---

## App Decisions — Sổ Thu Chi (override the generic specs above)

The generated sections above come straight from the skill (row "Expense Splitter / Bill Split").
Where they are generic web-landing advice, the decisions below win. Page files in `pages/` still
override this whole file.

### Color (implemented as OKLCH tokens in `src/app/globals.css`, gated by `npm run check:contrast`)
- **Brand / primary = deep emerald** (~`#047857`), not `#059669`: white text on `#059669` is ~3.8:1,
  below the 4.5:1 rule. Primary carries white text.
- **Income = green, expense = red, warning = amber.** Primary sits on a teal-leaning hue (~165) and
  income on a greener hue (~150) so "brand" and "money in" are not the same swatch.
- **Never colour alone:** every amount shows a sign (`+` / `−`) and, in lists, an arrow icon.
- **Background slate `#F8FAFC`, foreground `#0F172A`**, muted-foreground slate-600.
- **Charts:** a 6-step categorical palette that never puts red next to green; every chart has a
  data-table fallback.
- **Dark mode:** desaturated tonal variants on slate-950, not inverted colours; contrast re-checked.
- **The primary button is emerald, not the red accent.** Red is reserved for expense and destructive.

### Typography
- **Be Vietnam Pro** (not Inter): designed for Vietnamese diacritics, and the whole UI is Vietnamese.
  Inter's Vietnamese marks stack poorly at small sizes.
- All money uses `tabular-nums`.
- Base 16px, line-height 1.5. The user-controlled font scale (small / medium / large) stays: it is a
  real need for older users.

### Shape, depth & motion (Flat + Minimal Swiss)
- Cards: 1px border, no shadow, no hover lift. Rows and cards that are clickable change background
  colour on hover in 150ms.
- Shadows only for things that truly float (dialogs, menus, bottom bar).
- Radius: 10px controls, 16px cards, 24px sheets.
- Motion: enter 200ms, exit ~130ms, transform/opacity only, honour `prefers-reduced-motion`.

### Interaction
- Minimum 44×44px touch targets; 8px or more between targets.
- `cursor-pointer` on everything clickable.
- Buttons show a spinner and are disabled while an async action runs.
- Validate on blur; put the error next to its field; on submit, focus the first error.
- Destructive actions: confirm first, or offer an "Undo" toast (3–5s, `aria-live="polite"`).
- Exactly one primary CTA per screen.

### Navigation / IA
- Bottom bar (mobile): 4 destinations + centre "Ghi" button — Ghi chép `/`, Nợ `/loans`,
  Báo cáo `/reports`, Cài đặt `/settings`. Sidebar ≥768px; admin has its own shell.
- No separate overview page: the ledger is home (the user found an overview unnecessary).
- Month picker on the ledger stays simple (‹ month ›, no money); month totals sit under the calendar.

### Icons
- Lucide for all UI icons.
- Category icons are emoji the user picked (user data, not UI chrome). They are shown inside a
  uniform rounded tile.
