#!/usr/bin/env node
// pull-nvd.mjs — fetches NVD CVE detail records and enriches our local cache.
// Reads the unique CVE set from CISA ICS-CERT advisories (exact-tier matches
// against any plant in data/) and the KEV catalog, then queries NVD API 2.0.
//
// Rate limit: 5 req/30s without key, 50 req/30s with key (NVD_API_KEY env var).
// Usage:
//   docker compose -f compose.toolchain.yml run --rm node node scripts/feeds/pull-nvd.mjs
//   docker compose -f compose.toolchain.yml run --rm node node scripts/feeds/pull-nvd.mjs --include-kev
//   docker compose -f compose.toolchain.yml run -e NVD_API_KEY=xxx --rm node node scripts/feeds/pull-nvd.mjs --include-kev

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { canonicalizeVendor } from "./match.mjs";

const ROOT = process.cwd();
const FEED_DIR = path.join(ROOT, "data", "feeds");
const OUT_PATH = path.join(FEED_DIR, "nvd-cves.json");

const NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const UA = "Mozilla/5.0 (compatible; OTSniffer-feeds/1.0; +https://malkansolutions.com)";
const API_KEY = process.env.NVD_API_KEY || null;
// Without key: 5 req / 30s → 1 req per 6.5s. With key: 50 req / 30s → 1 req per 0.7s.
const REQ_INTERVAL_MS = API_KEY ? 800 : 6500;

const args = new Set(process.argv.slice(2));
const includeKEV = args.has("--include-kev");

async function main() {
  await mkdir(FEED_DIR, { recursive: true });
  const cveIds = await collectCveIds();
  console.log(`→ enriching ${cveIds.length} CVEs from NVD${API_KEY ? " (with API key)" : " (no API key — slower)"}`);
  if (!API_KEY && cveIds.length > 60) {
    console.log(`  estimated runtime: ~${Math.ceil(cveIds.length * REQ_INTERVAL_MS / 60000)} min`);
  }

  const cache = await loadCache();
  const stale = cveIds.filter(id => !cache[id] || isStale(cache[id]));
  console.log(`  ${stale.length} new or stale, ${cveIds.length - stale.length} cached`);

  let pulled = 0, failed = 0;
  for (const cveId of stale) {
    try {
      const rec = await fetchCVE(cveId);
      if (rec) cache[cveId] = rec;
      pulled++;
      if (pulled % 10 === 0 || pulled === stale.length) {
        console.log(`    pulled ${pulled}/${stale.length}`);
        // Save progress incrementally
        await writeFile(OUT_PATH, JSON.stringify({ pulled_at: new Date().toISOString(), cves: cache }, null, 2));
      }
    } catch (err) {
      failed++;
      if (failed <= 3) console.warn(`    ${cveId}: ${err.message}`);
    }
    await sleep(REQ_INTERVAL_MS);
  }

  await writeFile(OUT_PATH, JSON.stringify({ pulled_at: new Date().toISOString(), cves: cache }, null, 2));
  console.log(`✓ NVD enrichment: ${pulled} pulled, ${failed} failed, ${Object.keys(cache).length} total cached`);
}

async function collectCveIds() {
  const ids = new Set();

  // From CISA ICS-CERT advisories — pull CVEs from exact-tier matches per plant
  const advPath = path.join(FEED_DIR, "cisa-ics-advisories.json");
  if (existsSync(advPath)) {
    const adv = JSON.parse(await readFile(advPath, "utf8"));
    // Plant fixtures we know about (must match the registry in dev-server.mjs)
    const plantFiles = ["data/plant-enriched.json", "data/plant-water-enriched.json"];
    const knownVendors = new Set();
    for (const pf of plantFiles) {
      const full = path.join(ROOT, pf);
      if (!existsSync(full)) continue;
      const plant = JSON.parse(await readFile(full, "utf8"));
      for (const a of plant.assets || []) {
        const cv = canonicalizeVendor(a.vendor);
        if (cv) knownVendors.add(cv);
      }
    }
    // Collect CVEs from advisories whose vendor is in the BOM (exact-or-vendor tier)
    for (const a of adv.advisories || []) {
      const advVendors = new Set((a.affected_products || []).map(p => canonicalizeVendor(p.vendor)));
      const overlap = [...advVendors].some(v => knownVendors.has(v));
      if (!overlap) continue;
      for (const cve of a.cves || []) ids.add(cve);
    }
  }

  // From KEV — only if --include-kev passed (1583 entries, slow without API key)
  if (includeKEV) {
    const kevPath = path.join(FEED_DIR, "cisa-kev.json");
    if (existsSync(kevPath)) {
      const kev = JSON.parse(await readFile(kevPath, "utf8"));
      for (const v of kev.vulnerabilities || []) ids.add(v.cveID);
    }
  }

  return [...ids].filter(id => /^CVE-\d{4}-\d+$/.test(id));
}

async function loadCache() {
  if (!existsSync(OUT_PATH)) return {};
  try {
    const raw = JSON.parse(await readFile(OUT_PATH, "utf8"));
    return raw.cves || {};
  } catch { return {}; }
}

function isStale(rec, days = 30) {
  if (!rec.fetched_at) return true;
  const age = (Date.now() - new Date(rec.fetched_at).getTime()) / (1000 * 60 * 60 * 24);
  return age > days;
}

async function fetchCVE(cveId) {
  const url = `${NVD_API}?cveId=${encodeURIComponent(cveId)}`;
  const headers = { "user-agent": UA, "accept": "application/json" };
  if (API_KEY) headers.apiKey = API_KEY;
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const cve = json.vulnerabilities?.[0]?.cve;
  if (!cve) return null;

  const desc = cve.descriptions?.find(d => d.lang === "en")?.value || "";
  const metric = cve.metrics?.cvssMetricV31?.[0]?.cvssData
              || cve.metrics?.cvssMetricV30?.[0]?.cvssData
              || cve.metrics?.cvssMetricV2?.[0]?.cvssData
              || null;
  const cwes = (cve.weaknesses || [])
    .flatMap(w => (w.description || []).filter(d => d.lang === "en").map(d => d.value))
    .filter(c => /^CWE-\d+$/.test(c));
  const refs = (cve.references || []).map(r => ({ url: r.url, tags: r.tags || [] }));

  return {
    cve_id: cveId,
    description: desc,
    cvss_version: metric?.version || null,
    cvss_score: metric?.baseScore || null,
    cvss_severity: metric?.baseSeverity?.toLowerCase() || null,
    cvss_vector: metric?.vectorString || null,
    cwes,
    references: refs.slice(0, 8),
    published: cve.published,
    last_modified: cve.lastModified,
    fetched_at: new Date().toISOString(),
  };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

main().catch(err => { console.error(err.stack || err); process.exit(1); });
