#!/usr/bin/env node
// pull-cisa.mjs — pulls CISA Known Exploited Vulnerabilities + ICS-CERT
// advisories (CSAF JSON from cisagov/CSAF GitHub repo), normalizes, writes to
// data/feeds/. Run via Docker:
//   docker compose -f compose.toolchain.yml run --rm node node scripts/feeds/pull-cisa.mjs

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_DIR = path.join(ROOT, "data", "feeds");

const UA = "Mozilla/5.0 (compatible; OTSniffer-feeds/1.0; +https://malkansolutions.com)";

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

// Pull current and previous year. Older advisories rarely apply to live OT plants.
const ICS_YEARS = [String(new Date().getFullYear() - 1), String(new Date().getFullYear())];
const ICS_MAX_PER_YEAR = 200;

async function main() {
  await mkdir(FEED_DIR, { recursive: true });

  console.log("→ pulling CISA Known Exploited Vulnerabilities");
  const kev = await pullKEV();
  await writeFile(path.join(FEED_DIR, "cisa-kev.json"), JSON.stringify(kev, null, 2));
  console.log(`  wrote ${kev.vulnerabilities.length} KEV entries`);

  console.log("→ pulling CISA ICS-CERT advisories from cisagov/CSAF");
  const advisories = await pullICSAdvisories();
  await writeFile(path.join(FEED_DIR, "cisa-ics-advisories.json"), JSON.stringify({ advisories }, null, 2));
  console.log(`  wrote ${advisories.length} normalized ICS advisories`);

  const meta = {
    pulled_at: new Date().toISOString(),
    sources: {
      kev: { url: KEV_URL, count: kev.vulnerabilities.length, catalog_version: kev.catalogVersion, date_released: kev.dateReleased },
      ics_advisories: {
        repo: "https://github.com/cisagov/CSAF",
        years_pulled: ICS_YEARS,
        count: advisories.length,
      },
    },
  };
  await writeFile(path.join(FEED_DIR, "_meta.json"), JSON.stringify(meta, null, 2));
  console.log(`✓ feeds refreshed at ${meta.pulled_at}`);
}

async function pullKEV() {
  const res = await fetch(KEV_URL, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`KEV fetch failed: HTTP ${res.status}`);
  return res.json();
}

async function pullICSAdvisories() {
  const records = [];
  for (const year of ICS_YEARS) {
    const listUrl = `https://api.github.com/repos/cisagov/CSAF/contents/csaf_files/OT/white/${year}`;
    const res = await fetch(listUrl, { headers: { "user-agent": UA, "accept": "application/vnd.github+json" } });
    if (!res.ok) {
      console.warn(`  ${year}: directory listing failed (HTTP ${res.status}); skipping`);
      continue;
    }
    const items = await res.json();
    const jsonFiles = items.filter(i => i.type === "file" && i.name.endsWith(".json"));
    console.log(`  ${year}: ${jsonFiles.length} CSAF files (capping at ${ICS_MAX_PER_YEAR})`);

    const slice = jsonFiles.slice(-ICS_MAX_PER_YEAR);  // newest first
    let pulled = 0, failed = 0;
    for (const f of slice) {
      try {
        const adv = await pullCSAF(f.download_url);
        if (adv) records.push(adv);
        pulled++;
        if (pulled % 25 === 0) console.log(`    ${year}: pulled ${pulled}/${slice.length}`);
      } catch (err) {
        failed++;
      }
      // Light rate-limit so we don't get throttled by GitHub
      await sleep(40);
    }
    console.log(`  ${year}: ${pulled} pulled, ${failed} failed`);
  }
  // Sort newest first
  records.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return records;
}

async function pullCSAF(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) return null;
  const csaf = await res.json();
  return normalizeCSAF(csaf);
}

// Normalize a CSAF 2.0 advisory to a flat, matchable record.
function normalizeCSAF(csaf) {
  const doc = csaf.document || {};
  const id = doc.tracking?.id || "";
  const date = doc.tracking?.initial_release_date || doc.tracking?.current_release_date || "";
  const title = doc.title || "";

  // Notes: extract summary, risk evaluation, sectors
  const notes = doc.notes || [];
  const noteText = (cat, titleMatch) => {
    const n = notes.find(n => n.category === cat && (!titleMatch || (n.title || "").toLowerCase().includes(titleMatch)));
    return n ? n.text : "";
  };
  const summary = noteText("summary", "risk") || noteText("summary");
  const sectorsText = noteText("other", "critical infrastructure sector") || noteText("other", "sector");
  const sectors = sectorsText ? sectorsText.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

  // Vulnerabilities: collect CVEs and worst CVSS
  const vulns = csaf.vulnerabilities || [];
  const cves = [...new Set(vulns.map(v => v.cve).filter(Boolean))];
  let cvss_max = 0;
  let cvss_severity = "info";
  for (const v of vulns) {
    for (const s of v.scores || []) {
      const score = s.cvss_v3?.baseScore || s.cvss_v31?.baseScore || s.cvss_v40?.baseScore || 0;
      const sev = s.cvss_v3?.baseSeverity || s.cvss_v31?.baseSeverity || s.cvss_v40?.baseSeverity || "";
      if (score > cvss_max) {
        cvss_max = score;
        cvss_severity = mapCvssSeverity(sev || score);
      }
    }
  }

  // Product tree: walk to extract vendor/product/version triples
  const affectedProducts = [];
  const tree = csaf.product_tree?.branches || [];
  for (const vendorBranch of tree) {
    if (vendorBranch.category !== "vendor") continue;
    const vendor = (vendorBranch.name || "").trim();
    walkProducts(vendorBranch.branches || [], vendor, "", affectedProducts);
  }

  // Public URL for the advisory at CISA's site
  const cisaUrl = `https://www.cisa.gov/news-events/ics-advisories/${id.toLowerCase()}`;

  return {
    advisory_id: id,
    title,
    date: date.slice(0, 10),
    summary: summary.slice(0, 800),
    sectors,
    cves,
    cvss_max,
    cvss_severity,
    affected_products: affectedProducts,
    cisa_url: cisaUrl,
  };
}

function walkProducts(branches, vendor, productPrefix, out) {
  for (const b of branches) {
    if (b.category === "product_name" || b.category === "product_family") {
      const productName = (productPrefix ? productPrefix + " " : "") + (b.name || "");
      if (b.branches) {
        walkProducts(b.branches, vendor, productName, out);
      } else if (b.product) {
        out.push({ vendor, product: productName.trim(), version: "", product_id: b.product.product_id || "" });
      }
    } else if (b.category === "product_version" || b.category === "product_version_range") {
      out.push({
        vendor,
        product: productPrefix.trim(),
        version: (b.name || "").trim(),
        product_id: b.product?.product_id || "",
      });
    } else if (b.branches) {
      walkProducts(b.branches, vendor, productPrefix, out);
    }
  }
}

function mapCvssSeverity(input) {
  if (typeof input === "number") {
    if (input >= 9) return "critical";
    if (input >= 7) return "high";
    if (input >= 4) return "medium";
    return "low";
  }
  const s = String(input).toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  if (s === "low") return "low";
  if (s === "none") return "info";
  return "info";
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

main().catch(err => { console.error(err.stack || err); process.exit(1); });
