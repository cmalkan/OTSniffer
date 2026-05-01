// vendor-recognize.mjs — applies the vendor-bank to a list of assets in
// the context of the source PDF text. Used by both the node-side
// extractor and (via a browser mirror) the onboarding UI.
//
// Strategy:
//   1. Build a per-zone vendor-context map by scanning lines that contain
//      the zone name OR are between zone headers.
//   2. For each asset, try the asset's own name/model text first.
//   3. Fall back to the asset's zone-context for vendor-only inference.
//   4. Tag each tagged asset with _source, _confidence, _evidence_line.

import { recognizeVendor } from "./vendor-bank.js";

// Tag each asset with vendor/model recognition. `lines` is the cleaned
// per-page line stream from the PDF; `assets` is the topology-extracted
// asset list (already with zone_id assigned).
export function tagAssetsFromPdfLines(lines, assets, zones) {
  const cleaned = (lines || []).map((s) => String(s || "").trim()).filter(Boolean);
  const zoneContext = buildZoneContext(cleaned, zones);

  const tagged = [];
  let directHits = 0;
  let zoneHits = 0;

  for (const a of assets || []) {
    const next = { ...a };

    // Skip if the asset already has a vendor assigned (manual or BOM-table).
    if (next.vendor && String(next.vendor).trim()) {
      tagged.push(next);
      continue;
    }

    // 1) Try the asset's own text — name + model + process_tag combined
    const ownText = [a.name, a.model, a.process_tag, a.asset_id].filter(Boolean).join(" ");
    let hit = recognizeVendor(ownText);
    if (hit) {
      applyTag(next, hit, ownText, "asset_text");
      directHits += 1;
      tagged.push(next);
      continue;
    }

    // 2) Fall back to zone-context — scan lines belonging to this asset's zone
    const ctxLines = zoneContext.get(a.zone_id) || [];
    for (const line of ctxLines) {
      hit = recognizeVendor(line);
      if (hit) {
        applyTag(next, hit, line, "zone_context");
        zoneHits += 1;
        break;
      }
    }

    tagged.push(next);
  }

  return {
    assets: tagged,
    summary: {
      total: assets.length,
      direct_hits: directHits,
      zone_hits: zoneHits,
      tagged: directHits + zoneHits,
      coverage: assets.length ? (directHits + zoneHits) / assets.length : 0,
    },
  };
}

function applyTag(asset, hit, evidence, source) {
  asset.vendor = hit.vendor_canonical;
  if (hit.product_canonical && !asset.model) asset.model = hit.product_canonical;
  asset._vendor_source = source;
  asset._vendor_confidence = source === "asset_text" ? hit.confidence : Math.max(0.5, hit.confidence - 0.2);
  asset._vendor_evidence = String(evidence || "").slice(0, 240);
}

// Build a map of zone_id -> [lines mentioning that zone or under its heading].
// Heuristic: walk the line stream, when we see a zone-name appearance, the
// next ~6 lines (until the next zone-name appearance) belong to that zone's
// context. Zone-name appearance = the zone.name token (case-insensitive,
// punctuation insensitive) appears in the line.
function buildZoneContext(lines, zones) {
  const ctx = new Map();
  if (!zones || !zones.length) return ctx;

  // Pre-compute normalized zone names for matching
  const zoneMatchers = zones.map((z) => ({
    zone_id: z.zone_id,
    re: new RegExp(`\\b${escapeRegex(z.name).replace(/\s+/g, "\\s+")}\\b`, "i"),
  }));

  let activeZones = new Set();
  let buffer = [];
  const flush = () => {
    if (!activeZones.size || !buffer.length) return;
    for (const zid of activeZones) {
      const arr = ctx.get(zid) || [];
      arr.push(...buffer);
      ctx.set(zid, arr);
    }
    buffer = [];
  };

  for (const line of lines) {
    const matchedZones = zoneMatchers.filter((zm) => zm.re.test(line));
    if (matchedZones.length) {
      flush();
      activeZones = new Set(matchedZones.map((m) => m.zone_id));
      // The line itself is part of the context too
      buffer.push(line);
      continue;
    }
    if (activeZones.size) {
      buffer.push(line);
      // Cap context at 12 lines per zone-mention to avoid bleed
      if (buffer.length >= 12) flush();
    }
  }
  flush();

  return ctx;
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
