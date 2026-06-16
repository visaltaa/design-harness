---
description: Approve verified design work — merge the worktree branch, log what changed & why, and fold durable decisions back into the design-system / product-context rules.
argument-hint: "[short note on what & why]"
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
---

# /design-harness:approve — merge, log, and loop learnings back (Layer 3 → Layers 1/2)

This is the only step that mutates the base branch and the rule files. It is
user-invoked only. Approval note (optional): **$ARGUMENTS**

Current state (injected):
- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null`
- Status: !`git status --short 2>/dev/null`
- Commits vs base: !`git log --oneline main..HEAD 2>/dev/null | head -20`
- Latest proof folder: !`ls -t notes/design-harness/proofs 2>/dev/null | head -1`

## Procedure

### 1. Gate on a passing proof
Open the latest proof folder's `report.md`. Proceed only if it corresponds to the
current branch/HEAD and shows **FAIL: 0**. If there is no proof, it's stale, or it
has failures, STOP and tell the user to run `/design-harness:design-check` first. (A `git merge`
hook also enforces this, but check here so we fail fast and clearly.)

### 2. Merge
Determine the base branch (default `main`; confirm from product-context if set).
Merge the feature branch into the base with a non-fast-forward merge so the thread
of work stays legible, then report the resulting merge commit:
```bash
git checkout <base> && git merge --no-ff <feature-branch> -m "approve: <slug> — <one-line summary>"
```
If working in a separate worktree, merge the branch into the base worktree's
checkout rather than switching the current one. Do not delete the branch unless
the user asks.

### 3. Append to the session log
Append an entry to `notes/session-log.md` (create it if missing):
```
## <YYYY-MM-DD HH:MM> — <slug>
- branch: <feature-branch>  →  <base> (merge <short-sha>)
- what changed: <plain-language summary, drawn from the proof report's changelog>
- why: <rationale — incorporate the approval note: $ARGUMENTS>
- rules touched: <DS-*/VB-* added, changed, or enforced>
- proof: file://<proof dir>/
```

### 4. Loop the learnings back (doc-update protocol)
This is what makes the harness self-improving. Updating a reviewed rule file is
governed by the same discipline as `/build-feature`'s Step 1.5 — **never silently
overwrite** a reviewed doc. For each target file, pick a mode:

- **Append (default)** — add new entries (a `DS-NNN` rule, a promoted brief)
  without touching existing content. The common case.
- **Delta-update** — when refining an existing rule, append a dated revision
  (`## Revision <YYYY-MM-DD> — <what changed>`) rather than rewriting it.
- **Backup-and-replace** — only for a structural rewrite: back up first
  (`cp design-system.md design-system.backup-$(date +%Y%m%d-%H%M%S).md`), then
  rewrite, and announce the backup path.
- **Review** — if unsure, show the diff and ask before writing.

Apply it per file:
- **design-system.md** — append durable decisions as new `DS-NNN` rules (status:
  active, since: today + merge sha, a concrete `check`, rationale → the log entry).
  Continue numbering from the highest existing ID. Wrong rules become
  `status: deprecated`, never deleted.
- **product-context.md** — promote the relevant Pending brief into the confirmed
  sections (Features/Glossary/Non-goals), then remove it from Pending.
- **visual-baseline.md** — touch ONLY for a genuinely portable rule, and ask first.

Also graduate any **feature acceptance criteria** that proved durable: move them
from the brief / `2-features.md` into `DS-*` checks, so the next `/design-harness:design-check`
enforces "done" for this feature automatically.

### 5. Confirm
Summarize in chat: what merged (merge sha), which `DS-*` rules were added/updated,
the product-context updates, and the session-log entry. Note that the next
`/design-harness:design-check` will enforce the new rules.
