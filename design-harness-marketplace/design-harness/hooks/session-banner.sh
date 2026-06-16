#!/bin/sh
# Design harness — SessionStart banner. Reminds you (and Claude) of the loop and
# where the rules live. Pure POSIX sh, no dependencies. Output is added to context.
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-git")
echo "── design-harness ──────────────────────────────────────────"
echo "branch: $branch"
echo "rules:  .claude/rules/{visual-baseline,design-system,product-context}.md"
echo "loop:   design-context -> build (worktree) -> /design-harness:design-check -> /design-harness:approve"
echo "gate:   merging into the base branch is blocked until a fresh"
echo "        design-check proof reports FAIL: 0."
echo "────────────────────────────────────────────────────────────"
