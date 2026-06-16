<div align="center">

# design-harness

**Agentic design harness for Claude Code** — explore complex UI, build it on isolated
worktrees, **prove it with Playwright**, and harden a design system that doubles as a
test suite.

<p>
  <img alt="Claude Code plugin" src="https://img.shields.io/badge/Claude%20Code-plugin-d97757">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.0-3b82f6">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-22c55e">
  <img alt="proof" src="https://img.shields.io/badge/proof-Playwright%20%2B%20axe-2ea44f?logo=playwright&logoColor=white">
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white">
</p>

</div>

`design-harness` is a **Claude Code plugin**: a bundle of skills, slash commands,
hooks, and one Playwright script that turns UI work into a repeatable
sense → build → prove → approve loop — where every approval feeds learnings back
into the rules. The only code is `scripts/proof.mjs`; everything else is markdown
that steers Claude.

> **Command namespace.** Plugin commands and skills are namespaced under the plugin
> name, so every invocation is prefixed with `design-harness:` — e.g.
> `/design-harness:approve`.

## Architecture

```mermaid
flowchart TB
  orch["<b>/design-harness:design-feature</b> · orchestrator<br/>Spec → [Explore] → Build → Prove → Approve"]

  subgraph loop["the loop"]
    direction LR
    ctx["<b>design-context</b><br/>Layer 2 · scope → spec"]
    build["<b>build</b><br/>git worktree · vs spec"]
    check["<b>design-check</b><br/>Layer 3 · prove + verify"]
    gate{"FAIL = 0?"}
    approve["<b>approve</b><br/>merge + harden"]
    ctx --> build --> check --> gate
    gate -->|pass| approve
  end

  orch -.->|chains the loop| ctx

  explore["/design-harness:explore<br/>variants · optional"]
  build -.-> explore

  proof["proof.mjs · Playwright"]
  artifacts["proof/ · gif · frames<br/>checks.json · report.md"]
  verify["verify · ui-ux-pro-max + axe + DS-*"]
  check --> proof --> artifacts --> verify

  hook["approve-gate.mjs hook<br/>PreToolUse on Bash"]
  hook -.->|gates merge| gate

  subgraph kb["Layer 1 · Knowledge base — .claude/rules/ ← rules-templates/"]
    direction LR
    vb["<b>visual-baseline.md</b><br/>VB-* · portable floor"]
    ds["<b>design-system.md</b><br/>DS-* · rules → tests"]
    pc["<b>product-context.md</b><br/>what & why · glossary"]
  end

  approve -->|"harden · new DS-* + session-log"| kb
  kb -->|reads| ctx

  classDef purple fill:#ede9fe,stroke:#7c3aed,color:#3b0764;
  classDef blue fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
  classDef orange fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
  classDef green fill:#dcfce7,stroke:#16a34a,color:#14532d;
  classDef red fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;
  classDef cyan fill:#cffafe,stroke:#0891b2,color:#164e63;
  classDef magenta fill:#fae8ff,stroke:#c026d3,color:#701a75;
  classDef yellow fill:#fef9c3,stroke:#ca8a04,color:#713f12;

  class orch purple
  class ctx purple
  class build blue
  class check orange
  class gate red
  class approve green
  class explore yellow
  class proof blue
  class artifacts cyan
  class verify magenta
  class hook red
  class vb blue
  class ds orange
  class pc cyan
```

## The three layers

| Layer | Job | How it's encoded |
|------|-----|------------------|
| **1 · Visual** | A portable baseline + an evolving design system that hardens into a test suite | `CLAUDE.md` (always-on) + `rules/visual-baseline.md` + `rules/design-system.md` |
| **2 · Context** | Sense new work, interrogate you, fan out variants before converging | `design-context` skill (auto-fires) + `/design-harness:explore` + `rules/product-context.md` |
| **3 · Agentic** | Build on a worktree → prove → verify → approve, then loop learnings back up | `design-check` skill + `/design-harness:approve` + `hooks/` + `scripts/proof.mjs` |

## Install

```bash
# point Claude Code at the marketplace (local path, or a GitHub <owner>/<repo>)
claude plugin marketplace add /absolute/path/to/design-harness-marketplace

# install the plugin (project scope shares it with your team via .claude/)
claude plugin install design-harness@design-harness-marketplace --scope project
```

Then copy the rule templates into your repo, wire the `CLAUDE.md` snippet, and
install the proof toolchain (`npm i -D playwright && npx playwright install chromium`).
Full steps in [INSTALL.md](design-harness-marketplace/design-harness/INSTALL.md).

## Commands & skills

Every invocation is prefixed with `design-harness:`.

- **`/design-harness:design-feature <seed>`** — run the whole workflow end to end (resume-safe).
- **`design-context`** (skill) — grounds new work in the rules, asks what's unknown, writes the spec.
- **`/design-harness:explore <thing> [n=3]`** — fan out N distinct variants, compare, reconverge.
- **`/design-harness:design-check`** (skill) — capture a Playwright proof, verify, write the report.
- **`/design-harness:approve [note]`** — merge the worktree, log, and fold learnings into the rules.

## Documentation

- **[Plugin README](design-harness-marketplace/design-harness/README.md)** — full overview, architecture, and component reference.
- **[INSTALL.md](design-harness-marketplace/design-harness/INSTALL.md)** — setup & first run.
- **[USAGE.md](design-harness-marketplace/design-harness/USAGE.md)** — one-page quickstart + build modes.

## Repository layout

```
design-harness/                          ← this repo
├─ LICENSE                               MIT
├─ README.md                             ← you are here
└─ design-harness-marketplace/           the Claude Code marketplace
   ├─ .claude-plugin/marketplace.json
   └─ design-harness/                    the plugin
      ├─ .claude-plugin/plugin.json
      ├─ skills/  commands/  hooks/  scripts/
      ├─ rules-templates/  templates/
      └─ README.md · INSTALL.md · USAGE.md
```

## License

MIT © 2026 Visal Medepalli. See [LICENSE](LICENSE).
