# OTSniffer Service Tiers & Glossary

Canonical reference for buyer-facing tier names, pricing, value propositions, and every acronym used across the project. Single source of truth — outreach copy, SOW templates, sample reports, and internal plans all cite this file.

Last updated: 2026-04-19.

---

## Service Tiers — Malkan Solutions LLC

Internal codes (T1–T4) are retained for SOW templates and toolchain plumbing. **All buyer-facing materials must use the renamed tiers.** Reason: water-utility boards and MSSP channel reps avoid "blast-radius," "red-team," and "monitoring" language collisions with existing vendor offerings.

### Overview

| Internal code | Buyer-facing name | What the buyer gets | Duration | Price (anchor) |
|---|---|---|---|---|
| T1 | **Evidence Pack** | Passive OT exposure snapshot + redacted PDF + 30-day dashboard | 1 week | **$7,500** |
| T2 | **Impact Map** | Evidence Pack + full blast-radius simulation + top-20 attack scenarios + 90-day dashboard + readout call | 3–4 weeks | **$35,000** |
| T3 | **Proven Pathways** | Impact Map + lab-validated credential/path testing + remediation roadmap + re-test | 6–8 weeks | **$95,000** |
| T4 | **Posture Watch** | Quarterly Impact Map reruns + drift alerts + new-CVE re-scoring + CISA advisory monitoring | Ongoing retainer | **$4,500/mo** |

### Evidence Pack (T1) — the wedge

**Job-to-be-done:** "When my insurer, auditor, or board asks what's exposed at our plant this quarter, I want a defensible one-week evidence artifact, so I can answer without committing to a $40k engagement."

- **Deliverables:** 10-page PDF report with redacted evidence, regulatory cross-references (EPA AWIA, CISA CPGs, CIRCIA, SRF grant framing), 30-day hosted dashboard access, evidence pack SHA-256.
- **Scope:** Passive reconnaissance, secrets scan, supply-chain scan against asset inventory provided by client. No active probing. No network-visible footprint on client systems during scan.
- **Pricing:**
  - Floor: $5,000 (below = brand hygiene damage; $4,500 acceptable only inside a bundled MSSP deal)
  - Anchor: **$7,500** (list price)
  - Premium: $12,000 (multi-site, MSSP white-label, or expedited turn)
- **Payment terms:** 40% on signing / 60% on report delivery. Net 30.
- **Liability cap:** 1× contract fee.
- **Funding sources buyers use:**
  - Opex "regulatory compliance" or "emergency response planning" line
  - EPA CWSRF / DWSRF cyber set-asides (state-administered)
  - IIJA / BIL cyber grants via state administrators
  - MSSP channel pass-through on existing MSA

### Impact Map (T2) — the intended conversion tier

**Job-to-be-done:** "When I need to show our board or insurer the specific operational consequences of our cyber posture, I want a mapped set of attack paths that tie findings to process impact, so I can defend rate-case, insurance, or remediation spend."

- **Deliverables:** Everything in Evidence Pack plus: top-20 attack scenarios with barrier traces, blast-radius simulation results, IEC 62443-4-2 SR coverage matrix (when mapping data supports it), 90-day hosted dashboard, 60-minute readout with plant leadership + CISO delegate.
- **Pricing:**
  - Floor: $24,000
  - Anchor: **$35,000**
  - Premium: $55,000 (multi-site or extended simulation)
- **Payment terms:** 30/40/30 (signing / mid-engagement gate / report + readout). Net 30.
- **Liability cap:** 2× contract fee.

### Proven Pathways (T3) — premium, gate-heavy

**Job-to-be-done:** "When I need to prove to my underwriter or regulator that predicted attack paths actually traverse, I want lab-validated evidence of each high-risk chain, so I can negotiate insurance premiums or close a compliance gap with confidence."

- **Deliverables:** Everything in Impact Map plus: lab-only credential spray against designated targets, path validation on confirmed traversals, detailed remediation roadmap with sequencing, mid-engagement re-test after first-round fixes.
- **Hard requirements before kickoff:**
  - Signed Authorization Letter
  - Signed Rules of Engagement (ROE)
  - `LAB_MODE=1` attestation — no active scan ever touches production OT
  - Malkan Solutions LLC carries active cyber liability + E&O insurance certificates, attached to SOW
- **Pricing:**
  - Floor: $75,000
  - Anchor: **$95,000** (sub-$100k clears many GM signing limits)
  - Premium: $140,000
- **Payment terms:** 25/25/25/25 on four milestones (kickoff / passive / lab-validation / re-test). Net 30.
- **Liability cap:** 1× contract fee, insurance certificates attached.
- **Positioning note:** Rarely sold to water utilities in 2026. Primary audience is electric utilities and mid-industrial manufacturers. Kept on the price sheet as a decoy that anchors Impact Map as obvious value.

### Posture Watch (T4) — retainer

**Job-to-be-done:** "When new CVEs land or our environment drifts, I want continuous re-scoring and quarterly evidence refresh, so I don't have to buy a new assessment every time my board asks 'are we still okay?'"

- **Deliverables:** Quarterly Impact Map rerun against current environment, drift alerts between quarters, new-CVE re-scoring against existing asset inventory, CISA advisory monitoring with utility-specific filter, hosted dashboard year-round.
- **Pricing:**
  - Floor: $2,500/mo
  - Anchor: **$4,500/mo** ($54k/yr list)
  - Annual prepay: $48,000/yr (~11% discount)
  - Premium: $8,000/mo (adds named-analyst hours, custom reporting cadence)
- **Terms:** 12-month term, 60-day termination for convenience. Price lock for 24 months if utility prepays 6 months.

### Packaging notes (don't change without Pearl sign-off)

- Keep all four tiers visible on the price sheet even when selling into water. **Decoy math**: T2 is the intended conversion — removing T3 drops T2 perceived value by 20–30%.
- Never quote T3 to water-utility boards without signed E&O + cyber liability attached to the SOW. Hard gate.
- MSSP channel: 60/40 revenue split on Evidence Pack / Posture Watch. White-label allowed; Malkan provenance retained in the evidence footer.

### Buyer funding calendar (water utilities, 2026)

- **Fiscal year start:** July 1 (varies by state). Target SOWs March–May for maximum budget-alignment close rate.
- **State SRF Intended Use Plan (IUP) comment windows:** vary by state; produce natural outreach triggers.
- **Insurance renewal windows:** carrier-specific; most pool programs renew in Q1 or Q3 — renewal month is a T1 trigger.
- **AWIA RRA 5-year cycles:** staggered by system size. Mid-size (10k–100k served) utilities are on the current wave through 2026.

### Value quantification (what the buyer avoids)

Numbers are directional — cite sources when used with clients; do not invent site-specific figures.

- **EPA enforcement gap:** Remediation + legal + emergency response after an EPA letter ≈ $50,000–$150,000 + political exposure. Evidence Pack at $7,500 closes the documentation gap.
- **Ransomware exposure:** 2024 average ransomware incident cost $5.13M; average OT downtime 24 days; ransom demands against utilities now exceed $500k.
- **Insurance loading:** 15–25% premium reductions for documented OT segmentation + continuous monitoring. On a $75,000 annual premium, that is $11,000–$19,000/year — Evidence Pack pays for itself every year.
- **Rate-case defensibility:** Impact Map report becomes an exhibit in rate-case filings; utilities without documented cyber assessments face pushback from state PUCs.

### Comparable teardown (what we're anchored against)

Preserves the vendor-comparable analysis that set the floor/anchor/premium bands above. Where a firm public SKU isn't available, the band is derived from partner-channel margin math (typical 30–45% channel markup on OT-specialist vendor assessments) and is marked *low* confidence. **Do not quote specific competitor dollar figures externally without re-verifying** — these are defensible internal anchors, not published rate cards.

#### Evidence Pack (T1) — anchor $7,500

| Vendor / offering | Scope comparable to | Price band | Where they anchor in buyer's mind | Source / confidence |
|---|---|---|---|---|
| Dragos "Quickstart" / partner-led OT assessment | Passive asset & exposure snapshot, 1–2 wk | $15k–$35k (partner-delivered); Dragos-direct rare below $50k | "OT-specialist = expensive but credible" | Partner teardown, channel margin ~35%. Medium confidence. |
| Claroty / Nozomi partner "posture check" (SI-delivered) | Asset inventory + passive findings, 1–2 wk | $10k–$25k (often bundled into appliance POC) | Free-to-cheap when tied to a sensor sale; standalone feels thin | Channel-rep conversations; public Claroty xDome trial framing. Medium. |
| Regional SI / small MSSP "OT health check" | Site walk-down + passive scan + PDF | $5k–$15k per site | "Commodity — one of six quotes" | Public SI statements of capability; AWWA vendor directory. Medium-high. |
| AWWA / NRWA free or subsidized RRA tabletop | AWIA RRA checklist assist | $0–$3k | "Grant-funded baseline, not defensible evidence" | AWWA cybersecurity guidance page. High. |
| Mandiant / Kudelski "scoping assessment" | Pre-engagement scoping, not a deliverable | $0 (loss-leader) or $25k+ as paid workshop | Credibility-by-association; never a wedge buy | Public service descriptions. Medium. |

**Positioning read (T1):** $7.5k anchor sits at **value-parity with regional SI** and **~50% penetration vs Dragos/Claroty partner quicks**. The decoy effect from T2/T3 makes T1 read as "the affordable wedge from a firm that also does the premium work" — not as the cheap seat. Floor of $5k holds because below it, the buyer pattern-matches to a free AWWA tabletop and discounts credibility.

#### Impact Map (T2) — anchor $35,000

| Vendor / offering | Scope comparable to | Price band | Where they anchor in buyer's mind | Source / confidence |
|---|---|---|---|---|
| Dragos Professional Services "architecture review" + threat scenarios | Attack-path mapping + IEC 62443 alignment | $60k–$120k | "What a real OT vendor charges — but we wait 8 weeks" | Dragos PS scoping norms; partner teardown. Medium. |
| Claroty / Nozomi partner "risk assessment" | Asset + segmentation + attack-path narrative | $40k–$90k | Tied to product sale; feels like pre-sales | Channel margin math. Medium-low. |
| 1898 & Co. (Burns & McDonnell) OT risk assessment | Multi-week engineering + cyber review | $75k–$250k per site | "The engineering firm our board already trusts" | Public case studies; utility RFP awards. Medium. |
| Kudelski / Accenture Security OT practice scoping | Strategy + attack scenarios | $100k–$300k+ | Premium brand tax; slow decision cycle | Big-consultancy rate-card norms ($350–550/hr blended). Medium. |
| Regional SI "comprehensive OT risk assessment" | Site survey + vuln scan + report | $25k–$60k | "Cheaper than Dragos but no blast-radius narrative" | SI capability statements. Medium-high. |

**Positioning read (T2):** $35k anchor is **penetration vs OT-specialists (~40–55% below Dragos PS)** and **parity with premium regional SI**. The differentiator is the blast-radius simulation + rate-case exhibit framing — neither Dragos PS nor a regional SI typically delivers a PUC-filing-ready artifact. $55k premium remains below the psychological $60k "needs VP sign-off" threshold at most mid-utilities.

#### Proven Pathways (T3) — anchor $95,000

| Vendor / offering | Scope comparable to | Price band | Where they anchor in buyer's mind | Source / confidence |
|---|---|---|---|---|
| Mandiant (Google Cloud) OT red team / validated assessment | Lab-validated attack paths, IR-adjacent | $150k–$400k | "The premium anchor — what you buy after an incident" | Public Mandiant engagement norms; post-M&A pricing. Medium. |
| Dragos "Threat & Risk" multi-phase + validation | Phased assessment w/ targeted validation | $120k–$250k | "OT-native premium — long lead time" | Partner teardown. Medium-low. |
| Accenture / Kudelski OT red team | Full-scope red team + remediation roadmap | $200k–$500k+ | "Board-level program, not a project" | Big-consultancy norms. Medium. |
| 1898 & Co. + partner red-team | Engineering + cyber validation combo | $150k–$350k | Utility-trusted engineering wrapper around cyber | Public utility program awards. Low-medium. |
| Electric-utility in-house + NERC CIP auditor | Compliance-validation equivalent | $80k–$150k (internal-equivalent cost) | "We already pay for this via NERC CIP" | NERC CIP program cost studies. Medium. |

**Positioning read (T3):** $95k anchor is deliberate **sub-$100k penetration vs Mandiant/Accenture premium** (clears GM signing limits at mid-industrial manufacturers). Primary role is **decoy** — presence of T3 on the sheet makes T2 read as obvious value. $140k premium ceiling still sits ~25–40% below Mandiant floor, preserving "credible but accessible" position.

#### Posture Watch (T4) — anchor $4,500/mo ($54k/yr list)

| Vendor / offering | Scope comparable to | Price band | Where they anchor in buyer's mind | Source / confidence |
|---|---|---|---|---|
| Dragos Platform subscription (sensor + service) | Continuous OT monitoring + advisories | $60k–$250k/yr depending on site count | "The platform play — sensor-dependent" | Public Dragos platform norms; partner quotes. Medium. |
| Claroty xDome / Nozomi Vantage SaaS | Asset visibility + advisories | $30k–$120k/yr per site | Asset-inventory tool, not evidence retainer | Vendor SaaS list pages. Medium. |
| Elisity microsegmentation subscription | Identity-based segmentation SaaS | $40k–$150k/yr per site (per Elisity ROI guide) | "Adjacent control, not an assessment" | Elisity microseg budget guide 2025. High. |
| MSSP OT managed service (regional) | 24×7 monitoring + quarterly report | $5k–$15k/mo | "We already pay an MSSP" — direct substitute objection | MSSP channel pricing norms. Medium-high. |
| Big-4 retainer / "CISO advisory" | Quarterly advisory hours | $8k–$25k/mo | Premium advisory, not evidence-product | Big-4 retainer norms. Medium. |

**Positioning read (T4):** $4.5k/mo anchor is **parity with regional MSSP OT retainer** and **~80–90% below Dragos platform**. Explicitly *not* positioned as a monitoring product (decoy-collision with Dragos/Nozomi/Claroty platforms) — sold as an **evidence-refresh retainer** tied to quarterly board/insurer asks. $2.5k/mo floor holds only inside an MSSP white-label where MSSP adds the monitoring layer.

### What this means

The **$7,500 T1 anchor remains defensible** against this set: it sits cleanly between the AWWA/NRWA free-tabletop floor and the Dragos/Claroty partner-quickstart band, while the T2/T3 decoys keep it from reading as commodity. Three conditions would justify moving it:

- **Move to $9,500 anchor** if (a) Impact Map close rate exceeds 25% of T1 engagements (demand signal), or (b) a named insurer formally discounts premiums on evidence of T1 completion (funding-source upgrade).
- **Hold at $7,500** through at least W12 — two to three T1 engagements are needed to validate willingness-to-pay before repricing; moving earlier damages anchor credibility with MSSP channel partners.
- **Drop to $5,000 floor** only inside an MSSP bundled deal (60/40 split stated above) or for a marquee logo where the report itself is the case study. Never as a list-price response to a "it's too expensive" objection — that is a packaging failure, not a pricing one.

---

## Glossary — every acronym used across this project

### Technical & toolchain

| | |
|---|---|
| **OT** | Operational Technology — control systems running physical equipment (PLCs, SCADA, HMIs) |
| **ICS** | Industrial Control Systems — same problem space; often paired as ICS/OT |
| **IT** | Information Technology — corporate networks, email, business applications |
| **PLC** | Programmable Logic Controller — device running a turbine, conveyor, mixer |
| **HMI** | Human-Machine Interface — operator screen for controlling a process |
| **SCADA** | Supervisory Control and Data Acquisition — central system watching many PLCs |
| **SIS** | Safety Instrumented System — independent safety controller (HIMA, Triconex) |
| **DMZ** | Demilitarized Zone — buffer network between IT and OT |
| **CVE** | Common Vulnerabilities and Exposures — public ID for a known security flaw |
| **CVSS** | Common Vulnerability Scoring System — 0–10 severity score |
| **SBOM** | Software Bill of Materials — list of software components in a product |
| **CI/CD** | Continuous Integration / Continuous Delivery — automated build & deploy |
| **API** | Application Programming Interface — a programmatic endpoint |
| **CLI** | Command-Line Interface — terminal tool (`otsniff` is one) |
| **CJS / ESM** | CommonJS / ECMAScript Modules — Node's two module systems |
| **RCE** | Remote Code Execution — exploit class |
| **MITM** | Man-in-the-Middle — interception attack |
| **SOC 2** | AICPA Service Organization Controls audit (Type I or Type II) |

### Project management & product

| | |
|---|---|
| **MVP** | Minimum Viable Product |
| **PMF** | Product-Market Fit |
| **JTBD** | Jobs-to-be-Done — Pearl's framing method |
| **RAG** | Red / Amber / Green — status indicator |
| **RAID** | Risks / Assumptions / Issues / Dependencies — PM log |
| **CPM** | Critical Path Method — scheduling technique |
| **PMI / PMBOK** | Project Management Institute / Project Management Body of Knowledge |
| **SOW** | Statement of Work |
| **ROE** | Rules of Engagement |
| **E&O** | Errors & Omissions insurance |
| **LOI** | Letter of Intent |
| **MSA** | Master Services Agreement |
| **KPI** | Key Performance Indicator |
| **GTM** | Go-to-Market |
| **PLG** | Product-Led Growth |
| **VBP** | Value-Based Pricing |
| **EVC** | Economic Value to Customer |
| **PE** | Private Equity |

### Channel & market

| | |
|---|---|
| **SI** | System Integrator — engineering firm installing/configuring OT |
| **MSSP** | Managed Security Service Provider — outsourced security ops |
| **OEM** | Original Equipment Manufacturer — Rockwell, Siemens, Schneider, Emerson, Honeywell |
| **SOC** | Security Operations Center — 24×7 monitoring team |
| **MSP** | Managed Service Provider (IT-focused cousin of MSSP) |
| **VAR** | Value-Added Reseller |

### Regulatory & standards — water / critical infrastructure

| | |
|---|---|
| **EPA** | Environmental Protection Agency (US) |
| **AWIA** | America's Water Infrastructure Act of 2018 — requires Risk & Resilience Assessments |
| **RRA** | Risk and Resilience Assessment (AWIA artifact) |
| **ERP** | Emergency Response Plan (AWIA artifact — *not* the business software) |
| **PWS** | Public Water System (EPA term) |
| **MGD** | Million Gallons per Day — utility size metric |
| **DWSRF / CWSRF / SRF** | Drinking Water / Clean Water State Revolving Fund; SRF = umbrella term |
| **IUP** | Intended Use Plan — state SRF annual prioritization document |
| **IIJA / BIL** | Infrastructure Investment and Jobs Act / Bipartisan Infrastructure Law |
| **CIRCIA** | Cyber Incident Reporting for Critical Infrastructure Act of 2022 |
| **CISA** | Cybersecurity and Infrastructure Security Agency (US federal) |
| **CPG** | Cross-Sector Cybersecurity Performance Goals (CISA) |
| **SLCGP** | State and Local Cybersecurity Grant Program (CISA/FEMA) |
| **NERC CIP** | North American Electric Reliability Corp Critical Infrastructure Protection |
| **FERC** | Federal Energy Regulatory Commission |
| **PUC** | Public Utilities Commission (state-level) |
| **TSA SD** | Transportation Security Administration Security Directive (pipelines) |
| **AWWA** | American Water Works Association |
| **NRWA / RWA** | National Rural Water Association / state-level Rural Water Associations |

### Regulatory & standards — industrial / process

| | |
|---|---|
| **IEC 62443** | International cybersecurity standard for industrial automation; `-4-1` = product dev, `-4-2` = component requirements; SR = Security Requirement |
| **IEC 60601** | Medical electrical equipment safety standard |
| **IEC 61511** | Functional safety for process industry SIS |
| **NIST SP 800-82** | NIST guide to ICS/OT security |
| **NIST CSF** | NIST Cybersecurity Framework |
| **ISO 27001** | International infosec management system standard |
| **ISO 13485** | Medical-device QMS standard |
| **ISA / ISA99** | International Society of Automation; ISA99 = committee behind IEC 62443 |
| **CSIA** | Control System Integrators Association |
| **API 1164** | American Petroleum Institute pipeline SCADA security standard |
| **INGAA** | Interstate Natural Gas Association of America |
| **CMMC** | Cybersecurity Maturity Model Certification (DoD supply chain) |

### Regulatory & standards — medical / pharma

| | |
|---|---|
| **FDA QSR / QMSR** | Quality System Regulation (21 CFR 820); harmonized with ISO 13485 as QMSR (Feb 2, 2026) |
| **21 CFR 820** | FDA device QSR |
| **21 CFR Part 11** | FDA electronic records & signatures |
| **CDMO** | Contract Development and Manufacturing Organization |
| **CSV** | Computer System Validation (*not* the file format) |
| **GAMP 5** | Good Automated Manufacturing Practice (ISPE) — pharma/medical framework |
| **EU MDR** | EU Medical Device Regulation 2017/745 |
| **EU CRA** | EU Cyber Resilience Act (2024) — connected products |
| **NIS2** | EU Network and Information Security Directive 2 (Oct 2024) |
| **PMCF / PSUR** | Post-Market Clinical Follow-up / Periodic Safety Update Report |
| **ISPE** | International Society for Pharmaceutical Engineering |

### Regulatory & standards — food

| | |
|---|---|
| **FSMA** | Food Safety Modernization Act; **FSMA 204** = Food Traceability Final Rule |
| **FSIS** | Food Safety and Inspection Service (USDA, meat/poultry) |
| **HACCP** | Hazard Analysis and Critical Control Points |
| **SQF / BRCGS / FSSC 22000** | Private food-safety/quality standards (retail audit gates) |
| **PMMI** | Association for Packaging and Processing Technologies |

### Companies / products referenced

| | |
|---|---|
| **Dragos / Claroty / Nozomi** | OT-specialist security vendors; partner networks = "OT-practice MSSP" path |
| **Kudelski / 1898 & Co. / Accenture** | Big-consultancy OT practices — premium comparable |
| **FM Global / AIG / AEGIS / EIM** | Industrial property & cyber insurers |
| **Rockwell / Siemens / Schneider / Emerson / Honeywell** | Big-five automation OEMs |
| **WinCC / PI / PanelView / M580 / HIMax / PLICSLED / XCOM** | Specific OT products (various fixtures / skill refs) |

### Internal-to-this-project

| | |
|---|---|
| **W1 / W2 / W3 / W4** | Calendar weeks 1–4 from Apr 19 2026 |
| **Evidence Pack / Impact Map / Proven Pathways / Posture Watch** | Buyer-facing tier names (internal T1/T2/T3/T4) |
| **LAB_MODE** | Env flag gating active scanners (Proven Pathways only); never invoked from Netlify Functions |
| **`otsniff`** | Project CLI — `scan:secrets`, `scan:supply-chain`, `merge`, `report`, `help` |

---

## Sources

Tier names, pricing, and funding research drew from:

- EPA SRF cyber guidance (October 2025) — `epa.gov/system/files/documents/2025-10/strengthening-and-integrating-cybersecurity-measures-into-state-revolving-fund-srf-funded-projects.pdf`
- EPA CWSRF cybersecurity page — `epa.gov/cwsrf/supporting-cybersecurity-measures-clean-water-state-revolving-fund`
- EPA Water Resilience / Cybersecurity Funding — `epa.gov/waterresilience/cybersecurity-funding`
- EPA Cyber Insurance Brief (Oct 2024) — `epa.gov/system/files/documents/2024-10/cyber-insurance-final-508-101624.pdf`
- CRS Report R48556 — `congress.gov/crs-product/R48556`
- AWWA Cybersecurity Guidance — `awwa.org/resource/cybersecurity-guidance`
- Industrial Cyber insurance landscape — `industrialcyber.co/features/industrial-sector-faces-tougher-cyber-insurance-landscape-...`
- Elisity microsegmentation ROI guide — `elisity.com/blog/microsegmentation-budget-planning-2025-cybersecurity-roi-guide`

All quoted dollar ranges, premium reduction percentages, and funding program citations are current to April 2026 and should be re-verified before citing in client-facing materials.
