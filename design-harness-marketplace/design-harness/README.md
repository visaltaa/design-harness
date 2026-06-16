# design-harness

An agentic design harness for Claude Code: explore complex UI workflows, build them
on isolated worktrees, prove the work with Playwright, and let approvals feed
learnings back into a design system that doubles as a test suite.

It's a **plugin** — a bundle of skills, slash commands, hooks, and one Playwright
script. The only code is `scripts/proof.mjs`; everything else is markdown that
steers Claude.

## The three layers

| Layer | Job | How it's encoded |
|------|-----|------------------|
| **1 · Visual** | A portable baseline + an evolving design system that hardens into a test suite | `CLAUDE.md` (always-on) + `rules/visual-baseline.md` + `rules/design-system.md` |
| **2 · Context** | Sense new work, interrogate you, fan out variants before converging | `design-context` skill (auto-fires) + `/explore` + `rules/product-context.md` |
| **3 · Agentic** | Build on a worktree → prove → verify → approve, then loop learnings back up | `design-check` skill + `/approve` + `hooks/` + `scripts/proof.mjs` |

## The loop

```
new work ─▶ design-context (sense, AskUserQuestion) ─▶ [/explore variants] ─▶ reconverge
              │
              ▼
        build on a worktree/branch
              │
              ▼
        /design-check ──▶ start dev server ──▶ Playwright proof (GIF/screenshots)
              │                                  ├─ deterministic: axe + DOM audit + source greps
              │                                  └─ judged: hierarchy, mirroring, DS-* rules
              ▼
        design-check report  (PASS: n · FAIL: m, proof folder, live preview)
              │
       ┌──────┴───────┐
   you correct      /approve ──▶ merge ──▶ session-log ──▶ update design-system.md
   the work                                                  + product-context.md
                                                              (new DS-* rules become
                                                               the next check's test suite)
```

## What fires automatically vs. what you control (hybrid)

- **Always-on:** the visual baseline, loaded via `CLAUDE.md`.
- **Auto-fires:** `design-context` when Claude senses new/unscoped UI work.
  `design-check` can also run automatically at the end of a build.
- **You invoke (explicit):** `/explore`, `/design-check`, `/approve`. `/approve`
  is user-only and never auto-runs — it's the one step that mutates the base
  branch and the rules.

## Verification is hybrid

`/design-check` proves work two ways and a rule must clear both kinds that apply:

- **Deterministic** (`[auto:*]` rules): axe-core (contrast, names, headings),
  a baseline DOM audit (pointer cursor, ≥44px targets, focus-visible, alt text),
  console/network errors, and source greps (no hardcoded color, primitives reused).
- **Judged** (`[judge]` rules): hierarchy, spacing rhythm, state coverage, copy,
  and — most importantly — **pattern mirroring**: does a new "Add to X" reuse the
  canonical "Add to collection" popover instead of inventing a new interaction?

## How a decision becomes a test

This is the point of the harness. When you `/approve`, any durable decision is
appended to `rules/design-system.md` as a `DS-NNN` rule with a concrete `check`
(a DOM assertion, a source grep, or a judgment prompt). The next `/design-check`
enforces it. Rules are never deleted — wrong ones are marked `deprecated`, so the
design system carries its own history.

## End-to-end workflow: `/design-feature`

The harness runs as a complete, self-contained workflow via **`/design-feature`** —
a resume-safe orchestrator that takes a feature from idea to shipped-and-proven:

```
idea → design-context (spec) → [/explore] → build on a worktree
     → /design-check (USER-TEST gate) → /approve → rules hardened
```

It bakes in the practices worth keeping from a mature pipeline — a product-design
persona, staged analyze→scope→UX with acceptance criteria and per-screen states,
resume-safe state detection, up to 3 parallel build agents, a real verification
gate, and self-improving rules — without depending on or modifying any other
workflow you run.

Run it alongside your existing pipeline to compare results — nothing here touches or
replaces that pipeline. ui-ux-pro-max is consulted at the gate if installed, and
skipped gracefully if not.

One source of truth, when you're ready: reconcile ui-ux-pro-max's `0-style.md` with
the harness's `visual-baseline.md` + `design-system.md`.

## File map

```
design-harness/
├─ .claude-plugin/plugin.json        manifest
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
│  ├─ visual-baseline.md
│  ├─ design-system.md
│  └─ product-context.md
├─ templates/
│  ├─ CLAUDE.snippet.md              paste into your repo's CLAUDE.md
│  └─ proof-steps.example.mjs        example interactive steps module
└─ USAGE.md                          one-page quickstart (incl. build modes)
```

## Commands & skills

- **`/design-feature <seed>`** — run the whole workflow end to end (resume-safe).
- **`design-context`** (skill) — grounds new work in the rules, asks what's
  unknown, writes the spec. Also invocable as `/design-context`.
- **`/explore <thing> [n=3]`** — fan out N distinct variants, compare, reconverge.
- **`/design-check`** (skill) — capture proof, verify, write the report.
- **`/approve [note]`** — merge the worktree, log, and fold learnings into the rules.

See `INSTALL.md` to set it up. Tune the proof-gate with `DESIGN_HARNESS_BASE`,
`DESIGN_HARNESS_PROOF_MAX_AGE_MIN`, and `DESIGN_HARNESS_SKIP_GATE=1`.
