---
name: sbom-vuln-matching
description: Methodology for joining a customer SBOM/asset inventory against vulnerability feeds (CISA ICS-CERT, KEV, NVD, vendor PSIRT) and emitting prioritized findings that conform to OTSniffer's normalized finding schema. Use when building or improving any scanner that consumes a plant fixture and produces vulnerability evidence.
---

# SBOM → Vulnerability Matching (OTSniffer canonical)

## Why this skill exists

Industrial buyers don't pay for a CVE list — they pay for a defensible answer to "what does our current asset base expose us to right now?" That requires joining the customer's inventory (vendor + model + firmware) against authoritative public sources (ICS-CERT, KEV, NVD, vendor PSIRT) and grading each match by exploit gating + zone exposure + KEV status. This skill codifies the matching algorithm so every scanner produces consistent, audit-ready findings.

## The four authoritative feeds (in priority order)

1. **CISA ICS-CERT advisories** (`data/feeds/cisa-ics-advisories.json`) — most operationally relevant for OT. Format: `ICSA-YY-NNN-NN` and `ICSMA-YY-NNN-NN` (medical). Includes patch availability, public-exploit flag, vendor coordination state. Refresh weekly.
2. **CISA KEV catalog** — Known Exploited Vulnerabilities. A CVE here triggers a CISA mandate and is an underwriting signal. Use as a binary boost, not a relative weight.
3. **NVD** — broadest CVE coverage, with CPE matching. Noisier; only use when ICS-CERT has no row for a vendor/product family.
4. **Vendor PSIRT feeds** — Rockwell Stakeholder Center, Schneider SE Cybersecurity Notifications, Siemens ProductCERT, Honeywell PSIRT. Authoritative for that vendor; inconsistent format. Use to fill ICS-CERT lag.

Always cite which feed produced each match.

## The matching pipeline

```
INPUT:  plant fixture (assets[] with vendor, model, firmware_version)
        + feeds (cisa-ics-advisories.json, kev.json)
OUTPUT: findings[] (normalized schema)
```

### Step 1 — Canonicalize the asset side

For every asset, produce `(vendor_canonical, model_canonical, firmware_canonical)` using the **same vendor-bank module** the PDF extractor uses (`scripts/onboarding/vendor-bank.mjs`). Drift between extractor and matcher is the #1 source of false negatives. Both sides import the same bank.

```
"Allen-Bradley" → "Rockwell Automation"
"AB"            → "Rockwell Automation"
"Foxboro"       → "Schneider Electric (Foxboro)"
"Schneider"     → "Schneider Electric"
"Triconex"      → "Schneider Electric (Triconex)"  // distinct product family
```

If canonicalization fails, emit a `vendor_unknown` audit row and skip — do **not** match by raw substring.

### Step 2 — Canonicalize the feed side

Feed entries also get canonicalized — `vendor` field in CISA feed is already canonical-ish ("Rockwell Automation"), but products vary ("ControlLogix Redundancy Enhanced Module Catalog 1756-RM2 Firmware"). Extract the *product family* by walking through known product markers (`ControlLogix`, `CompactLogix`, `GuardLogix`, etc.) and tagging.

### Step 3 — Vendor join

```
For each asset where vendor_canonical is set:
  candidate_advisories = feed.advisories where advisory.products.any(
    product.vendor_canonical == asset.vendor_canonical
  )
```

This is the vendor-side filter. Cuts the search space by 95%+ for any one asset.

### Step 4 — Model match scoring

Within candidate advisories, score each by model match:

```
score = 0
if asset.model_canonical matches any product family in advisory: score += 5
if asset.model_canonical exact match (substring) in product name:   score += 3
if asset.firmware_version falls in advisory affected-version range: score += 4
if no firmware_version on asset: score += 1  // can't exclude, low confidence
```

Threshold for emission: `score >= 5`. Lower thresholds produce noise that
buries real findings.

### Step 5 — Severity & exploitability grading

For each emitted match, compute final severity:

```
severity_input = max(advisory.cvss_base, 0)
if KEV listed:                    severity = "critical"  (always)
elif cvss_base >= 9.0:            severity = "critical"
elif cvss_base >= 7.0:            severity = "high"
elif cvss_base >= 4.0:            severity = "medium"
else:                              severity = "low"
```

Tag exploit gating from the advisory body:

```
"unauthenticated remote"         → "confirmed-remote-unauth"
"authenticated remote"           → "confirmed-remote-auth"
"adjacent network"               → "requires-adjacent"
"physical access"                → "requires-physical"
"default credentials"            → "requires-default-creds"
no exploit publicly available    → "theoretical-only"
```

The scanner should not invent exploitability — pull from the advisory text only.

### Step 6 — Emit findings (normalized schema)

```json
{
  "finding_id": "<sha256(asset_id|advisory_id|cve_id) shortened>",
  "asset_id": "a_plc_43_44",
  "finding_type": "supply_chain",
  "severity": "high",
  "evidence": {
    "advisory_id": "ICSA-24-XXX-NN",
    "advisory_url": "https://...",
    "cve_ids": ["CVE-2024-XXXXX"],
    "matched_vendor_canonical": "Rockwell Automation",
    "matched_product_family": "ControlLogix",
    "asset_vendor_raw": "Allen-Bradley",
    "asset_model_raw": "ControlLogix 1756-L75",
    "kev_listed": false,
    "exploit_gating": "confirmed-remote-auth",
    "cvss_base": 7.5,
    "match_score": 8,
    "rationale": "ControlLogix 1756-L75 firmware unspecified — assume affected until firmware is captured during onsite review."
  },
  "source_tool": "advisories",
  "detected_at": "2026-04-28T15:00:00Z",
  "confidence": 0.7
}
```

`confidence` reflects match certainty:
- `0.9` — vendor + product family + firmware-in-range all match
- `0.7` — vendor + product family match, firmware unknown
- `0.5` — vendor match only (broad family), product approximate
- Below 0.5 — do not emit; log to audit

### Step 7 — Operator summary

The findings JSON is for the dashboard. The operator also needs a human read:

```
TOP 10 (sorted by KEV first, then CVSS desc, then EPSS desc)

1. [CRITICAL · KEV] ControlLogix 1756-L75 (a_plc_43_44, Zone L1)
   ICSA-24-XXX-NN — CVE-2024-XXXXX (CVSS 9.8)
   Why this matters: Reachable from L2 via Modbus TCP per connectivity[].
   Action: Patch to firmware 35.011 or compensate via L2/L1 firewall ACL.
   Patch availability: Vendor advisory dated 2024-XX-XX.

(grouped by zone level, so L1/L2 findings get attention before L3.5)
```

### Step 8 — Coverage report

What you matched is half the story. Also report:

```
- assets_total
- assets_with_vendor: 38 / 56  (68%)
- assets_with_model: 12 / 56  (21%)
- assets_matched: 8
- vendor_unknown: 3 (Acme, FooCorp, Generic) — vendor-bank gap
- advisories_loaded: 1247
- advisories_matched: 14
```

Gaps in vendor-unknown drive next iteration's extractor improvements.

## Hard rules

- **No invented advisories.** Only emit findings traceable to a feed row.
- **No inflated severity.** Pulled from feed; never elevated.
- **No raw-substring vendor matching.** Always go through canonical bank.
- **Always cite feed source** in `evidence.source_feed` (`cisa-ics-cert`, `kev`, `nvd`, `vendor-psirt`).
- **No live exploit code.** Assess-only; this is the trust contract with industrial buyers.
- **Idempotent.** Re-running the scanner on the same fixture + same feeds produces byte-identical findings (modulo `detected_at`). The merge step in `scripts/otsniff/merge.mjs` already dedupes by `finding_id` — make sure `finding_id` is deterministic.

## Testing

Always include:
1. Unit test on a fixture with a known Rockwell + Schneider asset against a fixture feed → expected findings count.
2. Negative test: asset with vendor "Acme Widgets" → 0 findings, 1 `vendor_unknown` audit row.
3. Determinism test: run twice, diff non-timestamp fields → empty diff.
