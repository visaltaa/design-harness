#!/usr/bin/env node
// Design harness proof-gate (PreToolUse : Bash).
//
// Blocks `git merge` of a feature branch INTO the base branch unless a fresh,
// passing design-check proof (a report.md containing "FAIL: 0") exists. This is
// the deterministic backstop for "never approve without proof"; the /design-harness:approve
// command also checks, so this only catches direct merges.
//
// Design choices:
//   - Only gates the "approve direction": merges run while ON the base branch
//     (main/master/develop/trunk or $DESIGN_HARNESS_BASE). Merging the base INTO
//     a feature branch (updating your branch) is never blocked.
//   - Fails OPEN on any internal error, so a hook bug can never wedge you.
//   - Escape hatch: DESIGN_HARNESS_SKIP_GATE=1 for legitimate non-design merges.
//
// Env:
//   DESIGN_HARNESS_BASE                 extra base branch name to gate on
//   DESIGN_HARNESS_PROOF_MAX_AGE_MIN    freshness window, minutes (default 120)
//   DESIGN_HARNESS_SKIP_GATE=1          bypass entirely

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function allow() { process.exit(0); } // emit nothing => default permission flow
function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

function main() {
  if (process.env.DESIGN_HARNESS_SKIP_GATE === "1") return allow();

  let data = {};
  try { data = JSON.parse(readStdin() || "{}"); } catch { return allow(); }

  const cmd = String(data.toolInput?.command ?? data.tool_input?.command ?? "");
  if (!cmd) return allow();

  // Only react to `git merge`. Ignore merge --abort/--continue/--quit.
  if (!/\bgit\b[^\n]*\bmerge\b/.test(cmd)) return allow();
  if (/--abort|--continue|--quit/.test(cmd)) return allow();

  const cwd = process.cwd();
  const gitOpt = { cwd, stdio: ["ignore", "pipe", "ignore"] };

  let branch = "";
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpt).toString().trim();
  } catch { return allow(); }

  const base = (process.env.DESIGN_HARNESS_BASE || "").trim();
  const baseBranches = new Set(
    [base, "main", "master", "develop", "trunk"].filter(Boolean)
  );
  // Only gate merges INTO the base branch (the approve direction).
  if (!baseBranches.has(branch)) return allow();

  const proofsDir = path.join(cwd, "notes", "design-harness", "proofs");
  let dirs = [];
  try {
    dirs = fs.readdirSync(proofsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(proofsDir, d.name));
  } catch {
    return deny(
      "Blocked: no design-check proofs found (notes/design-harness/proofs/ is " +
      "missing). Run /design-harness:design-check before merging into " + branch + "."
    );
  }

  const maxAgeMin = Number(process.env.DESIGN_HARNESS_PROOF_MAX_AGE_MIN || 120);
  const now = Date.now();
  let passing = null;
  for (const dir of dirs) {
    const report = path.join(dir, "report.md");
    let stat, text;
    try {
      stat = fs.statSync(report);
      text = fs.readFileSync(report, "utf8");
    } catch { continue; }
    const ageMin = (now - stat.mtimeMs) / 60000;
    if (/FAIL:\s*0\b/.test(text) && ageMin <= maxAgeMin) {
      if (!passing || stat.mtimeMs > passing.mtime) {
        passing = { dir, mtime: stat.mtimeMs };
      }
    }
  }

  if (passing) return allow();
  return deny(
    `Blocked: no passing design-check proof in the last ${maxAgeMin} min ` +
    `(need a report.md with "FAIL: 0"). Run /design-harness:design-check, then merge. ` +
    `Override a non-design merge with DESIGN_HARNESS_SKIP_GATE=1.`
  );
}

try { main(); } catch { allow(); }
