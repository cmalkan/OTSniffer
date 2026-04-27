# Path C — Finding-to-Action Signal:Noise Test

**Date:** 2026-04-26
**Author:** Claude (solo, no agent)
**Source data:** `data/findings.json` + `data/plant-enriched.json` (energy/turbine fixture)
**Method:** for each of the 11 demo findings, write the concrete action a real water-utility operator would take in week 1, then score signal vs noise and water-utility-fit.

This is one half of the value-validation triad (Pearl A = JTBD interviews, Pearl B = artifact review, Path C = artifact internals). It tests whether the artifact's *content* would move a real operator, independent of whether they'd buy it.

---

## Scoring rubric

**Signal:noise (1–5)** — would a real ops person act on this in week 1?
- 5 = drops everything, fixes today
- 4 = adds to next sprint, tracked
- 3 = adds to backlog, tracked
- 2 = "interesting, not actionable"
- 1 = noise, "yes that's how Modbus works"

**Water-fit** — does this finding apply to a mid-size WI water utility?
- ✓ universal (same pattern, same vendor classes)
- ◐ partial (pattern applies, vendor wrong, reframe needed)
- ✗ mismatch (specific to energy fixture; rebuild needed before showing externally)

---

## Per-finding analysis

### f_seed_01 — RSA private key in turbine_logic.acd.bak (engineering WS)
- **Severity (claimed):** critical
- **Action a water-utility ops person takes in week 1:** rotate the key in whatever it authenticated to (vendor portal / git / cloud); audit the share for who's read the .bak; check git history for prior commits of the same file; clean the bak from project share.
- **Concrete blast radius they can describe to their GM:** "if attacker has this key, they can sign as our engineering WS to vendor X."
- **Signal:noise:** **5**
- **Water-fit:** ✓ Universal. Water utilities run engineering workstations with project backups (.acd is Rockwell Studio 5000; PI/Wonderware projects also have .bak patterns). Wisconsin SCADA = mostly Rockwell + Wonderware. Same finding applies, may need filename pattern broadening.

### f_seed_02 — AKIA*** in s3-backup.cfg (engineering WS)
- **Severity:** high
- **Action:** rotate IAM key, check CloudTrail for unauthorized use, switch backup script to instance role or short-lived creds.
- **Signal:noise:** **5**
- **Water-fit:** ✓ Universal. Water utilities use cloud backup for SCADA configs. Same pattern.

### f_seed_03 — pi_admin password in /etc/aveva/historian.ini
- **Severity:** high
- **Action:** rotate `pi_admin`, restrict file mode, switch to integrated/AD auth where supported.
- **Signal:noise:** **5**
- **Water-fit:** ✓ Universal. Water utilities run historians (PI / OSIsoft / Wonderware Historian / Canary). The `.ini` plaintext-cred pattern is endemic.

### f_seed_04 — modbus_admin in panelview-export.xml (HMI)
- **Severity:** medium
- **Action:** check whether export was committed to a repo or shared; rotate; question whether "modbus_admin" is the deployed cred or a vendor default in an export template.
- **Signal:noise:** **3** (lower confidence 0.6, ambiguous — could be vendor default in an export template; needs corroboration to avoid noise).
- **Water-fit:** ✓ Universal. Rockwell PanelView is widely deployed in WI water lift stations. Pattern applies. Confidence framing matters — need to indicate "this might be a vendor default in an export, not your live cred" to avoid alarm-fatigue.

### f_seed_05 — unpinned actions/checkout@master in CI
- **Severity:** high
- **Action a water-utility ops person takes in week 1:** *probably none*. Most mid-size WI water utilities don't run CI/CD. This finding lands on the SI/integrator who builds their automation, not the utility GM.
- **Signal:noise to a utility buyer:** **2** (interesting but they won't act on it).
- **Signal:noise to an SI/integrator buyer:** **5**.
- **Water-fit:** ◐ Partial. The finding is real and high-value, but the buyer is the SI, not the utility. Suggests two artifact variants OR explicit "your SI should fix" framing for utility audience. Currently the artifact treats utility as the buyer of all findings — this is a packaging miss.

### f_seed_06 — log4j 2.14.1 in WinCC OA (SCADA)
- **Severity:** critical
- **Action:** vendor patch path, hot-fix log4j-core jar, network-isolate as compensating control.
- **Signal:noise:** **5** (CVE-2021-44228 is the canonical OT supply-chain bomb).
- **Water-fit:** ✗ **Mismatch.** WinCC OA is Siemens — used in some power and large industrial, but rare in mid-size WI water. Water utilities typically run Wonderware / iFIX / Rockwell FactoryTalk View / Inductive Automation Ignition. Showing "log4j in WinCC OA" to a Marty Pollard or AWWA chair will produce: "we don't run WinCC, this isn't us." Credibility hit. **Need water-flavored fixture before showing externally.**

### f_seed_07 — OpenSSL 1.0.2k in historian connector
- **Severity:** medium
- **Action:** vendor patch path; assess actual exposure (likely low if internal-only); add to vendor-risk register.
- **Signal:noise:** **3** (real but not urgent; many utility plants will say "yeah we know, vendor's slow").
- **Water-fit:** ✓ Universal. Stale OpenSSL bundled in vendor connectors is endemic across all OT vendors.

### f_seed_08 — TCP/102 (S7) reachable from corporate VLAN (SCADA)
- **Severity:** critical
- **Action:** firewall rule, audit who reached it, document, fold into segmentation roadmap.
- **Signal:noise (the *concept*):** **5** (control-plane protocol from IT VLAN is a textbook north-south violation).
- **Water-fit:** ✗ **Mismatch.** S7 is Siemens. Water utilities run Modbus TCP, EtherNet/IP, DNP3, sometimes BACnet — rarely S7. The finding TYPE applies (control protocol from corporate VLAN), but the specific port/protocol will read as wrong-vendor to a water reviewer. **Need water-flavored fixture: same finding, but TCP/2222 (EtherNet/IP) or TCP/20000 (DNP3) reachable from corporate VLAN.**

### f_seed_09 — TCP/502 (Modbus) responding with no auth banner (PLC)
- **Severity:** high
- **Action:** confirm whether reachable from where it shouldn't be; segment if so; "no auth banner" is tautological — Modbus has no auth. Real action is around exposure topology, not the missing auth.
- **Signal:noise:** **3** as written. **5** if reframed as "Modbus reachable from \[wrong zone\]". The current text "no auth banner" will land flat with a Modbus-fluent operator.
- **Water-fit:** ✓ Universal. Modbus TCP is core protocol in WI water (lift stations, RTU polls). Reframing fix recommended regardless of fixture.

### f_seed_10 — PanelView HTTP/80 with default cert (HMI)
- **Severity:** medium
- **Action:** replace cert, restrict access to mgmt VLAN, disable HTTP if HTTPS available.
- **Signal:noise:** **3** (real but small-impact; routine hygiene).
- **Water-fit:** ✓ Universal. PanelView default certs are everywhere in mid-size WI water.

### f_seed_11 — SIS controller reachable from HMI zone (mesh_gap)
- **Severity:** critical
- **Action:** **HOT.** Audit all routes from HMI zone to SIS; segment immediately; this is a safety claim, not a security claim — board-level conversation.
- **Signal:noise:** **5** (highest-stakes finding; mesh-gap into a safety controller IS the board deck).
- **Water-fit:** ◐ Partial. Water utilities have SIS — chemical dosing interlocks, chlorine release, well-pump shutoff, intake-gate trip. The finding TYPE absolutely applies. But the specific fixture is HIMA HIMax (turbine trip) — wrong vendor and process for water. Pattern transfers; specifics need swap. **Water-flavored fixture should put this on a Triconex, ABB AC800, or pump-shutoff PLC.**

---

## Synthesis

| Score | Count | Findings |
|---|---|---|
| 5 (act today) | 5 | f01, f02, f03, f06 (concept), f11 (concept) |
| 4 (next sprint) | 0 | — |
| 3 (backlog) | 4 | f04, f07, f09, f10 |
| 2 (low-act) | 1 | f05 (for utility audience) |
| 1 (noise) | 0 | — |

**Signal:noise ratio:** 9/11 actionable (≥3), 5/11 high-action (≥5). **Above the 60% threshold the freeze sets for "tier holds."**

**Water-fit:** 7/11 universal ✓, 2/11 partial ◐ (f05 audience-mismatch, f11 vendor-mismatch), 2/11 mismatch ✗ (f06 log4j-WinCC, f08 S7-on-corp). **Two mismatches are deal-breakers if the sample PDF is shown to Marty Pollard or AWWA chair without rebuild.** The patterns transfer; the vendor-specific evidence does not.

---

## Recommendations

1. **Tier holds on signal grounds.** 9/11 findings translate to concrete week-1 action. Evidence Pack content is real, not theatrical. Path C ✓ for the freeze rubric.

2. **DO NOT show the current sample PDF to water reviewers.** Build a water-flavored fixture before Pearl path B sessions. Estimated effort: 1 working day to swap plant-demo.json to a water-utility analogue (Rockwell + Wonderware + Modbus + DNP3 + chemical-dosing SIS) and regenerate findings.json + sample PDF.

3. **Reframe two findings regardless of fixture:**
   - f_seed_09: "no auth banner" → "Modbus reachable from \[zone X\] where it shouldn't be." Ditch the auth-banner framing — it reads as ignorance to anyone who knows Modbus.
   - f_seed_05: add explicit "this is a finding for your SI / integrator, not your ops team" framing OR split artifact into utility/SI variants.

4. **f_seed_04 confidence framing:** add "this may be a vendor default in an export template; verify against deployed creds" to avoid alarm-fatigue. Confidence 0.6 should drive language, not just a number.

5. **Strongest findings for water buyer narrative:** f01 (RSA key), f02 (AWS key), f03 (PI admin), f06-equivalent (vendored CVE in their actual SCADA), f11-equivalent (mesh gap into chemical/pump SIS). These are the five that should anchor any water-flavored sample PDF.

6. **Path C verdict:** **green for "value exists in the artifact's bones,"** **red for "current sample PDF is showable to water reviewers."** The asymmetry matters: don't mistake "tier holds" for "current PDF is shippable."

---

## Time + cost

- **This analysis:** ~45 min, no agent.
- **Water-flavored fixture build:** ~1 day (plant-water-demo.json + scanner re-run + sample PDF regen + render verification).
- **Path C re-run on water fixture:** ~30 min after fixture exists.

## Open questions (for sponsor / Pearl)

1. Is the SI/integrator buyer-channel angle (f_seed_05) worth a separate motion, or is utility-direct the only motion? Pearl decides.
2. Should the water-flavored fixture rebuild happen during the freeze (as a value-validation prerequisite) or after thaw (as a "ship the rebuilt PDF" task)? Recommend during — Pearl B reviewers can't be shown the energy version.
3. f_seed_07 (OpenSSL in historian) is a slow-burn finding. Should Evidence Pack downgrade or omit slow-burn items in favor of fewer-but-sharper findings? Tradeoff: density vs alarm-fatigue. Pearl decides.
