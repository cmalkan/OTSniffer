# Authorization Letter — OT Assessment Engagement

**Template version:** 2026-04-20 · draft
**Engagement:** `{{ENG-CODE}}`
**Date:** `{{DATE}}`

---

**To:** Malkan Solutions LLC ("Provider")
**From:** `{{CLIENT_LEGAL_NAME}}` ("Client")
**Re:** Authorization to perform Operational Technology (OT) cybersecurity assessment activities

---

## 1. Authorization

`{{CLIENT_LEGAL_NAME}}`, acting through the undersigned, hereby authorizes Malkan Solutions LLC and its named personnel to perform the cybersecurity assessment activities described in:

- Statement of Work `{{SOW-DOC-ID}}`, dated `{{SOW_DATE}}` ("SOW")
- Rules of Engagement `{{ROE-DOC-ID}}`, dated `{{ROE_DATE}}` ("ROE")

both of which are incorporated by reference into this letter. This authorization is granted by Client in Client's capacity as lawful owner and/or operator of the assets described below, and Client represents that it has authority to grant it.

## 2. Authorized personnel

The following Provider personnel are authorized to conduct engagement activity:

| Name | Role | Contact | Authorized activities |
|---|---|---|---|
| `{{NAME}}` | Engagement lead | `{{EMAIL}}` | All activities in SOW + ROE |
| `{{NAME}}` | Analyst | `{{EMAIL}}` | Passive + analysis only |
| `{{NAME}}` | Analyst | `{{EMAIL}}` | `{{SCOPE}}` |

Substitutions require Client's written consent (email from undersigned sufficient).

## 3. Authorized scope

Authorization covers **only** the activities listed as "Authorized" in ROE §2 for the tier in effect (`{{TIER}}`), against the targets enumerated in Exhibit A of this letter, within the window:

- **Start:** `{{START_DATETIME_TZ}}`
- **End:** `{{END_DATETIME_TZ}}`

Client authorizes Provider to generate, capture, hash, and retain engagement artifacts as specified in ROE §7 (Evidence chain-of-custody) and ROE §8 (Data handling).

Any activity outside ROE §2 ("Authorized activities"), outside the targets in Exhibit A, or outside the window above is **not authorized** and requires a written amendment to this letter signed by the same signatories.

## 4. No-touch acknowledgment

Client confirms the no-touch list in ROE §4 is complete as of this letter's date and accurately reflects:

- all Safety Instrumented Systems (SIS) operated by or on behalf of Client at the in-scope site(s);
- all PLCs on Client's safety-critical register;
- all assets on Client's emergency-response or alarm chain;
- all assets currently in declared maintenance or commissioning windows.

Client accepts responsibility for timely updates to that list during the engagement per ROE §4.

## 5. Regulatory and standards framework

This engagement is conducted under the following lawful-use and good-practice frameworks, which Provider will reference in its methodology and deliverables as applicable:

- **NIST SP 800-82 Rev. 3** — Guide to Operational Technology (OT) Security
- **IEC 62443** series, in particular IEC 62443-4-2 Component Security Requirements and IEC 62443-3-3 System Security Requirements
- **CISA Cross-Sector Cybersecurity Performance Goals (CPGs)**
- `{{SECTOR_FRAMEWORK}}` — one or more of:
  - **EPA AWIA Risk and Resilience Assessment** (water utilities)
  - **AWWA Cybersecurity Guidance** (water utilities)
  - **NERC CIP** (electric utilities)
  - **TSA Security Directive(s)** (pipelines)
  - **FDA 21 CFR 820 / Part 11** (medical manufacturing)
  - **FSMA** (food manufacturing)

Client and Provider each acknowledge that these frameworks describe recognized industry practice. Nothing in this letter constitutes a regulatory filing or admission.

## 6. Representations by Client

Client represents and warrants to Provider that:

1. Client owns or operates the assets in Exhibit A, or has obtained authorization from the owner/operator sufficient to permit the activities in §3.
2. No third-party consent (landlord, co-tenant, joint venturer, regulator) is required for the authorized activities that Client has not already obtained.
3. Personnel identified in ROE §1 with emergency-stop and authorization authority have the organizational authority actually to stop work and to authorize this letter.
4. The no-touch list in ROE §4 is accurate and complete as of this date.
5. Client has reviewed the SOW, ROE, and this letter with its own counsel or has knowingly elected not to.

## 7. Representations by Provider

Provider represents and warrants to Client that:

1. Provider's engagement personnel listed in §2 have completed the engagement-specific acceptable-use attestation per ROE §11.
2. For Proven Pathways (T3) engagements: Provider's Cyber Liability and E&O insurance are current and certificates have been attached to the SOW, naming Client as an additional insured for the engagement window.
3. Provider will not exceed the authorized scope in §3, regardless of what further access might be possible during the engagement.
4. Provider will observe ROE §6 (Emergency-stop protocol) without qualification.

## 8. Indemnity scope

This letter does not expand, narrow, or replace any indemnity or liability provisions in the SOW. In event of conflict, SOW §10 (Liability, warranty, and terms) controls.

## 9. Duration, amendment, and revocation

- This authorization is effective from the Start timestamp in §3 and terminates at the End timestamp in §3, unless earlier revoked under this section or terminated under ROE §13.
- Amendments require a written document signed by the same two Client signatories named below plus the Provider engagement lead.
- Client may revoke this authorization at any time, for any reason, by written notice (email acceptable) to the Provider engagement lead. Provider ceases activity per ROE §6 upon revocation.
- Provider may decline to continue engagement activity if any §3 precondition (for T3) or ROE §4 condition is, in Provider's good-faith judgment, no longer met.

## 10. Signatures

Client's plant-level security lead **and** engineering owner must both sign for this letter to be effective. Single-signatory execution is not valid.

**Client — plant-level security lead**

Name: _________________________
Title: _________________________
Date: _________________________
Signature: _____________________

**Client — engineering owner (OT)**

Name: _________________________
Title: _________________________
Date: _________________________
Signature: _____________________

**Provider — Malkan Solutions LLC, engagement lead (acknowledging receipt)**

Name: _________________________
Title: _________________________
Date: _________________________
Signature: _____________________

---

## Exhibit A — Authorized targets

List each target (asset, repository, SBOM, or network segment) permitted under this engagement. Every entry in the final report and dashboard must map to a target on this list.

| # | Target identifier | Type (asset / repo / sbom / segment) | Location / URL | Tier activities authorized |
|---|---|---|---|---|
| 1 | `{{IDENT}}` | `{{TYPE}}` | `{{LOCATION}}` | `{{PASSIVE | ACTIVE-LAB}}` |
| 2 | | | | |
| 3 | | | | |

Targets not enumerated in Exhibit A are out of scope. Additions require a written amendment per §9.

---

### Template notes (delete before execution)

- Do not issue without both Client signatures. A single-signatory letter is invalid by design — this is a deliberate two-key check borrowed from NERC CIP practice.
- Verify Exhibit A is populated from the Intake Questionnaire and reviewed against ROE §4 no-touch list — any overlap is a drafting error and must be resolved before countersignature.
- For T1 engagements, this letter is recommended but not required by the SOW. Many utility-sector Clients will require it under their own policy regardless of tier; default to requesting it.
- For T3 engagements, this letter is mandatory per SOW and ROE §3. Do not begin active work without it countersigned and on file.
- Keep the countersigned original in Provider's engagement register with the SOW and ROE; scan-only copies are not sufficient for audit.
