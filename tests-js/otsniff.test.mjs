import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanSecrets } from "../scripts/otsniff/scanners/secrets.mjs";
import { scanSupplyChain } from "../scripts/otsniff/scanners/supply-chain.mjs";
import { scanExposure } from "../scripts/otsniff/scanners/exposure.mjs";
import { scanMeshGap } from "../scripts/otsniff/scanners/mesh-gap.mjs";
import { mergeFindings } from "../scripts/otsniff/merge.mjs";
import { validateFinding, findingToVulnerability } from "../scripts/otsniff/schema.mjs";

test("schema: validates a well-formed finding", () => {
  const f = {
    finding_id: "f_abc",
    asset_id: "a_eng_01",
    finding_type: "secret_leak",
    severity: "high",
    evidence: "leaked AKIA***",
    source_tool: "noseyparker",
    detected_at: new Date().toISOString(),
    confidence: 0.7,
  };
  assert.deepEqual(validateFinding(f), []);
});

test("schema: rejects invalid severity + type", () => {
  const errors = validateFinding({
    finding_id: "f1", asset_id: "a", finding_type: "bogus", severity: "meh",
    evidence: "", source_tool: "noseyparker", detected_at: "x", confidence: 0.5,
  });
  assert.ok(errors.length >= 2);
});

test("schema: projects finding into vulnerability shape", () => {
  const v = findingToVulnerability({
    finding_id: "f_1", asset_id: "a_eng_01", finding_type: "secret_leak",
    severity: "high", evidence: "AKIA***", source_tool: "noseyparker",
    detected_at: "2026-04-19T00:00:00Z", confidence: 0.8,
  });
  assert.equal(v.vuln_id, "f_1");
  assert.equal(v.asset_id, "a_eng_01");
  assert.equal(v.severity, "high");
  assert.ok(v.cve.startsWith("SECRET-"));
});

test("scanSecrets: builtin fallback detects AKIA + PLC default creds", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "otsniff-"));
  try {
    await writeFile(path.join(dir, "cfg.txt"),
      "aws=AKIAABCDEFGHIJKLMNOP\nplc login admin:plc\n");
    const findings = await scanSecrets({ target: dir, assetHint: "a_eng_01", forceBuiltin: true });
    assert.ok(findings.length >= 2, `expected >=2 findings, got ${findings.length}`);
    for (const f of findings) assert.deepEqual(validateFinding(f), []);
    assert.ok(findings.every((f) => f.finding_type === "secret_leak"));
    assert.ok(findings.every((f) => f.source_tool === "manual"), "builtin findings must be tagged manual");
    assert.ok(findings.every((f) => !/AKIAABCDEFGHIJKLMNOP/.test(f.evidence)), "raw secret leaked");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scanSecrets: redacts full api_key value, not just middle", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "otsniff-"));
  try {
    const secret = "sk_live_abcdefghijklmnop1234567890abcd";
    await writeFile(path.join(dir, "cfg.txt"), `api_key="${secret}"\n`);
    const findings = await scanSecrets({ target: dir, assetHint: "a", forceBuiltin: true });
    for (const f of findings) {
      assert.ok(!f.evidence.includes(secret), `raw api_key leaked: ${f.evidence}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("merge: enriches plant fixture and rejects unknown assets", () => {
  const plant = {
    plant_id: "p", assets: [{ asset_id: "a_eng_01" }], vulnerabilities: [],
  };
  const findings = [
    { finding_id: "f_1", asset_id: "a_eng_01", finding_type: "secret_leak",
      severity: "high", evidence: "x", source_tool: "noseyparker",
      detected_at: "2026-04-19T00:00:00Z", confidence: 0.8 },
    { finding_id: "f_2", asset_id: "a_ghost", finding_type: "secret_leak",
      severity: "high", evidence: "x", source_tool: "noseyparker",
      detected_at: "2026-04-19T00:00:00Z", confidence: 0.8 },
  ];
  const enriched = mergeFindings(plant, findings);
  assert.equal(enriched.vulnerabilities.length, 1);
  assert.equal(enriched.evidence_findings.length, 1);
  assert.equal(enriched.evidence_meta.accepted_count, 1);
  assert.equal(enriched.evidence_meta.rejected_count, 1);
});

test("scanSupplyChain: detects pwn_request, script_injection, self_hosted, secret_echo", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "sc-"));
  try {
    await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(dir, ".github", "workflows", "bad.yml"), `
name: bad
on: pull_request_target
jobs:
  run:
    runs-on: [self-hosted, linux]
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - run: echo "\${{ github.event.issue.title }}"
      - run: echo \${{ secrets.NPM_TOKEN }} | npm publish
      - uses: some/third-party@main
permissions: write-all
`);
    const findings = await scanSupplyChain({ target: dir, assetHint: "a_eng_01", forceBuiltin: true });
    for (const f of findings) assert.deepEqual(validateFinding(f), []);
    assert.ok(findings.every(f => f.finding_type === "supply_chain"));
    assert.ok(findings.every(f => f.source_tool === "manual"));
    const evidences = findings.map(f => f.evidence).join("\n");
    for (const needle of ["pull_request_target", "untrusted github event", "self-hosted", "secret piped", "write-all", "commit SHA"]) {
      assert.ok(evidences.includes(needle), `missing pattern match for: ${needle}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scanSupplyChain: clean workflow produces zero findings", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "sc-"));
  try {
    await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(dir, ".github", "workflows", "ok.yml"), `
name: ok
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
      - run: npm ci && npm test
`);
    const findings = await scanSupplyChain({ target: dir, assetHint: "a", forceBuiltin: true });
    assert.equal(findings.length, 0, `expected 0 findings, got: ${JSON.stringify(findings.map(f=>f.evidence))}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scanSupplyChain: rejects when no target and no repo", async () => {
  await assert.rejects(scanSupplyChain({}), /required/);
});

test("scanExposure: detects HTTP on HMI, cross-level control protocol, field RTU DNP3, eng-WS bi-PLC", async () => {
  const plant = {
    plant_id: "test",
    zones: [
      { zone_id: "z_ops",   name: "Ops",       level: "L3" },
      { zone_id: "z_treat", name: "Treatment", level: "L2" },
      { zone_id: "z_proc",  name: "Process",   level: "L1" },
      { zone_id: "z_field", name: "Field Distribution", level: "L1" },
    ],
    assets: [
      { asset_id: "a_scada", name: "SCADA", asset_type: "scada-server",          vendor: "AVEVA",    model: "SP",     zone_id: "z_ops" },
      { asset_id: "a_hmi",   name: "HMI",   asset_type: "hmi",                   vendor: "Rockwell", model: "FT",     zone_id: "z_treat" },
      { asset_id: "a_eng",   name: "EngWS", asset_type: "engineering-workstation", vendor: "Rockwell", model: "Studio", zone_id: "z_treat" },
      { asset_id: "a_plc",   name: "PLC",   asset_type: "plc",                   vendor: "AB",       model: "CL",     zone_id: "z_proc" },
      { asset_id: "a_rtu",   name: "RTU",   asset_type: "rtu",                   vendor: "Schneider",model: "SP350",  zone_id: "z_field" },
    ],
    connectivity: [
      { source_asset_id: "a_scada", target_asset_id: "a_hmi", protocol: "http",        port: 80,    allowed_direction: "uni" },
      { source_asset_id: "a_scada", target_asset_id: "a_rtu", protocol: "dnp3",        port: 20000, allowed_direction: "bi"  },
      { source_asset_id: "a_eng",   target_asset_id: "a_plc", protocol: "ethernet-ip", port: 44818, allowed_direction: "bi"  },
    ],
  };
  const findings = await scanExposure({ plant });
  for (const f of findings) assert.deepEqual(validateFinding(f), [], `bad finding: ${JSON.stringify(f)}`);
  assert.ok(findings.every((f) => f.finding_type === "exposure"));
  assert.ok(findings.every((f) => f.source_tool === "manual"));
  const ev = findings.map((f) => f.evidence).join("\n");
  assert.ok(/HTTP\/80/.test(ev),                "expected HTTP web exposure finding");
  assert.ok(/DNP3.*Purdue/.test(ev),            "expected cross-level DNP3 finding");
  assert.ok(/Field RTU/.test(ev),               "expected field RTU exposure finding");
  assert.ok(/Engineering workstation/.test(ev), "expected eng-WS bi-directional finding");
});

test("scanExposure: clean fixture produces zero findings", async () => {
  const plant = {
    plant_id: "test-clean",
    zones: [
      { zone_id: "z_ops",   name: "Ops",       level: "L3" },
      { zone_id: "z_treat", name: "Treatment", level: "L2" },
      { zone_id: "z_proc",  name: "Process",   level: "L1" },
    ],
    assets: [
      { asset_id: "a_hmi", name: "HMI", asset_type: "hmi", vendor: "X", model: "Y", zone_id: "z_treat" },
      { asset_id: "a_plc", name: "PLC", asset_type: "plc", vendor: "X", model: "Y", zone_id: "z_proc" },
    ],
    connectivity: [
      { source_asset_id: "a_hmi", target_asset_id: "a_plc", protocol: "ethernet-ip", port: 44818, allowed_direction: "uni" },
    ],
  };
  const findings = await scanExposure({ plant });
  assert.equal(findings.length, 0, `expected 0, got: ${JSON.stringify(findings.map((f) => f.evidence))}`);
});

test("scanExposure: rejects when no plant", async () => {
  await assert.rejects(scanExposure({}), /required/);
});

test("scanMeshGap: detects HMI->SIS, bi-directional SIS, cross-level high-crit PLC", async () => {
  const plant = {
    plant_id: "test",
    zones: [
      { zone_id: "z_ops",   name: "Ops",       level: "L3" },
      { zone_id: "z_treat", name: "Treatment", level: "L2" },
      { zone_id: "z_proc",  name: "Process",   level: "L1" },
    ],
    assets: [
      { asset_id: "a_scada", name: "SCADA", asset_type: "scada-server",     vendor: "X", model: "Y", zone_id: "z_ops" },
      { asset_id: "a_hmi",   name: "HMI",   asset_type: "hmi",              vendor: "X", model: "Y", zone_id: "z_treat" },
      { asset_id: "a_plc",   name: "PLC",   asset_type: "plc",              vendor: "X", model: "Y", zone_id: "z_proc", criticality_score: 10 },
      { asset_id: "a_sis",   name: "SIS",   asset_type: "safety-controller",vendor: "X", model: "Y", zone_id: "z_proc" },
    ],
    connectivity: [
      { source_asset_id: "a_hmi",   target_asset_id: "a_sis", protocol: "ethernet-ip", port: 44818, allowed_direction: "uni" },
      { source_asset_id: "a_plc",   target_asset_id: "a_sis", protocol: "ethernet-ip", port: 44818, allowed_direction: "bi"  },
      { source_asset_id: "a_scada", target_asset_id: "a_plc", protocol: "ethernet-ip", port: 44818, allowed_direction: "bi"  },
    ],
  };
  const findings = await scanMeshGap({ plant });
  for (const f of findings) assert.deepEqual(validateFinding(f), [], `bad finding: ${JSON.stringify(f)}`);
  assert.ok(findings.every((f) => f.finding_type === "mesh_gap"));
  assert.ok(findings.every((f) => f.source_tool === "manual"));
  const ev = findings.map((f) => f.evidence).join("\n");
  assert.ok(/Safety controller .* reachable from .*hmi/i.test(ev), "expected HMI→SIS finding");
  assert.ok(/bi-directional/.test(ev),                              "expected bi-directional SIS finding");
  assert.ok(/High-criticality PLC/.test(ev),                        "expected high-crit PLC cross-level finding");
});

test("scanMeshGap: properly isolated plant produces zero findings", async () => {
  const plant = {
    plant_id: "test-clean",
    zones: [
      { zone_id: "z_proc", name: "Process", level: "L1" },
    ],
    assets: [
      { asset_id: "a_plc", name: "PLC", asset_type: "plc",               vendor: "X", model: "Y", zone_id: "z_proc", criticality_score: 8 },
      { asset_id: "a_sis", name: "SIS", asset_type: "safety-controller", vendor: "X", model: "Y", zone_id: "z_proc" },
    ],
    connectivity: [
      { source_asset_id: "a_plc", target_asset_id: "a_sis", protocol: "ethernet-ip", port: 44818, allowed_direction: "uni" },
    ],
  };
  const findings = await scanMeshGap({ plant });
  assert.equal(findings.length, 0, `expected 0, got: ${JSON.stringify(findings.map((f) => f.evidence))}`);
});

test("scanMeshGap: rejects when no plant", async () => {
  await assert.rejects(scanMeshGap({}), /required/);
});

test("merge: is idempotent on repeat runs (vulns + evidence)", () => {
  const plant = { plant_id: "p", assets: [{ asset_id: "a" }], vulnerabilities: [] };
  const findings = [{
    finding_id: "f_dup", asset_id: "a", finding_type: "secret_leak",
    severity: "low", evidence: "x", source_tool: "noseyparker",
    detected_at: "2026-04-19T00:00:00Z", confidence: 0.5,
  }];
  const fixedNow = () => "2026-04-19T00:00:00.000Z";
  const once = mergeFindings(plant, findings, { now: fixedNow });
  const twice = mergeFindings(once, findings, { now: fixedNow });
  assert.equal(twice.vulnerabilities.length, 1);
  assert.equal(twice.evidence_findings.length, 1);
  assert.deepEqual(twice, mergeFindings(once, findings, { now: fixedNow }));
});
