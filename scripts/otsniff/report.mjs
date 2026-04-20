// `otsniff report` — renders the T1 Exposure Snapshot PDF from an enriched plant
// fixture. HTML is produced by report/template.mjs; Chromium via Playwright handles
// pagination and PDF serialization.

import { readFile, writeFile } from "node:fs/promises";
import { renderReport } from "./report/template.mjs";

export async function buildReport({ plantPath, outPath, htmlOut, engagement }) {
  const plant = JSON.parse(await readFile(plantPath, "utf8"));
  const html = renderReport({ plant, engagement });

  if (htmlOut) await writeFile(htmlOut, html);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outPath,
      format: "Letter",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }
  return { outPath, pages: countPages(html) };
}

function countPages(html) {
  return (html.match(/<section class="page/g) || []).length;
}
