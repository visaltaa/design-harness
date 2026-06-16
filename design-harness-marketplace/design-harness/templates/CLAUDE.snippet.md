<!-- ============================================================
  DESIGN HARNESS — paste this block into your repo's CLAUDE.md.
  It is the always-on (Layer 1) memory that loads the rules and
  defines the loop for every session.
============================================================ -->

## Design harness

This project uses the **design-harness** plugin. On every design task, treat the
three rule files as authoritative context (read them before proposing or building UI):

- `@.claude/rules/visual-baseline.md` — portable floor; rarely changes.
- `@.claude/rules/design-system.md` — this project's evolving rules **and** test
  suite. Enforced by `/design-harness:design-check`, grown by `/design-harness:approve`.
- `@.claude/rules/product-context.md` — what we're building and why.

### The loop (Layer 3)
1. **Sense** — when new work appears, the `design-context` skill grounds it
   against the rules and asks clarifying questions. Optionally `/design-harness:explore` to
   fan out variants, then reconverge on one.
2. **Build** — do the work on a dedicated git worktree/branch, never on the base.
3. **Prove** — run `/design-harness:design-check`: it starts the dev server, captures a
   Playwright proof (GIF for interactive changes, screenshots for static),
   verifies against the baseline + design-system rules, and writes a
   `design-check report` to `notes/design-harness/proofs/<date-slug>/report.md`.
4. **Decide** — you correct the work, or run `/design-harness:approve`, which merges the branch,
   appends "what changed & why" to `notes/session-log.md`, and **loops learnings
   back** into `design-system.md` / `product-context.md`.

### Hard rules
- Never merge design work without a passing proof. (A hook enforces this on
  `git merge`.)
- The `design-check report` format is fixed — see `/design-harness:design-check`. It must always
  include the branch/worktree/HEAD/working header, a PASS/FAIL tally, the
  "what was fixed" changelog, a `file://` proof link, and the live-preview PID.
- Keep the dev server running after a check so you can poke the live preview.

### Conventions
- Dev server: `npm run dev` (Next.js, http://localhost:3000) unless overridden in
  `.claude/rules/product-context.md`.
- Proofs live in `notes/design-harness/proofs/`; the session log in
  `notes/session-log.md`. Both are committed.
