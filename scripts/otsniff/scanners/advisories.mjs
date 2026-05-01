// advisories.mjs — match plant SBOM (vendor + model) against CISA ICS-CERT
// advisories and emit normalized findings.
//
// Inputs:
//   { plant: "<path-to-plant.json>", feed: "<path-to-cisa-ics-advisories.json>" }
//
// Output:
//   { findings: [...], summary: { ... } }
//
// Methodology lives in .claude/skills/sbom-vuln-matching/SKILL.md.
// Vendor canonicalization lives in web/js/vendor-bank.js (single source).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeFinding } from "./_base.mjs";
import { recognizeVendor, buildFeedAliasIndex } from "../../../web/js/vendor-bank.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_FEED = path.resolve(__dirname, "../../../data/feeds/cisa-ics-advisories.json");
const DEFAULT_KEV  = path.resolve(__dirname, "../../../data/feeds/cisa-kev.json");

// Public entry. Returns { findings: [], summary: {...} }.
export async function scanAdvisories({ plant, feed = DEFAULT_FEED, kev = DEFAULT_KEV, now = new Date() } = {}) {
  if (!plant) throw new Error("scanAdvisories: { plant } is required");

  const plantData  = JSON.parse(await readFile(plant, "utf8"));
  const feedData   = JSON.parse(await readFile(feed,  "utf8"));
  const kevSet     = await loadKevSet(kev);
  const aliasIndex = buildFeedAliasIndex();

  const advisories = Array.isArray(feedData?.advisories) ? feedData.advisories : (Array.isArray(feedData) ? feedData : []);
  const advByVendor = indexAdvisoriesByCanonicalVendor(advisories, aliasIndex);

  const findings = [];
  const assetPatches = [];   // backfill canonical vendor/model into asset rows that lack them
  const audit = {
    assets_total: 0,
    assets_with_vendor: 0,
    assets_with_model: 0,
    assets_matched: 0,
    vendor_unknown: new Set(),                 // raw vendor strings we couldn't canonicalize
    vendors_recognized: new Set(),             // canonical vendors we did recognize on assets
    vendors_recognized_no_match: new Set(),    // recognized but found 0 advisories — feed-coverage gap
    advisories_loaded: advisories.length,
    advisories_matched: new Set(),
    kev_hits: 0,
  };

  for (const asset of plantData.assets || []) {
    audit.assets_total += 1;
    const canonical = canonicalizeAssetVendor(asset);
    if (!canonical) {
      if (asset.vendor) audit.vendor_unknown.add(asset.vendor);
      continue;
    }
    audit.assets_with_vendor += 1;
    audit.vendors_recognized.add(canonical.vendor_canonical);
    if (asset.model) audit.assets_with_model += 1;

    // Backfill canonical vendor/model into the asset row when they are empty.
    // Operator can override on the onboarding form, but downstream UI now has
    // something to display instead of a blank cell.
    if (!asset.vendor || !asset.model) {
      assetPatches.push({
        asset_id: asset.asset_id,
        vendor: asset.vendor || canonical.vendor_canonical,
        model: asset.model || canonical.product_canonical || "",
      });
    }

    const candidates = advByVendor.get(canonical.vendor_canonical) || [];
    let matchedThisAsset = false;
    for (const adv of candidates) {
      const m = scoreMatch(asset, canonical, adv);
      // Hard floor: require model evidence. A pure vendor match (no product
      // family hit, no model-token overlap, no firmware-range hit) is too
      // noisy to act on — it would tell a Schneider customer they have all
      // 291 Schneider advisories. Emit only when there's an asset-specific
      // signal: product family match, ≥2 model tokens overlap, or firmware
      // in the advisory's affected range.
      if (!m.product_family_hit && !m.firmware_in_range && m.model_token_overlap < 2) continue;
      const score = m.score;

      const cveList = Array.isArray(adv.cves) ? adv.cves : [];
      const kevListed = cveList.some((c) => kevSet.has(c));

      const severity = computeSeverity(adv, kevListed);
      const exploitGating = inferExploitGating(adv);
      const cvssBase = Number(adv.cvss_max || 0) || 0;

      if (kevListed) audit.kev_hits += 1;

      const evidenceObj = {
        advisory_id: adv.advisory_id,
        advisory_url: adv.cisa_url,
        cve_ids: cveList,
        matched_vendor_canonical: canonical.vendor_canonical,
        matched_product_family: canonical.product_canonical || null,
        asset_vendor_raw: asset.vendor || "",
        asset_model_raw: asset.model || "",
        kev_listed: kevListed,
        exploit_gating: exploitGating,
        cvss_base: cvssBase,
        match_score: score,
        rationale: buildRationale(asset, canonical, adv, kevListed),
        source_feed: "cisa-ics-cert",
      };

      const evidenceStr = `${adv.advisory_id} · ${asset.vendor || canonical.vendor_canonical} ${asset.model || canonical.product_canonical || ""} · ${kevListed ? "[KEV] " : ""}CVSS ${cvssBase} · ${exploitGating} · ${cveList.slice(0, 2).join(", ")}${cveList.length > 2 ? "…" : ""}`;

      findings.push(makeFinding({
        finding_type: "supply_chain",
        evidence: evidenceStr.slice(0, 300),
        severity,
        confidence: matchConfidence(score, canonical),
        key: `${asset.asset_id}|${adv.advisory_id}|${cveList[0] || ""}`,
        asset_id: asset.asset_id,
        source_tool: "cisa-advisories",
        detected_at: now.toISOString(),
      }));

      // Stash structured evidence on the finding for downstream UI/report
      // consumers — not part of the validated schema, but tolerated.
      const tail = findings[findings.length - 1];
      tail.evidence_obj = evidenceObj;

      audit.advisories_matched.add(adv.advisory_id);
      matchedThisAsset = true;
    }
    if (matchedThisAsset) audit.assets_matched += 1;
  }

  // Sort: KEV first, then severity desc, then CVSS desc
  findings.sort((a, b) => {
    const ak = a.evidence_obj?.kev_listed ? 1 : 0;
    const bk = b.evidence_obj?.kev_listed ? 1 : 0;
    if (ak !== bk) return bk - ak;
    const sev = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    if (sev[b.severity] !== sev[a.severity]) return sev[b.severity] - sev[a.severity];
    return (b.evidence_obj?.cvss_base || 0) - (a.evidence_obj?.cvss_base || 0);
  });

  // Compute the set of canonical vendors we recognized on assets that
  // produced ZERO matched advisories. This is a feed-coverage signal —
  // commonly Trellix, AspenTech, AVEVA, etc. that aren't in CISA ICS-CERT.
  const vendorsThatMatched = new Set();
  for (const f of findings) {
    if (f.evidence_obj?.matched_vendor_canonical) {
      vendorsThatMatched.add(f.evidence_obj.matched_vendor_canonical);
    }
  }
  for (const v of audit.vendors_recognized) {
    if (!vendorsThatMatched.has(v)) audit.vendors_recognized_no_match.add(v);
  }

  return {
    findings,
    asset_patches: assetPatches,
    summary: {
      assets_total: audit.assets_total,
      assets_with_vendor: audit.assets_with_vendor,
      assets_with_model: audit.assets_with_model,
      assets_matched: audit.assets_matched,
      vendor_unknown: [...audit.vendor_unknown],
      vendors_recognized: [...audit.vendors_recognized],
      vendors_recognized_no_match: [...audit.vendors_recognized_no_match],
      advisories_loaded: audit.advisories_loaded,
      advisories_matched: audit.advisories_matched.size,
      kev_hits: audit.kev_hits,
      coverage_vendor: audit.assets_total ? audit.assets_with_vendor / audit.assets_total : 0,
    },
  };
}

// ── helpers ────────────────────────────────────────────────────────────

async function loadKevSet(kevPath) {
  try {
    const raw = await readFile(kevPath, "utf8");
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.vulnerabilities) ? parsed.vulnerabilities : (Array.isArray(parsed) ? parsed : []);
    return new Set(list.map((e) => e.cveID || e.cve || e.id).filter(Boolean));
  } catch { return new Set(); }
}

function canonicalizeAssetVendor(asset) {
  // Prefer asset.vendor + asset.model; fall back to asset.name (topology-extracted assets sometimes have vendor in the name).
  const ownText = [asset.vendor, asset.model, asset.name, asset.process_tag].filter(Boolean).join(" ");
  return recognizeVendor(ownText);
}

// Build advisory index keyed by canonical vendor name. A single feed-side
// vendor name (e.g. "Schneider Electric") expands to multiple canonical
// buckets (Schneider Electric, Foxboro, Triconex) — we push the advisory
// into each so assets in any of those buckets surface the same advisory.
function indexAdvisoriesByCanonicalVendor(advisories, aliasIndex) {
  const idx = new Map();
  for (const adv of advisories) {
    const seenForAdv = new Set();
    for (const p of adv.affected_products || []) {
      const raw = String(p.vendor || "").trim();
      if (!raw) continue;
      const canonicals = aliasIndex.get(raw.toLowerCase()) || new Set([raw]);
      for (const canonical of canonicals) {
        if (seenForAdv.has(canonical)) continue;
        seenForAdv.add(canonical);
        const arr = idx.get(canonical) || [];
        arr.push(adv);
        idx.set(canonical, arr);
      }
    }
  }
  return idx;
}

function scoreMatch(asset, canonical, advisory) {
  let score = 5; // vendor matched (we got here via the vendor index)
  let product_family_hit = false;
  let firmware_in_range = false;
  let model_token_overlap = 0;

  const products = advisory.affected_products || [];
  const assetModelTokens = tokenize(asset.model || canonical.product_canonical || "");
  const assetFw = String(asset.firmware_version || "").trim();

  for (const p of products) {
    const productName = String(p.product || "");
    const productTokens = tokenize(productName);

    if (canonical.product_canonical && productName.toLowerCase().includes(canonical.product_canonical.toLowerCase())) {
      score += 5;
      product_family_hit = true;
    }
    const overlap = assetModelTokens.filter((t) => productTokens.includes(t)).length;
    if (overlap > model_token_overlap) model_token_overlap = overlap;
    if (overlap >= 2) score += 3;
    else if (overlap === 1) score += 1;

    if (assetFw && firmwareInRange(assetFw, p.version)) {
      score += 4;
      firmware_in_range = true;
    }
  }

  return { score, product_family_hit, firmware_in_range, model_token_overlap };
}

function firmwareInRange(fw, range) {
  if (!fw || !range || typeof range !== "string") return false;
  const r = range.toLowerCase().trim();
  if (r === "vers:all/*") return true;
  // Very loose: handle "<1.4.0", "<=2.0", ">=3.0,<4.0"
  const lt = r.match(/<\s*([0-9][0-9a-z.\-]*)/);
  if (lt && cmpVersion(fw, lt[1]) < 0) return true;
  const lte = r.match(/<=\s*([0-9][0-9a-z.\-]*)/);
  if (lte && cmpVersion(fw, lte[1]) <= 0) return true;
  // Don't claim a match we can't prove.
  return false;
}

function cmpVersion(a, b) {
  const ax = String(a).split(/[.\-]/).map((n) => parseInt(n, 10) || 0);
  const bx = String(b).split(/[.\-]/).map((n) => parseInt(n, 10) || 0);
  const len = Math.max(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const av = ax[i] || 0, bv = bx[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function computeSeverity(advisory, kevListed) {
  if (kevListed) return "critical";
  const cvss = Number(advisory.cvss_max) || 0;
  if (cvss >= 9.0) return "critical";
  if (cvss >= 7.0) return "high";
  if (cvss >= 4.0) return "medium";
  if (cvss > 0)    return "low";
  // No CVSS — fall back to advisory's own severity tag if present
  const tag = String(advisory.cvss_severity || "").toLowerCase();
  if (["critical", "high", "medium", "low", "info"].includes(tag)) return tag;
  return "medium";
}

function inferExploitGating(adv) {
  const text = `${adv.summary || ""} ${adv.title || ""}`.toLowerCase();
  if (/unauthenticated\s+remote/.test(text)) return "confirmed-remote-unauth";
  if (/authenticated\s+remote/.test(text))   return "confirmed-remote-auth";
  if (/adjacent\s+network/.test(text))       return "requires-adjacent";
  if (/physical\s+access/.test(text))        return "requires-physical";
  if (/default\s+credential/.test(text))     return "requires-default-creds";
  if (/remote\s+attacker|remotely/.test(text)) return "confirmed-remote-auth"; // safer default than unauth
  return "unspecified";
}

function buildRationale(asset, canonical, adv, kev) {
  const fwClause = asset.firmware_version
    ? `firmware ${asset.firmware_version} `
    : "firmware unspecified — assume affected until captured during onsite review; ";
  const kevClause = kev ? "Listed in CISA KEV — patch this quarter or compensate. " : "";
  return `${kevClause}${asset.vendor || canonical.vendor_canonical} ${asset.model || canonical.product_canonical || ""} ${fwClause}matches ${adv.advisory_id}.`.trim();
}

function matchConfidence(score, canonical) {
  if (score >= 12) return 0.9;
  if (score >= 8)  return 0.75;
  if (canonical.product_canonical) return 0.7;
  return 0.55;
}
