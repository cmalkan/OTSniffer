---
name: pdf-extraction
description: Methodology for extracting structured asset/vendor/topology data from industrial customer PDFs. Use when building or improving any extractor that consumes a PDF in this project — onboarding BOM upload, FDS/FRS parsing, P&ID label scraping, zone-and-conduit drawing parsing. Covers pdfjs-dist positioning, table reconstruction, architecture-drawing fallback, vendor-bank canonicalization, and the confidence/source schema every extractor must emit.
---

# PDF Extraction Methodology (OTSniffer canonical)

## Why this skill exists

Customer PDFs in OT/ICS are *not* BOMs. They are zone-and-conduit drawings, FDS/FRS narratives, IO lists with continuation rows, and scanned packages from MOC submittals. A naive `getTextContent → split lines → regex` parser produces 0 useful rows from 80% of real customer documents. This skill is the methodology that turns that into a 70%+ vendor-tagged asset list with confidence flags the operator can trust.

## The five document shapes (decide first, parse second)

When a new PDF arrives, identify which of these shapes it is *before* writing extraction logic:

1. **Tabular BOM** — explicit header row + data rows + repeating column-x positions. Example: a customer-exported asset spreadsheet saved as PDF.
2. **Architecture drawing** — graphical, zone boxes with text labels positioned freely; no header row exists. Example: KNPC ZCD-001, ISA-62443-3-2 zone-and-conduit drawing.
3. **FDS/FRS narrative + tables** — sectioned prose with embedded tables that span continuation pages. Example: KNPC FDS-CS-001.
4. **IO list / tag list** — long repeating-pattern document, often 50-500 pages, single dominant table.
5. **Image-only / scanned** — pdfjs returns no text; OCR required.

Each shape gets a different extractor. **Do not write a single parser that handles all shapes.** Write a *router* that classifies the PDF, then hands off.

## Step 1 — Always dump raw text first

```bash
docker compose -f compose.toolchain.yml run --rm node sh -c \
  "npm i --no-save --no-audit --no-fund --silent pdfjs-dist@4.0.379 && \
   node scripts/onboarding/extract-pdf.mjs <pdf>" > /tmp/raw.txt
```

Read at least:
- Page 1 (title block — confirm boilerplate)
- Page 2-3 (legend / abbreviations / first content page)
- The middle (structural pattern repeats)
- The last 1-2 pages (revision history, appendices)

If pages are mostly empty after extraction → image-only doc → stop and tell the operator.

## Step 2 — pdfjs positioning model

`getTextContent().items[]` returns text runs with `transform[4]` (x), `transform[5]` (y), and `str`. PDF y-axis is bottom-up; characters on the same line share y to ~2.5pt. Cluster:

```
y-cluster (within 2.5pt)  → line
gap > 14pt within a line  → column boundary
```

Column gaps under 14pt are intra-word; over 25pt usually mean multi-table-section. Tune per document family if needed but never below 12 (causes word-splitting on certain fonts).

## Step 3 — Detect and strip boilerplate

Title blocks, drawing-control blocks, and page footers repeat on every page. Detect by counting per-line frequency across all pages, threshold = `max(3, floor(pages * 0.4))`.

```js
const counts = new Map();
for (const page of pages) {
  const seen = new Set();
  for (const line of page) {
    const k = norm(line);
    if (k.length < 4 || k.length > 200 || seen.has(k)) continue;
    seen.add(k);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
}
const boilerplate = new Set(
  [...counts].filter(([_, c]) => c >= threshold).map(([k]) => k)
);
```

Stripping boilerplate before any further analysis is non-negotiable. Otherwise revision history rows leak into BOMs and you get assets named "M.A" and "29.05.2025".

## Step 4 — Choose the extractor

### Shape 1: Tabular BOM

```
Find runs of ≥3 consecutive lines whose column-x positions match
within ±10pt. Header row must:
  - have all cells <= 40 chars
  - hit ≥2 known header tokens (vendor, model, ip, zone, etc.)
Reject runs whose header doesn't pass both checks (kills false positives
from narrative paragraphs that happen to align).
```

Header → field mapping uses `HEADER_ALIASES` (already defined in
`scripts/onboarding/extract-bom.mjs:22-33`). Extend, don't fork.

### Shape 2: Architecture drawing

The text is positioned graphically — no table exists. Two passes:

**Pass A — zone-section detection.** Use `topology-extract.js` patterns:
section heading regex (`^(?:\d+(?:\.\d+)*\s+)?([A-Za-z][A-Za-z0-9/,&+\- ]+? Zone)`),
collect items under each section by `contains:` or by VLAN-table rows.

**Pass B — vendor-context tagging.** For each section, scan that section's
lines for vendor-bank matches and tag every asset in the section with the
nearest vendor mention. Confidence = 0.6 (because it's positional, not
columnar). If a model-marker is also present in the section (e.g. "FCP270"),
attach the model with confidence 0.7.

Architecture-drawing extraction outputs assets with `source: "topology"` and
`confidence: 0.6-0.8`. The operator must review.

### Shape 3: Narrative + tables

Section walker (depth-first), with `mode = "table" | "list" | "prose"`
state machine. Tables in narrative docs almost always span continuation
pages — track column-x across pages and merge rows whose x-pattern matches
the previous page's last table.

### Shape 4: Long IO list

Skip the first N pages (TOC), find the dominant table, walk the rest as
data. Most IO lists have a "Tag, Description, IP, Module, Slot, Channel"
header. Use `HEADER_ALIASES` extended with IO-specific tokens.

### Shape 5: Image-only

Bail loudly. Do not attempt extraction. Return `{ shape: "image-only",
ocr_required: true }` and let the operator decide.

## Step 5 — Vendor-bank canonicalization

Every extractor imports the same vendor-bank module
(`scripts/onboarding/vendor-bank.mjs`). The bank exports:

```js
{
  vendors: [
    {
      canonical: "Rockwell Automation",
      aliases: [/\b(rockwell|allen[\s-]?bradley|\bAB\b)\b/i, /\bAB\s*PLC\b/i],
      products: [
        { canonical: "ControlLogix", marker: /\bcontrol[\s-]?logix\b/i },
        { canonical: "GuardLogix",   marker: /\bguard[\s-]?logix\b/i },
        { canonical: "MicroLogix",   marker: /\bmicro[\s-]?logix\b/i },
        { canonical: "CompactLogix", marker: /\bcompact[\s-]?logix\b/i },
        { canonical: "FactoryTalk",  marker: /\bfactory[\s-]?talk\b/i },
        { canonical: "Studio 5000",  marker: /\bstudio\s*5000\b/i },
      ],
    },
    // ... Schneider, Siemens, Honeywell, Foxboro (Schneider), Triconex (Schneider),
    //     Emerson, Yokogawa, ABB, AspenTech, AVEVA, Bently Nevada, Trellix,
    //     Nozomi, Claroty, Dragos, Fortinet, Cisco, Belden/Hirschmann, Moxa,
    //     Phoenix Contact, Wago, B&R, Mitsubishi, Omron
  ]
}
```

When you encounter a vendor not in the bank, **add it to the bank, not
to the parser**. The bank is the single source of truth.

## Step 6 — The output schema (never deviate)

Every extracted asset row carries:

```
{
  asset_id, name, asset_type, vendor, model, firmware_version,
  ip_address, zone_id, criticality_score, process_tag,
  // extraction metadata — REQUIRED
  _source: "bom_table" | "topology" | "manual" | "vendor_inferred",
  _confidence: 0..1,
  _evidence_line?: string,   // the raw PDF line that triggered the tag
  _evidence_page?: number,
}
```

Persistence may strip the underscore-prefixed fields, but they MUST exist
during the extract → review pipeline so the UI can surface confidence and
the operator can audit.

## Step 7 — Build the enrichment DB

Even if persistence is JSON today, design as if it will be queried:

```
plant_assets(plant_id, asset_id, vendor_canonical, model_canonical,
             firmware_version, source, confidence)
plant_zones(plant_id, zone_id, name, level)
plant_connectivity(plant_id, source_asset_id, target_asset_id, protocol, port)
vendor_evidence(plant_id, asset_id, evidence_line, evidence_page,
                regex_matched)
```

Design indexes:
- `(vendor_canonical, model_canonical)` — for advisory join
- `(plant_id, zone_id)` — for blast-radius queries
- `(plant_id, confidence)` — for "needs review" queue

Today it's a JSON file. Tomorrow it's SQLite. Don't paint yourself into a
corner with field names that won't translate.

## Failure modes to handle explicitly

1. **Empty extract** — image-only PDF. Return shape classification, not synthetic data.
2. **Wrong shape detection** — extractor finds 0 candidates. Fall through to next shape; if all shapes return 0, classify as `unknown` and surface raw text dump for operator.
3. **Boilerplate that varies per page** — drawing-revision blocks where the date changes. Strip by regex on the per-line content (`/^[A-C]\s+\d{2}\.\d{2}\.\d{4}/`), not just frequency.
4. **Continuation rows** — IO lists where description spills to the next line. Detect by: row has fewer columns than header AND first column is empty AND y is within 1.5 line-heights of previous.
5. **Multi-column flow** — landscape pages with two text columns. y-clustering breaks down. Detect by checking if x-distribution is bimodal; if so, split page in half by the gap and parse each column independently.

## What NOT to do

- Do not put placeholder text in form input cells that looks like a real vendor — empty cells with `placeholder="Rockwell Automation"` cause operators to think extraction succeeded when it didn't. Use `—` or empty.
- Do not silently fall back from BOM extraction to topology extraction; flag the fall-through and show the operator the confidence drop.
- Do not match vendors by raw substring without going through the canonical bank.
- Do not invent confidence values. 1.0 = explicit BOM column. 0.7 = topology + model marker. 0.6 = topology + vendor only. 0.0 = manual stub.
