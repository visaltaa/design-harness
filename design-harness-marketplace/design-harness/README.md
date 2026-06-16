# design-harness

An agentic design harness for Claude Code: explore complex UI workflows, build them
on isolated worktrees, prove the work with Playwright, and let approvals feed
learnings back into a design system that doubles as a test suite.

It's a **plugin** — a bundle of skills, slash commands, hooks, and one Playwright
script. The only code is `scripts/proof.mjs`; everything else is markdown that
steers Claude.

> **Command namespace.** Plugin commands and skills are always namespaced under the
> plugin name, so every invocation is prefixed with `design-harness:` — e.g.
> `/design-harness:approve`. This is mandatory in Claude Code (it prevents
> collisions between plugins) and can't be removed.

## Contents

- [The three layers](#the-three-layers)
- [The loop](#the-loop)
- [Installation](#installation)
- [How to use](#how-to-use)
- [Plugin architecture](#plugin-architecture)
- [Commands & skills](#commands--skills)

## The three layers

| Layer | Job | How it's encoded |
|------|-----|------------------|
| **1 · Visual** | A portable baseline + an evolving design system that hardens into a test suite | `CLAUDE.md` (always-on) + `rules/visual-baseline.md` + `rules/design-system.md` |
| **2 · Context** | Sense new work, interrogate you, fan out variants before converging | `design-context` skill (auto-fires) + `/design-harness:explore` + `rules/product-context.md` |
| **3 · Agentic** | Build on a worktree → prove → verify → approve, then loop learnings back up | `design-check` skill + `/design-harness:approve` + `hooks/` + `scripts/proof.mjs` |

## The loop

```
new work ─▶ design-context (sense, AskUserQuestion) ─▶ [explore variants] ─▶ reconverge
              │
              ▼
        build on a worktree/branch
              │
              ▼
        design-check ──▶ start dev server ──▶ Playwright proof (GIF/screenshots)
              │                                  ├─ deterministic: axe + DOM audit + source greps
              │                                  └─ judged: hierarchy, mirroring, DS-* rules
              ▼
        design-check report  (PASS: n · FAIL: m, proof folder, live preview)
              │
       ┌──────┴───────┐
   you correct      approve ──▶ merge ──▶ session-log ──▶ update design-system.md
   the work                                                  + product-context.md
                                                              (new DS-* rules become
                                                               the next check's test suite)
```

## Installation

**Prerequisites:** Claude Code, Node.js, and a Next.js (or static-HTML) project to
work in. `playwright` is needed for proofs; `ffmpeg` is optional (for GIF rendering).

### 1. Install the plugin

```bash
# point Claude Code at the marketplace (local path, or a GitHub <owner>/<repo>)
claude plugin marketplace add /absolute/path/to/design-harness-marketplace

# install the plugin (project scope shares it with your team via .claude/)
claude plugin install design-harness@design-harness-marketplace --scope project
```

To distribute it, push `design-harness-marketplace/` to a git repo and have your
team run `claude plugin marketplace add <owner>/<repo>` instead of the local path.

### 2. Set up the project repo

```bash
# point HARNESS at the plugin bundle you cloned (holds rules-templates/, templates/, scripts/)
HARNESS=/absolute/path/to/design-harness-marketplace/design-harness

# 1. drop the three rule files where CLAUDE.md / the skills expect them
mkdir -p .claude/rules
cp "$HARNESS"/rules-templates/*.md .claude/rules/

# 2. wire the always-on baseline: append the snippet to your CLAUDE.md
cat "$HARNESS"/templates/CLAUDE.snippet.md >> CLAUDE.md

# 3. install the proof toolchain
npm i -D playwright && npx playwright install chromium
#   optional but recommended — needed to render the GIF (else you get frames + webm):
#   macOS: brew install ffmpeg   |   Debian/Ubuntu: sudo apt-get install ffmpeg

# 4. make sure proofs + log are tracked
mkdir -p notes/design-harness/proofs
```

Then fill in `.claude/rules/product-context.md` (what you're building) and set the
dev command/port there if it isn't `npm run dev` / `:3000`.

### 3. Verify the install

```bash
# sanity-check the proof script and report format without a browser
node "$HARNESS"/scripts/proof.mjs --selftest
```

The full setup walkthrough lives in [`INSTALL.md`](./INSTALL.md).

## How to use

Run the whole thing end to end with `/design-harness:design-feature <seed>`
(resume-safe), or step through the loop yourself:

1. **Describe the work.** `design-context` fires — answer its questions. Mention the
   build mode here if it isn't the default (see the table below).
2. **(Optional) `/design-harness:explore <thing> [n=3]`** — fan out N distinct
   variants, compare trade-offs, reconverge on one.
3. **Build** it on a dedicated git worktree/branch (never on the base branch).
4. **`/design-harness:design-check`** — starts the dev server, captures a Playwright
   proof, runs axe + the DOM audit, consults `ui-ux-pro-max` if installed, verifies
   the acceptance criteria, and writes the `design-check report`. Fix anything red.
5. **`/design-harness:approve "what & why"`** — merges the branch, appends to
   `notes/session-log.md`, and hardens durable decisions into the rules.

### Choosing the build mode (per task)

You don't configure this in the plugin — **just say it in the task.**

| Mode | Say something like | How it's built | How design-check proves it |
|---|---|---|---|
| `standalone-html` | "…as a standalone HTML prototype" | one `.html` file, no build step | Playwright opens the `file://` (or `npx serve`); lighter checks, no PID |
| `nextjs` *(default)* | "…as a Next.js prototype" | `npm run dev` on :3000 | Playwright hits `localhost:3000/route`; full proof |
| `fullstack` | "…as a full-stack feature" | dev server + backend/API/env/seed | full proof **plus** data-driven & auth states |

The default lives in `.claude/rules/product-context.md` → **Build & dev defaults**;
a mention in the task overrides it for that task only.

A one-page quickstart lives in [`USAGE.md`](./USAGE.md).

### The merge gate

A `PreToolUse` hook blocks `git merge` **into your base branch** unless a fresh
`design-check` proof reports `FAIL: 0`. It only fires in the approve direction
(merging a feature into `main`/`master`/`develop`/`trunk`), so updating your feature
branch with `git merge main` is never blocked. Tune it with environment variables:

- `DESIGN_HARNESS_BASE=release` — add another branch name to gate on.
- `DESIGN_HARNESS_PROOF_MAX_AGE_MIN=240` — widen the freshness window (default 120).
- `DESIGN_HARNESS_SKIP_GATE=1 git merge …` — bypass for a non-design merge.

## Plugin architecture

The plugin is a thin orchestration layer: markdown steers Claude, one script does
the deterministic capture, and two hooks wire it into every session.

### Components

| Component | File(s) | What it does | How it's invoked |
|---|---|---|---|
| **`design-context`** skill | `skills/design-context/SKILL.md` | Senses new/unscoped UI work, grounds it in the rules, asks clarifying questions, writes a spec | Auto-fires; or `/design-harness:design-context` |
| **`design-check`** skill | `skills/design-check/SKILL.md` | Serves the work, captures the proof, runs hybrid verification, writes the report | `/design-harness:design-check` (can auto-run after a build) |
| **`/design-harness:design-feature`** | `commands/design-feature.md` | Resume-safe orchestrator that chains the whole loop end to end | User-invoked |
| **`/design-harness:explore`** | `commands/explore.md` | Fans out N design variants, compares, reconverges on one | User-invoked |
| **`/design-harness:approve`** | `commands/approve.md` | Merges the branch, logs what changed, folds learnings into the rules | User-invoked only |
| **SessionStart banner** | `hooks/hooks.json` → `hooks/session-banner.sh` | Prints the loop + where the rules live, into context each session | Hook (`SessionStart`) |
| **Merge gate** | `hooks/hooks.json` → `hooks/approve-gate.mjs` | Denies `git merge` into the base branch without a fresh passing proof | Hook (`PreToolUse` on `Bash`) |
| **Proof capture** | `scripts/proof.mjs` | Drives Playwright: frames/GIF, console log, axe + DOM audit, `checks.json`, report stub | Called by the `design-check` skill (or directly) |
| **Rule templates** | `rules-templates/*.md` | Copied into the project's `.claude/rules/` as the editable rule set | Copied at install |
| **Project templates** | `templates/*` | `CLAUDE.snippet.md` (paste into `CLAUDE.md`) + an example proof-steps module | Copied at install |

### File map

```
design-harness/
├─ .claude-plugin/plugin.json        manifest (name, version, author, keywords)
├─ skills/
│  ├─ design-context/SKILL.md        senses new work; AskUserQuestion; briefs
│  └─ design-check/SKILL.md          build → proof → hybrid verify → report
├─ commands/
│  ├─ design-feature.md              end-to-end workflow (analyze→build→prove→approve)
│  ├─ approve.md                     merge + session-log + loop-back (user-only)
│  └─ explore.md                     open-thinking variant fan-out
├─ hooks/
│  ├─ hooks.json                     SessionStart banner + PreToolUse proof-gate
│  ├─ session-banner.sh
│  └─ approve-gate.mjs               blocks `git merge` into base without a passing proof
├─ scripts/
│  └─ proof.mjs                      Playwright capture + axe/DOM audit + report stub
├─ rules-templates/                  copy into your repo's .claude/rules/
│  ├─ visual-baseline.md             portable VB-* floor (rarely changes)
│  ├─ design-system.md               evolving DS-* rules = the project's test suite
│  └─ product-context.md             what you're building & why; build/dev defaults
├─ templates/
│  ├─ CLAUDE.snippet.md              paste into your repo's CLAUDE.md
│  └─ proof-steps.example.mjs        example interactive steps module
├─ INSTALL.md                        full setup walkthrough
└─ USAGE.md                          one-page quickstart (incl. build modes)
```

### The rules (your design system as a test suite)

Three files, copied into your repo's `.claude/rules/` at install and loaded every
session via `CLAUDE.md`:

- **`visual-baseline.md`** — portable, project-agnostic `VB-*` rules (the floor every
  screen must clear). Rarely changes.
- **`design-system.md`** — this project's `DS-*` rules. **This is both the design
  system and the test suite** — it grows every time you approve work.
- **`product-context.md`** — what you're building, for whom, and the build/dev
  defaults.

Each rule carries a check type: `[auto:dom]` (verified against the live page with
Playwright + axe-core), `[auto:src]` (verified by grepping source), or `[judge]`
(Claude's judgment from the captured screenshots/GIF).

### Verification is hybrid

`/design-harness:design-check` proves work two ways, and a rule must clear both kinds
that apply:

- **Deterministic** (`[auto:*]` rules): axe-core (contrast, accessible names,
  headings), a baseline DOM audit (pointer cursor, ≥44px targets, focus-visible,
  alt text), console/network errors, and source greps (no hardcoded color,
  primitives reused).
- **Judged** (`[judge]` rules): hierarchy, spacing rhythm, state coverage, copy, and
  — most importantly — **pattern mirroring**: does a new "Add to X" reuse the
  canonical "Add to collection" popover instead of inventing a new interaction?

`proof.mjs` writes a timestamped folder under
`notes/design-harness/proofs/<date-slug>/` containing `flow.gif` (or `static.png`),
the source `frame-*.png`, `flow.webm`, `console.log`, `checks.json`, and a
`report.md` stub. The skill finalizes the report's `PASS: n · FAIL: m` tally.

### How a decision becomes a test

This is the point of the harness. When you `/design-harness:approve`, any durable
decision is appended to `rules/design-system.md` as a `DS-NNN` rule with a concrete
`check` (a DOM assertion, a source grep, or a judgment prompt). The next
`/design-harness:design-check` enforces it. Rules are never deleted — wrong ones are
marked `deprecated`, so the design system carries its own history.

### End-to-end orchestration: `/design-harness:design-feature`

The harness runs as a complete, self-contained workflow via
**`/design-harness:design-feature`** — a resume-safe orchestrator that takes a
feature from idea to shipped-and-proven:

```
idea → design-context (spec) → [explore] → build on a worktree
     → design-check (USER-TEST gate) → approve → rules hardened
```

It bakes in the practices worth keeping from a mature pipeline — a product-design
persona, staged analyze→scope→UX with acceptance criteria and per-screen states,
resume-safe state detection, up to 3 parallel build agents, a real verification
gate, and self-improving rules — without depending on or modifying any other
workflow you run. `ui-ux-pro-max` is consulted at the gate if installed, and skipped
gracefully if not.

## Commands & skills

Every invocation is prefixed with `design-harness:` (the bare names are the same
commands without the prefix).

- **`/design-harness:design-feature <seed>`** — run the whole workflow end to end (resume-safe).
- **`design-context`** (skill) — grounds new work in the rules, asks what's unknown,
  writes the spec. Auto-fires, or invoke as `/design-harness:design-context`.
- **`/design-harness:explore <thing> [n=3]`** — fan out N distinct variants, compare, reconverge.
- **`/design-harness:design-check`** (skill) — capture proof, verify, write the report.
- **`/design-harness:approve [note]`** — merge the worktree, log, and fold learnings into the rules.

See [`INSTALL.md`](./INSTALL.md) for setup and [`USAGE.md`](./USAGE.md) for the
quickstart. Tune the proof-gate with `DESIGN_HARNESS_BASE`,
`DESIGN_HARNESS_PROOF_MAX_AGE_MIN`, and `DESIGN_HARNESS_SKIP_GATE=1`.
