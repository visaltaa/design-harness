# Visual baseline

Portable, project-agnostic design standards. This file rarely changes — it is the
floor every screen must clear before project-specific design-system rules apply.
It is loaded on every session via `CLAUDE.md` and checked by `/design-harness:design-check`.

Each rule has a stable ID and a check type:

- `[auto:dom]` — verifiable at runtime against the live page (Playwright + axe-core).
- `[auto:src]` — verifiable by grepping the source.
- `[judge]` — requires Claude's judgment from screenshots/GIFs (subjective).

`/design-harness:design-check` evaluates `[auto:*]` rules deterministically and `[judge]` rules
from the captured proof. A FAIL on any rule blocks `/design-harness:approve` until fixed or the
rule is explicitly waived in the report.

---

## Tokens & values

- **VB-01 [auto:src]** — No hardcoded colors in component source (no raw hex,
  `rgb()`, or `hsl()` literals). Use design tokens / CSS variables.
- **VB-02 [auto:src]** — No magic spacing numbers. Use the spacing scale
  (tokens or a documented step set), not arbitrary `px` values.
- **VB-03 [judge]** — New tokens are named by role (`--color-danger`), never by
  value (`--color-red`).

## Layout & spacing

- **VB-04 [judge]** — Spacing follows a consistent rhythm; related elements are
  grouped by proximity, unrelated elements are separated.
- **VB-05 [judge]** — One clear primary action per view. Visual weight matches
  action importance.

## Typography

- **VB-06 [auto:dom]** — Headings are sequential (no skipped levels: h1 → h2 → h3).
- **VB-07 [judge]** — Type scale is limited and consistent; body copy is ≥ 14px
  equivalent and comfortably legible.

## Color & contrast

- **VB-08 [auto:dom]** — Text/background contrast meets WCAG AA (4.5:1 body,
  3:1 large text). (axe-core: `color-contrast`.)
- **VB-09 [judge]** — Color is never the sole signal for state (error, success,
  selection) — pair it with icon, text, or shape.

## Interactive affordances

- **VB-10 [auto:dom]** — Every clickable element (`onclick`, `role="button"`,
  links, menu items) has `cursor: pointer`. *(Common regression — the kind of
  silent miss `/design-harness:design-check` is built to catch.)*
- **VB-11 [judge]** — Interactive elements have visible hover and active states.

## Focus & keyboard

- **VB-12 [auto:dom]** — Every focusable element has a visible focus indicator
  (`:focus-visible`); focus order is logical.
- **VB-13 [auto:dom]** — Controls have accessible names (label, `aria-label`, or
  associated text). (axe-core: `button-name`, `link-name`, `label`.)

## Touch targets

- **VB-14 [auto:dom]** — Interactive targets are ≥ 44×44px (or have ≥ 44px
  effective hit area via padding).

## Motion

- **VB-15 [judge]** — Transitions are purposeful and fast (≈150–250ms);
  no motion that blocks interaction. Respect `prefers-reduced-motion`.

## Component states

- **VB-16 [judge]** — Every data-driven view defines all four states: loading,
  empty, error, and populated. No dead-ends.
- **VB-17 [judge]** — Disabled controls look disabled and explain why when it
  matters.

## Consistency & pattern mirroring

- **VB-18 [judge]** — Analogous actions use analogous patterns. If "Add to X"
  already exists, a new "Add to Y" mirrors it (same trigger, same popover shape,
  same affordances) rather than inventing a new interaction. *(This is the
  license-dropup-mirrors-collection-dropup lesson — encode such pairings as
  `DS-*` rules in `design-system.md` once discovered.)*
- **VB-19 [auto:src]** — Shared primitives (Button, Dropup, Tag) are reused, not
  re-implemented per feature.

## Content & copy

- **VB-20 [judge]** — Labels, empty states, and errors are specific and
  action-oriented; no lorem ipsum or placeholder copy ships.

## No-regression

- **VB-21 [auto:dom]** — The page produces no console errors and no failed
  network requests during the proof run.
