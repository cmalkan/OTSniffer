# Session Handoff — OTSniffer / Malkan Solutions

> Instructions for a new Claude Code session picking up this project. Read this first, in full, before touching anything.

Last updated: **2026-04-21** (start of W2). Tip of `chainingTools` is `d7eabf5`. **7 commits unpushed.**

---

## 1. Read these first, in order

Do not recommend, plan, price, or code before reading:

1. **`CLAUDE.md`** (this repo) — architecture, Docker-only rule, CJS/ESM boundary, dev-server routing, scanner pattern.
2. **`C:\Users\b2\.claude\projects\C--Users-b2-source-repos-OTSniffer\memory\MEMORY.md`** — auto-loads; follow the entries it points at.
3. **`docs/tiers-and-glossary.md`** — canonical service-tier names, pricing, full acronym glossary, value quantification, funding sources, **comparable teardown (added 2026-04-19)**.
4. **`docs/outreach/wi-contacts-2026-04.md`** — Wisconsin 10-utility contact list + state channel contacts. **Decays weekly — re-verify before any Day 0 send.**
5. **`docs/templates/*`** — Phase 1 Sellable Asset Pack (7 files). All sponsor-locked except `{{COUNTY}}` in SOW.
6. **`G:\My Drive\Ghar Files\4. B2 Docs\Tech Projects\Idea91 OTSniffer\03_Viable Concept\02_Build Status.md`** — what's delivered vs deferred.
7. **Agent personas in `.claude/agents/`** — pearl, amber, industry-guy, pricing-analyst, 5 verticals.

If any of the above conflicts with what the user says, trust the file and ask the user to clarify.

---

## 2. Where the project stands (end of 2026-04-21 session)

### Shipped (in repo, committed)

**Content / copy — Phase 1 Sellable Asset Pack complete:**
- `docs/templates/sow-evidence-pack.md` — Wisconsin governing law, $7,500 anchor, 40/60 payment, 1× liability cap
- `docs/templates/roe.md` — no-touch list, blackout/e-stop, chain-of-custody, T3 preconditions
- `docs/templates/authorization-letter.md` — dual-signatory, Exhibit A targets
- `docs/templates/intake-questionnaire.md` — 12 sections; safety-critical register feeds ROE §4
- `docs/templates/one-pager.md` — water-utility variant, grant-eligibility led
- `docs/templates/water-outreach-sequence.md` — Day 0/3/7 + nurture + AWWA chapter variant
- `docs/templates/grant-eligibility-language.md` — 4 length variants; WI active, IL/TX/FL/NY placeholders

**Research / evidence:**
- `docs/tiers-and-glossary.md` — canonical pricing + comparable teardown (Dragos/Claroty/Nozomi/Kudelski/1898/Accenture/Mandiant/regional SIs/AWWA/Elisity/NERC CIP) + move-triggers for T1 anchor
- `docs/outreach/wi-contacts-2026-04.md` — Wisconsin 10-utility list + state channel

### What works end-to-end (unchanged)

- `otsniff` CLI (scan:secrets, scan:supply-chain, merge, report)
- Netlify Evidence API + Evidence tab
- Malkan brand on 5 analyst pages
- 5-page T1 sample PDF at `data/t1-sample.pdf`
- Docker-first workflow, 15 Node + 3 pytest tests green

### Service packaging (locked)

| Code | Buyer name | Anchor | Duration | Notes |
|---|---|---|---|---|
| T1 | Evidence Pack | **$7,500** | 1 wk | Floor $5k MSSP-only, premium $12k. WI governing law. |
| T2 | Impact Map | $35,000 | 3–4 wk | Primary conversion tier. |
| T3 | Proven Pathways | $95,000 | 6–8 wk | Needs E&O + LAB_MODE. Bind **~2026-07-07** (broker-cold slip). |
| T4 | Posture Watch | $4,500/mo | retainer | |

### Sponsor decisions locked 2026-04-20

- $7,500 T1 anchor
- Wisconsin governing law + venue
- Outreach state pool: FL / NY / IL / WI / TX; execution order **WI → IL → TX**, FL reserved for Q3 hurricane window, NY deferred
- Warm intros: **none** — cold outreach is the only path
- Landing page: **deferred** ("not at this time"); one-pager PDF is the only durable marketing asset
- Outreach block: **Tue/Thu 9–11 + 2–4 local, starting 2026-05-03**, 10 hrs/wk
- E&O broker relationship: **none** — cold search; RFQ milestone needs a broker-shortlist task prepended

### Wisconsin list status

- 3/10 utilities fully populated (Racine, Sheboygan, Neenah alternate)
- 5/10 partial — email missing (Kenosha, Janesville, Appleton, Wausau, West Allis, Manitowoc)
- 2/10 name-missing (**Waukesha — GM vacancy, highest-priority transition-window target**; Eau Claire — unnamed on city site)
- **Marty Pollard (WI DNR Drinking Water cyber contact, Martin.Pollard@wisconsin.gov)** = single-highest-leverage state referral node. AWWA-variant outreach, not sales.
- **SFY 2026 SRF windows CLOSED** — live trigger is **SDWLP SFY 2027 principal-forgiveness deadline 2026-06-30**.
- **WIAWWA 2026-05-07 Technology & Security Seminar** = 50+ utilities in one room; pursue free-briefing slot via contact@wiawwa.org.
- **No dominant MSSP footprint in mid-size WI water** — channel wedge intact.
- AWWA WI Section website returned 403 on every fetch — chapter chair + cyber committee chair names need manual lookup.

---

## 3. What to do next (priority order)

### Gate-clearing — must happen before first Day 0 send (2026-05-03 hard deadline)

| # | Gate | Owner | Status |
|---|---|---|---|
| G1 | Sender domain email + SPF/DKIM/DMARC on malkansolutions.com | Sponsor | **unknown — ask first** |
| G2 | Calendar link for `{{CAL_LINK}}` (Cal.com / Calendly) | Sponsor | unknown |
| G3 | Outreach tracking schema | Claude to draft | not started |
| G4 | 5 email-confirmation phone calls (partial WI rows) | Sponsor | not started |
| G5 | Waukesha GM successor check + transition script | Claude to draft | not started |
| G6 | WIAWWA 2026-05-07 seminar briefing inquiry email | Claude drafts, sponsor sends | not started |
| G7 | `{{COUNTY}}` value for SOW venue clause | Sponsor | pending |

### Staged artifacts for next session (in order)

1. **`docs/outreach/tracking-schema.md`** — 15-column schema: contact_id / utility / role / name / email / phone / state / source / day_0_sent / day_3_sent / day_7_sent / opened / replied / disposition / notes. Delivered as markdown + CSV header + Airtable field spec.
2. **`docs/outreach/wiawwa-inquiry-email.md`** — time-sensitive; May 7 seminar. Ask for briefing slot + chapter chair + cyber committee chair names.
3. **`docs/outreach/waukesha-transition-script.md`** — listening posture, different opening than standard Day 0. High-value transition-window target.
4. **Amber re-score** — invoke `amber` agent to re-score W2 critical path with: broker-cold slip (T3 bind 2026-07-07), WIAWWA seminar as new path node, Waukesha as highest-priority lead.

### Lower-priority (after above)

- Populate IL / TX / FL / NY state variants in `grant-eligibility-language.md` when those waves approach
- Wire `LAB_MODE=1` code gate (still documentation-only)
- Extract `scripts/otsniff/scanners/_base.mjs` to dedupe scanner structure
- `data/iec62443-map.json` + renderer for Impact Map SR coverage matrix

---

## 4. How to verify things still work

```bash
# Tests (Docker — never run on host)
docker compose -f compose.toolchain.yml run --rm node npm test              # expect 15 passing
docker compose -f compose.toolchain.yml run --rm py pytest -q               # expect 3 passing

# Dev server
docker compose -f compose.toolchain.yml up -d web                           # http://localhost:3000

# Sample PDF regen (proves render pipeline)
MSYS_NO_PATHCONV=1 docker compose -f compose.toolchain.yml run --rm report report \
  --plant /app/data/plant-enriched.json \
  --out /app/data/t1-sample.pdf \
  --client "Sample Utility" --engagement "ENG-TEST" \
  --authorizer "Test Authorizer" --scope "Sample scope" \
  --partner "Malkan Solutions"
```

---

## 5. Agents — how to invoke

All 9 agents in `.claude/agents/`. Invokable via `Agent` tool with `subagent_type: <name>` (after session restart) or inline via `general-purpose` with persona file injected.

- **pearl** — product / JTBD / pricing rationale / packaging
- **amber** — launch PM / critical path / gates / RAID / RAG
- **industry-guy** — vertical verification; coordinates 5 verticals
- **oil-and-gas / critical-infrastructure / food-packaging / medical-manufacturing / industrial-automation** — parked this quarter but available
- **pricing-analyst** — floor/anchor/premium; funding sources; value quantification

Coordinate through lanes. Pearl proposes dates → push back. Amber changes scope → push back. Drift is a simulation failure.

---

## 6. Open asks of sponsor (cmalkan@gmail.com)

1. **G1 — is `malkansolutions.com` configured for SPF/DKIM/DMARC?** Blocks all outreach if no.
2. **G2 — calendar link set up yet?** Every template references `{{CAL_LINK}}`.
3. **G7 — `{{COUNTY}}` in Wisconsin** for SOW venue clause.
4. **G4 — 5 email-confirmation calls** for partial WI rows (~90 min).
5. E&O + cyber liability broker shortlist — cold search; realistic bind ~2026-07-07.

**Do not fabricate answers.** Block on work that requires these; proceed on work that doesn't.

---

## 7. Things to NOT do

- Do not run `npm` or `pytest` on the host. Always via `compose.toolchain.yml`.
- Do not push to any remote without explicit sign-off. 7 unpushed commits on `chainingTools`.
- Do not change product scope without Pearl. Do not change dates without Amber.
- Do not pitch or price outside the buyer-facing tier names. Internal T1–T4 codes are for SOW plumbing only.
- Do not invent customer names, win rates, NPS scores, or case-study content. Mark approximate data "verify before client use."
- Do not add active scanners (Trident, purple-team) without `LAB_MODE=1` + signed authorization.
- Do not touch `.claude/settings.local.json` — local-only, gitignored.
- **Do not quote any Wisconsin utility contact externally without re-verifying** — the list decays weekly.
- **Do not send a Day 0 email from malkansolutions.com** until G1 (SPF/DKIM/DMARC) is confirmed.

---

## 8. Shape of a good next response

If the user says "continue" or "next":
1. Read this handoff.
2. Read `memory/project_current_state.md` (auto-loads via MEMORY.md pointer).
3. Ask G1 first. Everything else is downstream.
4. If G1 is green, proceed to stage G3 (tracking schema) → G6 (WIAWWA email) → G5 (Waukesha script). Amber re-score after.
5. If G1 is red, do not draft more outreach artifacts. Help unblock G1 (DNS vendor identification, SPF/DKIM/DMARC scope) or park outreach and work on LAB_MODE / scanner base / IEC 62443 map instead.

When in doubt: Amber validates schedule, Pearl validates positioning, IndustryGuy validates vertical fit, pricing-analyst validates price.
