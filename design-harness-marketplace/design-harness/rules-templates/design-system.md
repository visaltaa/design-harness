# Design system (evolving test suite)

This file is the project's living design system **and** its design test suite.
Unlike `visual-baseline.md` (portable, rarely changes), this file **grows during
the design process**: every time you `/approve` work, any durable decision made
along the way is appended here as a rule. On the next `/design-check`, those
rules are checked like any other. This is how a one-off design decision becomes a
permanent guardrail instead of a forgotten note.

## Lifecycle

1. `/explore` or `design-context` surfaces a decision (e.g. "Add-to-X opens a
   popover, never navigates").
2. You build it; `/design-check` proves it.
3. `/approve` appends it here as a `DS-*` rule and logs the rationale in
   `notes/session-log.md`.
4. Future `/design-check` runs enforce it. If a rule turns out wrong, change its
   `status` to `deprecated` (don't delete — keep the history).

## Entry format

```
### DS-NNN — <short title>
- status: active | proposed | deprecated
- since: <YYYY-MM-DD> (commit <sha>)
- rule: <one sentence, testable>
- check: <how /design-check verifies it>
    - [auto:dom] <selector/assertion>  e.g. `[data-add-action] => opens [role=dialog], no navigation`
    - [auto:src] <grep/pattern>
    - [judge] <what to look for in the proof>
- rationale: <why — link the session-log entry>
- applies-to: <routes / components>
```

---

## Active rules

### DS-001 — "Add to X" actions open a mirrored popover
- status: active
- since: 2026-05-07 (commit af01153)
- rule: Any "Add to <collection-like-thing>" action opens a popover that mirrors
  the canonical "Add to collection" pattern (top "New <thing>" action, scrollable
  list with member counts, bottom search/name input). It never navigates on click.
- check:
    - [auto:dom] clicking `[data-add-action]` opens `[role="dialog"]` and the URL
      does not change
    - [auto:dom] the popover trigger and all list items have `cursor: pointer`
    - [judge] layout matches the collection popover (new-action top, list middle,
      search bottom)
- rationale: License "Add to license" was a navigate-on-click button that
  diverged from the established collection pattern; unifying them removed a
  silent inconsistency. See session-log 2026-05-07 license-dropup.
- applies-to: /library, any "add to <container>" control

<!-- New DS-* rules are appended below by /approve. Keep them small and testable. -->
