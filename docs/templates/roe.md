# Rules of Engagement (ROE)

**Template version:** 2026-04-20 · draft
**Engagement:** `{{ENG-CODE}}` — `{{CLIENT_LEGAL_NAME}}` × Malkan Solutions LLC
**Tier:** `{{Evidence Pack | Impact Map | Proven Pathways}}`
**SOW reference:** `{{SOW-DOC-ID}}`, dated `{{DATE}}`
**Effective window:** `{{START_DATETIME_TZ}}` through `{{END_DATETIME_TZ}}`

> This ROE governs the on-the-ground conduct of the engagement. It is incorporated by reference into the SOW and the Authorization Letter. Where this document conflicts with the SOW, the SOW controls. Where it conflicts with an Authorization Letter countersigned by Client's plant-level security lead and engineering owner, the Authorization Letter controls.

---

## 1. Parties and points of contact

| Role | Name | Organization | Contact (email + phone) | Backup |
|---|---|---|---|---|
| Provider engagement lead | `{{NAME}}` | Malkan Solutions LLC | `{{EMAIL}}` / `{{PHONE}}` | `{{BACKUP}}` |
| Client plant-level security lead | `{{NAME}}` | `{{CLIENT}}` | `{{EMAIL}}` / `{{PHONE}}` | `{{BACKUP}}` |
| Client engineering owner (OT) | `{{NAME}}` | `{{CLIENT}}` | `{{EMAIL}}` / `{{PHONE}}` | `{{BACKUP}}` |
| Client operations on-call | `{{NAME}}` | `{{CLIENT}}` | `{{EMAIL}}` / `{{PHONE}}` | `{{BACKUP}}` |
| Client emergency-stop authority | `{{NAME}}` | `{{CLIENT}}` | 24×7 `{{PHONE}}` | `{{BACKUP}}` |

Any substitution to the above requires written notice to the other party's engagement lead before the substitute takes any action under this ROE.

## 2. Authorized activities

Only the activities listed are authorized under this ROE. Anything not listed is out of scope and requires a written change order to the SOW + a reissued ROE.

**Authorized for all tiers (T1/T2/T3):**

- Passive reconnaissance using Client-provided asset inventory and network descriptions.
- Secrets scanning against Client-designated code repositories, configuration exports, and artifact stores.
- Supply-chain scanning against Client-designated dependency manifests and SBOMs.
- Correlation against EPA AWIA RRA, CISA CPGs, CIRCIA, IEC 62443-4-2 SR coverage, and NIST SP 800-82 where the engagement contracts for it.
- Redaction and evidence-packaging on Provider-controlled systems.

**Authorized for Impact Map (T2) additionally:**

- Blast-radius simulation against the delivered model, running entirely on Provider infrastructure. No simulation traffic is emitted to Client networks.
- Readout call with Client leadership on a Client- or Provider-hosted conference bridge.

**Authorized for Proven Pathways (T3) additionally — and only if §3 conditions are all met:**

- Lab-only credential spray against Client-supplied credentials on a Client-supplied air-gapped or lab environment. No live directory, no production PLC, no production SCADA.
- Path validation limited to targets named in the Authorization Letter's target list.
- Post-remediation re-test against the same target list.

**Never authorized under any tier of this ROE:**

- Active scanning, probing, or exploitation against any production OT asset.
- Any activity that emits traffic to safety instrumented systems (SIS) or to the PLCs listed in the Client's safety-critical register (see §4).
- Social engineering, phishing, or pretexting against Client personnel.
- Physical-access testing, lock-picking, badge cloning, or tailgating.
- Denial-of-service, fuzzing, or stress testing.
- Work outside the effective window declared above.

## 3. Preconditions for T3 (Proven Pathways) active work

Active work under T3 may not begin until *all* of the following are in place and verified in writing by both engagement leads:

1. Countersigned Authorization Letter naming the exact targets, dates, and authorized testers.
2. `LAB_MODE=1` attestation from Provider confirming the active scanner toolchain has lab-mode gating enabled and has been run against a non-production target once successfully within the preceding 30 days.
3. Cyber Liability and Errors & Omissions insurance certificates from Provider, current and attached to the SOW, naming Client as an additional insured for the engagement window.
4. Confirmed 24×7 reachability of Client's emergency-stop authority for the entire active-work sub-window.
5. Client-confirmed absence of any regulatory inspection, safety test, or production-critical window overlapping the active-work sub-window.

Any one of these preconditions lapsing mid-engagement suspends all active work immediately.

## 4. No-touch list

The following assets are categorically excluded from any scan, probe, or touch under this engagement regardless of tier, and Provider configures scanner scopes to exclude them before any tool runs:

- All Safety Instrumented Systems (SIS), including but not limited to: `{{SIS_VENDORS_AND_TAGS}}`
- All PLCs on the safety-critical register: `{{PLC_LIST_OR_ATTACHMENT_REF}}`
- Any asset on the Client's emergency-response or alarm chain: `{{ALARM_CHAIN_REF}}`
- Any asset currently in a declared maintenance or commissioning window.
- Any asset for which the vendor has issued an active advisory requiring no-probe posture.

Client may add assets to this list at any time during the engagement with immediate effect; removals require written confirmation from both the security lead and the engineering owner.

## 5. Maintenance-window and blackout clauses

- **Declared blackout windows:** `{{BLACKOUT_LIST}}` — no Provider activity occurs during these windows.
- **Ad-hoc blackout:** Client's operations on-call or emergency-stop authority may declare an immediate blackout by phone or SMS to the Provider engagement lead. Provider acknowledges within 10 minutes and all Provider activity affecting Client assets halts within 15 minutes of acknowledgement.
- **Resumption:** Provider does not resume after an ad-hoc blackout until Client's security lead or engineering owner gives written clearance.
- **Regulatory-inspection overlap:** if an EPA, CISA, state PUC, or other regulatory inspection is declared for Client's site during the engagement window, Provider activity pauses for the inspection's duration plus 24 hours buffer, unless Client's security lead expressly waives the buffer in writing.

## 6. Emergency-stop protocol

1. Either party may invoke emergency stop at any time, for any reason, by any channel that reaches the other party's engagement lead. No justification required at the moment of invocation.
2. Provider confirms receipt within 10 minutes and ceases all engagement activity within 15 minutes. The confirmation timestamp is logged.
3. Provider quarantines all in-flight tooling output on the evidence chain (see §7) and does not delete.
4. A post-stop review occurs within 2 business days: root cause, scope of activity up to the stop, any artifacts produced, remediation if any.
5. Resumption requires written sign-off from Client's security lead **and** Client's engineering owner. An Authorization Letter amendment is required if the resumption changes scope, target list, or timing.

Emergency stops are not billable events. Client is not charged additional fees for stops unless the stop was caused by Client failing to provide a documented input on time (in which case Net 30 timing under the SOW applies per §5 of the SOW).

## 7. Evidence chain-of-custody

- All scanner output is written to a Provider-controlled, write-once evidence store with per-artifact SHA-256 hashing at capture time.
- Evidence metadata includes: engagement code, source tool (toolchain image + version, or `"manual"` for fallback scanners), operator identity, timestamp (UTC and site-local), and a monotonic engagement sequence number.
- Raw secrets are redacted before any artifact leaves Provider systems; redaction happens *in the capture pipeline*, not after the fact. See Provider's [`scripts/otsniff/scanners/secrets.mjs`](../../scripts/otsniff/scanners/secrets.mjs) `redact()` for the canonical method.
- Findings emitted to the final report and dashboard carry their finding-id back to the evidence store; an auditor with Client's consent can trace any reported finding to the exact hashed artifact.
- Evidence store retention: 12 months from engagement end, then destroyed unless Client has requested earlier destruction in writing or is contractually obligated to longer retention under regulation.

## 8. Data handling

- All Client-origin data is treated as Confidential Information per SOW §8.
- Transit: TLS 1.2+ for all network transfers; SSH with key auth only (no password) for any operator-session access to Provider infrastructure.
- At rest: Provider evidence store is encrypted (AES-256); dashboard host uses encrypted volumes.
- Access: least-privilege. Only the named Provider engagement lead and up to two named analysts from Provider may access raw artifacts.
- Third-party sub-processors: none authorized under this ROE without prior written Client consent. Netlify (dashboard hosting) is the sole default sub-processor; any other requires consent.
- Cross-border: all engagement data is stored and processed in the United States unless Client authorizes otherwise in writing.
- Destruction: on Client request or at retention expiry, Provider destroys raw artifacts and confirms in writing with a destruction manifest.

## 9. Communications and escalation

| Severity | Example | Channel | Response target |
|---|---|---|---|
| P1 — active production impact or suspected | Unexpected alarm, PLC reboot, process deviation during engagement window | Phone to emergency-stop authority + engagement leads | Immediate; emergency-stop protocol fires |
| P2 — engagement blocker | Scanner crash, access revoked, missing input | Phone + email engagement leads | Same business day |
| P3 — routine update | Daily status, finding preview, schedule reminder | Email | Next business day |

Silence from Client's engagement lead for more than 1 business day on a P2 triggers escalation to the security lead.

## 10. Reporting obligations during engagement

- Provider delivers a one-paragraph daily status to Client's engagement lead by end of each engagement day.
- Any finding classified Critical or High severity at discovery is communicated to Client's security lead and engineering owner within 2 business hours — redacted summary only, full evidence in the final report.
- Any observation suggesting active compromise (not merely exposure) is communicated immediately and the engagement pauses pending Client direction. This is not billable additional work.

## 11. Acceptable use

- Provider personnel will identify themselves on any call or email as Malkan Solutions engagement staff; no pretexting or social-engineering personas.
- Provider will not retain any Client credentials beyond the engagement window. All credentials are destroyed on delivery day and confirmed in writing.
- Provider will not use Client environments, systems, or data for any purpose outside this engagement — including, explicitly, for training Provider models or benchmarking Provider toolchain.
- Provider personnel complete and sign the engagement-specific acceptable-use attestation before any scanner runs.

## 12. Incident reporting (CIRCIA alignment)

If during the engagement Provider identifies a covered cyber incident as defined by CIRCIA or an equivalent state or sector rule:

1. Provider notifies Client's security lead and engineering owner immediately.
2. Provider provides Client all evidence required for Client to meet Client's own regulatory notification obligations.
3. Provider will cooperate with Client's incident response without expecting additional fees under this ROE (a separate IR SOW may follow if scope expands materially).
4. Provider does not make any regulatory notification on Client's behalf unless separately engaged and authorized to do so.

## 13. Termination of the ROE

- Either party may terminate this ROE on 24 hours written notice for convenience.
- Immediate termination on: material breach of §4 (no-touch) or §2 (authorized activities), lapse of any §3 precondition during a T3 engagement, or loss of Provider insurance coverage.
- On termination, Provider completes the evidence chain-of-custody wrap-up (§7), delivers any in-progress artifacts to Client, and invoices for earned fees per SOW §6.

## 14. Signatures

**Malkan Solutions LLC — Provider**

Engagement lead: _________________________
Date: _________________________
Signature: _____________________

**`{{CLIENT_LEGAL_NAME}}` — Client**

Plant-level security lead: _________________________
Date: _________________________
Signature: _____________________

Engineering owner (OT): _________________________
Date: _________________________
Signature: _____________________

---

### Template notes (delete before execution)

- Pair with SOW (`sow-evidence-pack.md` for T1) and Authorization Letter (`authorization-letter.md`). Do not issue this ROE without both.
- §3 preconditions apply only to T3. Redact or remove §3 for T1 execution copies to avoid confusion.
- §4 no-touch list must be populated from the Intake Questionnaire answers before ROE execution. Do not execute with placeholder text in §4.
- §5 blackout list should be populated from the Client-provided scan-window preferences in the Intake Questionnaire.
- Verify 24×7 emergency-stop authority phone is a real number that rolls to a human, not a voicemail. Test-call before engagement Day 1.
