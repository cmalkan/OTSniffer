# OTSniffer Features — by Industry Vertical

Who each feature is for, what framing to use, and what to leave out. Use this when repackaging a tier for a non-water buyer, when scoping a pilot, or when deciding whether a feature even belongs in a given pitch.

Last updated: 2026-04-21.

Related:
- [`docs/tiers-and-glossary.md`](tiers-and-glossary.md) — canonical tier names, pricing, acronyms.
- [`.claude/agents/`](../.claude/agents/) — the vertical leads that own each column below.

---

## Verticals covered

The `industry-guy` team covers six verticals; the table columns below follow them:

| Column | Sub-agent file | Primary scope |
|---|---|---|
| **Water** | `critical-infrastructure.md` | Water & wastewater utilities (mid-size is the OTSniffer wedge) |
| **Electric** | `electric-utilities.md` | IOUs, public power, co-ops, ISO/RTO |
| **O&G** | `oil-and-gas.md` | Upstream, midstream, downstream |
| **Ind. Auto** | `industrial-automation.md` | Discrete + process OEMs and SIs |
| **Med — A** | `medical-manufacturing.md` persona A | Pharma CDMOs, sterile mfg, device-OEM plant floors |
| **Med — B** | `medical-manufacturing.md` persona B | Premarket device-OEM cyber submissions |
| **Food** | `food-packaging.md` | Co-manufacturers, CPG brand owners, packaging converters |

---

## Fit legend

- ✅ **Native** — sells as-is; regulatory framing already matches.
- ⚠ **Repack** — sells with vertical-specific regulatory / channel / framing swap. See repack notes below the table.
- ❌ **Wrong fit** — do not pitch.

---

## Feature × vertical matrix

### Tier-level features

| Feature | Water | Electric | O&G | Ind. Auto | Med — A | Med — B | Food |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **T1 Evidence Pack** — passive OT exposure snapshot | ✅ | ✅ | ✅ | ✅ | ⚠ | ❌ | ⚠ |
| **T2 Impact Map** — blast-radius + top-20 scenarios | ⚠ | ✅ | ✅ | ✅ | ⚠ | ❌ | ✅ |
| **T3 Proven Pathways** — lab credential / path validation | ❌ | ⚠ (non-HIGH only) | ⚠ | ✅ | ❌ | ❌ | ❌ |
| **T4 Posture Watch** — quarterly rerun + drift + CVE re-score | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ (postmarket) | ✅ |
| **Multi-site / expedited premium ($12k / $55k / $140k)** | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MSSP white-label (60/40 split)** | ✅ | ⚠ (OT-specialist MSSP only) | ⚠ (ICS-pedigree only) | ✅ | ❌ | ❌ | ⚠ |

### Technical features (what the toolchain / report actually ships)

| Feature | Water | Electric | O&G | Ind. Auto | Med — A | Med — B | Food |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Passive secrets scan** (`scan:secrets`) | ✅ | ✅ | ✅ | ✅ | ⚠ | ✅ | ✅ |
| **Supply-chain scan** (`scan:supply-chain`) | ✅ | ✅ (CIP-013 fit) | ✅ | ✅ | ⚠ | ✅ (SBOM core) | ✅ |
| **Blast-radius simulation** | ⚠ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Top-20 attack scenarios with barrier traces** | ⚠ | ✅ | ✅ | ✅ | ⚠ | ❌ | ✅ |
| **IEC 62443-4-2 SR coverage matrix** | ❌ | ⚠ | ✅ | ✅ | ⚠ | ⚠ | ⚠ |
| **Lab credential spray / LAB_MODE active scan** | ❌ | ⚠ (LOW/MED only) | ⚠ | ✅ | ❌ | ❌ | ❌ |
| **Redacted evidence + SHA-256** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Hosted dashboard (30 / 90 day)** | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ | ✅ |
| **Readout call with plant leadership + CISO delegate** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Report framing features (what goes on the cover + in the exhibits)

| Feature / framing | Water | Electric | O&G | Ind. Auto | Med — A | Med — B | Food |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **EPA AWIA / CISA CPG / CIRCIA / SRF cross-refs** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **NERC CIP-002/005/007/010/013 mapping** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **TSA SD Pipeline-2021-02C / API 1164 v3 / INGAA** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **IEC 62443-4-1 / 4-2 SR citations** | ❌ | ⚠ | ⚠ | ✅ | ⚠ | ⚠ | ⚠ |
| **EU CRA / NIS2 citations** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **21 CFR 820.30 / 820.75 / ISO 13485 §7.3 / GAMP 5** | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠ | ❌ |
| **FD&C Section 524B(c)(1–4) / FDA Premarket Cyber Guidance (Sept 2023) / SPDF** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **FSMA 204 / SQF / BRCGS / FSSC 22000 / retail-buyer cyber questionnaire** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Insurance-renewal framing** — state water pools | ⚠ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Insurance-renewal framing** — AEGIS / EIM / IOU cyber pools | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Insurance-renewal framing** — FM Global / AIG energy | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Rate-case exhibit framing** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Grant-eligibility framing** — SRF / IIJA / SLCGP | ✅ | ⚠ (SLCGP only) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Retail-buyer cyber questionnaire framing** (Kroger, Costco, Walmart) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Rate-of-return / PE portfolio standardization framing** | ❌ | ⚠ | ❌ | ⚠ | ⚠ | ⚠ | ✅ |
| **Submission-readiness / RTA-avoidance framing** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Repack notes — what to change per vertical

### Water (primary wedge)
- Feature set ships ~native. This is the vertical the toolchain was built for.
- **Swap out of standard pitch:** nothing. Keep T1 at $7.5k anchor; cite EPA AWIA, CIRCIA, SRF/IUP.
- **Do not pitch:** T3 lab validation. Water utility boards reject active testing.

### Electric
- **Swap in report:** NERC CIP mapping replaces EPA AWIA cross-refs. CIP-002 (BES categorization), CIP-005 (ESP), CIP-007 R2 (patch), CIP-010 R3 (vuln assessment — this is the flagship fit), CIP-013 R1/R2 (supply chain).
- **Swap framing:** AEGIS/EIM renewal + rate-case exhibit + Volt Typhoon posture.
- **Price up:** single-site T1 sells at $40–90k for IOUs (vs $7.5k water anchor). Do not undersell.
- **T3 is sellable** at LOW and MEDIUM-impact BES Cyber Systems. Never HIGH-impact without extensive ROE.
- **Channel:** Burns & McDonnell / 1898, Black & Veatch, Quanta, SEL partners, Dragos partner ecosystem (don't compete).

### O&G
- **Swap in report:** TSA SD Pipeline-2021-02C, API 1164 v3, INGAA member requirements, CIRCIA energy-sector reporting.
- **Swap framing:** FM Global / AIG renewal + M&A due-diligence + copycat-ransomware peer heat.
- **Price up:** single-plant T1 sells at $15–40k.
- **Never say "penetration test"** — use "exposure snapshot" or "posture evidence assessment."
- **Channel:** Wood, Burns & McDonnell, Matrix Service; Emerson Impact / Honeywell HPS / Rockwell PartnerNetwork; insurance brokers.

### Industrial Automation
- **Two plays:**
  - End-user play: T1/T2 toward Director of Ops / Plant IT-OT Manager. Same deliverable as water/electric with IEC 62443-4-2 matrix as the flagship exhibit.
  - **OEM product-security play:** different deliverable (product-scoped IEC 62443-4-2 evidence pack, CRA gap analysis), different buyer (Product Security Officer), 2–3× price. Worth expanding the SOW template to cover.
- **Swap framing:** IEC 62443-4-1/-4-2 with explicit SR citations (SR 1.1, SR 2.1, SR 3.1, etc.), EU CRA staging, NIS2, Windows 10 EOL fallout, RFP cyber clauses.
- **Channel:** Rockwell / Siemens / Schneider / Emerson PartnerNetworks; CSIA member firms; OT-specialist MSSPs (Dragos / Claroty / Nozomi partner nets); ISA.

### Medical Manufacturing — Persona A (validation)
- **Swap in report:** 21 CFR 820.30 (design controls), 820.75 (process validation), ISO 13485:2016 §7.3, GAMP 5 mapping. Must explicitly state respect for validated-state principles (read-only scope, documented change-control integration).
- **Price up:** T1 at $15k+, never below. Validation overhead is real cost.
- **Scanning posture:** passive only, out-of-band, during scheduled maintenance windows. Active scanning against validated production is a hard no without change control.
- **Channel:** validation consulting firms (IPS, Commissioning Agents, ProPharma, Azzur). Not cyber boutiques.

### Medical Manufacturing — Persona B (premarket device-OEM)
- **Entirely different product.** Not a plant-floor OT assessment. Deliverable is a submission-ready cyber package.
- **Deliverable:** SBOM with component provenance, threat model using SPDF, four security architecture views (global system, multi-patient harm, updatability, security-use-case), postmarket cybersecurity plan, reasonable-assurance procedures.
- **Swap in report:** explicit mapping to FD&C Section 524B(c)(1–4), FDA Premarket Cybersecurity Guidance (Sept 2023) tables, IEC 81001-5-1, AAMI TIR57/TIR97, MDCG 2019-16 for EU-bound.
- **Swap framing:** submission-calendar-driven. "Cyber package delivered for your Q3 2026 510(k) submission" + RTA-letter avoidance.
- **Price band:** $25–60k for a single device submission package. $15–40k/yr postmarket retainer per device family.
- **Channel:** NAMSA, Emergo, MCRA, RQM+ (premarket regulatory firms). Not validation consultancies.
- **T1 / T2 / T3 / T4 tier names do not apply cleanly.** This is a separate product line; consider a distinct SOW template before quoting.

### Food Packaging
- **Swap in report:** FSMA 204 traceability language, 21 CFR Part 11, SQF / BRCGS / FSSC 22000 cross-refs, named retail-buyer cyber questionnaire coverage (Kroger / Costco / Walmart).
- **Swap framing:** OEE + recall economics. "One hour of unplanned line downtime = $X; one ransomware event = 5 days down = $Y; our assessment is 2% of that number."
- **Price ceiling:** T1 must stay under $10k to sell at most co-manufacturers. Use $7.5k anchor at the upper end.
- **PE-portfolio angle:** one PE sponsor win = 4–8 plants. Worth prospecting the PE side.
- **Scanning posture:** fit to changeover or weekend windows. Never during production.
- **Channel:** OEE/line-modernization SIs (Polytron, Maverick, E Technologies), packaging OEMs (Syntegon, Tetra Pak, IMA), PMMI.

---

## Features with no vertical home

The following ship in the product but do not have a flagship buyer today. Flagged for Pearl:

- **Validated-credential discovery** (planned T3 scanner, not built). Needs lab-mode gating and a buyer — probably industrial automation OEM-facing or electric mid-size IOU. Not defensible for water, food, or medical manufacturing.
- **Mesh-gap / segmentation attack scenarios.** Strong fit for industrial automation + electric. Weak fit for water (buyer vocabulary) and food (OEE-first). Consider whether to expose this as a standalone deliverable per vertical.
- **Purple-team / active adversary emulation** (future T3+). Only pitchable in industrial automation + electric at non-HIGH impact sites. Do not surface in water / medical / food pitches.

---

## Changelog

- **2026-04-21** — initial version. Split electric from water; added medical-manufacturing premarket device-OEM persona (B).
