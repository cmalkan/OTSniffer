# RAID Log — OTSniffer / Malkan Solutions

**Owner:** Amber (launch PM)
**Created:** 2026-04-26
**Last updated:** 2026-04-26 (W2 mid-session, post-freeze)
**Companion doc:** `docs/amber/critical-path-w2-onward.md`

> Living document. Every entry has an ID, owner, status, and either a mitigation date or a close date. Risks/issues without owners or dates do not exist for tracking purposes.

---

## Status legend

- **OPEN** — active, monitored
- **MITIGATED** — action taken, residual risk acceptable
- **CLOSED** — no longer applies (e.g., gate cleared, dependency met)
- **CARRY** — moved to a future phase / paused-but-tracked

---

## Risks (R)

| ID | Risk | Likelihood | Impact | Trigger / window | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R1 | **Peer-charity bias in Path B** — 5 expert reviewers asked for free read will soft-pedal kill signals; we get false-positive validation | M | H | Throughout W3–W5 reviewer sessions | Adversarial questions §6 of `artifact-review-protocol.md`; force ≥1 explicit "what would a Dragos partner do better than this" prompt per session | Pearl (script discipline) | OPEN |
| R2 | **Sponsor-as-interviewer bias in Path A** — sponsor builds product AND runs interviews; risk of leading questions / confirmation theater | M | H | All Path-A sessions W3–W6 | Mom-Test rules in JTBD guide §3; verbatim-quote rule on Q3/Q5/Q9; 5-min decision tree §6; Pearl reviews first 2 transcripts before W4 sessions | Sponsor + Pearl QA | OPEN |
| R3 | **Water-fixture rebuild scope creep** — "1 working day" estimate could 2–3x if scanners need re-tuning per vendor | M | M | W3 SI-feedback to W4 PDF regen | Box at 1.5 sponsor-hr (W3 0.5 + W4 1.0); over that → pause + Amber re-scope; SI feedback constrains scope, not expands it | Claude (build) + Amber (timebox) | OPEN |
| R4 | **Thaw-decision drift** — "let's run a few more" temptation when synthesis is mixed; freeze extends informally | M | H | W6 EOW thaw call | Binding W6 EOW call; partial-thaw / kill rubric in `PIN_sales.md` is the answer, not "extend"; Amber refuses to re-score without a recorded decision | Sponsor (call) + Amber (discipline) | OPEN |
| R5 | **WIAWWA 2026-05-07 missed** — 12-month annual recurrence asset burned if §5(b) declined or decided after 2026-05-02 | H (today) | M | Decision deadline 2026-05-02 | §5 attend-as-listener recommendation; bounded 4-hr W3 cost; not a sales motion so does not violate freeze | Sponsor (decision) + Pearl (language) | OPEN |
| R6 | **Path-A WTP threshold infeasibility** (P1 push-back) — ≥4/10 ≥$5k WTP unachievable in Mom-Test no-price-anchor calls | H | H | W6 synthesis | Pearl re-spec threshold to "≥4/10 name a funding source" OR "≥2/10 name workaround dollar figure"; if not re-spec'd, Path A returns red on measurement artifact, not signal | Pearl (decision) | OPEN |
| R7 | **Path-B forwarding-question per-archetype variance** (P2 push-back) — MSSP and SI reviewers don't have boards/GMs to forward to; threshold effectively ≥3/3 not ≥3/5 | M | M | W3–W4 B sessions | Pearl re-spec question per archetype OR lower threshold to ≥2/5 with named-person + ≥2/5 with named-channel | Pearl (decision) | OPEN |
| R8 | **Buyer-channel ambiguity (utility vs SI)** — f_seed_05 audience-mismatch surfaces real question: who is the artifact for? Affects Path-B differentiation test (P3) | M | H | W3–W6 | Pearl decides utility-direct vs SI-channel before W4 MSSP session | Pearl | OPEN |
| R9 | **Cold-list send burn** — would have torched WI list with un-validated send pre-freeze | (was) H | (was) M | pre-freeze | **Freeze REDUCES this risk.** Status: MITIGATED by freeze itself | n/a | MITIGATED |
| R10 | **Sponsor momentum / context loss** — solo founder, 10 hr/wk, multi-week freeze risks disengagement | L (≤4 wk) / M (5+ wk) | H | W6+ if freeze extends | Anchor binding thaw date W6; weekly status note Amber → Sponsor; Friday afternoon recap email | Amber | OPEN |
| R11 | **Broker-cold E&O bind 2026-07-07** — no broker relationship; cold search is 6–8 wk | M | H | survives 4-wk freeze; RED at 5+ wk freeze | T3 work paused regardless during freeze; broker-shortlist drafting is freeze-allowed work for Claude; if thaw slips to 2026-06-15 broker search must start by 2026-05-25 | Sponsor (broker outreach) + Claude (shortlist draft) | OPEN |
| R12 | **No warm intros** — cold outreach is the only path; reply rates lower than warm baseline | H | M | W3 onwards | Outreach at small batch (10 utilities + 5 archetypes) so cold-rate impact is measurable not theoretical; if W3 reply rate <30% on B, capacity for B is shot, drop to 3 reviewers with caveat | Sponsor + Pearl | OPEN |
| R13 | **WI contact list decay** — names re-verified 2026-04-21; by 2026-05-12 list is "stale" | M | M | accelerates W4 onwards | Re-verify before any post-thaw send (mandatory per PIN); during freeze, only structural impact is mass-send timing not interview targeting | Sponsor (re-verify) | OPEN |
| R14 | **Path-A reply rate below 60%** — if cold outreach lands fewer than 6/10 sessions, threshold testing becomes statistically thin | M | M | recognize at W3 EOW | Drop threshold to ≥5/8 OR extend interview window 1 wk (and slip thaw 1 wk); decide at W4 Tue review | Pearl (call) + Amber (slip) | OPEN |
| R15 | **W4 capacity at 9.5/10 hr — no slip buffer** — any W3 task spillover puts W4 over ceiling | M | M | W4 (2026-05-11→17) | Pre-emptive slip protocol: MSSP session moves to W5; one Path-A interview moves to W5 if W3 sessions slip into W4 | Amber | OPEN |
| R16 | **Pollard + AWWA-chair credibility hit if shown un-rebuilt PDF** — energy fixture (WinCC, S7, HIMA) reads as wrong-vendor | (was) H | (was) H | pre-freeze, would have hit at first showing | **Freeze CHANGED this:** inner ordering (SI session → fixture rebuild → Pollard + AWWA) eliminates the risk if discipline holds. Status: MITIGATED by sequencing | Amber (sequencing discipline) | MITIGATED |

---

## Assumptions (A)

| ID | Assumption | Confirm by | Owner | Status |
|---|---|---|---|---|
| A1 | **Cold-outreach reply rate ~60%** — 6/10 utility reply, 3/5 expert reply | W3 EOW (real data) | Sponsor + Amber | OPEN — real data lands W3 |
| A2 | **Water-fixture rebuild fits in 1 working day** — Claude time + 1.5 sponsor-hr | W4 EOW | Claude (build) | OPEN |
| A3 | **Sponsor 10 hr/wk holds for 5 weeks** — no day-job spike | 2026-04-29 (sponsor confirms) | Sponsor | OPEN — S3 in critical-path doc |
| A4 | **WIAWWA accepts attendee-only registration** if §5(b) chosen | 2026-05-05 (no-reply = skip) | WIAWWA | CARRY |
| A5 | **Path-A questions don't bias toward T1 over T2/T4** — JTBD guide is tier-agnostic per design | W6 synthesis review | Pearl | OPEN |
| A6 | **9/11 Path-C signal holds when re-run on water fixture** — water rebuild only changes specifics, not finding-action quality | W4 C re-run | Claude + sponsor verify | OPEN |
| A7 | **Sponsor's email setup (G1) won't be needed during freeze** — discovery outreach can go from `cmalkan@gmail.com` if needed | n/a (decided by sponsor) | Sponsor | CARRY (post-thaw blocker) |

---

## Issues (I)

| ID | Issue | Owner | Needed by | Status |
|---|---|---|---|---|
| I1 | **G2 CAL_LINK still unconfirmed** — promote to active for W2 outreach? | Sponsor | 2026-04-30 EOD | OPEN |
| I2 | **AWWA WI Section website 403** — chapter chair + cyber committee chair names not confirmed; Path-B archetype 2.2 blocked on name surfacing via `contact@wiawwa.org` email | Sponsor (sends email) | 2026-05-04 EOD (W3 Mon) | OPEN |
| I3 | **7 unpushed commits on `chainingTools`** — no push pending sponsor sign-off | Sponsor | freeze unrelated; before any external review | OPEN — non-blocking |
| I4 | **Sample PDF currently NOT showable to Pollard / AWWA chair** | Claude (rebuild) | 2026-05-13 (W4 Tue) | OPEN |
| I5 | **Pearl thresholds P1/P2/P3 not yet resolved** — schedule risk on Path-A measurement artifact | Pearl | 2026-05-04 (W3 Mon, before Path-A interviews start) | OPEN |
| I6 | **f_seed_05 buyer-channel ambiguity** unresolved | Pearl | 2026-05-11 (W4 Mon, before MSSP session) | OPEN |
| I7 | **Decision tree JTBD §6 — sponsor must run within 5 min of every interview** — discipline issue, not a content issue | Sponsor | every session | OPEN — recurring |

---

## Dependencies (D)

| ID | Dependency | On whom | Needed by | Status |
|---|---|---|---|---|
| D1 | **G2 CAL_LINK live before W2 outreach goes out** | Sponsor | 2026-04-30 EOD | OPEN |
| D2 | **W2 outreach sent before W3 sessions schedulable** | Sponsor | 2026-04-30 EOD | OPEN |
| D3 | **SI session before water-fixture rebuild** | Sponsor (book) + reviewer (avail) | W3 (2026-05-05/07) | OPEN — inner critical path |
| D4 | **Water-fixture rebuild before Pollard + AWWA sessions** | Claude (build) + sponsor (verify) | 2026-05-13 EOD | OPEN — inner critical path |
| D5 | **All 5 Path-B sessions complete before B synthesis** | Sponsor (sessions) | W5 EOW | OPEN |
| D6 | **All 10 Path-A interviews (or final cohort decision) complete before A synthesis** | Sponsor | W6 EOW | OPEN |
| D7 | **Triple-green check before thaw decision** | Pearl + Amber + sponsor | W6 EOW | OPEN |
| D8 | **Pearl resolves P1/P2/P3 thresholds before A interviews start collecting WTP signal** | Pearl | W3 Mon | OPEN |
| D9 | **WIAWWA inquiry sent (if §5(b)) before 2026-05-02** | Sponsor + Pearl | 2026-05-02 EOD | OPEN |
| D10 | **Broker-shortlist draft (Claude work) before T3 broker outreach starts post-thaw** | Claude | W6 EOW (low-priority parallel work) | OPEN |

---

## Closed / superseded

| ID | Item | Closed when | Why |
|---|---|---|---|
| (none yet — log is fresh as of 2026-04-26) | | | |

---

## Update protocol

- Re-stamp `Last updated` on every edit.
- Move OPEN → MITIGATED only with evidence (not aspiration).
- Move OPEN → CLOSED only when the trigger window has passed without the risk firing OR the dependency is met.
- Carry forward unchanged risks to next phase rather than deleting (audit trail).
- Owner change requires Amber + new-owner acknowledgement.

*End.*
