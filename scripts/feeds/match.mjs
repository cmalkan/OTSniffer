// Feed matcher — joins plant fixture assets against pulled CISA ICS-CERT
// advisories and the KEV catalog. Vendor name normalization handles common
// OT-vendor aliases (Allen-Bradley ↔ Rockwell, Wonderware ↔ AVEVA, etc.).
//
// Match tiers:
//   "exact"  — vendor canonical + product substring both match
//   "vendor" — only vendor matches (advise plant operator to check version)
//
// Used by the /api/posture handler in dev-server.mjs and by the netlify
// function once that's wired up.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Canonical vendor → list of substrings that should map to it.
// Order matters: more specific aliases listed first.
const VENDOR_ALIASES = [
  ["Rockwell Automation", ["rockwell automation", "rockwell", "allen-bradley", "allen bradley", " ab "]],
  ["AVEVA",               ["aveva", "wonderware", "osisoft", "pi system", "archestra"]],
  ["Siemens",             ["siemens", "simatic", "wincc"]],
  ["Schneider Electric",  ["schneider electric", "schneider", "scadapack", "modicon", "tricon"]],
  ["Emerson",             ["emerson", "deltav", "ovation"]],
  ["Honeywell",           ["honeywell", "experion"]],
  ["ABB",                 ["abb"]],
  ["HIMA",                ["hima"]],
  ["GE",                  ["general electric", " ge ", "ge ", "ifix", "cimplicity", "proficy"]],
  ["Yokogawa",            ["yokogawa"]],
  ["Mitsubishi Electric", ["mitsubishi", "melsec"]],
  ["Hitachi",             ["hitachi"]],
  ["Phoenix Contact",     ["phoenix contact"]],
  ["WAGO",                ["wago"]],
  ["Beckhoff",            ["beckhoff"]],
  ["OPTO 22",             ["opto 22", "opto22"]],
  ["Red Lion",            ["red lion"]],
  ["Moxa",                ["moxa"]],
  ["Hirschmann",          ["hirschmann"]],
];

export function canonicalizeVendor(name) {
  if (!name) return null;
  const lower = " " + String(name).toLowerCase().trim() + " ";
  for (const [canonical, aliases] of VENDOR_ALIASES) {
    for (const a of aliases) {
      if (lower.includes(a.toLowerCase())) return canonical;
    }
  }
  return name.trim();
}

export async function loadFeeds(rootDir) {
  const advPath = path.join(rootDir, "data", "feeds", "cisa-ics-advisories.json");
  const kevPath = path.join(rootDir, "data", "feeds", "cisa-kev.json");
  const metaPath = path.join(rootDir, "data", "feeds", "_meta.json");
  const nvdPath = path.join(rootDir, "data", "feeds", "nvd-cves.json");
  if (!existsSync(advPath) || !existsSync(kevPath)) return null;
  const [adv, kev, meta, nvd] = await Promise.all([
    readFile(advPath, "utf8").then(JSON.parse),
    readFile(kevPath, "utf8").then(JSON.parse),
    existsSync(metaPath) ? readFile(metaPath, "utf8").then(JSON.parse) : Promise.resolve(null),
    existsSync(nvdPath) ? readFile(nvdPath, "utf8").then(JSON.parse) : Promise.resolve({ cves: {} }),
  ]);
  return {
    advisories: adv.advisories || [],
    kev: kev.vulnerabilities || [],
    meta,
    nvd: nvd.cves || {},
    nvd_pulled_at: nvd.pulled_at || null,
  };
}

// Enrich an advisory with NVD CVE detail when available. Returns a new shape
// adding nvd_cves: [{ cve_id, description, cvss_score, cwes, references }]
// for each CVE we have a cache entry for.
export function enrichAdvisoryWithNVD(advisory, nvdCache) {
  if (!nvdCache || !advisory.cves?.length) return { ...advisory, nvd_cves: [] };
  const enriched = advisory.cves
    .map(id => nvdCache[id] ? { ...nvdCache[id] } : null)
    .filter(Boolean);
  return { ...advisory, nvd_cves: enriched };
}

// For one plant asset, find all advisories that hit it.
// Returns an array of { advisory, match_tier, matched_vendor, matched_product }
export function matchAdvisoriesForAsset(asset, advisories) {
  const assetVendor = canonicalizeVendor(asset.vendor);
  if (!assetVendor) return [];
  const assetModel = String(asset.model || "").toLowerCase();

  const out = [];
  for (const adv of advisories) {
    const products = adv.affected_products || [];
    if (!products.length) continue;
    let bestTier = null;
    let bestVendor = null, bestProduct = null;

    for (const p of products) {
      const advVendor = canonicalizeVendor(p.vendor);
      if (advVendor !== assetVendor) continue;
      // Vendor matches; check product
      const advProduct = String(p.product || "").toLowerCase();
      const productHit =
        assetModel && advProduct &&
        (assetModel.includes(advProduct) || advProduct.includes(assetModel) ||
         tokenOverlap(assetModel, advProduct) >= 0.5);

      if (productHit) {
        bestTier = "exact";
        bestVendor = advVendor;
        bestProduct = p.product;
        break;
      }
      if (bestTier === null) {
        bestTier = "vendor";
        bestVendor = advVendor;
        bestProduct = p.product;
      }
    }
    if (bestTier) {
      out.push({ advisory: adv, match_tier: bestTier, matched_vendor: bestVendor, matched_product: bestProduct });
    }
  }
  return out;
}

// Match an asset against the KEV catalog (separate join; CVE-level not vendor-level).
// Returns KEV entries where the vendor matches the asset's canonical vendor.
export function matchKEVForAsset(asset, kevEntries) {
  const assetVendor = canonicalizeVendor(asset.vendor);
  if (!assetVendor) return [];
  return kevEntries.filter(k => canonicalizeVendor(k.vendorProject) === assetVendor);
}

// Match all assets at once; returns a map asset_id -> { advisories, kev, sev_tally }
export function matchAllAssets(plant, feeds) {
  const result = {};
  for (const asset of plant.assets || []) {
    const advHits = matchAdvisoriesForAsset(asset, feeds.advisories);
    const kevHits = matchKEVForAsset(asset, feeds.kev);
    const sev_tally = advHits.reduce((acc, h) => {
      const s = h.advisory.cvss_severity || "info";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    result[asset.asset_id] = {
      advisory_hits: advHits,
      kev_hits: kevHits,
      sev_tally,
      exact_count: advHits.filter(h => h.match_tier === "exact").length,
      vendor_count: advHits.filter(h => h.match_tier === "vendor").length,
    };
  }
  return result;
}

function tokenOverlap(a, b) {
  const ta = new Set(a.split(/[\s\-_/]+/).filter(t => t.length > 2));
  const tb = new Set(b.split(/[\s\-_/]+/).filter(t => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits++;
  return hits / Math.min(ta.size, tb.size);
}
