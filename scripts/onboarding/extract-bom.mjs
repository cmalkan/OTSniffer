#!/usr/bin/env node
// extract-bom.mjs — smarter BOM extraction from real customer documents.
// Builds on extract-pdf.mjs by:
//   1. Detecting and removing repeating page headers/footers
//   2. Clustering text by column-x positions to identify real tables
//   3. Merging "continuation rows" (lines with few items following wider rows)
//   4. Recognizing OT-typical table headers and emitting BOM-shaped JSON
//
// Usage:
//   docker compose -f compose.toolchain.yml run --rm node sh -c \
//     "npm i --no-save --no-audit --no-fund --silent pdfjs-dist@4.0.379 && \
//      node scripts/onboarding/extract-bom.mjs <path-to-pdf>"
//
// Outputs: stderr = diagnostic stats, stdout = JSON { pages, tables, candidates }

import { readFile, writeFile } from "node:fs/promises";

// Silence pdfjs's chatty console.log/warn so stdout stays pure JSON
const _log = console.log, _warn = console.warn;
console.log = () => {}; console.warn = () => {};

const HEADER_ALIASES = {
  asset_id:          ["assetid", "tag", "tagname", "letterbug", "wsname", "wsno", "ws", "stationname", "hostname", "device", "deviceid", "node"],
  name:              ["name", "description", "purpose", "function", "designation"],
  asset_type:        ["type", "category", "class", "kind", "role", "deviceclass", "category"],
  vendor:            ["vendor", "manufacturer", "make", "mfr", "supplier", "oem", "brand"],
  model:             ["model", "modelno", "modelnumber", "partnumber", "partno", "product", "productname", "switchmodel", "firewallmodel", "servermodel"],
  firmware_version:  ["firmware", "firmwareversion", "version", "fw", "rev", "revision", "swrev"],
  ip_address:        ["ip", "ipaddress", "address", "ipaddr", "managementip"],
  zone_id:           ["zone", "zoneid", "subnet", "network", "vlan", "segment", "location", "level", "vlanname"],
  criticality_score: ["criticality", "crit", "priority", "importance", "criticalityscore"],
  process_tag:       ["process", "processtag", "service", "application"],
};

// Column-header tokens that, if present in a row, indicate the row is a real
// table header (not narrative text that happens to have aligned column-x).
const HEADER_TOKEN_HINTS = new Set([
  "assetid","tag","tagname","letterbug","wsname","name","device","model","modelno","modelnumber",
  "vendor","manufacturer","make","mfr","supplier","ip","ipaddress","zone","vlan","subnet","network",
  "type","function","description","firewall","switch","server","host","controller","level","location",
  "id","port","protocol","priority","level","criticality","sl",
]);

async function main() {
  const filePath = process.argv[2];
  const outPath = process.argv[3];
  if (!filePath) { console.error("usage: extract-bom.mjs <pdf> [out.json]"); process.exit(2); }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url
  ).pathname;

  const buf = await readFile(filePath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;

  // Step 1 — extract positioned text per page
  const allPages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    allPages.push(positionedToLines(items));
  }
  console.error(`# pages: ${allPages.length}`);

  // Step 2 — identify and strip repeating boilerplate
  const boilerplate = detectBoilerplate(allPages);
  console.error(`# boilerplate lines stripped: ${boilerplate.size}`);
  const cleanPages = allPages.map(lines => lines.filter(line => !boilerplate.has(normLine(line.text))));

  // Step 3 — find table regions by clustering on column-x positions
  const tables = [];
  for (let i = 0; i < cleanPages.length; i++) {
    for (const t of detectTables(cleanPages[i])) {
      tables.push({ page: i + 1, ...t });
    }
  }
  console.error(`# table-like regions detected: ${tables.length}`);

  // Step 4 — auto-map each table to BOM rows where headers match
  const candidates = [];
  for (const t of tables) {
    const mapped = autoMapTable(t);
    if (mapped.assets.length) {
      candidates.push({
        page: t.page,
        confidence: mapped.confidence,
        column_map: mapped.column_map,
        original_headers: t.headers,
        assets: mapped.assets,
      });
    }
  }
  console.error(`# candidate BOM rows: ${candidates.reduce((s, c) => s + c.assets.length, 0)} across ${candidates.length} tables`);

  const result = {
    file: filePath,
    pages: allPages.length,
    tables_detected: tables.length,
    boilerplate_lines: boilerplate.size,
    candidates,
  };
  if (outPath) {
    await writeFile(outPath, JSON.stringify(result, null, 2));
    _log(`wrote ${outPath}`);
  } else {
    _log(JSON.stringify(result, null, 2));
  }
}

// Convert positioned text items into y-grouped lines, each with x-positions
function positionedToLines(items) {
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  let curY = null, line = [];
  for (const it of items) {
    if (curY === null || Math.abs(it.y - curY) > 2.5) {
      if (line.length) lines.push(toLine(line));
      line = [it]; curY = it.y;
    } else line.push(it);
  }
  if (line.length) lines.push(toLine(line));
  return lines;
}

function toLine(items) {
  items.sort((a, b) => a.x - b.x);
  const cols = [];
  let cur = items[0]?.str || "";
  let curStartX = items[0]?.x || 0;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const it = items[i];
    const gap = it.x - (prev.x + prev.str.length * 5);
    if (gap > 14) {
      cols.push({ text: cur.trim(), x: curStartX });
      cur = it.str; curStartX = it.x;
    } else {
      cur += (cur && !cur.endsWith(" ") ? " " : "") + it.str;
    }
  }
  cols.push({ text: cur.trim(), x: curStartX });
  return {
    text: cols.map(c => c.text).join("  |  "),
    cols: cols.filter(c => c.text.length > 0),
    y: items[0].y,
  };
}

function normLine(text) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

// Detect lines that appear on >40% of pages — these are the boilerplate
// titles, footers, document headers we want to strip
function detectBoilerplate(allPages) {
  const counts = new Map();
  for (const lines of allPages) {
    const seen = new Set();
    for (const line of lines) {
      const k = normLine(line.text);
      if (k.length < 4 || k.length > 200) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.floor(allPages.length * 0.4));
  const boilerplate = new Set();
  for (const [k, c] of counts) if (c >= threshold) boilerplate.add(k);
  return boilerplate;
}

// Find table-like regions in a page's lines. A table is a run of >=3
// consecutive lines whose column-x positions form a recurring pattern
// (within ±10pt). The header is the first line of the run.
function detectTables(lines) {
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    // Skip lines with fewer than 3 columns — too short to start a table
    if (!lines[i].cols || lines[i].cols.length < 3) { i++; continue; }

    const xs = lines[i].cols.map(c => c.x);
    let j = i + 1;
    let runRows = [lines[i]];
    while (j < lines.length) {
      const candidate = lines[j];
      if (matchesColumnPattern(candidate.cols, xs)) {
        runRows.push(candidate);
        j++;
      } else if (looksLikeContinuation(candidate, runRows[runRows.length - 1])) {
        // Append the continuation text into the trailing column of the previous row
        const prev = runRows[runRows.length - 1];
        const lastCol = prev.cols[prev.cols.length - 1];
        if (lastCol) lastCol.text += " " + candidate.cols.map(c => c.text).join(" ");
        prev.text = prev.cols.map(c => c.text).join("  |  ");
        j++;
      } else break;
    }
    // Require the candidate header row to look like a real header — short
    // cells (<40 chars) AND at least two cells contain a known header token
    // as a substring. Drops false positives where narrative paragraphs
    // happen to align by column-x position.
    const headerLooksReal = (headerCols) => {
      const cells = headerCols.map(h => String(h || ""));
      const allShort = cells.every(c => c.length > 0 && c.length <= 40);
      if (!allShort) return false;
      const normed = cells.map(h => normalizeHeader(h));
      let hits = 0;
      for (const h of normed) {
        for (const hint of HEADER_TOKEN_HINTS) {
          if (h.includes(hint)) { hits++; break; }
        }
      }
      return hits >= 2;
    };
    if (runRows.length >= 3 && headerLooksReal(runRows[0].cols.map(c => c.text))) {
      const headerCols = runRows[0].cols.map(c => c.text);
      const dataRows = runRows.slice(1).map(r => {
        const filled = new Array(headerCols.length).fill("");
        for (const c of r.cols) {
          const idx = nearestColIndex(c.x, xs);
          if (filled[idx]) filled[idx] += " " + c.text;
          else filled[idx] = c.text;
        }
        return filled;
      });
      tables.push({ headers: headerCols, rows: dataRows, x_pattern: xs });
      i = j;
    } else i++;
  }
  return tables;
}

function matchesColumnPattern(cols, xs) {
  if (cols.length < Math.max(2, xs.length - 1)) return false;
  let matched = 0;
  for (const c of cols) {
    if (xs.some(x => Math.abs(x - c.x) <= 10)) matched++;
  }
  return matched >= Math.min(cols.length, xs.length) - 1;
}

function nearestColIndex(x, xs) {
  let best = 0, dist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(x - xs[i]);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}

function looksLikeContinuation(candidate, prev) {
  if (!candidate.cols || !prev) return false;
  // Continuation: very few columns, shifted right of the prev's leftmost column
  if (candidate.cols.length > 2) return false;
  return true;
}

// Auto-map a table to BOM rows. Returns assets[] + column_map + confidence.
function autoMapTable(table) {
  const headers = table.headers.map(h => normalizeHeader(h));
  const colMap = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      if (aliases.some(a => headers[i].includes(a))) {
        if (colMap[field] === undefined) { colMap[field] = i; break; }
      }
    }
  }
  if (Object.keys(colMap).length < 2) return { assets: [], column_map: {}, confidence: 0 };

  const assets = table.rows.map((row, r) => {
    const a = {
      asset_id: "", name: "", asset_type: "plc",
      vendor: "", model: "", firmware_version: "",
      ip_address: "", zone_id: "", criticality_score: 5, process_tag: "",
    };
    for (const [field, idx] of Object.entries(colMap)) {
      let v = String(row[idx] || "").replace(/\s+/g, " ").trim();
      if (field === "criticality_score") v = clampNum(v, 5, 1, 10);
      a[field] = v;
    }
    if (!a.asset_id) a.asset_id = `a_extracted_${r + 1}`;
    if (!a.name && a.vendor && a.model) a.name = `${a.vendor} ${a.model}`;
    return a;
  }).filter(a => a.vendor || a.model || a.asset_id !== `a_extracted_${1}`);

  return {
    assets,
    column_map: colMap,
    confidence: Math.min(1, Object.keys(colMap).length / 4),
  };
}

function normalizeHeader(h) {
  return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function clampNum(v, def, lo, hi) {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

main().catch(err => { console.error(err.stack || err); process.exit(1); });
