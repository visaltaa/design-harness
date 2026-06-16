# Product context

What we are building and why. The `design-context` skill reads this to ground new
work, asks you about anything missing (via AskUserQuestion), and proposes updates.
`/design-harness:approve` promotes proposed updates to confirmed. Keep it current — this is the
brief every design decision is measured against.

## Build & dev defaults
- **Default build mode**: `nextjs`   <!-- standalone-html | nextjs | fullstack -->
- **Dev command / port**: `npm run dev` · 3000
- **Base branch**: `main`

Override the build mode per task by saying it in the request — e.g. "build X as a
standalone HTML prototype" or "…as a full-stack feature". This default is used
only when you don't specify.

## Product
<!-- One paragraph: what the product is and the outcome it delivers. -->
_TODO: describe the product._

## Users & segments
<!-- Who uses it, their context, their level of expertise. -->
- _TODO: primary user_
- _TODO: secondary user_

## Core jobs (what users are trying to do)
<!-- Jobs-to-be-done, most important first. -->
1. _TODO_

## Features
<!-- For each feature: what it does, its current states, and known gaps.
     Mark each as: shipped | in-progress | planned. -->

### <Feature name> — status: planned
- does: _TODO_
- states: loading / empty / error / populated — _which exist?_
- gaps: _TODO_

## Glossary
<!-- Domain terms so Claude uses your vocabulary, not generic synonyms. -->
- **Term** — definition.

## Non-goals
<!-- Things we are deliberately NOT doing, to prevent scope creep. -->
- _TODO_

## Open questions
<!-- Unknowns design-context will ask about when they become relevant. -->
- _TODO_

---

## Pending briefs (proposed by design-context / explore — promoted on /design-harness:approve)
<!-- design-context appends a short brief here when you start new work. It stays
     "proposed" until /design-harness:approve folds it into the sections above. -->
