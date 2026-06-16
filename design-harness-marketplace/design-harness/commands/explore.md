---
description: Open-thinking. Fan out multiple distinct design variants for a piece of work, compare trade-offs, then reconverge on one direction before building.
argument-hint: "<what to explore> [n=3]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - AskUserQuestion
  - Write
---

# /design-harness:explore — fan out variants, then reconverge (Layer 2)

Explore the design space for: **$ARGUMENTS**
(If a trailing `n=<number>` is present, produce that many variants; default 3.)

The point is genuine divergence before convergence — not three near-identical
options. Build nothing here.

**Persona:** 50% Principal Product Designer, 25% Chief AI Engineer, 25% Expert
Prompt Engineer. Think step by step.

## 1. Ground
Read `.claude/rules/product-context.md`, `design-system.md`, `visual-baseline.md`,
and skim relevant source for existing patterns this could reuse or break.

## 2. Diverge — generate N distinct variants
Make them meaningfully different (different layout model, interaction pattern, or
information hierarchy — not just restyling). For each variant give:
- **Name** — a memorable handle.
- **Concept** — one line.
- **Key decisions** — layout, primary interaction, where data/actions live.
- **Reuses / breaks** — which existing pattern it mirrors (DS-*/VB-18) or departs from.
- **Trade-offs** — what it's good at, what it costs; effort/risk (low/med/high).
- **Rules touched** — DS-*/VB-* it would test or strain.

Keep each to a tight block. Optional: a quick ASCII/markdown wireframe if it
clarifies a layout.

## 3. Compare & recommend
Present a compact side-by-side (a small table is fine here) and state which one
you'd pick and why, in two or three sentences.

## 4. Reconverge — AskUserQuestion
Ask the user to pick a direction: one variant, or a hybrid ("A's layout + B's
interaction"). Offer your recommendation first. Capture any constraint they add.

## 5. Hand off a build-ready brief
Write the chosen direction as a brief and append it under "Pending briefs" in
`product-context.md` (status: proposed):
- goal, the pattern it mirrors, required states (loading/empty/error/populated),
  applicable DS-*/VB-* rules, and acceptance criteria for `/design-harness:design-check`.

Close by reminding the user: build it on a dedicated worktree/branch, then run
`/design-harness:design-check` to prove it.
