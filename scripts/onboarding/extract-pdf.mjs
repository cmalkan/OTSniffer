#!/usr/bin/env node
// extract-pdf.mjs — server-side mirror of the browser-side PDF parser in
// web/js/onboarding.js. Useful for testing the parser against real customer
// documents without spinning up a browser. Same y-then-x grouping heuristic.
//
// Usage:
//   docker compose -f compose.toolchain.yml run --rm node sh -c \
//     "npm i --no-save --no-audit --no-fund --silent pdfjs-dist@4.0.379 && \
//      node scripts/onboarding/extract-pdf.mjs <path-to-pdf>"

import { readFile } from "node:fs/promises";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("usage: node extract-pdf.mjs <path-to-pdf>");
    process.exit(2);
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Worker file ships in legacy/build; tell pdfjs where to find it
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url
  ).pathname;

  const buf = await readFile(filePath);
  const data = new Uint8Array(buf);
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  console.log(`# ${filePath}`);
  console.log(`# pages: ${pdf.numPages}`);
  console.log();

  const allRows = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
    }));

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group items on the same y-coordinate (within 2.5pt) into one line
    let curY = null, line = [];
    const lines = [];
    for (const it of items) {
      if (curY === null || Math.abs(it.y - curY) > 2.5) {
        if (line.length) lines.push(line);
        line = [it]; curY = it.y;
      } else line.push(it);
    }
    if (line.length) lines.push(line);

    // Each line → split into columns by detecting x-gaps
    const pageRows = lines.map(items => {
      items.sort((a, b) => a.x - b.x);
      const cols = [];
      let cur = items[0]?.str || "";
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const it = items[i];
        const gap = it.x - (prev.x + prev.str.length * 5);
        if (gap > 14) { cols.push(cur.trim()); cur = it.str; }
        else cur += (cur && !cur.endsWith(" ") ? " " : "") + it.str;
      }
      cols.push(cur.trim());
      return cols.filter(c => c.length > 0);
    }).filter(r => r.length > 0);

    allRows.push({ page: p, rows: pageRows });
  }

  // Render output: per page, raw rows. Tables show up as runs of similarly-
  // shaped rows.
  for (const { page, rows } of allRows) {
    console.log(`\n=========================`);
    console.log(`page ${page} (${rows.length} lines)`);
    console.log(`=========================\n`);
    for (const r of rows) {
      console.log("|", r.join("  |  "));
    }
  }

  // Summary
  const totalRows = allRows.reduce((s, p) => s + p.rows.length, 0);
  const tableLikeRuns = countTableLikeRuns(allRows);
  console.error(`\n# extracted ${totalRows} text lines across ${pdf.numPages} pages`);
  console.error(`# table-like runs (consecutive lines with similar column counts): ${tableLikeRuns}`);
}

function countTableLikeRuns(allRows) {
  let runs = 0;
  for (const { rows } of allRows) {
    let curCols = -1, run = 0;
    for (const r of rows) {
      if (r.length >= 3 && r.length === curCols) { run++; if (run === 3) runs++; }
      else { curCols = r.length; run = 1; }
    }
  }
  return runs;
}

main().catch(err => { console.error(err.stack || err); process.exit(1); });
