# Critical Path — W2 → W6 (Freeze Re-Score)

**Author:** Amber (launch PM)
**Date stamp:** 2026-04-26 (Sunday, W2 mid-session)
**Branch state:** `chainingTools` tip `d7eabf5`, **7 commits unpushed**, sales freeze **active** per `docs/PIN_sales.md`.
**Method applied:** CPM (critical path with inner ordering), gate-driven phase model, RAID, RAG.
**Inputs (mandatory):** `SESSION_HANDOFF.md`, `docs/PIN_sales.md`, `docs/discovery/{jtbd-interview-guide,artifact-review-protocol,findings-action-test}.md`, `docs/tiers-and-glossary.md`, `docs/outreach/wi-contacts-2026-04.md`.

---

## 1. Capacity envelope

- Sponsor (Chetan Malkan) is solo, **10 hr/wk hard ceiling.**
- Working blocks: **Tue 9–11 + 2–4 local**, **Thu 9–11 + 2–4 local** = 4 blocks × 2 hr = **8 hr scheduled** + ~2 hr async/admin = 10 hr.
- Mon / Wed / Fri are **day-job time** — no project capacity. Plans assuming Mon/Wed/Fri work are infeasible.
- Outreach blocks (Tue/Thu) are now **available for discovery** since sales is frozen.
- **External lead time for booking interviews: minimum 1 week.** A "send invite Mon" → "session held Tue same week" assumption is invalid. First sessions can be held in W3 only if outreach goes out by W2 Tue 2026-04-28.
- US holidays through 2026-05-31: **Memorial Day Mon 2026-05-25** — Mon is already non-working; net impact zero on a Tue/Thu schedule. W5 is a normal week capacity-wise.

**Capacity validation per week is at the bottom of each week below; flagged red if >10 hr.**

---

## 2. Critical path (named)

The longest dependency chain that gates the thaw decision:

> **Path-A outreach (W2 Tue) → A interviews held (W3–W5) → A synthesis (W5 EOW) → Path-B SI session (W3) → water-fixture rebuild (W3 late) → sample-PDF regen (W4 early) → Pollard + AWWA sessions (W4) → ex-CIO + MSSP sessions (W3–W4) → B synthesis (W4 EOW) → Path-C re-run on water fixture (W4) → C synthesis confirm (W4 EOW) → triple-green check (W5 Mon) → thaw decision (W5 Mon 2026-05-18 base case).**

The single longest chain is **Path A** (10 interviews × 1-wk lead × Tue/Thu cadence = 3+ calendar weeks). Path A is the binding constraint on the thaw date. Anything else slipping that doesn't slip Path A is float, not critical.

The **inner ordering inside Path B** (newly surfaced today): **SI session → water-fixture rebuild → Pollard + AWWA**. Violating it costs credibility with the highest-leverage state node (Pollard) and with the chapter chair. This is non-negotiable — it is a quality gate, not a schedule preference.

---

## 3. Gantt-style week view

### Legend
- **A** = Path A JTBD interviews · **B** = Path B artifact reviews · **C** = Path C internals
- **FX** = water-fixture rebuild · **PDF** = sample-PDF regen
- Hour estimates are sponsor hours (the constraint); my hours don't count.

---

### W2 (current, 2026-04-26 Sun → 2026-05-03 Sun) — **discovery launch week**

**Working days available:** Tue 2026-04-28, Thu 2026-04-30. (Today Sun + Mon are non-working.)

| Task | Owner | Hours (sponsor) | Dep |
|---|---|---|---|
| Draft + send Path-A outreach emails to first wave of WI water utilities (8–10) | Sponsor (drafts pre-written by Pearl Appendix A) | 2.0 | none |
| Draft + send Path-B outreach to 5 archetypes (Pollard, AWWA `contact@`, ex-CIO, MSSP partner mgr, regional SI) | Sponsor (drafts pre-written by Pearl §2) | 1.5 | none |
| Read Path-A guide + Path-B protocol cover-to-cover, internalize Mom Test rules | Sponsor | 1.5 | none |
| Begin water-fixture rebuild scoping (read existing `plant-enriched.json`, list water-vendor swap targets, plan Rockwell/Wonderware/Modbus/DNP3/dosing-SIS replacements) | Claude / sponsor reviews | 0.5 sponsor + Claude time | findings-action-test §recommendations |
| Calendar hygiene — set up `{{CAL_LINK}}` if not already (G2) so reviewers can self-book | Sponsor | 0.5 | none |
| Schedule replies as they come in, defer scheduling to async between blocks | Sponsor | 0.5 | outreach sent |
| **Reserve:** WIAWWA decision (see §5) | Sponsor + Pearl | 0.5 | this doc |

**W2 sponsor hours: ~6.5.** GREEN.

**W2 deliverable / exit gate:** All 15 outreach emails (10 Path-A + 5 Path-B) sent by **EOD Thu 2026-04-30**. Calendar link live. Water-fixture rebuild scoped on paper.

**Risk if missed:** every Path-A interview slot slips one week → thaw slips one week.

---

### W3 (2026-05-04 Mon → 2026-05-10 Sun) — **first sessions, fixture rebuild**

**Working days available:** Tue 2026-05-05, Thu 2026-05-07. **WIAWWA seminar 2026-05-07 (see §5).**

| Task | Owner | Hours | Dep |
|---|---|---|---|
| **Path-B SI session** (regional WI utility OT integrator) — first B reviewer because their water-pattern feedback informs the fixture rebuild | Sponsor (Pearl coaches script in advance) | 2.0 (30 min prep + 30 min session + 30 min synthesis + 30 min follow-up) | W2 outreach reply |
| **Path-B ex-CIO session** — second B reviewer, also script-calibrating | Sponsor | 2.0 | W2 outreach reply |
| **First 2 Path-A interviews** (slot Tue 9–11 + Thu 9–11 if utilities self-book) | Sponsor | 2.0 (prep negligible after first one — 30 min session + 5-min decision tree + 15-min note-up + 10-min thank-you) | W2 outreach reply |
| **Water-fixture rebuild — Day 1** (Claude builds plant-water-demo.json swap; sponsor reviews shape) | Claude + sponsor 0.5 | 0.5 sponsor | SI session output |
| Synthesis-capture per interview (decision-tree 5-min rule from JTBD §6) | Sponsor | rolled into per-session hours above | each session |
| **Reserve:** WIAWWA seminar attend if path-A chosen in §5 | Sponsor | 3.0 if attended, 0 if skipped | §5 decision |

**W3 sponsor hours, base case (no WIAWWA):** ~6.5 + 0.5 reserve = **7.0**. GREEN.
**W3 sponsor hours if WIAWWA attended:** 7.0 + 3.0 = **10.0**. AT CEILING — no buffer for slips. AMBER.

**W3 deliverable / exit gate:**
- SI feedback captured.
- Water-fixture rebuild **decision**: rebuild parameters locked based on SI's water-pattern feedback.
- 2 Path-A interviews held + decision-tree filled.

**Critical-path note:** Pollard + AWWA-chair sessions cannot be scheduled in W3 — fixture rebuild + PDF regen must complete first. If outreach replies from those two land in W3, schedule for **W4 Thu earliest**.

---

### W4 (2026-05-11 Mon → 2026-05-17 Sun) — **fixture lands, Pollard + AWWA fire**

**Working days available:** Tue 2026-05-12, Thu 2026-05-14.

| Task | Owner | Hours | Dep |
|---|---|---|---|
| **Water-fixture rebuild — completion** (scanners re-run on plant-water-demo.json, findings.json regen) | Claude (Docker) + sponsor verify | 1.0 sponsor | W3 SI feedback |
| **Sample-PDF regen on water fixture** (`docker compose run --rm report report …`) | Claude + sponsor reviews artifact | 1.0 sponsor | fixture rebuild |
| **Path-C re-run on water fixture** (Claude scores 11 findings against rubric again) | Claude + sponsor reviews | 0.5 sponsor | PDF regen |
| **Path-B Pollard session** | Sponsor | 2.0 | new water PDF |
| **Path-B AWWA chapter chair session** | Sponsor | 2.0 | new water PDF |
| **Path-B MSSP partner-mgr session** (can run with old or new PDF; new is safer) | Sponsor | 2.0 | water PDF preferred |
| **Path-A interviews (3–4 sessions)** | Sponsor | 3.0–4.0 | rolling outreach |
| Per-session decision tree | Sponsor | included above | each |

**W4 sponsor hours, max:** 1.0 + 1.0 + 0.5 + 2.0 + 2.0 + 2.0 + 4.0 = **12.5**. **RED — exceeds 10-hr ceiling by 2.5 hr.**

**Resolution (Amber decision):** push **MSSP partner-mgr session to W5**. New W4 total = 10.5, still 0.5 over — push **one Path-A interview from 4 to 3** (3 sessions × 1.0 = 3.0). New W4 total = **9.5 hr**. AMBER (no slip buffer).

**W4 deliverable / exit gate:**
- Water-fixture rebuilt + PDF regenerated + Path-C re-validated.
- Pollard + AWWA chair B sessions complete.
- 5–6 cumulative Path-A interviews complete (2 from W3 + 3 from W4).

---

### W5 (2026-05-18 Mon → 2026-05-24 Sun) — **finish discovery, synthesize**

**Working days available:** Tue 2026-05-19, Thu 2026-05-21.

| Task | Owner | Hours | Dep |
|---|---|---|---|
| **Path-B MSSP partner-mgr session** (slipped from W4) | Sponsor | 2.0 | water PDF |
| **Path-A interviews (4 sessions)** to reach 9–10 total | Sponsor | 4.0 | rolling |
| **Path-B synthesis** (1-page memo per protocol §5) | Sponsor + Pearl drafts | 1.5 | all 5 B sessions complete |
| **Path-C synthesis confirm** (water-fixture re-run review) | Sponsor + Claude drafts | 0.5 | W4 C re-run |
| **Path-A mid-cohort check** (have we hit threshold trends? continue or pivot?) | Sponsor + Pearl | 0.5 | W5 sessions complete |
| Per-session decision tree | Sponsor | included | each |

**W5 sponsor hours:** 2.0 + 4.0 + 1.5 + 0.5 + 0.5 = **8.5 hr.** GREEN.

**W5 deliverable / exit gate:** Paths B and C synthesized. Path A at ~9–10 sessions, awaiting final 1–2 in W6 + synthesis.

---

### W6 (2026-05-25 Mon → 2026-05-31 Sun) — **Path-A close, thaw decision**

**Working days available:** Mon 2026-05-25 = **Memorial Day, off** (already non-working in our schedule). Tue 2026-05-26, Thu 2026-05-28. No capacity hit.

| Task | Owner | Hours | Dep |
|---|---|---|---|
| **Final 1–2 Path-A interviews** (target hit 10 total) | Sponsor | 2.0 | rolling |
| **Path-A synthesis** (per JTBD guide §7, 1-page memo, all 4 thresholds scored) | Sponsor + Pearl drafts | 2.5 | all interviews complete |
| **Triple-green check** (Pearl asserts A pass, Amber confirms B pass W5, C pass W4) | Pearl + Amber + sponsor | 1.0 | all three syntheses |
| **Thaw / partial-thaw / kill decision** per `PIN_sales.md` rubric | Sponsor (call) | 1.0 | triple-green check |
| Update `SESSION_HANDOFF.md` + `project_current_state.md` to reflect thaw or pivot | Amber | 1.0 | decision |

**W6 sponsor hours:** **7.5 hr.** GREEN.

**W6 deliverable / exit gate (the big one):** Thaw decision documented, RAID closed or carried, next-phase critical path drafted by Amber for sponsor sign-off.

---

### Capacity summary table

| Wk | Calendar | Sponsor hr | RAG | Notes |
|---|---|---|---|---|
| W2 | 2026-04-26 → 05-03 | 6.5 | GREEN | freeze launch + outreach |
| W3 | 2026-05-04 → 05-10 | 7.0 (10.0 if WIAWWA) | GREEN / AMBER | first sessions, fixture starts |
| W4 | 2026-05-11 → 05-17 | 9.5 (after MSSP slip + Path-A trim) | AMBER | fixture lands, Pollard + AWWA fire |
| W5 | 2026-05-18 → 05-24 | 8.5 | GREEN | finish, synth B + C |
| W6 | 2026-05-25 → 05-31 | 7.5 | GREEN | Path-A synth + thaw call |

---

## 4. Gate dependency graph

### Discovery gates (active during freeze)

```
                     Path A (10 interviews)
                          ├─ outreach W2
                          ├─ interviews W3–W6
                          └─ synthesis W6 ──────┐
                                                │
Path B SI session ──► water-fixture rebuild ──► Pollard + AWWA sessions
        │                  │                          │
        └─► ex-CIO  ───────┤                          │
                           └─► MSSP (W4→W5) ──────────┤
                                                      │
                                              Path B synth W5 ──┐
                                                                │
Path C ──► water-fixture re-run ──► Path C synth W4 ────────────┤
                                                                │
                                            Triple-green check W6 ──► THAW DECISION (sponsor)
```

### Pre-existing G1–G7 gates (sponsor-owned, paused during freeze)

These do not become critical until after thaw. They are NOT on the critical path during the freeze.

- G1 SPF/DKIM/DMARC — needed before first Day-0 send post-thaw.
- G2 `{{CAL_LINK}}` — **promote to W2 active** because B and A reviewers need to self-book; was paused, un-pause it.
- G3 outreach tracking schema — paused.
- G4 5 partial-WI confirmation calls — paused.
- G5 Waukesha transition script — paused.
- G6 WIAWWA briefing email — superseded by §5 below.
- G7 `{{COUNTY}}` — paused.

**Amber promotion:** G2 (CAL_LINK) is the only G-gate that becomes active during the freeze, because both A and B outreach reference it. Sponsor must close G2 in W2.

---

## 5. WIAWWA 2026-05-07 seminar — explicit decision

**Today + 11 days. Will fall during freeze.**

**Two options per task brief:**
- **(a) skip** — accept the decay cost (1-yr recurrence). No inquiry sent. No room of 50+ utilities reached this cycle.
- **(b) send a Pearl-vetted "we want to attend, not pitch" inquiry by no later than 2026-05-02** (5 days organizer lead time).

**Amber recommendation: (b) — send the inquiry, but as a listener, not a presenter.**

Rationale:

1. **The freeze does not prohibit listening.** PIN §"What IS allowed during freeze" allows discovery work. Sitting in a 50-utility room for a day is a discovery activity, not a sales activity, and the JTBD synthesis benefits enormously from real ambient conversation.
2. **(a) burns a 12-month-recurrence asset.** WIAWWA Tech & Security Seminar is annual. Skipping costs us full year of room access. That is a non-trivial decay cost on a slow-cadence calendar.
3. **(b) is not a thaw.** Sponsor attends, listens, takes notes, hands no business cards proactively, sends no follow-up sells. If asked what he does, he says: *"I'm doing market discovery for a small OT cyber practice; I'd rather hear what your members think than tell you anything."* Pure JTBD.
4. **Cost of (b) is bounded.** ~3 hr seminar attendance + 0.5 hr drive each way (assume) = ~4 hr W3 sponsor time. Above I flagged W3 at 10.0 hr if WIAWWA attended — at-ceiling but not over. Acceptable if **one Path-A interview is pushed from W3 to W4** to absorb the load. That swap is a no-cost trade because Path A is rolling.
5. **PIN §"What to NOT do during freeze"** says: *"Do not send the WIAWWA seminar inquiry. (If sponsor wants the seminar slot independent of sales, that's a separate decision — flag to Pearl.)"* I am flagging it. The decision frame here is **"attend as listener for discovery purposes,"** which is allowed under the PIN's freeze rules. The "briefing-slot" framing of G6 was a sales motion — I am explicitly NOT recommending that. The attendee-only inquiry is a different request.

**Operational steps if sponsor accepts (b):**

1. **By 2026-05-02** (Sat): Pearl drafts a 60-word inquiry to `contact@wiawwa.org`. Single ask: *"Is there a registration for non-presenting attendees? I'm doing market discovery, not selling. Happy to pay any standard registration fee."*
2. Sponsor sends from `cmalkansolutions.com` if G1 is closed by then; otherwise from `cmalkan@gmail.com` with explicit "Malkan Solutions LLC, WI" sign-off.
3. If WIAWWA accepts: sponsor attends 2026-05-07. Treat as a listening-only Path-A datapoint (informal, not counted toward 10/10 formal interviews).
4. If WIAWWA does not respond by 2026-05-05 EOD: skip. No follow-up.

**Pearl owns the language; Amber owns the W3 capacity adjustment** (push 1 Path-A from W3 to W4).

**Decision required from sponsor by 2026-05-02 EOD.** This date is hard.

---

## 6. Decay-cost log

Quantified per `PIN_sales.md` time-sensitive list. Today = 2026-04-26.

| Item | 1-wk freeze cost | 2-wk freeze cost | 3+-wk freeze cost (kill / delay) |
|---|---|---|---|
| **WIAWWA 2026-05-07 seminar** (today + 11 d) | already 5/11 days into decay | inquiry deadline 2026-05-02 missed if freeze still tight on decision-making → SLOT MISSED | full seminar missed; no recurrence until 2027 (12-month delay) |
| **Wisconsin contact list** (re-verified 2026-04-21) | 1 wk decay = 12 days from re-verify, list still usable | 2 wk decay = 19 days, names start drifting (GM successions, role moves), spot-check before send | 3+ wk decay = 26+ days, full re-verify mandatory, ~2 hr sponsor effort to re-confirm 10 utilities |
| **SDWLP SFY 2027 principal forgiveness 2026-06-30** | 9 wk lead remains → safe | 8 wk lead → safe | 7 wk lead → still safe; survives 4-wk freeze. Kill threshold = ~5 wk freeze (2026-05-31) |
| **T3 E&O bind 2026-07-07 (broker-cold)** | 10 wk lead → safe | 9 wk lead → safe | 8 wk lead → still safe; broker-cold realistic search is 6–8 wk so 5+ wk freeze is when this turns RED |
| **SFY 2027 SDWLP cycle (2027 application window)** | no near-term cost | no near-term cost | no near-term cost; 12 mo+ horizon |
| **Cold-list send burn** (counterfactual: had we sent W2) | freeze REDUCES this risk — un-validated send would have torched the list | reduction continues | reduction continues; net positive of freeze on this axis |
| **Sponsor momentum / context loss** | low — fresh | medium — context still warm | high — re-onboarding cost grows; 4+ wk freeze risks sponsor disengaging |

**Summary call:** under a **4-wk freeze ending W6 (2026-05-25)**, only WIAWWA is at structural risk (and §5 gives a way to neutralize it). Everything else survives. A **5+ wk freeze** starts to threaten T3 E&O timing and SDWLP. A **7+ wk freeze** kills SDWLP for SFY 2027.

**Therefore the thaw decision must happen by W6 EOW (2026-05-29) or the decay tab grows materially.** This anchors §8.

---

## 7. RAID — see `docs/amber/raid-log.md`

Top entries (full log in companion file):

- **R1 — Peer-charity bias in Path B:** 5 expert reviewers asked for free read; will tend to soft-pedal kill signals. *Mitigation:* adversarial questions §6 of B protocol pre-load the kill prompts.
- **R2 — Sponsor-as-interviewer bias in Path A:** sponsor builds the product AND runs the interviews; risk of leading questions. *Mitigation:* JTBD guide §3 anti-pitch handling + verbatim-quote rule on Q3/Q5/Q9 + 5-min decision tree.
- **R3 — Water-fixture rebuild scope creep:** "1 working day" estimate could expand if scanners need re-tuning per vendor. *Mitigation:* Amber boxes the rebuild at 1.5 sponsor-hours total (W3 0.5 + W4 1.0); over that = pause and re-scope.
- **R4 — Thaw-decision drift:** soft "let's run a few more" temptation when synthesis is mixed. *Mitigation:* W6 EOW thaw call is binding; partial-thaw/pivot rubric in PIN §"Partial-thaw triggers" must be the decision, not a re-extension.
- **R5 — WIAWWA missed if §5(b) declined:** 12-month asset burn. *Mitigation:* §5 recommendation. Sponsor decides by 2026-05-02.
- **D1 — G2 CAL_LINK:** if not live by W3 Mon, all 15 outreach emails go out without a self-book mechanism, slipping every session by 1 day of email-tag.
- **A1 — interview replies will land:** assumed 60% reply rate cold (6/10 A, 3/5 B). If actuals are <40%, W4–W6 capacity is over-allocated and Pearl pivot-options engage.

---

## 8. Thaw decision date

**Working backwards from §3 capacity model:**

- **Base case (clean greens):** all three paths return green by EOW W6. **Thaw call: Mon 2026-06-01 (W7 start).**
- **Slip-once case (one path needs re-run):** add 2 weeks for re-run + re-synth. **Thaw call: Mon 2026-06-15.** Still inside the SDWLP / T3-E&O survivability window (decay §6).
- **Kill case (≥1 path red):** recognize at W5 EOW (B + C synth date). Sponsor + Pearl call kill/pivot Mon 2026-05-25. Pivot options per PIN §"Partial-thaw triggers": ship water PDF + delay outreach (C-only green), rebuild artifact (A-only green), or major reposition (B-only green). Each pivot resets a new critical path; Amber re-scores at that point.

**Recognition triggers for kill case:**
- W4 EOW: if ≤2/5 B sessions held (outreach failed), capacity for B is shot — call early kill on B-as-designed and reduce reviewer cohort to 3 with explicit caveat in synthesis.
- W5 EOW: if Path-B synth shows ≥3/5 "I'd skim and shelf" → red, pivot per PIN.
- W6 mid-week: if Path-A interviews stalled at <7 completed, threshold cannot be hit; call kill on tier-as-priced or extend interview window 2 wk (and add 2 wk to thaw).

**Amber recommended target: thaw decision Mon 2026-06-01 (W7), slip-once protected to 2026-06-15.** Communicate this to sponsor as a binding date, not a soft target.

---

## 9. Top-3 NEW sponsor decisions required (freeze-forced)

These are NOT G1–G7. These are decisions only the freeze creates.

| # | Decision | Decision-required-by | Owner |
|---|---|---|---|
| **S1** | **WIAWWA 2026-05-07 — attend as listener (Amber rec) or skip?** Per §5. | **2026-05-02 EOD** (organizer lead time) | Sponsor + Pearl drafts language |
| **S2** | **Promote G2 (CAL_LINK) to active during freeze** so reviewers + interviewees can self-book? Or proceed manual-tag? | **2026-04-30 EOD** (before W2 outreach goes out) | Sponsor |
| **S3** | **Confirm 10 hr/wk capacity for the next 5 weeks**, including the seminar swap if §5(b). If sponsor's day-job calendar shifts, Amber needs to know now to re-shape W3–W6. | **2026-04-29 EOD** (before W2 Tue block) | Sponsor |

**These are the ones that move the critical path. Other decisions can wait.**

---

## 10. Push-back to Pearl

Per Amber/Pearl coordination protocol, Amber flags schedule/capacity infeasibility, not product strategy. Three thresholds I am flagging:

**P1 — Path A "≥4/10 willingness-to-pay band ≥$5k" threshold (PIN §"Thaw triggers" item 1).**
- Concern: cold outreach to mid-size WI water utility GMs at 30 minutes / no-pitch is a *low-WTP-disclosure* setting. Buyers don't volunteer dollar bands to peer reviewers; they volunteer them to vendors with a quote in hand. Asking the JTBD guide to extract WTP from a Mom-Test-disciplined call may be asking the same call to do two contradictory jobs (no-price-anchor AND get-a-price-band).
- Schedule risk: if Pearl insists on 4/10 hard threshold, my forecast says realistic field rate is 1–2/10 (proxy: workaround dollar mentions). We will hit the W6 thaw decision with Path A flagged red on this axis even if the underlying job is healthy.
- **Push-back specifics:** lower the threshold OR change the measurement. Either (a) ≥4/10 name a *funding source* (SRF, opex line, insurance offset) — JTBD Q11 already collects this, much higher hit rate, or (b) ≥2/10 name a dollar figure they spent on a workaround in the last 24 mo (Q3 / Q6) — past spend is volunteered more freely than future-WTP.
- **Pearl owns the call.** Amber position: current threshold is schedule-infeasible at our cadence; recommend re-spec.

**P2 — Path B "≥3/5 say I'd hand this to my board / utility GM" threshold (artifact-review §1).**
- Concern: this requires the reviewer to credibly imagine an end-buyer interaction. The MSSP partner-mgr archetype and possibly the regional SI archetype don't have boards or GMs in their narrative — they have channel teams. Two of five reviewers may legitimately answer "n/a" to the forwarding question, leaving the threshold at ≥3/3 effective for Pollard + AWWA chair + ex-CIO. That's a stricter test than 3/5.
- **Push-back:** either reduce the threshold to ≥2/5 OR re-spec the question per archetype (MSSP says "I'd forward to my channel partners," SI says "I'd give it to my project lead"). Pearl decides.

**P3 — Path B "≤1/5 say I've seen this exact thing from MSSP X already."**
- This one I think is achievable; flagging here only because if Path C's findings are reframed for the SI/integrator buyer (per finding-action-test §recommendations point 5), MSSP reviewer will more likely say "yes I've seen partner quickstart deliverables like this." **Pearl needs to decide: is the artifact pitched at utilities or SIs?** If both, the differentiation threshold may be fundamentally untestable. JTBD interviews need the answer first.

**No push-back on Path C** (≥7/11 actionable threshold) — already validated 9/11 in the 2026-04-26 paper run. That gate is essentially pre-passed pending the water-fixture re-run.

**Amber summary to Pearl:** thresholds are reasonable in spirit but Path A WTP is the load-bearing infeasibility. If you don't relax or re-spec it, expect Path A to come back yellow on a healthy underlying signal, and the freeze will extend on a measurement artifact.

---

## 11. Asks of sponsor (recap, this week's hard list)

Time-boxed:

- **By 2026-04-29 EOD:** confirm 10 hr/wk capacity for 5 wk, confirm Tue/Thu blocks W3–W6.
- **By 2026-04-30 EOD:** decision on G2 CAL_LINK (promote to active or stay paused).
- **By 2026-04-30 EOD:** approve Path-A and Path-B outreach drafts (if Pearl needs sponsor sign-off on language).
- **By 2026-05-02 EOD:** WIAWWA 2026-05-07 — attend-as-listener Y/N.

---

## 12. Asks of Pearl

- Resolve **P1** (Path A WTP threshold infeasibility) before W2 outreach goes out, or accept the schedule risk in writing.
- Resolve **P2** (Path B forwarding-question per-archetype variance).
- Resolve **f_seed_05 buyer-channel ambiguity** (utility vs SI) — this loops back to **P3**.
- Draft the WIAWWA-as-listener inquiry email (if sponsor accepts §5 recommendation).

---

## 13. RAG roll-up

| Phase | This week | Next week | Driver |
|---|---|---|---|
| Path A (interviews) | GREEN | GREEN | outreach launching, threshold concern is W6 not W2/W3 |
| Path B (artifact reviews) | GREEN | GREEN | inner ordering enforced, fixture rebuild planned |
| Path C (internals) | GREEN (passed 9/11) | GREEN | water-fixture re-run W4 |
| Capacity | GREEN | AMBER (W4) | W4 at 9.5/10 hr leaves no slip room |
| Schedule integrity | GREEN | AMBER | one-wk lead time means any W2 outreach miss slips W3 starts |
| Decay risk | AMBER | AMBER | WIAWWA forces decision by 2026-05-02 |

**Top blocker:** §5 WIAWWA decision + §11 sponsor confirmations. None are blocking right now; all are blocking in 3–6 days.

---

*End. This doc supersedes any prior W3+ critical-path scoring. Re-score on thaw or on any path returning red.*
