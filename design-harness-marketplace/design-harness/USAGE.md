# Using the design harness — quickstart

One page. Full detail in `README.md`; setup detail in `INSTALL.md`.

## Install (once)

```bash
claude plugin marketplace add /absolute/path/to/design-harness-marketplace
claude plugin install design-harness@design-harness-marketplace --scope project
mkdir -p .claude/rules notes/design-harness/proofs
# HARNESS = the plugin bundle you cloned (holds rules-templates/ and templates/)
HARNESS=/absolute/path/to/design-harness-marketplace/design-harness
cp "$HARNESS"/rules-templates/*.md .claude/rules/
cat "$HARNESS"/templates/CLAUDE.snippet.md >> CLAUDE.md
npm i -D playwright && npx playwright install chromium   # + brew install ffmpeg for GIFs
```

Then fill in `.claude/rules/product-context.md` (what you're building + the
Build & dev defaults).

## The daily loop

Run it end to end with `/design-harness:design-feature <seed>` (resume-safe), or step through it:

1. **Describe the work.** `design-context` fires — answer its questions. Add the
   build mode here if it isn't the default (see below).
2. **(Optional) `/design-harness:explore <thing> [n=3]`** — compare variants, reconverge on one.
3. **Build** it on a dedicated git worktree/branch.
4. **`/design-harness:design-check`** — captures a Playwright proof, verifies against the rules +
   ui-ux-pro-max + acceptance criteria, writes the report. Fix anything red.
5. **`/design-harness:approve "what & why"`** — merges, logs, and hardens the decision into the rules.

## Choosing the build mode (per task)

You don't configure this in the plugin — **just say it in the task.** Three modes:

| Mode | Say something like | How it's built | How `/design-harness:design-check` proves it |
|---|---|---|---|
| `standalone-html` | "…as a standalone HTML prototype" | one `.html` file, no build step | Playwright opens the `file://` (or `npx serve`); lighter checks, no PID |
| `nextjs` *(default)* | "…as a Next.js prototype" | `npm run dev` on :3000 | Playwright hits `localhost:3000/route`; full proof |
| `fullstack` | "…as a full-stack feature" | dev server + backend/API/env/seed | full proof **plus** data-driven & auth states |

The default lives in `.claude/rules/product-context.md` → **Build & dev defaults**.
A mention in the task overrides it for that task only. Examples:

- "Build a pricing page **as a standalone HTML prototype**."
- "Build the invite flow **as a full-stack feature**, then run `/design-harness:design-check`."

## Commands

Commands and skills are namespaced under the plugin, so each is invoked with the
`design-harness:` prefix (e.g. `/design-harness:approve`).

- **`/design-harness:design-feature <seed>`** — run the whole workflow end to end (resume-safe).
- **`design-context`** (auto) — senses & scopes; asks; writes the spec.
- **`/design-harness:explore <thing> [n=3]`** — fan out variants, then reconverge.
- **`/design-harness:design-check`** — proof + hybrid verification → the report.
- **`/design-harness:approve [note]`** — merge + session log + harden rules.

## The gate & env

Merges into your base branch are blocked until a fresh proof reports `FAIL: 0`.

- `DESIGN_HARNESS_BASE=release` — gate an extra base branch.
- `DESIGN_HARNESS_PROOF_MAX_AGE_MIN=240` — widen the freshness window.
- `DESIGN_HARNESS_SKIP_GATE=1 git merge …` — bypass for a non-design merge.

## Comparing with your existing pipeline

`/design-harness:design-feature` is a standalone workflow — run it alongside your existing
`build-feature` pipeline and compare results. It does not read, depend on, or modify
that pipeline; your setup is untouched. Mention the build mode in your request and it
carries through the run.
