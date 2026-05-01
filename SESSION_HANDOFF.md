# Session Handoff — OTSniffer / Malkan Solutions

> Instructions for a new Claude Code session picking up this project. Read this first, in full, before touching anything.

Last updated: **2026-04-26** (W2 mid; **sales track FROZEN** — value-validation pivot). Tip of `chainingTools` is `4136eec`. **9 commits unpushed.**

---

## 1. Read these first, in order

Do not recommend, plan, price, or code before reading:

1. **`CLAUDE.md`** (this repo) — architecture, Docker-only rule, CJS/ESM boundary, dev-server routing, scanner pattern.
2. **`C:\Users\b2\.claude\projects\C--Users-b2-source-repos-OTSniffer\memory\MEMORY.md`** — auto-loads; follow the entries it points at.
3. **`docs/PIN_sales.md`** — **the freeze file.** Sales track is paused; this names the thaw triggers, the gate inventory, and the locked sponsor decisions.
4. **`docs/discovery/findings-action-test.md`** — path C signal:noise scoring of all 11 demo findings. Names the water-fixture-rebuild trigger.
5. **`docs/discovery/jtbd-interview-guide.md`** — Pearl path A: 12-question no-pitch interview script for water utility GMs.
6. **`docs/discovery/artifact-review-protocol.md`** — Pearl path B: 5-reviewer expert-eyes protocol for the sample PDF.
7. **`docs/amber/critical-path-w2-onward.md`** — Amber's W2 → W6 schedule, ordered B-path inner sequence, dated decisions.
8. **`docs/amber/raid-log.md`** — risks, assumptions, issues, decisions for the freeze era.
9. **`docs/tiers-and-glossary.md`** — canonical service-tier names, pricing, full acronym glossary, comparable teardown. Pricing is locked during freeze.
10. **`docs/templates/*`** — Phase 1 Sellable Asset Pack (7 files). Sponsor-locked, do not edit during freeze.
11. **`docs/outreach/wi-contacts-2026-04.md`** — Wisconsin 10-utility list. Outreach is suspended; list decays weekly.
12. **`G:\My Drive\Ghar Files\4. B2 Docs\Tech Projects\Idea91 OTSniffer\03_Viable Concept\02_Build Status.md`** — what's delivered vs deferred.
13. **Agent personas in `.claude/agents/`** — pearl, amber, industry-guy, pricing-analyst, 6 verticals.

If any of the above conflicts with what the user says, trust the file and ask the user to clarify.

---

## 2. Where the project stands (end of 2026-04-26 session)

### The headline

**Sales track is frozen as of 2026-04-26.** Sponsor decision after one session of artifact + outreach work: validate value before sending email. Three discovery paths (JTBD interviews, expert artifact review, finding signal:noise) are queued. Outreach resumes only when all three return green per `docs/PIN_sales.md` thaw rules.

### Triple-convergent finding from today

All three discovery paths surfaced the same blocking issue: **the current sample T1 PDF is built from the energy/turbine demo plant and is not credibly showable to water-utility expert reviewers** (Wisconsin DNR contact, AWWA chapter cyber chair). Vendors and protocols (WinCC, S7, HIMA turbine SIS) are wrong for water. The pattern transfers; the evidence does not.

**Mitigation already shipped in this session:** a water-flavored plant fixture and re-rendered sample PDF (see "Shipped today" below). The B-path inner sequence is now: SI session first (he reads past fixture) → fixture rebuild informed by SI feedback → Pollard + AWWA last.

### Shipped today (commits `4662223` + `4136eec`)

**Discovery + freeze docs:**
- `docs/PIN_sales.md` — thaw triggers, gate inventory, do/don't list during freeze
- `docs/discovery/jtbd-interview-guide.md` — Pearl, 12 questions, sponsor-bias mitigations
- `docs/discovery/artifact-review-protocol.md` — Pearl, 5 expert reviewers, structured feedback form
- `docs/discovery/findings-action-test.md` — path C, 9/11 findings actionable, 2 vendor-mismatched
- `docs/amber/critical-path-w2-onward.md` — W2 → W6 schedule with dated decisions
- `docs/amber/raid-log.md` — freeze-era risk log

**Water utility plant fixture + IEC mapping:**
- `data/plant-water-demo.json` — Wisconsin mid-size water utility, 7 assets, 5 zones (AVEVA SCADA + Historian, Rockwell HMI + Studio 5000 EngWS, Allen-Bradley ControlLogix treatment PLC, GuardLogix dosing safety, Schneider SCADAPack lift station on cellular DNP3)
- `data/findings-water.json` — 11 findings rebuilt with water-correct vendors and protocols
- `data/plant-water-enriched.json` — merge output
- `data/t1-water-sample.pdf` — 5-page water-flavored sample (179 KB)
- `data/iec62443-map.json` — 7 FRs, 21 SRs, finding-type-to-SR-violation map (renderer wiring is follow-on)
- `data/t1-sample.pdf` — energy version regenerated as part of session verification

### Verified today

- 15 of 15 Node tests pass
- 3 of 3 Python tests pass
- `otsniff` CLI: secrets scanner runs against `data/sample-configs/`; supply-chain scanner runs cleanly (returns 0 against this repo, correct because no `.github/workflows/`); merge produces expected output; report renderer produces a valid 5-page PDF
- Dev server serves all 5 HTML pages (200) and 4 spot-checked API endpoints with populated, valid JSON
- Water plant loads correctly through `OTSNIFF_PLANT_FILE` override
- IEC map internally consistent (no orphan SR refs, no SR with invalid FR ref)

### Service packaging — locked, do not edit during freeze

| Code | Buyer name | Anchor | Duration | Notes |
|---|---|---|---|---|
| T1 | Evidence Pack | **$7,500** | 1 wk | Floor $5k MSSP-only, premium $12k. Wisconsin governing law. |
| T2 | Impact Map | $35,000 | 3–4 wk | Primary conversion tier. |
| T3 | Proven Pathways | $95,000 | 6–8 wk | Needs E&O + LAB_MODE. Bind ~2026-07-07 (broker-cold). |
| T4 | Posture Watch | $4,500/mo | retainer | |

### Suspended during freeze (resume only on thaw)

- 2026-05-03 hard Day-0 outreach deadline
- Wisconsin 10-utility outreach (list decays weekly; 5 days into decay as of today)
- All seven Phase-1 Sellable Asset Pack templates
- The five outstanding gates from prior sessions (sender domain config, calendar link, county for SOW, partial-row confirmation calls, Waukesha transition script)

### Will pass during freeze (decay cost)

- **Wisconsin water association seminar 2026-05-07** — 50+ utilities in one room, 12-month recurrence. Amber recommends sending a "we'd like to attend, not pitch" inquiry by 2026-05-02 EOD. Listening posture is allowed under the freeze.

---

## 3. What to do next (priority order, freeze-era)

### Sponsor decisions Amber needs by date

| # | Decision | Due | Owner |
|---|---|---|---|
| 1 | Yes/no on attending the 2026-05-07 water association seminar (listener posture) | **2026-05-02 EOD** | Sponsor |
| 2 | Promote calendar link to active during freeze (referenced in every discovery email) | **2026-04-30 EOD** | Sponsor |
| 3 | Confirm 10 hr/wk capacity holds for 5 straight weeks | **2026-04-29 EOD** | Sponsor |

### Pearl re-spec needed before interviews start

The willingness-to-pay threshold in the JTBD interview guide (`≥4/10 name a price ≥$5k`) is likely unachievable in Mom-Test discipline — peers don't volunteer dollar bands without a vendor anchor. Pearl needs to re-spec this threshold by 2026-05-04 (W3 Mon) before interviews begin collecting. Without the re-spec, path A returns red on a measurement artifact, not real signal.

### Allowed technical work during freeze

- Renderer wiring for the IEC 62443 map (a netlify function + an analyst-page section). Probably 2–3 hours. Pearl input first on which views drive Impact Map upsell value.
- Scanner base extraction (`scripts/otsniff/scanners/_base.mjs`) per the architecture note. Cleanup, no behavior change.
- LAB_MODE code gate (currently doc-only).
- A water-flavored Shodan exposure dataset (currently the simulated banners are still energy-style).

### After thaw (if all three discovery paths return green)

1. Re-verify Wisconsin contact list freshness (will be 5+ weeks decayed by 2026-06-01 base-case thaw).
2. Sponsor confirms gates G1, G2, G7.
3. First Day-0 send.
4. Resume the W2 outreach plan from prior session.

---

## 4. How to verify things still work

```bash
# Tests (Docker — never run on host)
docker compose -f compose.toolchain.yml run --rm node npm test              # expect 15 passing
docker compose -f compose.toolchain.yml run --rm py pytest -q               # expect 3 passing

# Dev server
docker compose -f compose.toolchain.yml up -d web                           # http://localhost:3000

# Energy sample PDF regen
MSYS_NO_PATHCONV=1 docker compose -f compose.toolchain.yml run --rm report report \
  --plant /app/data/plant-enriched.json \
  --out /app/data/t1-sample.pdf \
  --client "Sample Utility" --engagement "ENG-TEST" \
  --authorizer "Test Authorizer" --scope "Sample scope" \
  --partner "Malkan Solutions"

# Water sample PDF regen (use this for water-utility expert reviews)
MSYS_NO_PATHCONV=1 docker compose -f compose.toolchain.yml run --rm report report \
  --plant /app/data/plant-water-enriched.json \
  --out /app/data/t1-water-sample.pdf \
  --client "Meadowbrook Water Utility" --engagement "ENG-WATER-DEMO" \
  --authorizer "Plant Manager" --scope "Demonstration assessment" \
  --partner "Malkan Solutions"
```

To load the water plant in the dev server or analyst pages, set `OTSNIFF_PLANT_FILE=/app/data/plant-water-enriched.json` on the container.

---

## 5. Agents — how to invoke

All 10 agents in `.claude/agents/`. Invokable via `Agent` tool with `subagent_type: <name>` (after session restart) or inline via `general-purpose` with persona file injected.

- **pearl** — product / JTBD / pricing rationale / packaging
- **amber** — launch PM / critical path / gates / RAID / RAG
- **industry-guy** — vertical verification; coordinates 6 verticals
- **oil-and-gas / critical-infrastructure** [water only] **/ electric-utilities / food-packaging / medical-manufacturing** [2 personas: mfg + premarket] **/ industrial-automation** — parked this quarter but available. Electric split from critical-infrastructure 2026-04-21; medical-manufacturing expanded with premarket device-OEM persona same day.
- **pricing-analyst** — floor/anchor/premium; funding sources; value quantification

Coordinate through lanes. Pearl proposes dates → push back. Amber changes scope → push back. Drift is a simulation failure.

---

## 6. Open asks of sponsor (cmalkan@gmail.com)

**Freeze-era, Amber-flagged (new this session):**
1. **Decision 1 (due 2026-05-02 EOD):** attend the 2026-05-07 water association seminar as a listener?
2. **Decision 2 (due 2026-04-30 EOD):** stand up the calendar booking link.
3. **Decision 3 (due 2026-04-29 EOD):** confirm 10 hr/wk × 5 weeks capacity.

**Queued for thaw (from prior sessions, do not action during freeze):**
4. Sender domain authentication for `malkansolutions.com` — required before any Day-0 send.
5. Five email-confirmation phone calls for the partial Wisconsin utility rows.
6. Wisconsin county for the SOW venue clause.
7. Errors-and-omissions plus cyber-liability broker shortlist — cold search, realistic bind ~2026-07-07.

**Do not fabricate answers.** Block on work that requires these; proceed on work that doesn't.

---

## 7. Things to NOT do

- Do not run `npm` or `pytest` on the host. Always via `compose.toolchain.yml`.
- Do not push to any remote without explicit sign-off. **9 unpushed commits on `chainingTools`.**
- Do not change product scope without Pearl. Do not change dates without Amber.
- Do not pitch or price outside the buyer-facing tier names. Internal T1–T4 codes are for SOW plumbing only.
- Do not invent customer names, win rates, NPS scores, or case-study content.
- Do not add active scanners (Trident, purple-team) without `LAB_MODE=1` + signed authorization.
- Do not touch `.claude/settings.local.json` — local-only, gitignored.

**Freeze-era additions (until thaw):**
- Do not draft new outreach emails to utilities.
- Do not edit `docs/templates/*` or `docs/tiers-and-glossary.md`.
- Do not quote any Wisconsin utility contact externally — list decays weekly.
- Do not show the energy-fixture sample PDF (`data/t1-sample.pdf`) to water-utility expert reviewers. Use the water version (`data/t1-water-sample.pdf`).
- Do not send the water-association seminar inquiry until Decision 1 is confirmed.

---

## 8. Shape of a good next response

If the user says "continue" or "next":

1. Read this handoff in full.
2. Read `memory/project_current_state.md` (auto-loads via `MEMORY.md` pointer).
3. Read `docs/PIN_sales.md` to confirm the freeze still applies.
4. **Ask the three Amber-flagged dated decisions first** (§6 items 1–3) — those are the immediate blockers.
5. If decisions are answered, queue Pearl re-spec of the willingness-to-pay threshold next.
6. If decisions are not answered yet, do one of the allowed technical tasks (§3 "allowed technical work during freeze") rather than nudging.
7. If user wants to thaw early, refer to `PIN_sales.md` thaw rules — three signals must converge, sponsor decides.

When in doubt: Amber validates schedule, Pearl validates positioning, IndustryGuy validates vertical fit, pricing-analyst validates price.

User communication preference: **plain English, no acronym chains** in conversational replies. Inside repo docs the canonical short forms are correct and should stay.
