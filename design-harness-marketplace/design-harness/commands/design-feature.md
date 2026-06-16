---
description: End-to-end design-harness workflow — analyze, scope, design UX, build on a worktree, prove with /design-harness:design-check, and /design-harness:approve to harden the rules. Self-contained and resume-safe. A standalone alternative you can run and compare against your own pipeline.
argument-hint: "<feature description | file path | Figma URL>"
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
  - SlashCommand
  - Skill
  - TodoWrite
  - WebSearch
  - WebFetch
---

# /design-harness:design-feature — the harness, end to end

**Persona:** 50% Principal Product Designer, 25% Chief AI Engineer, 25% Expert
Prompt Engineer. Think step by step.

Orchestrator for the design harness's own loop. It is **self-contained** — it does
not depend on, read, or modify any other workflow you have. It chains the harness's
own pieces; it does not reimplement them.

```
idea ─▶ design-context (spec) ─▶ [/design-harness:explore variants] ─▶ build (worktree)
     ─▶ /design-harness:design-check (USER-TEST gate) ─▶ /design-harness:approve ─▶ rules hardened
```

`$ARGUMENTS` is an optional seed — a feature description, a file path, or a Figma
URL. If empty, ask the user what to build.

---

## Step 1: Preflight (resume-safe)

`TodoWrite` the phases: `Spec`, `Explore?`, `Build`, `Prove`, `Approve`.

Derive a `<slug>` for the feature. Detect state from artifacts and pick the start:

| Condition | Start at |
|---|---|
| No `notes/design-harness/specs/<slug>.md` | **Spec** |
| Spec exists, no feature worktree/branch | **Build** |
| Branch exists, no passing proof for HEAD | **Prove** |
| Proof shows `FAIL: 0`, not yet in `session-log.md` | **Approve** |
| Approved | Report "done" + exit |

Announce the detected state and the planned start in 3–5 lines. No preamble.

---

## Step 2: Spec — analyze → scope → UX

Invoke the spec skill: `Skill: design-harness:design-context` (pass `$ARGUMENTS` as seed). It reads
the rules, resolves gaps with AskUserQuestion, and writes a structured spec to
`notes/design-harness/specs/<slug>.md`: refined requirements, scoped features with
**acceptance criteria** (checkboxes) + Must/Should/Could, UX flows with per-screen
**states**, the mirrored pattern, and applicable `DS-*`/`VB-*` rules.

If a spec already exists, design-context applies the use-as-is / delta-update /
backup-replace / review discipline — never clobber a reviewed spec.

Optional divergence: if the direction is non-obvious, `SlashCommand: /design-harness:explore <goal>`
to fan out variants, then reconverge before building.

---

## Step 3: Build (on a worktree)

Create an isolated worktree/branch `design-<slug>`. Implement against the spec's
acceptance criteria, reusing existing primitives and the mirrored pattern.

For independent chunks, launch up to **3 parallel `Agent` calls** (general-purpose)
in one message. Each agent prompt is self-contained: the feature slice, its
acceptance criteria, relevant file paths, the project's `CLAUDE.md` conventions, and
the applicable `DS-*`/`VB-*` rules. Agents implement, run the build, commit, and
report back with branch + files + results — they **do not merge**. Sequence agents
that would touch the same files.

---

## Step 4: Prove (USER-TEST gate)

`SlashCommand: /design-harness:design-check` on the worktree. It serves the work per the spec's
**build mode** (`standalone-html` | `nextjs` | `fullstack`), captures the Playwright
proof, runs axe + the DOM audit, consults ui-ux-pro-max, verifies the acceptance
criteria, and writes the `design-check report`.

The gate clears only on **`FAIL: 0`**. On any failure, surface the listed fixes and
return to Step 3. Do not proceed.

---

## Step 5: Approve

On a clean gate, `SlashCommand: /design-harness:approve "<slug>: what & why"`. It merges the branch
(the proof-gate hook enforces the passing proof), appends to `notes/session-log.md`,
and hardens durable decisions + acceptance criteria into `design-system.md` via the
doc-update discipline. Approval is never automatic — confirm before running it.

---

## Step 6: Summary (checkpoint boundaries only)

At a batch boundary, a USER-TEST gate, or completion:
- what shipped (features + acceptance criteria met),
- branch + merge sha + any new `DS-*` rules,
- failures / skips + reasons,
- the next gate's `design-check` report with `file://` proof links, inline,
- resume command: `/design-harness:design-feature` (auto-detects state and continues).

No per-step chatter — only at boundaries.

---

## Invariants

- **Self-contained.** Never reads or edits any other workflow's files.
- **Delegate, don't reimplement** — chain `design-context`, `/design-harness:explore`,
  `/design-harness:design-check`, `/design-harness:approve`. 
- **Announce every stage decision**; be resume-safe.
- **Max 3 parallel agents.**
- **Gate before merge** — never merge without a `FAIL: 0` proof; `/design-harness:approve` does the
  merge and is itself proof-gated.
- **AskUserQuestion at real forks** — scope, variant choice, approval.
