# Intake Questionnaire — Evidence Pack (T1)

**Template version:** 2026-04-20 · draft
**Engagement:** `{{ENG-CODE}}` — to be assigned on receipt
**Client:** `{{CLIENT_LEGAL_NAME}}`
**Completed by:** `{{NAME, TITLE}}`
**Date returned:** `{{DATE}}`

> Complete this questionnaire to start an Evidence Pack engagement. It collects the minimum inputs Provider needs to perform passive OT exposure analysis, redact secrets appropriately, and map findings to regulatory frameworks you rely on. Estimated time to complete: **45–60 minutes** with someone who knows the plant. A 45-minute scoped-intake call is available — request at `{{CONTACT}}`.
>
> Sensitive fields (credentials, IP ranges, plant addresses) are not required in this questionnaire. Those are collected over a secure channel after countersignature of the SOW and ROE.

---

## Section 1 — Organization and site

1. **Legal entity name** and **DBA** (if any):
2. **Primary site** to assess (street-level not required; city/state OK for this form):
3. **Number of sites** in scope for this engagement:
4. **Sector / subsector** (water / wastewater / electric / gas / pipeline / food / pharma / medical device / general manufacturing / other): `__________`
5. **Organization size** (employees, revenue band): `__________`
6. **If water utility:** size in MGD and population served: `__________`
7. **Regulatory touchpoints active in the next 12 months** (check all that apply):
   - [ ] EPA AWIA Risk & Resilience Assessment due
   - [ ] State PUC rate case or filing
   - [ ] NERC CIP audit
   - [ ] TSA Security Directive reporting
   - [ ] FDA inspection (pharma / medical)
   - [ ] FSMA 204 traceability compliance
   - [ ] Cyber insurance renewal
   - [ ] SRF grant application (specify round): `__________`
   - [ ] Other: `__________`

## Section 2 — Points of contact

For each role, provide name, title, email, and phone. Backup contact strongly recommended for the bold rows.

| Role | Name | Title | Email | Phone |
|---|---|---|---|---|
| Primary engagement contact | | | | |
| **Plant-level security lead** (signs Auth Letter) | | | | |
| **Engineering owner, OT** (signs Auth Letter) | | | | |
| Operations on-call | | | | |
| **Emergency-stop authority** (24×7 reachable) | | | | |
| Legal / procurement (SOW signatory) | | | | |
| Finance (invoice routing) | | | | |

## Section 3 — Asset inventory

Provider will work from whatever level of inventory you have. If you have a CMDB export or spreadsheet, attach it in lieu of completing the table — indicate format below.

- [ ] Attaching existing inventory (format: `__________`)
- [ ] Completing table below
- [ ] Partial — have some, need to build the rest during engagement kickoff

| # | Asset tag / name | Type (PLC / HMI / SCADA / SIS / historian / switch / other) | Vendor | Model | Firmware (if known) | Location (unit / room) | Role / process served | Safety-critical? (Y/N) |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |

Add rows as needed. Partial data is fine — mark unknowns as "unknown." Do **not** guess firmware versions.

## Section 4 — Safety-critical / no-touch register

List every asset that must **never** be probed, scanned, or touched — even passively — during this engagement. These populate ROE §4.

- Safety Instrumented Systems (SIS): `__________`
- Safety-critical PLCs: `__________`
- Emergency-response or alarm-chain assets: `__________`
- Assets currently in maintenance, commissioning, or vendor-advisory no-probe status: `__________`

Who has authority during the engagement to add or remove items from this list? (must be a named role per ROE §4): `__________`

## Section 5 — Network topology

Attach a diagram if available (draw.io / Visio / PDF / hand sketch all acceptable). Otherwise describe:

1. **IT–OT boundary:** Is there a documented DMZ? `__________`
2. **Remote access paths** into OT (VPN, jump host, vendor remote, cellular): `__________`
3. **Wireless segments** touching OT: `__________`
4. **Cloud-connected OT components** (historian in cloud, telemetry export, vendor-hosted dashboards): `__________`
5. **Known segmentation gaps** or known bypasses (internal candor helps; not used against you): `__________`
6. **Directory services** (AD / LDAP / local only / other): `__________`

## Section 6 — Software, repositories, and supply chain

List sources Provider is authorized to scan for secrets and supply-chain findings. Read-only access credentials are collected separately after SOW execution.

| # | Source type (git host / file share / artifact store) | URL or path | Scope (all / specific repos) | Contact for access |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

- [ ] SBOMs available — format: `__________`
- [ ] Dependency manifests available — languages/frameworks: `__________`
- [ ] No repositories in scope for this engagement

## Section 7 — Prior assessments and evidence

- **Most recent OT cybersecurity assessment** (vendor, date, findings summary if shareable): `__________`
- **Insurance cyber questionnaire completed in last 12 months?** `__________`
- **Open items from prior assessments** you specifically want re-examined: `__________`
- **Known incidents** (informational only; Provider's scope is assessment, not IR): `__________`

## Section 8 — Scan windows and blackouts

- **Preferred engagement start date:** `__________`
- **Hard constraints / blackouts** within the candidate window (regulatory inspections, peak demand, seasonal operations, vendor work): `__________`
- **Working hours for coordination** (time zone + hours): `__________`
- **After-hours emergency-stop channel** (phone / SMS / both, number confirmed live): `__________`

## Section 9 — Redaction conventions

- **Site / plant names** to redact from deliverables: `__________`
- **Operator or personnel names** to redact: `__________`
- **Customer identifiers** to redact: `__________`
- **Regulatory identifiers** to preserve (EPA PWSID, NERC ID, FDA FEI, etc.): `__________`
- **Acceptable level of detail** in the redacted PDF to show to:
  - [ ] Internal board only
  - [ ] Insurer
  - [ ] Auditor
  - [ ] Grant administrator
  - [ ] Regulator
  - [ ] Other: `__________`

## Section 10 — Deliverable preferences

- **Report recipients** (emails, up to 5 for initial delivery): `__________`
- **Dashboard readers** during the 30-day access window (emails, up to 10): `__________`
- **Readout call requested?** (T1 does not include a readout; add-on available): [ ] yes [ ] no
- **Preferred PDF disclosure classification** (e.g., "Internal — Confidential," "Attorney-Client Privileged via `__________`"): `__________`

## Section 11 — Funding and procurement

- **Funding source** (check all that apply):
  - [ ] Operating budget — regulatory compliance line
  - [ ] Operating budget — emergency response / resilience
  - [ ] Capex — line modernization / compliance infrastructure
  - [ ] EPA CWSRF / DWSRF cyber set-aside
  - [ ] IIJA / BIL cyber grant (state-administered)
  - [ ] CISA SLCGP grant
  - [ ] Insurance-premium-offset budget
  - [ ] MSSP channel pass-through
  - [ ] Other: `__________`
- **Procurement instrument** (PO / MSA addendum / standalone SOW / grant sub-award): `__________`
- **Fiscal year end:** `__________`
- **Invoice routing email:** `__________`
- **Any vendor onboarding steps** Provider should expect (W-9, insurance certs, COI, vendor portal): `__________`

## Section 12 — Questions or constraints from Client

Free-form — anything we should know before we quote, scope, or start?

`__________________________________________________________________`

---

### Submission

Return by email to `{{CONTACT}}` with the subject line `Intake — {{CLIENT_LEGAL_NAME}} — {{DATE}}`. Provider will confirm receipt within 1 business day and, within 2 business days, either (a) issue an SOW or (b) request a 45-minute scoping call to close remaining gaps.

### Template notes (delete before sending)

- Ship as a fillable PDF or Word form for non-technical recipients. Markdown copy is the canonical source.
- Do **not** collect credentials, specific IPs, or physical site addresses via this form — those move to a post-countersignature secure channel.
- Sections 4, 5, and 8 are the load-bearing inputs for ROE §4 (no-touch) and ROE §5 (blackout). Do not execute an ROE without these populated.
- If Client declines to complete Section 7, do not push — some Clients treat prior-assessment disclosure as privileged until after countersignature.
