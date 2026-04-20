# Statement of Work — Evidence Pack (T1)

**Template version:** 2026-04-20 · draft · anchor pricing pending sponsor confirmation
**Issuer:** Malkan Solutions LLC ("Provider")
**Client:** `{{CLIENT_LEGAL_NAME}}` ("Client")
**Engagement code:** `{{ENG-CODE}}`
**Governing law / venue:** `{{STATE}}` — *TBD by sponsor before first execution*

> This SOW incorporates by reference the executed Master Services Agreement (MSA) between the parties. If no MSA is in place, the Terms in §10 apply.

---

## 1. Engagement summary

Provider will deliver an **Evidence Pack** — a one-week passive Operational Technology (OT) exposure assessment producing a redacted, regulator-aligned evidence artifact that Client may use to answer insurer, auditor, board, or grant-administrator requests regarding OT cyber posture.

The Evidence Pack is **passive-only**. No active probing, credential testing, exploitation, or network-visible traffic is generated against Client production OT systems under this SOW. Active work is covered separately under the Proven Pathways (T3) tier and requires a signed Authorization Letter, Rules of Engagement, and attached insurance certificates.

## 2. Scope

**In scope:**

- Passive reconnaissance against the asset inventory Client provides in the Intake Questionnaire (see §4).
- Secrets scan of Client-designated code repositories, configuration exports, and artifact stores (if provided).
- Supply-chain scan of Client-designated dependency manifests and SBOMs (if provided).
- Correlation of findings against:
  - EPA America's Water Infrastructure Act (AWIA) Risk & Resilience Assessment (RRA) requirements, where applicable
  - CISA Cross-Sector Cybersecurity Performance Goals (CPGs)
  - Cyber Incident Reporting for Critical Infrastructure Act (CIRCIA) notification triggers
  - State Revolving Fund (SRF) cyber set-aside eligibility framing
- Redaction of secrets and sensitive identifiers before any artifact leaves Provider's systems.

**Out of scope (this SOW):**

- Active scanning, credential spray, exploit validation, red-team activity (covered under Proven Pathways, T3).
- Network penetration testing against Client infrastructure.
- Remediation implementation (advisory only under this tier).
- IT-domain assessments beyond the OT/IT boundary relevant to blast-radius scoring.
- Physical security, insider-threat, or social-engineering assessments.
- Incident response or forensic work related to an active compromise.

## 3. Deliverables

| # | Deliverable | Format | Due |
|---|---|---|---|
| D1 | Kickoff brief + signed Intake Questionnaire confirmation | Email + PDF | Day 1 |
| D2 | Mid-engagement findings preview (optional 15-min call) | Call + note | Day 3 |
| D3 | **Evidence Pack report** — 10-page PDF with redacted findings, regulatory cross-references, and remediation priorities | PDF | Day 7 |
| D4 | 30-day hosted dashboard access for Client-designated readers | URL + credentials | Day 7 |
| D5 | Evidence archive (raw normalized findings, SHA-256 integrity hash) | Zip + `.sha256` | Day 7 |

The report cross-references EPA AWIA RRA, CISA CPGs, CIRCIA, and SRF cyber set-aside eligibility where findings map to those frameworks. Dashboard access expires 30 days after delivery unless Client converts to a Posture Watch (T4) retainer.

## 4. Inputs required from Client

Client will provide, via the Intake Questionnaire, within 2 business days of SOW countersignature:

- Asset inventory (PLC / HMI / SCADA / SIS / historian list with vendor, model, firmware where known)
- Network topology diagram or description, including IT/OT boundary and any DMZ
- Code repositories, configuration exports, or SBOMs to be scanned (if applicable)
- Primary point of contact + escalation contact
- Scan window preferences and any no-touch periods (e.g., seasonal demand peaks, regulatory inspection windows)
- Redaction conventions (site names, operator names, customer identifiers)

Client delays in providing inputs shift the Day-7 delivery by matching business days. Provider will flag any such slip within 24 hours of the gate missing.

## 5. Schedule

Standard engagement is **5 business days of analysis** over a 1-calendar-week window. Kickoff occurs on Day 1 upon receipt of signed SOW + completed Intake Questionnaire. Expedited turn (3 business days) available at Premium pricing (§6).

| Day | Milestone |
|---|---|
| 0 | SOW countersigned, 40% payment invoiced |
| 1 | Kickoff + Intake confirmed |
| 2–3 | Passive recon + secrets + supply-chain scans |
| 3 | Optional mid-engagement preview call |
| 4–5 | Analysis, cross-reference mapping, redaction, report drafting |
| 6 | Internal QA review |
| 7 | Delivery of D3–D5; 60% payment invoiced |

## 6. Fees and payment

- **Engagement fee:** **$7,500 USD** (list anchor)
  - Floor: $5,000 (applies only inside a bundled MSSP channel agreement — not available as a list-price discount)
  - Premium: $12,000 (multi-site, MSSP white-label, or expedited 3-day turn)
- **Payment split:** 40% on SOW countersignature / 60% on delivery of D3
- **Terms:** Net 30 from invoice date
- **Currency:** USD; wire or ACH preferred; credit card +3% surcharge
- **Expenses:** None expected. Any travel-required work requires a separate change order.

Pricing is anchored to defensible funding sources: EPA CWSRF/DWSRF cyber set-asides, IIJA/BIL cyber grants (state-administered), insurance-premium offset, or operating "regulatory compliance" line. Provider will on request furnish grant-eligibility framing language for Client's SRF application.

## 7. Acceptance

D3 (Evidence Pack report) is deemed accepted on the earlier of:

- Client's written acceptance, or
- 10 business days after delivery with no written objection specifying a material deficiency.

Material deficiency means the report fails to deliver one or more listed deliverables in §3. Disagreement with a finding is not a material deficiency — finding dispute resolution is handled per §9.

## 8. Confidentiality and data handling

- All Client-provided materials are treated as Confidential Information under the MSA (or, if no MSA, under the terms below).
- Provider retains the redacted Evidence Pack and the raw findings archive for **12 months** from delivery for audit support, then destroys both unless Client requests earlier destruction in writing.
- Secrets detected are **redacted in all artifacts** before any artifact leaves Provider-controlled systems. Raw secret values are never included in the report, dashboard, or evidence archive.
- Dashboard data is hosted on Provider-managed infrastructure; access is limited to Client-named readers over HTTPS.
- Provider will not publish, cite, or reference Client by name in marketing without separate written consent. Aggregated, anonymized finding statistics may be used.

## 9. Finding dispute and correction

If Client believes a finding is factually inaccurate, Client notifies Provider in writing within 10 business days of delivery. Provider will re-examine evidence and issue a corrected report within 5 business days at no charge. This is the sole remedy for finding accuracy disputes.

## 10. Liability, warranty, and terms

- **Liability cap:** Provider's total aggregate liability under this SOW is capped at **1× the engagement fee** ($7,500 at anchor). This cap excludes gross negligence, willful misconduct, or breach of confidentiality obligations.
- **Warranty:** Services delivered in a workmanlike manner consistent with industry practice for OT assessment services. **No warranty** that findings are exhaustive or that absence of a finding implies absence of vulnerability — Evidence Pack is a one-week passive snapshot, not a complete security audit.
- **No production touch:** Provider warrants that no active probing, exploitation, credential testing, or network-visible traffic will be generated against Client production OT under this SOW.
- **Insurance:** Provider maintains General Liability and will provide certificates on request. Cyber Liability / E&O coverage is **not required** for T1 (passive-only) engagements; such coverage is required for T3 (Proven Pathways) engagements under a separate SOW.
- **Indemnification:** Each party indemnifies the other against third-party claims arising from its own gross negligence or willful misconduct.
- **Termination:** Either party may terminate for material uncured breach after 5 business days written notice. Fees earned through termination date remain payable.
- **Independent contractor:** Provider is engaged as an independent contractor. No employment, partnership, or joint venture is created.
- **Governing law:** `{{STATE}}` law; exclusive venue in `{{COUNTY, STATE}}` courts.

## 11. Change control

Any change to scope, schedule, or fees requires a written change order signed by both parties before work against the change begins.

## 12. Signatures

**Malkan Solutions LLC**

Name: _________________________
Title: _________________________
Date: _________________________
Signature: _____________________

**`{{CLIENT_LEGAL_NAME}}`**

Name: _________________________
Title: _________________________
Date: _________________________
Signature: _____________________

---

### Template notes (delete before execution)

- Replace all `{{PLACEHOLDER}}` values.
- Confirm $7,500 anchor with sponsor before first external issuance. Pearl held $5k floor only inside bundled MSSP deals.
- Governing law / venue unresolved — sponsor decision required (Malkan Solutions LLC state of formation is the natural default).
- Pair with: Rules of Engagement (`roe.md`), Authorization Letter (`authorization-letter.md`), Intake Questionnaire (`intake-questionnaire.md`). Authorization Letter is *not* required for T1 passive-only but is recommended for utility-sector engagements where Client's own policy mandates it.
- Do not issue without a matching entry in Malkan's engagement register and a distinct `{{ENG-CODE}}`.
