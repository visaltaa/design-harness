#!/usr/bin/env node
/**
 * design-harness proof capture.
 *
 * Drives a running dev server with Playwright and writes a timestamped proof
 * folder under notes/design-harness/proofs/<date-slug>/ containing:
 *   - flow.gif (interactive) or static.png (static)
 *   - frame-01.png .. frame-NN.png  (source frames)
 *   - flow.webm                     (interactive, raw recording)
 *   - console.log                   (browser console + page errors + failed requests)
 *   - checks.json                   (axe-core + baseline DOM audit results)
 *   - report.md                     (STUB: header, changelog, automated checks, links)
 *
 * It does NOT pass final design judgment — the /design-harness:design-check skill reads
 * checks.json + the frames, evaluates the design-system / visual-baseline rules,
 * and overwrites report.md's tally with the final "PASS: n rules · FAIL: m".
 *
 * Usage:
 *   node proof.mjs --url http://localhost:3000/library --slug library-dropup \
 *      --mode interactive --route /library --base main --pid 99608 [--steps ./steps.mjs]
 *   node proof.mjs --selftest         # no browser; prints a sample report
 *
 * Requires (on the user's machine): playwright. Optional: ffmpeg (for the GIF).
 *   npm i -D playwright && npx playwright install chromium
 */

import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";

// ---------- arg parsing ----------
function parseArgs(argv) {
  const a = { mode: "static", out: "notes/design-harness/proofs", base: "main", frames: 6 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--selftest") a.selftest = true;
    else if (t === "--no-axe") a.noAxe = true;
    else if (t === "--no-gif") a.noGif = true;
    else if (t.startsWith("--")) { a[t.slice(2)] = argv[i + 1]; i++; }
  }
  if (a.frames) a.frames = Number(a.frames);
  return a;
}

// ---------- small helpers ----------
const pad2 = (n) => String(n).padStart(2, "0");

function sh(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch { return ""; }
}

function isoNow() { return new Date().toISOString().replace(/\.\d+Z$/, "Z"); }

function stampDir(slug) {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
  return `${stamp}-${(slug || "proof").replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}`;
}

function gitInfo(cwd, base) {
  const branch = sh("git rev-parse --abbrev-ref HEAD", cwd) || "unknown";
  const worktree = sh("git rev-parse --show-toplevel", cwd) || cwd;
  const headShort = sh("git rev-parse --short HEAD", cwd) || "0000000";
  const subject = sh("git log -1 --pretty=%s", cwd) || "(no commits)";
  const dirty = sh("git status --porcelain", cwd);
  const working = dirty ? "dirty" : "clean";
  let changelog = [];
  const log = sh(`git log --oneline --reverse ${base}..HEAD`, cwd);
  if (log) changelog = log.split("\n").map((l) => l.trim()).filter(Boolean);
  return { branch, worktree, headShort, subject, working, changelog };
}

// ---------- report rendering ----------
function renderReport(o) {
  const lines = [];
  lines.push(`design-check report — ${o.label} — ${o.iso}`);
  lines.push("");
  lines.push(`Branch:    ${o.git.branch}`);
  lines.push(`Worktree:  ${o.git.worktree}`);
  lines.push(`HEAD:      ${o.git.headShort} ${o.git.subject}`);
  lines.push(`Working:   ${o.git.working}`);
  lines.push("");
  lines.push(o.tally);
  lines.push("");
  lines.push("What was fixed across this thread of work:");
  if (o.git.changelog.length) {
    o.git.changelog.forEach((c, i) => {
      const m = c.match(/^(\S+)\s+(.*)$/);
      lines.push(m ? `${i + 1}. ${m[1]} — ${m[2]}` : `${i + 1}. ${c}`);
    });
  } else {
    lines.push("(no commits ahead of base — working-tree changes only)");
  }
  lines.push("");
  if (o.failures && o.failures.length) {
    lines.push("Failures:");
    o.failures.forEach((f) => lines.push(`- ${f}`));
    lines.push("");
  }
  lines.push("Automated checks:");
  o.autoChecks.forEach((c) => lines.push(`- ${c}`));
  lines.push("");
  lines.push("Proof:");
  lines.push(`file://${o.absDir}/${o.proofMain}`);
  lines.push("");
  lines.push(`Folder also has the ${o.frameCount} source frames, the report.md, and the browser console log:`);
  lines.push(`file://${o.absDir}/`);
  lines.push("");
  if (o.pid) {
    lines.push("Live preview (server still running for you to poke):");
    lines.push(o.url);
    lines.push(`PID ${o.pid} — kill with kill ${o.pid} or pkill -f "next dev" when you're done.`);
  } else {
    lines.push("Live preview:");
    lines.push(`Start your dev server and open ${o.url || "(url not provided)"}`);
  }
  return lines.join("\n") + "\n";
}

// summarize checks.json into human lines + a pass/fail tally for the stub
function summarizeChecks(checks) {
  const out = [];
  let fail = 0, total = 0;
  const c = checks || {};
  const audit = c.audit || {};
  const con = c.console || {};
  const axe = c.axe || {};
  const mark = (ok, label) => { total++; if (!ok) fail++; out.push(`${ok ? "PASS" : "FAIL"} — ${label}`); };

  mark((con.errors || 0) === 0, `VB-21 console errors: ${con.errors || 0}`);
  mark((con.failedRequests || 0) === 0, `VB-21 failed requests: ${con.failedRequests || 0}`);
  mark((audit.pointerMissing || 0) === 0, `VB-10 interactive elements missing cursor:pointer: ${audit.pointerMissing ?? "?"}`);
  mark((audit.smallTargets || 0) === 0, `VB-14 sub-44px tap targets: ${audit.smallTargets ?? "?"}`);
  mark((audit.imagesNoAlt || 0) === 0, `VB-13 images without alt: ${audit.imagesNoAlt ?? "?"}`);
  mark(audit.focusVisibleRuleFound !== false, `VB-12 :focus-visible styling present: ${audit.focusVisibleRuleFound}`);
  mark((audit.headingSkips || 0) === 0, `VB-06 heading-level skips: ${audit.headingSkips ?? "?"}`);
  if (axe.available) {
    mark((axe.violationCount || 0) === 0, `axe-core violations: ${axe.violationCount || 0}` +
      (axe.violations && axe.violations.length ? ` (${axe.violations.map((v) => v.id).join(", ")})` : ""));
  } else {
    out.push("SKIP — axe-core unavailable (network blocked or --no-axe)");
  }
  return { lines: out, fail, pass: total - fail, total };
}

// ---------- baseline DOM audit (runs in the page) ----------
function domAuditFn() {
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const interactiveSel = 'a[href],button,[role="button"],[onclick],input,select,textarea,[tabindex]:not([tabindex="-1"]),[role="menuitem"]';
  const interactive = Array.from(document.querySelectorAll(interactiveSel)).filter(isVisible);
  let pointerMissing = 0, smallTargets = 0;
  for (const el of interactive) {
    const s = getComputedStyle(el);
    const clickable = el.matches('a[href],button,[role="button"],[onclick],[role="menuitem"]');
    if (clickable && s.cursor !== "pointer") pointerMissing++;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) smallTargets++;
  }
  const imagesNoAlt = Array.from(document.images).filter((i) => !i.alt && i.getAttribute("role") !== "presentation").length;

  // heading order
  const levels = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => Number(h.tagName[1]));
  let headingSkips = 0;
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) headingSkips++;

  // does any stylesheet define :focus-visible?
  let focusVisibleRuleFound = false;
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule.selectorText && rule.selectorText.includes(":focus-visible")) { focusVisibleRuleFound = true; break; }
      }
      if (focusVisibleRuleFound) break;
    }
  } catch { /* ignore */ }

  return { interactiveCount: interactive.length, pointerMissing, smallTargets, imagesNoAlt, headingSkips, focusVisibleRuleFound };
}

// ---------- default interactive routine ----------
async function defaultInteraction(page, capture, max) {
  await capture("load");
  // reveal lower content
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => {});
  await page.waitForTimeout(250);
  await capture("scroll-mid");
  // hover a few interactive elements
  const handles = await page.$$('button,[role="button"],a[href],[role="menuitem"]');
  for (let i = 0; i < handles.length && i < max - 3; i++) {
    try { await handles[i].hover({ timeout: 800 }); await page.waitForTimeout(150); await capture(`hover-${i}`); } catch { /* skip */ }
  }
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await capture("top");
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();

  // ----- selftest: no browser, just exercise git + report rendering -----
  if (args.selftest) {
    const git = gitInfo(cwd, args.base);
    const sample = {
      console: { errors: 0, warnings: 1, failedRequests: 0 },
      audit: { interactiveCount: 14, pointerMissing: 0, smallTargets: 0, imagesNoAlt: 0, headingSkips: 0, focusVisibleRuleFound: true },
      axe: { available: true, violationCount: 0, violations: [] },
    };
    const s = summarizeChecks(sample);
    const report = renderReport({
      label: "/library", iso: isoNow(), git,
      tally: `Automated: ${s.pass}/${s.total} checks pass · design rules PENDING — run /design-harness:design-check to finalize.`,
      autoChecks: s.lines, failures: [], absDir: path.join(cwd, "notes/design-harness/proofs/SAMPLE"),
      proofMain: "flow.gif", frameCount: 6, url: "http://localhost:3000/library", pid: 99608,
    });
    process.stdout.write("----- SELFTEST report.md -----\n" + report + "----- end -----\n");
    return;
  }

  if (!args.url || !args.slug) {
    console.error("error: --url and --slug are required (or use --selftest).");
    process.exit(2);
  }

  const label = args.label || args.route || args.url;
  const dirName = stampDir(args.slug);
  const absDir = path.resolve(cwd, args.out, dirName);
  fs.mkdirSync(absDir, { recursive: true });

  // lazy-load Playwright
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    try { ({ chromium } = await import("@playwright/test")); }
    catch {
      console.error("Playwright not installed. Run: npm i -D playwright && npx playwright install chromium");
      process.exit(3);
    }
  }

  const consoleLines = [];
  let consoleErrors = 0, failedRequests = 0;

  const browser = await chromium.launch();
  const context = await browser.newContext(
    args.mode === "interactive" ? { recordVideo: { dir: absDir, size: { width: 1280, height: 800 } } } : {}
  );
  const page = await context.newPage();
  page.setViewportSize({ width: 1280, height: 800 });

  page.on("console", (m) => { consoleLines.push(`[${m.type()}] ${m.text()}`); if (m.type() === "error") consoleErrors++; });
  page.on("pageerror", (e) => { consoleLines.push(`[pageerror] ${e.message}`); consoleErrors++; });
  page.on("requestfailed", (r) => { consoleLines.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText || ""}`); failedRequests++; });
  page.on("response", (r) => { if (r.status() >= 400) { consoleLines.push(`[http ${r.status()}] ${r.url()}`); failedRequests++; } });

  let frameCount = 0;
  const capture = async (name) => {
    frameCount++;
    const file = path.join(absDir, `frame-${pad2(frameCount)}.png`);
    await page.screenshot({ path: file, fullPage: args.mode === "static" }).catch(() => {});
    consoleLines.push(`[frame ${pad2(frameCount)}] ${name}`);
  };

  await page.goto(args.url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
    consoleLines.push(`[nav-error] ${e.message}`);
  });
  await page.waitForTimeout(300);

  let proofMain = "static.png";
  if (args.mode === "interactive") {
    proofMain = "flow.gif";
    if (args.steps) {
      try {
        const mod = await import(path.resolve(cwd, args.steps));
        await mod.default(page, capture);
      } catch (e) {
        consoleLines.push(`[steps-error] ${e.message} — falling back to default interaction`);
        await defaultInteraction(page, capture, args.frames);
      }
    } else {
      await defaultInteraction(page, capture, args.frames);
    }
  } else {
    await capture("static");
    await page.screenshot({ path: path.join(absDir, "static.png"), fullPage: true }).catch(() => {});
  }

  // baseline DOM audit
  let audit = {};
  try { audit = await page.evaluate(domAuditFn); } catch (e) { consoleLines.push(`[audit-error] ${e.message}`); }

  // axe-core
  let axe = { available: false, violationCount: 0, violations: [] };
  if (!args.noAxe) {
    try {
      await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js" });
      const res = await page.evaluate(async () => await window.axe.run());
      axe = {
        available: true,
        violationCount: res.violations.length,
        violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      };
    } catch (e) { consoleLines.push(`[axe-skip] ${e.message}`); }
  }

  await context.close(); // finalizes the video
  await browser.close();

  // rename the webm to flow.webm (Playwright uses a random name)
  if (args.mode === "interactive") {
    try {
      const webm = fs.readdirSync(absDir).find((f) => f.endsWith(".webm"));
      if (webm && webm !== "flow.webm") fs.renameSync(path.join(absDir, webm), path.join(absDir, "flow.webm"));
    } catch { /* ignore */ }
  }

  // assemble GIF from frames (ffmpeg, optional)
  if (args.mode === "interactive" && !args.noGif && frameCount > 0) {
    const ff = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    if (ff.status === 0) {
      const vf = "scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse";
      const r = spawnSync("ffmpeg", ["-y", "-framerate", "2", "-start_number", "1", "-i", "frame-%02d.png", "-vf", vf, "flow.gif"],
        { cwd: absDir, stdio: "ignore" });
      if (r.status !== 0) { consoleLines.push("[gif-skip] ffmpeg failed; frames + flow.webm retained"); proofMain = "flow.webm"; }
    } else {
      consoleLines.push("[gif-skip] ffmpeg not found; using flow.webm. Install ffmpeg for a GIF.");
      proofMain = fs.existsSync(path.join(absDir, "flow.webm")) ? "flow.webm" : `frame-01.png`;
    }
  }

  // write artifacts
  fs.writeFileSync(path.join(absDir, "console.log"), consoleLines.join("\n") + "\n");
  const checks = {
    url: args.url, route: args.route || null, mode: args.mode, frames: frameCount,
    console: { errors: consoleErrors, failedRequests }, audit, axe,
  };
  fs.writeFileSync(path.join(absDir, "checks.json"), JSON.stringify(checks, null, 2) + "\n");

  const s = summarizeChecks(checks);
  const git = gitInfo(cwd, args.base);
  const report = renderReport({
    label, iso: isoNow(), git,
    tally: `Automated: ${s.pass}/${s.total} checks pass · design rules PENDING — run /design-harness:design-check to finalize.`,
    autoChecks: s.lines, failures: [], absDir, proofMain, frameCount,
    url: args.url, pid: args.pid,
  });
  fs.writeFileSync(path.join(absDir, "report.md"), report);

  // tell the caller where everything is
  process.stdout.write(JSON.stringify({
    proofDir: absDir, proofMain, frameCount,
    automated: { pass: s.pass, fail: s.fail, total: s.total },
    reportPath: path.join(absDir, "report.md"),
  }) + "\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
