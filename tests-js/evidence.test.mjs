import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function withFixture(plant, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "ev-"));
  const file = path.join(dir, "plant.json");
  await writeFile(file, JSON.stringify(plant));
  const prev = process.env.OTSNIFF_PLANT_FILE;
  process.env.OTSNIFF_PLANT_FILE = file;
  delete require.cache[require.resolve("../netlify/functions/evidence.js")];
  delete require.cache[require.resolve("../netlify/functions/_shared/data.js")];
  try {
    const { handler } = require("../netlify/functions/evidence.js");
    await fn(handler);
  } finally {
    if (prev == null) delete process.env.OTSNIFF_PLANT_FILE;
    else process.env.OTSNIFF_PLANT_FILE = prev;
    await rm(dir, { recursive: true, force: true });
  }
}

const basePlant = {
  assets: [{ asset_id: "a1", name: "HMI" }, { asset_id: "a2", name: "PLC" }],
  zones: [], connectivity: [], vulnerabilities: [],
  process_functions: [], demo_scenarios: [],
  evidence_findings: [
    { finding_id: "f1", asset_id: "a1", finding_type: "secret_leak",
      severity: "low", evidence: "x", source_tool: "manual",
      detected_at: "2026-04-19T00:00:00Z", confidence: 0.3 },
    { finding_id: "f2", asset_id: "a1", finding_type: "secret_leak",
      severity: "critical", evidence: "y", source_tool: "noseyparker",
      detected_at: "2026-04-19T00:00:00Z", confidence: 0.9 },
    { finding_id: "f3", asset_id: "a2", finding_type: "supply_chain",
      severity: "high", evidence: "z", source_tool: "gato-x",
      detected_at: "2026-04-19T00:00:00Z", confidence: 0.7 },
  ],
};

test("evidence: returns findings filtered by asset, sorted by severity", async () => {
  await withFixture(basePlant, async (handler) => {
    const res = await handler({ queryStringParameters: { assetId: "a1" } });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.asset_id, "a1");
    assert.equal(body.finding_count, 2);
    assert.equal(body.findings[0].finding_id, "f2", "critical must sort first");
    assert.equal(body.severity_counts.critical, 1);
    assert.equal(body.severity_counts.low, 1);
    assert.equal(body.tool_counts.noseyparker, 1);
    assert.equal(body.tool_counts.manual, 1);
  });
});

test("evidence: 400 without assetId, 404 for unknown", async () => {
  await withFixture(basePlant, async (handler) => {
    const bad = await handler({ queryStringParameters: {} });
    assert.equal(bad.statusCode, 400);
    const miss = await handler({ queryStringParameters: { assetId: "ghost" } });
    assert.equal(miss.statusCode, 404);
  });
});

test("evidence: returns empty findings for asset without evidence", async () => {
  const plant = { ...basePlant, evidence_findings: [] };
  await withFixture(plant, async (handler) => {
    const res = await handler({ queryStringParameters: { assetId: "a1" } });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.finding_count, 0);
    assert.deepEqual(body.findings, []);
  });
});
