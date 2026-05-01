# Demo and Synthetic Data — What's Real, What's Not

Reference for sponsors, agents, and future sessions. Names every demo artifact in the repo, says what is synthetic versus real, and flags which items must never be quoted externally without re-verification.

Last updated: 2026-04-26.

---

## The rule of thumb

If a piece of data in this repo names a customer, contact, dollar figure, vulnerability, or finding — assume it is **demo / synthetic / illustrative until proven otherwise**. Real engagements will produce their own data, written into customer-scoped files that do not yet exist.

Exception: pricing anchors and tier definitions in `docs/tiers-and-glossary.md` are based on real research and locked sponsor decisions. Those are real, but the comparable-vendor dollar figures inside that doc are research-grade and should be re-verified before quoting externally.

---

## Demo artifacts catalog

### Plant fixtures — fully synthetic

| File | What it is | Real or synthetic? | External use |
|---|---|---|---|
| `data/plant-demo.json` | Fictional energy/turbine plant ("Alpha Combined Cycle Energy Plant"). 6 assets, 4 zones, 5 connectivity entries, 3 baseline vulnerabilities, 2 demo scenarios. | **Synthetic.** No real plant. | Demo / sample only. Never name "Alpha Combined Cycle Energy Plant" to a buyer. |
| `data/plant-enriched.json` | The same plant after `otsniff merge` folded in the 11 hand-coded findings from `data/findings.json`. | **Synthetic.** Derived from `plant-demo.json`. | Demo / sample only. |
| `data/plant-water-demo.json` | Fictional Wisconsin mid-size water utility ("Meadowbrook Regional Water Utility"). 7 assets, 5 zones, 6 connectivity entries, 3 baseline vulnerabilities, 2 demo scenarios. The `demo_note` field at the top of the file makes the synthetic status explicit. | **Synthetic.** No real plant. Vendor and topology choices reflect what a real Wisconsin mid-size water utility's OT footprint typically looks like, but the plant itself does not exist. | Demo / sample only. The name "Meadowbrook" is fictional; do not introduce it as a case study. |
| `data/plant-water-enriched.json` | The water plant after merge with the 11 hand-coded findings from `data/findings-water.json`. | **Synthetic.** | Demo / sample only. |

### Findings — illustrative

| File | What it is | Real or synthetic? | External use |
|---|---|---|---|
| `data/findings.json` | 11 hand-coded findings against the energy plant (RSA private key, AWS access key, plaintext PI admin password, log4j in WinCC OA, S7 reachable from corporate VLAN, etc.). | **Hand-coded illustrative.** Each finding describes a *pattern* that shows up in real engagements, but the specific evidence strings (file paths, key fragments, banners) are made up. | Demo only. The redacted fragments like `AKIA***XYZ`, `Hone***23`, `fact***01` are placeholders, not real secrets. |
| `data/findings-water.json` | 11 hand-coded findings against the water plant. Water-correct vendors and protocols (AVEVA, Rockwell, Allen-Bradley, Schneider SCADAPack, EtherNet/IP CIP, DNP3). | **Hand-coded illustrative.** | Demo only. |

When the toolchain's `scan:exposure` and `scan:mesh-gap` scanners run against the fixtures, they emit a small number of findings derived from the connectivity graph. Those scanner-produced findings are **deterministic outputs of a real algorithm against synthetic input data** — the algorithm is real, the findings inherit the synthetic status of the input fixture.

### CVE references in fixtures — plausible patterns, not all live CVEs

In `data/plant-demo.json` and `data/plant-water-demo.json`, the `vulnerabilities[]` array contains entries with `cve` fields that look like real CVE IDs (CVE-2024-1111, CVE-2023-9988, CVE-2024-3144, CVE-2024-21915, CVE-2023-3595, CVE-2022-7123). Some of these match real CVE patterns and vendor histories; others are plausible-sounding placeholders. **Do not cite any of these CVE IDs externally without verifying them in the National Vulnerability Database first.** The `demo_note` field in `plant-water-demo.json` is explicit about this.

The one exception is **CVE-2021-44228** (log4j) referenced in `findings.json` and `findings-water.json` — that one is a real, well-known CVE.

### Sample reports — generated from synthetic input

| File | What it is | Real or synthetic? | External use |
|---|---|---|---|
| `data/t1-sample.pdf` | 5-page Evidence Pack PDF rendered from the energy plant. | **Synthetic.** Every name, finding, and number in it derives from the synthetic energy fixture. | Demo only. Showing this PDF to a water utility reviewer creates the credibility problem documented in `docs/discovery/findings-action-test.md` — wrong vendors and protocols. |
| `data/t1-sample.html` | The HTML source of the energy sample report (an older version; the PDF is the canonical sample). | **Synthetic.** | Demo only. |
| `data/t1-water-sample.pdf` | 5-page Evidence Pack PDF rendered from the water plant. Cover names "Meadowbrook Water Utility," engagement ID "ENG-WATER-DEMO." | **Synthetic.** | Demo only. The "Meadowbrook" name and "ENG-WATER-DEMO" engagement ID make the synthetic status visible at the top of every page. This is the right sample to show to water utility reviewers. |

### Sample input files — fake credentials by design

| File | What it is | Real or synthetic? | External use |
|---|---|---|---|
| `data/sample-configs/plc-backup.txt` | A fake PLC-style configuration file with intentionally planted bad-practice secrets — fake AWS keys (AKIAIOSFODNN7EXAMPLE), private-key headers, default `admin:plc` credentials, plaintext Modbus user/pass. Used as input to demonstrate the secrets scanner. | **Synthetic test input.** The AWS key is the famous AWS documentation example key (not a real account). The private-key markers are RSA headers but no actual key body. | Test input only. Never use these credentials anywhere; never check anything similar into a real customer engagement. |

### IEC 62443 reference data — real standard, paraphrased text

| File | What it is | Real or synthetic? | External use |
|---|---|---|---|
| `data/iec62443-map.json` | Reference data for IEC 62443-3-3: 7 Foundational Requirements, 21 System Requirements (curated from 51), finding-type-to-violation mapping. | **Real standard, paraphrased descriptions.** The standard, FR/SR IDs, and security-level numbering are real (IEC 62443-3-3, 2013 + Amendment 1:2018). The descriptions in `system_requirements[].description` are paraphrased for readability — consult the published standard for normative text. | Reference data may be cited internally. For client-facing materials, cite the standard directly, not this file. |

The file's own `scope_note` says: *"Mapping is illustrative for assessment reporting, not a substitute for a formal IEC 62443 conformance audit."*

### Demo scenarios in fixtures — illustrative

Both plant fixtures include a `demo_scenarios[]` array with two entries (`s1` engineering workstation compromise, `s2` HMI ransomware foothold or RTU compromise). These drive the scenario explorer page.

These are **illustrative scenarios** that exercise the blast-radius simulation. They are not anchored to any real incident, customer, or postmortem. The Impact Map tier promises "top-20 attack scenarios" — the current product ships only these 2 hand-defined ones. See `docs/demo-data.md` (this file) and the gap analysis in this session's chat for context on the gap between the 2 demo scenarios and the 20-scenario claim.

---

## Pricing data — real research, internal-confidence

`docs/tiers-and-glossary.md` contains:

- **Tier anchor prices** ($7,500, $35k, $95k, $4.5k/mo) — these are **locked sponsor decisions**. Real, not demo. Citable internally. External quotes flow through SOW templates.
- **Comparable-vendor dollar figures** (Dragos partner-led $15k–$35k, Claroty/Nozomi $10k–$25k, Mandiant $150k–$400k, etc.) — these are **research-grade with confidence ratings** (low / medium / medium-high). The doc says explicitly: *"Do not quote specific competitor dollar figures externally without re-verifying — these are defensible internal anchors, not published rate cards."*
- **Value quantification numbers** (ransomware $5.13M, insurance discount 15–25%) — these are **directional, sourced**. The doc says: *"Numbers are directional — cite sources when used with clients; do not invent site-specific figures."*

---

## Wisconsin outreach data — real names, decays weekly

`docs/outreach/wi-contacts-2026-04.md` has real Wisconsin water utility contact information sourced from public records. Names and titles are real as of the 2026-04-21 build. **The list decays weekly** — by the time you read this, some entries may be stale. The handoff file (`SESSION_HANDOFF.md`) flags this; the freeze file (`docs/PIN_sales.md`) suspends use of the list during the value-validation pivot.

The same goes for the WIAWWA seminar reference (2026-05-07 Technology & Security Seminar) — real event, but verify the date and registration status before citing.

The single highest-leverage state contact named in the outreach file is **Marty Pollard** at the Wisconsin DNR Drinking Water cyber program. That contact is real and was sourced from a public Wisconsin DNR contact page. The handoff explicitly says: *"do not quote any Wisconsin utility contact externally without re-verifying."*

---

## Templates — real structure, customer-specific values to be filled in

`docs/templates/*` (SOW, ROE, authorization letter, intake questionnaire, one-pager, outreach sequence, grant-eligibility language) are real, sponsor-locked artifacts. They contain:

- Real legal structure (Wisconsin governing law, payment terms, liability cap).
- Real anchor pricing.
- **Placeholders** marked with `{{double-curly}}` syntax that must be filled in per engagement: `{{COUNTY}}`, `{{CAL_LINK}}`, `{{CLIENT_NAME}}`, etc.

A template is not a contract until the placeholders are filled and a signature is on it. The placeholders are the visible flag that the document is not yet customer-specific.

---

## Discovery and process docs — real but interpretive

`docs/discovery/*` and `docs/amber/*` (the freeze, the interview guide, the artifact review protocol, the path-C scoring, the critical path, the risk log) are real outputs of this session. They contain:

- Real process recommendations.
- Real schedule analysis.
- Real risk identification.
- **Hypothetical interview responses and reviewer feedback are NOT yet collected.** The interview guide and review protocol describe how to collect them; the docs themselves contain no actual interview transcripts or reviewer feedback yet.

When/if real interviews and reviews happen, those transcripts and verbatims should land in new files under `docs/discovery/transcripts/` (does not yet exist). Do not retroactively edit the protocol files to include them.

---

## How to spot demo data when reading code or docs

Quick checks in priority order:

1. **File path starts with `data/plant-demo`, `data/plant-water-demo`, or `data/findings`** → synthetic plant or hand-coded findings.
2. **Asset names like "Boiler PLC," "SCADA Core 01," "Lift Station 7 RTU," "Meadowbrook"** → synthetic.
3. **CVE IDs in vulnerabilities not matching CVE-2021-44228 (log4j)** → likely plausible-but-not-verified, must be re-checked.
4. **Redacted secrets containing `***`** (like `AKIA***XYZ`, `Hone***23`) → synthetic redaction patterns; the underlying secret is also fake.
5. **`demo_note`, `demo_scenarios`, `demo_only` field anywhere in JSON** → explicitly synthetic.
6. **Filename ending in `-sample.pdf` or `-sample.html`** → demo report.
7. **Presence of `{{placeholder}}` markers in a doc** → template, not yet customer-specific.
8. **Date stamps before today and a "decays weekly" or "verify before use" note** → may be stale, re-verify.
9. **Any pricing comparable cited from `docs/tiers-and-glossary.md`** → research-grade, not a published rate card; re-verify.
10. **Wisconsin contact name** → real but stale-able; re-verify before any external use.

---

## What does NOT exist in this repo (yet)

To prevent confusion in the other direction — these things are not in the repo and should not be assumed to exist:

- Any real customer engagement data, scan output, or signed SOW.
- Any real interview transcripts from water utility GMs or operators.
- Any real reviewer feedback on the sample PDFs.
- Any real outbound email logs or response data.
- Any real payment, billing, or stripe-equivalent transaction records.
- Any real customer credentials, API tokens, or secrets (the only secrets in the repo are the planted fakes in `data/sample-configs/plc-backup.txt`, which are AWS-documentation example keys).
- Any real CVE feed integration or live vulnerability scoring.
- Any real Shodan, Censys, or external-reachability data — the `source_tool: "shodan"` tags on hand-coded findings are aspirational labels, not from a live Shodan call.
- Any production hosting, multi-tenant separation, customer access control, or authentication.

When the project moves out of pre-engagement into a real first-paid customer, several of these will need to be added. They are not gaps to fix during the freeze; they are gaps to plan around.

---

## See also

- `SESSION_HANDOFF.md` — current session state.
- `docs/PIN_sales.md` — sales-track freeze rules.
- `docs/tiers-and-glossary.md` — locked tier definitions and the comparable teardown that anchors them.
- `docs/discovery/findings-action-test.md` — finding-by-finding signal-to-noise scoring of the 11 demo findings.
- `CLAUDE.md` — architecture, scanner pattern, guardrails.
