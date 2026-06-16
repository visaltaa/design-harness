# Install & first run

## 1. Install the plugin

From the directory that contains this marketplace (`design-harness-marketplace/`):

```bash
# point Claude Code at the local marketplace
claude plugin marketplace add /absolute/path/to/design-harness-marketplace

# install the plugin (project scope shares it with your team via .claude/)
claude plugin install design-harness@design-harness-marketplace --scope project
```

To distribute it instead, push `design-harness-marketplace/` to a git repo and
run `claude plugin marketplace add <owner>/<repo>`.

## 2. Set up a project repo

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

## 3. First run

```bash
# start a feature on an isolated worktree
git worktree add ../wt-my-feature -b my-feature
cd ../wt-my-feature
```

In Claude Code:

1. Describe the work. `design-context` should fire — answer its questions.
   Optionally `/explore my idea n=3` to compare variants, then reconverge.
2. Build it.
3. `/design-check` — it starts the dev server, captures the proof to
   `notes/design-harness/proofs/<date-slug>/`, verifies against the rules, and
   prints the `design-check report` with a `file://` proof link and a live preview.
4. If clean (`FAIL: 0`), run `/approve "what & why"`. It merges, appends to
   `notes/session-log.md`, and adds any new `DS-*` rules to your design system.

## Verifying the proof script directly

```bash
# sanity check the report format without a browser ($HARNESS from step 2 above)
node "$HARNESS"/scripts/proof.mjs --selftest

# a real capture (dev server must be running)
node "$HARNESS"/scripts/proof.mjs --url http://localhost:3000/library \
  --route /library --mode interactive --slug library-dropup --base main --pid <devpid>
```

## The merge gate

A `PreToolUse` hook blocks `git merge` **into your base branch** unless a fresh
`design-check` proof reports `FAIL: 0`. It only fires in the approve direction
(merging a feature into `main`/`master`/`develop`/`trunk`), so updating your
feature branch with `git merge main` is never blocked.

- `DESIGN_HARNESS_BASE=release` — add another branch name to gate on.
- `DESIGN_HARNESS_PROOF_MAX_AGE_MIN=240` — widen the freshness window.
- `DESIGN_HARNESS_SKIP_GATE=1 git merge ...` — bypass for a non-design merge.
