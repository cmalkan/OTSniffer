# PIN — Sales Track Frozen

**Date pinned:** 2026-04-26 (W2 mid-session)
**Pinned by:** Sponsor (Chetan Malkan), reason: validate value before sending email.
**Owning agent on resume:** Amber (re-score critical path).
**Branch state:** `chainingTools` tip `d7eabf5`, **7 commits unpushed**, no push pending.

This file freezes the sales-track state so a future session can pick it up without re-deriving anything. It is **not** a kill — it is a "do not advance" until the value-validation track returns evidence.

---

## Why frozen

We have priced and packaged a $7,500 Evidence Pack with $35k Impact Map upsell, locked Wisconsin governing law, built 7 sellable templates, and staged a 10-utility outreach list. None of it has been validated against a real buyer or a real expert reviewer. Sponsor's call: prove value first or risk burning the cold list and the time.

---

## What is frozen (do not advance, do not delete)

### Templates — sponsor-locked, ready to send when thawed
- `docs/templates/sow-evidence-pack.md` ($7,500 anchor, WI law, 40/60 pay, 1× cap)
- `docs/templates/roe.md` (no-touch, blackout, e-stop, T3 preconditions)
- `docs/templates/authorization-letter.md` (dual-signatory, Exhibit A)
- `docs/templates/intake-questionnaire.md` (12 sections)
- `docs/templates/one-pager.md` (water-utility variant)
- `docs/templates/water-outreach-sequence.md` (Day 0/3/7 + nurture + AWWA variant)
- `docs/templates/grant-eligibility-language.md` (4 length variants, WI-active)

### Pricing & positioning — locked
- T1 Evidence Pack $7,500 anchor (floor $5k, premium $12k)
- T2 Impact Map $35k anchor (3–4 wk)
- T3 Proven Pathways $95k anchor (6–8 wk; needs E&O + LAB_MODE)
- T4 Posture Watch $4.5k/mo retainer
- All in `docs/tiers-and-glossary.md` with comparable teardown.

### Outreach plan — staged, not active
- Wisconsin 10-utility list (`docs/outreach/wi-contacts-2026-04.md`) — 3/10 fully populated, 5/10 partial, 2/10 name-missing.
- Marty Pollard (WI DNR) flagged as highest-leverage state referral node.
- WIAWWA 2026-05-07 seminar identified as 50+-utility room; **briefing-slot inquiry not sent**.
- Execution order: WI → IL → TX → (FL Q3, NY deferred).
- Tue/Thu 9–11 + 2–4 outreach blocks **suspended** (was scheduled to start 2026-05-03).

### Open gates — still open, no work needed until thaw
| Gate | What | Owner |
|---|---|---|
| G1 | SPF/DKIM/DMARC on `malkansolutions.com` | Sponsor (still unanswered) |
| G2 | `{{CAL_LINK}}` calendar (Cal.com/Calendly) | Sponsor |
| G3 | Outreach tracking schema | Claude (deferred) |
| G4 | 5 email-confirmation calls for partial WI rows | Sponsor |
| G5 | Waukesha GM successor check + transition script | Claude (deferred) |
| G6 | WIAWWA 2026-05-07 briefing-slot inquiry email | Claude (deferred) |
| G7 | `{{COUNTY}}` value for SOW venue clause | Sponsor |

---

## Time-sensitive items now suspended

- **2026-05-03 hard Day-0 deadline** — *suspended*. Will reset on thaw.
- **2026-05-07 WIAWWA Technology & Security Seminar** — *will pass during freeze*. If discovery extends past 2026-05-05 the seminar slot is missed and won't recur until 2027. Note this as a decay cost.
- **2026-06-30 SDWLP SFY 2027 principal-forgiveness deadline** — still ~9 wk away on thaw date. Survives a 2–3 wk freeze.
- **2026-07-07 T3 broker-cold E&O bind target** — survives a 2–3 wk freeze.
- **Wisconsin contact list** — decays weekly. Names re-verified on 2026-04-21. By 2026-05-12 (3 wk decay) treat as stale; re-verify before any send.

---

## Thaw triggers — when to resume sales motion

Resume sales when **all three** of the following are evidenced (not just claimed):

1. **Path A (JTBD interviews)** — ≥7 of 10 utility interviews surface a job that maps to T1 / T2 / T3 (not just "yes cyber is a thing"), AND ≥4 of 10 name a willingness-to-pay band ≥$5k for an Evidence-Pack-shaped artifact.
2. **Path B (artifact review)** — ≥3 of 5 expert reviewers say "I would hand this to my board / utility GM," AND ≤1 of 5 says "I've seen this exact thing from MSSP X already" (differentiation signal).
3. **Path C (finding-to-action test)** — ≥7 of 11 demo findings translate to a concrete action a real utility operator would take in week 1; mismatch findings (energy-fixture-only) flagged for water-flavored fixture rebuild.

If **any** of the three returns red, **do not thaw** — kill or pivot the tier instead. Pearl owns the kill/pivot decision.

## Partial-thaw triggers (ship narrower)

If only Path C returns clean and A/B are mixed:
- Ship a water-flavored sample PDF refresh, but **delay outreach until A is green**.
- The artifact may be valuable to integrators / MSSPs even if direct-to-utility demand is fuzzy. Pivot consideration: T1-as-channel-product, not T1-as-direct.

If Path A is green but B is red:
- Job exists, artifact wrong. Rebuild artifact, re-test before outreach.

If Path B is green but A is red:
- Artifact good but no job. Likely a vendor-tooling play, not a utility-direct play. Major repositioning.

---

## What to NOT do during freeze

- Do not draft new outreach emails to utilities.
- Do not send the WIAWWA seminar inquiry. (If sponsor wants the seminar slot independent of sales, that's a separate decision — flag to Pearl.)
- Do not push the 7 unpushed commits without sponsor sign-off.
- Do not modify pricing or tier definitions in `tiers-and-glossary.md` without Pearl.
- Do not quote any Wisconsin utility contact externally — list decays weekly.
- Do not invent customer names or buyer testimonials.

## What IS allowed during freeze

- Path A / B / C discovery work (in `docs/discovery/`).
- Code work on scanner base extraction (`scripts/otsniff/scanners/_base.mjs`), `LAB_MODE` gate, IEC 62443 map (`data/iec62443-map.json`).
- Water-flavored plant fixture build (likely required after Path C anyway).
- Sample-PDF regeneration with new fixture.
- Updating SESSION_HANDOFF.md and memory to point at this PIN and the discovery track.

---

## Resume protocol

When all three thaw triggers green:

1. Amber re-scores W3+ critical path with new dates and the broker-cold E&O slip already factored.
2. Pearl confirms tier definitions still hold given discovery findings.
3. Sponsor confirms gates G1, G2, G7 (see table above) — these are the fastest path to first send.
4. Update `SESSION_HANDOFF.md` to point at the thaw decision and remove this PIN reference, OR explicitly mark it "thawed YYYY-MM-DD" rather than deleting (audit trail).
5. Re-verify Wisconsin contact list before any Day-0 send; week-of-thaw re-verification is mandatory.

---

## See also

- `docs/discovery/jtbd-interview-guide.md` — Pearl path A (in flight)
- `docs/discovery/artifact-review-protocol.md` — Pearl path B (in flight)
- `docs/discovery/findings-action-test.md` — path C (this session)
- `SESSION_HANDOFF.md` — full session state at end of W2
- `docs/tiers-and-glossary.md` — locked tier specs, do not edit during freeze
