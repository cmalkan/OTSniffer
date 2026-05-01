# Water Utility Outreach Sequence

**Version:** 2026-04-20 · draft
**Channel:** state Rural Water Associations (RWA) + state AWWA section chapter contacts + mid-size water utilities (10k–100k served)
**Sender identity:** Malkan Solutions LLC
**Sequence cadence:** Day 0 → Day 3 → Day 7 → (stop or nurture)

> Angle: grant-eligibility + peer EPA-letter precedent. **Not** blast-radius, red-team, or "get breached" language — those collide with existing Dragos/Claroty/Nozomi messaging and tend to over-alarm utility boards without advancing the sale. Lead with funding and regulatory alignment. Let the one-pager and Evidence Pack report do the technical heavy lifting after the call is booked.

---

## How to use this sequence

1. Pull contact list by state from RWA directories + AWWA section pages. Target roles: **General Manager, Operations Director, Board Chair, CFO, or IT/Security Lead** (whichever the utility publishes). Avoid generic info@ addresses — personalized first touch is required for the sequence to work.
2. Send Day 0 email from the named Malkan engagement contact, not from a marketing domain. A reply-able human address matters here.
3. Day 3 is a short, value-add-only follow-up — not a "did you see my email" ping. A ping gets reported as spam by utility staff this year; a tailored value-add does not.
4. Day 7 is a final touch with a concrete CTA. If no response, move the contact to the nurture track (quarterly) and do not continue pushing.
5. Log every touch in the CRM with response/no-response and any reason given. Response rates and objection patterns feed the W8 review.

## Personalization variables

Fill these in for each send. Skipping any of them drops open-rate substantially — do not send generic.

- `{{FIRST_NAME}}` / `{{LAST_NAME}}` / `{{TITLE}}`
- `{{UTILITY_LEGAL_NAME}}` / `{{UTILITY_SIZE_MGD_OR_POP_SERVED}}`
- `{{STATE}}` / `{{STATE_SRF_PROGRAM_NAME}}` (varies by state)
- `{{RELEVANT_TRIGGER}}` — one of:
  - Your utility is in the current AWIA RRA cycle wave
  - `{{STATE}}` SRF Intended Use Plan window is open / upcoming
  - Recent EPA enforcement or advisory letter to a peer utility in `{{STATE}}` or adjacent state
  - Upcoming insurance renewal window (if visible)
- `{{NAMED_PEER_PROGRAM}}` — e.g., "`{{STATE}}` Rural Water Association cybersecurity working group," AWWA `{{STATE}}` section cyber committee
- `{{SENDER_NAME}}` / `{{SENDER_TITLE}}` / `{{PHONE}}` / `{{CAL_LINK}}`

---

## Day 0 — opening email

**Subject line options (A/B test):**

- `{{STATE}} SRF cyber set-aside — one-week evidence artifact you can pair with the application`
- `For {{UTILITY_LEGAL_NAME}}: grant-eligible OT cyber evidence in one week, $7,500`
- `{{FIRST_NAME}} — quick note on {{STATE}} SRF cyber set-aside eligibility`

**Body:**

Hi `{{FIRST_NAME}}`,

I run Malkan Solutions, an OT cybersecurity assessment practice focused on water utilities in `{{UTILITY_SIZE_MGD_OR_POP_SERVED}}` size range. Writing because `{{RELEVANT_TRIGGER}}` — and most utilities this size I talk to are fielding the same two questions from insurers and boards without a ready answer:

1. *What's actually exposed on our plant floor this quarter?*
2. *Can we document it in a way that's defensible to the state SRF administrator, our insurer, and EPA?*

We built a one-week, passive-only assessment specifically for that gap. It's called the Evidence Pack:

- $7,500 fixed
- 1-week turnaround from intake to delivered 10-page redacted PDF
- Cross-references EPA AWIA RRA, CISA CPGs, and the `{{STATE_SRF_PROGRAM_NAME}}` cyber set-aside eligibility criteria
- 30-day hosted dashboard access for your security lead + insurer reviewer
- SHA-256-hashed evidence archive for auditor / regulator chain-of-custody

Importantly: **no active probing, no network-visible traffic to your plant, no touch on SIS or safety-critical PLCs**. Active validation work is a separate, gated tier with full E&O and cyber liability attached — rarely what a utility needs as a first engagement.

Would a 45-minute intake call next week be useful? If you're about to submit an SRF Intended Use Plan application, I can also send over the grant-eligibility framing language Malkan provides at no charge, even if the Evidence Pack isn't a fit this cycle.

Best,
`{{SENDER_NAME}}`
`{{SENDER_TITLE}}`, Malkan Solutions LLC
`{{PHONE}}` · schedule: `{{CAL_LINK}}`

---

## Day 3 — value-add follow-up (no call-to-action pressure)

**Subject:** `{{STATE_SRF_PROGRAM_NAME}} cyber set-aside — language you can paste into the IUP application`

**Body:**

Hi `{{FIRST_NAME}}`,

Not chasing — sending the grant-eligibility framing language I mentioned in case you or your grants lead is working on the `{{STATE_SRF_PROGRAM_NAME}}` Intended Use Plan application for this cycle. It's eligibility-focused, not sales copy — paste-ready for the "cybersecurity planning" or "emergency response planning" narrative section.

`[attach or inline: 200-word grant-eligibility paragraph citing EPA's October 2025 SRF cyber guidance, CISA CPGs alignment, and the AWIA RRA refresh tie-in; exact text maintained in C:\Users\b2\source\repos\OTSniffer\docs\templates\grant-eligibility-language.md (to be drafted as a separate template) — sender inlines it per state]`

Two things worth flagging while I have you:

- **Peer precedent:** EPA's 2024–2025 enforcement letters to water utilities in `{{STATE}}` and `{{ADJACENT_STATE}}` cite documentation gaps more than technical findings. Evidence Pack is specifically built to close that.
- **Insurance window alignment:** if your cyber liability renews in the next 90 days, an evidence artifact in hand during renewal negotiations has historically earned 15–25% premium reductions at mid-size utilities. That often funds the assessment.

If a 45-minute intake becomes useful this quarter, here's my calendar: `{{CAL_LINK}}`. If not — no worries, the language above is yours to use either way.

Best,
`{{SENDER_NAME}}`

---

## Day 7 — final touch, concrete ask

**Subject:** One ask on `{{STATE_SRF_PROGRAM_NAME}}` — 2 minutes?

**Body:**

Hi `{{FIRST_NAME}}`,

Last note from me on this. Two questions, either is useful:

1. Is Evidence Pack worth a 45-minute scoping call at `{{UTILITY_LEGAL_NAME}}`? If yes: `{{CAL_LINK}}`. If not this cycle, I'll park the outreach.
2. If Evidence Pack isn't a fit but you know another utility in `{{STATE}}` weighing an SRF cyber set-aside application this window, a one-line intro is worth a lot to me. I'll offer a referral credit on any engagement that results.

Either way, thanks for reading through the prior notes. I'll move `{{UTILITY_LEGAL_NAME}}` to a quarterly check-in cadence after this unless I hear otherwise.

Best,
`{{SENDER_NAME}}`
Malkan Solutions LLC
`{{PHONE}}`

---

## Nurture track (if no response after Day 7)

Quarterly touches only. Each touch must carry a **new external signal** — not a repeat ask. Signal examples:

- New EPA guidance document or enforcement action relevant to `{{STATE}}`
- New SRF cyber set-aside window opening in `{{STATE}}`
- New CISA CPG revision or water-specific CPG addition
- Malkan publishes anonymized aggregate findings report (quarterly)
- Peer utility in `{{STATE}}` announces completion of an evidence-pack equivalent (only with that utility's permission to reference)

No product-pitch-only nurture touches. Utility inboxes filter those out by spring 2026.

---

## AWWA section chapter variant

For AWWA `{{STATE}}` section cybersecurity committee chairs and state RWA staff — people with reach but not buyers themselves. Adjust Day 0 opener:

- Lead with *"I'd value 20 minutes to share what we're seeing across Evidence Pack engagements at utilities your members serve"* — an asymmetric value exchange that respects their role as trusted advisor, not buyer.
- Offer to deliver a free 30-minute briefing at a chapter meeting (virtual OK) on SRF cyber set-aside eligibility and common passive-assessment findings. No pitch, no logo on slides beyond footer.
- Convert the connection into utility-member referrals, not a direct sale to the chapter.

---

### Template notes (delete before sending)

- Do not batch-send. One-by-one personalization is what makes water-utility outreach work at this tier. Batches get filtered.
- Validate `{{STATE_SRF_PROGRAM_NAME}}` against the state's actual program page before sending. Program names vary.
- The Day 3 email references a grant-eligibility language attachment that is a separate template yet to be drafted (`docs/templates/grant-eligibility-language.md`). Inline the paragraph for now until that template lands.
- Track opens, replies, and booked calls per state. Water-utility outreach has long latency — do not judge a state's conversion rate before 30 days of sequence completion across at least 10 contacts.
- Sequence copy assumes $7,500 anchor. Update in one pass if sponsor reprices T1.
- Do not name specific peer utilities in any email without written permission. Use regional / state-level references only.
