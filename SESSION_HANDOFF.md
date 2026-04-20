# Session Handoff — OTSniffer / Malkan Solutions

> Instructions for a new Claude Code session picking up this project. Read this first, in full, before touching anything.

Last updated: **2026-04-19** (end of W1). Tip of `chainingTools` is `f6c37f8`.

---

## 1. Read these first, in order

Do not recommend, plan, price, or code before reading:

1. **`CLAUDE.md`** (this repo) — architecture, Docker-only rule, CJS/ESM boundary, dev-server routing, scanner pattern.
2. **`C:\Users\b2\.claude\projects\C--Users-b2-source-repos-OTSniffer\memory\MEMORY.md`** — auto-loads; follow the entries it points at.
3. **`docs/tiers-and-glossary.md`** — canonical service-tier names, pricing (floor/anchor/premium), full acronym glossary, value quantification, funding sources.
4. **`G:\My Drive\Ghar Files\4. B2 Docs\Tech Projects\Idea91 OTSniffer\03_Viable Concept\02_Build Status.md`** — what's delivered vs deferred.
5. **`G:\My Drive\Ghar Files\4. B2 Docs\Tech Projects\Idea91 OTSniffer\03_Viable Concept\01_Service Offering & Toolchain.md`** — service offering + positioning.
6. **Agent personas in `.claude/agents/`** — pearl, amber, industry-guy, pricing-analyst, 5 verticals. Skim each before invoking.

If any of the above conflicts with what the user says, trust the file and ask the user to clarify — the files were written deliberately.

---

## 2. Where the project stands

**What works end-to-end (verified green):**
- `otsniff` CLI — `scan:secrets`, `scan:supply-chain`, `merge`, `report` (Playwright PDF).
- Netlify Evidence API (`GET /api/evidence/:assetId`) + Evidence tab on `asset-detail.html`.
- Malkan Solutions brand on all 5 analyst pages (cyan `#0AA2C0`, Inter + Poppins + JetBrains Mono, Emil-Kowalski motion rules).
- 5-page T1 sample PDF: `data/t1-sample.pdf`.
- 11-finding evidence fixture: `data/findings.json` → `data/plant-enriched.json`.
- Docker-first workflow via `compose.toolchain.yml` (services: `node`, `py`, `otsniff`, `report`, `web`).
- 15 Node tests + 3 pytest tests green.

**Service packaging (renamed from T1-T4):**
| Code | Buyer name | Anchor | Duration |
|---|---|---|---|
| T1 | Evidence Pack | $7,500 | 1 wk |
| T2 | Impact Map | $35,000 | 3–4 wk |
| T3 | Proven Pathways | $95,000 | 6–8 wk |
| T4 | Posture Watch | $4,500/mo | retainer |

**Channel wedge:** parallel-primary — OT-practice MSSPs (Dragos/Claroty/Nozomi partner networks) **+** state Rural Water Associations / AWWA chapters. Water utilities are the hot 2026 window. Oil & Gas, Food Packaging, Medical Manufacturing, Industrial Automation are parked this quarter.

---

## 3. What to do next (priority order)

**All copy work — no code required.** Amber calls this the Phase 1 "Sellable Asset Pack." Without these, any "yes" in W3/W4 outreach can't convert.

### A. Draft the Evidence Pack SOW template (highest leverage)
- Use anchor price $7,500; 40% / 60% payment split; 1-week engagement window; liability cap = 1× fee; governing law and venue TBD by sponsor.
- Scope: passive recon + secrets + supply-chain scan against client-provided asset inventory; no active probing.
- Deliverables: 10-page PDF (regulatory cross-refs included), 30-day hosted dashboard, evidence pack SHA-256.
- Save as `docs/templates/sow-evidence-pack.md`.

### B. Draft Rules of Engagement template
- Scope boundaries, maintenance-window clause, no-touch-on-safety-critical-PLCs clause, emergency-stop protocol, evidence chain-of-custody, data-handling retention.
- Save as `docs/templates/roe.md`.

### C. Draft Authorization Letter template
- Signed by client's plant-level security lead + engineering owner; references the ROE; cites NIST 800-82 / IEC 62443 as lawful-use framework.
- Save as `docs/templates/authorization-letter.md`.

### D. Draft intake questionnaire
- Asset inventory template, network-diagram ask, mesh presence, CI/CD repos (if applicable), contact chain, scan window preferences, redaction conventions.
- Save as `docs/templates/intake-questionnaire.md`.

### E. Draft the one-pager
- Grant-eligibility framing (CWSRF/DWSRF cyber set-asides, IIJA), regulatory-alignment line (AWIA RRA, CISA CPGs), top-finding teaser, "book a 45-minute scoped intake" CTA.
- Save as `docs/templates/one-pager.md`.

### F. Draft water-variant outreach sequence (Pearl drafted MSSP variant; water is missing)
- Day 0 / Day 3 / Day 7 touches for state RWA + AWWA chapter contacts. Emphasize peer EPA letters and grant-eligibility, not "blast radius."
- Save as `docs/templates/water-outreach-sequence.md`.

**Lower-priority items (do after A–F):**
- Wire `LAB_MODE=1` env gate in code (currently documented only). Required before any T3 engagement. Simplify/security-review flagged it.
- Extract `scripts/otsniff/scanners/_base.mjs` to dedupe `run()`/`walk()`/`toFinding` across scanners. Pain growth quadratic per additional scanner.
- `data/iec62443-map.json` + renderer so the Impact Map report can show a real SR coverage matrix instead of the teaser.

---

## 4. How to verify things still work

```bash
# Tests (Docker — never run on host)
docker compose -f compose.toolchain.yml run --rm node npm test              # expect 15 passing
docker compose -f compose.toolchain.yml run --rm py pytest -q               # expect 3 passing

# Dev server
docker compose -f compose.toolchain.yml up -d web
# http://localhost:3000 — dashboard; click asset-detail → Evidence tab

# Sample PDF regeneration (proves the render pipeline)
docker compose -f compose.toolchain.yml run --rm report report \
  --plant /app/data/plant-enriched.json \
  --out /app/data/t1-sample.pdf \
  --client "Sample Utility" --engagement "ENG-TEST" \
  --authorizer "Test Authorizer" \
  --scope "Sample scope" \
  --partner "Malkan Solutions"
```

On Windows/Git Bash, prefix commands with `MSYS_NO_PATHCONV=1` when `/app/...` paths appear as arguments.

---

## 5. Agents — how to invoke

All 9 agents live in `.claude/agents/`. In a fresh session they register at startup and are invokable via `Agent` tool with `subagent_type: <name>`. Lanes:

- **pearl** — product strategy, JTBD, pricing rationale, packaging, positioning. Does NOT own dates.
- **amber** — launch PM, critical path, gates, RAID, RAG status. Does NOT change scope.
- **industry-guy** — verifies vertical claims for realism; coordinates 5 verticals.
- **oil-and-gas / critical-infrastructure / food-packaging / medical-manufacturing / industrial-automation** — buyer voice + regulatory windows + channel realism per vertical.
- **pricing-analyst** — floor/anchor/premium per tier, funding-source mapping, value quantification.

Coordinate through lanes. If Pearl proposes dates, or Amber changes scope, or a vertical claim contradicts IndustryGuy's verification protocol — push back. Drift is a simulation failure.

---

## 6. Open asks of sponsor (cmalkan@gmail.com) — unanswered at W1 end

1. Confirm **$7,500 T1 anchor** (Pearl held floor at $5k, and only inside a bundled MSSP deal).
2. **E&O + cyber liability broker RFQ timeline** — gates T3 engagements (not T1).
3. **Geography / state** for the initial 10 RWA/AWWA outreach contacts.
4. **Warm intros** to water utilities or OT-practice MSSPs — shortens W3 by 2–3 weeks if yes.
5. **Domain decision** for Pearl's landing-page A/B: subdomain on malkansolutions.com or separate?
6. **10 hrs/wk protected outreach block** in W3 (starts 2026-05-03).

Do not fabricate answers. If the user hasn't answered, note it as blocking and keep moving on work that doesn't require their input.

---

## 7. Things to NOT do

- Do not run `npm` or `pytest` on the host. Always via `compose.toolchain.yml`.
- Do not push to any remote without explicit sign-off. Branch is `chainingTools`, unpushed.
- Do not change product scope without Pearl. Do not change dates without Amber.
- Do not pitch or price outside the buyer-facing tier names (Evidence Pack / Impact Map / Proven Pathways / Posture Watch). Internal T1–T4 codes are for SOW plumbing only.
- Do not invent customer names, win rates, NPS scores, or case-study content. Mark anything approximate as "verify before client use."
- Do not add active scanners (Trident, purple-team) without `LAB_MODE=1` + signed authorization. Hard gate.
- Do not touch `.claude/settings.local.json` — that's local-only and gitignored.

---

## 8. Shape of a good next response

If the user says "continue" or "next," your first move should be:
1. Read this handoff.
2. Read the canonical docs (CLAUDE.md, tiers-and-glossary.md, Build Status).
3. Propose the next step from §3, highest-leverage first, with a concrete deliverable and validation method.
4. Ask only the questions that block progress. Don't dump all 6 open sponsor asks on the user — pick the one blocking the next move.

When in doubt: Amber validates schedule, Pearl validates positioning, IndustryGuy validates vertical fit, pricing-analyst validates the price. Use them.
