---
name: design-check
description: Use to verify UI work before approval. Starts the dev server, captures a Playwright proof (GIF for interactive changes, screenshots for static), checks the live page against the visual baseline and design-system rules using both deterministic checks and visual judgment, and writes a PASS/FAIL design-check report in the fixed format. Run automatically after finishing a build on a worktree, or explicitly as /design-harness:design-check.
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
---

# design-check — build → prove → verify → report (Layer 3)

Produce a trustworthy, reproducible verdict on UI work, backed by a proof folder.
Verification is **hybrid**: deterministic where possible, judged where it isn't.

This skill is also the verification step at a **USER-TEST gate** — driven by the
harness's own `/design-harness:design-feature` orchestrator, or by any other workflow you run. It
is the structured, proof-backed form of "run Playwright + ui-ux-pro-max and confirm
it works": `proof.mjs` is the Playwright run, and step 3 consults ui-ux-pro-max for
the design-intelligence judgment. When invoked at a gate, return a clean PASS/FAIL
so the orchestrator can proceed (`/design-harness:approve`) or halt.

## 0. Preconditions
- Confirm you are on a feature **worktree/branch**, not the base branch
  (`git rev-parse --abbrev-ref HEAD`). If on base, stop and warn.
- Resolve the dev command + port and the **base branch** for the changelog from
  `.claude/rules/product-context.md` (default: `npm run dev`, port 3000, base `main`).
- Identify the **route(s)/component** under test. Infer from changed files
  (`git diff --name-only <base>...HEAD`); if ambiguous, ask the user.
- Resolve the **build mode** — `standalone-html` | `nextjs` | `fullstack` — from
  the task prompt (a mention there overrides) or the `product-context.md` default.
  It decides how the work is served for the proof (step 1).
- Decide **capture mode**: `interactive` if the change involves interaction (menus,
  popovers, forms, hover/focus) → GIF; else `static` → screenshot. (This is the
  `--mode` passed to `proof.mjs`.)

## 1. Serve the work (keep it running) — by build mode
- **`standalone-html`** — no dev server or build. Point the proof at the file
  directly (`file://<abs path>`), or serve the folder statically if it has assets
  (`npx serve <dir>` / `python3 -m http.server`). There is no PID; the report's
  live-preview line is just the file/URL. Skip server-only checks.
- **`nextjs`** (default) — start the dev server in the background, capture its
  **PID**, and poll the URL until it responds. Keep it running; the report hands
  the live preview to the user.
- **`fullstack`** — start the web dev server **and** its backend/API; ensure
  required env vars and any seed data are present; capture the web PID. Step 3
  verification also covers data-driven and auth states.

```bash
# nextjs / fullstack:
( npm run dev >/tmp/design-harness-dev.log 2>&1 & echo $! > /tmp/design-harness-dev.pid )
# poll http://localhost:3000 until 200, then read the PID
```

## 2. Capture the proof
Run the bundled Playwright script. It writes a timestamped proof folder, captures
console output, runs the automated checks, and writes a report **stub**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/proof.mjs" \
  --url "http://localhost:3000/<route>" \
  --route "/<route>" \
  --mode <interactive|static> \
  --slug "<short-kebab-label>" \
  --base "<base-branch>" \
  --pid "$(cat /tmp/design-harness-dev.pid)" \
  --label "/<route>"
```

For an interactive flow, pass `--steps <path>` to a small steps module
(`export default async (page, capture) => { ... }`) that drives the exact
interaction and calls `capture('name')` at each meaningful frame. Without it, the
script runs a generic scroll/hover capture.

The script produces in `notes/design-harness/proofs/<date-slug>/`:
`flow.gif` (or `static.png`), `frame-*.png`, `console.log`, `checks.json`,
`flow.webm` (interactive), and a stub `report.md`.

## 3. Verify — hybrid
Read `checks.json` and the three rule files, then judge every applicable rule.

**Deterministic (`[auto:*]`)** — from `checks.json` and source greps:
- axe violations → fail the mapped VB rule (VB-08 contrast, VB-13 names, VB-06
  headings, etc.).
- baseline DOM audit → VB-10 pointer cursor, VB-12 focus-visible, VB-14 tap size.
- console errors / failed requests → VB-21.
- source greps you run here: VB-01 (no raw hex/rgb/hsl in changed components),
  VB-19 (shared primitives reused).

**Judged (`[judge]`)** — open the GIF/frames/screenshot and evaluate the
subjective rules: hierarchy (VB-05), spacing rhythm (VB-04), state coverage
(VB-16), and especially **pattern mirroring (VB-18)** and the project's `DS-*`
rules. For each `DS-*`, run its declared `check`.

**Design intelligence (ui-ux-pro-max)** — before finalizing the judged rules,
pull relevant guidance and audit against it. This is the gate's ui-ux-pro-max
consult, made systematic:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<feature/domain>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<feature/domain>" --domain style
# fallback if not project-level: ~/.claude/skills/ui-ux-pro-max/scripts/search.py ...
```
Audit the captured frames/screenshot against the returned guidelines and run
ui-ux-pro-max's pre-delivery checklist; treat material misses as judged failures.
Also verify any **feature acceptance criteria** from the spec
(`notes/design-harness/specs/<slug>.md`) or the pending brief.
Skip gracefully (note it) if the script isn't installed.

**Figma parity (if available)** — if a Figma reference exists for this screen,
fetch its screenshot and compare layout/hierarchy against the captured frame; flag
material divergence as a judged failure.

## 4. Write the final report
Overwrite `report.md` in the proof folder with EXACTLY this shape (this is the
contract — keep the header, tally, changelog, proof links, and live-preview block):

```
design-check report — <label> — <ISO8601 timestamp>

Branch:    <branch>
Worktree:  <worktree abs path>
HEAD:      <short-sha> <commit subject>
Working:   clean | dirty

PASS: <n> rules · FAIL: <m> · <one-line summary>

What was fixed across this thread of work:
1. <short-sha> — <subject>          (from: git log <base>..HEAD --oneline, oldest→newest)
2. ...

Failures (only if m > 0):
- <RULE-ID> — <what failed and the fix>

Proof:
file://<proof dir>/flow.gif            (or static.png)

Folder also has the <N> source frames, the report.md, and the browser console log:
file://<proof dir>/

Live preview (server still running for you to poke):
http://localhost:3000/<route>
PID <pid> — kill with kill <pid> or pkill -f "next dev" when you're done.
```

Most header fields and the changelog are already in the stub from `proof.mjs`;
your job is to finalize the PASS/FAIL tally, the Failures list, and confirm the
proof/preview links.

## 5. Report to the user
Print the report and the `file://` proof link in chat. Then:
- **FAIL > 0** → list each failure with a concrete fix. Do not suggest `/design-harness:approve`.
- **FAIL = 0** → say it's clean and ready, and that they can poke the live preview
  or run `/design-harness:approve` to merge and fold learnings back into the rules.

Never merge here. Approval is always an explicit, separate `/design-harness:approve`.

**At an orchestrator gate (`/design-harness:design-feature` or your own):** report the same way,
then return the verdict — `FAIL: 0` clears the USER-TEST gate (the orchestrator may
proceed to `/design-harness:approve`); any failure halts with the failures surfaced.
