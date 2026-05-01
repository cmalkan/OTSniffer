// advisories.foxboro-specificity.test.mjs
//
// Credibility bedrock for the OT advisory matcher.
//
// In CISA ICS-CERT, Foxboro, Triconex, Modicon, and "core" Schneider Electric
// all surface under `vendor: "Schneider Electric"` in `affected_products[]`.
// Naïve vendor-string matching would pin every Schneider advisory to every
// asset whose vendor string starts with "Schneider" — which is exactly the
// failure mode that causes undue panic with plant managers (a Foxboro
// customer being told they have all 291 Schneider Electric advisories).
//
// This test locks in three guarantees:
//
//   1. A Foxboro FCP270 asset gets ONLY Foxboro-family advisories.
//   2. A Modicon M580 asset gets ONLY Modicon-family advisories.
//   3. A Triconex-only advisory matches NEITHER asset above.
//
// The matching logic that enforces this is the model-evidence floor at
// `scripts/otsniff/scanners/advisories.mjs:83`:
//   if (!m.product_family_hit && !m.firmware_in_range && m.model_token_overlap < 2) continue;
//
// If that floor is removed or weakened, this test must fail loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanAdvisories } from "../scripts/otsniff/scanners/advisories.mjs";

// Shared fixtures: 2 assets (Foxboro FCP270, Modicon M580) and 3 advisories
// (Foxboro-only, Modicon-only, Triconex-only). All three advisories declare
// `vendor: "Schneider Electric"` because that is how CISA actually publishes.
function buildFixtures() {
  const plant = {
    plant_id: "test-foxboro-specificity",
    plant_name: "Specificity Test Plant",
    sector: "energy",
    zones: [
      { zone_id: "z_dcs", name: "DCS Zone", level: "L2" },
      { zone_id: "z_proc", name: "Process Zone", level: "L1" },
    ],
    assets: [
      {
        asset_id: "a_foxboro_fcp270",
        name: "Foxboro FCP270 Controller",
        asset_type: "plc",
        vendor: "Foxboro",
        model: "FCP270",
        firmware_version: "",
        zone_id: "z_dcs",
        criticality_score: 9,
      },
      {
        asset_id: "a_modicon_m580",
        name: "Modicon M580 PLC",
        asset_type: "plc",
        vendor: "Schneider Electric",
        model: "Modicon M580",
        firmware_version: "",
        zone_id: "z_proc",
        criticality_score: 8,
      },
    ],
    connectivity: [],
    vulnerabilities: [],
    process_functions: [],
    demo_scenarios: [],
  };

  const feed = {
    advisories: [
      {
        advisory_id: "ICSA-FOXBORO-TEST-01",
        title: "Schneider Electric EcoStruxure Foxboro DCS",
        date: "2026-01-15",
        summary: "An unauthenticated remote attacker could read sensitive control data on the Foxboro FCP270 controller.",
        sectors: ["Energy"],
        cves: ["CVE-2026-FOX01"],
        cvss_max: 8.6,
        cvss_severity: "high",
        affected_products: [
          {
            vendor: "Schneider Electric",
            product: "EcoStruxure Foxboro DCS FCP270",
            version: "vers:all/*",
            product_id: "CSAFPID-0001",
          },
        ],
        cisa_url: "https://www.cisa.gov/news-events/ics-advisories/icsa-foxboro-test-01",
      },
      {
        advisory_id: "ICSA-MODICON-TEST-01",
        title: "Schneider Electric Modicon M580",
        date: "2026-02-10",
        summary: "An authenticated remote attacker could write arbitrary memory on the Modicon M580 controller.",
        sectors: ["Critical Manufacturing"],
        cves: ["CVE-2026-MOD01"],
        cvss_max: 7.5,
        cvss_severity: "high",
        affected_products: [
          {
            vendor: "Schneider Electric",
            product: "Modicon M580 PLC",
            version: "vers:all/*",
            product_id: "CSAFPID-0001",
          },
        ],
        cisa_url: "https://www.cisa.gov/news-events/ics-advisories/icsa-modicon-test-01",
      },
      {
        advisory_id: "ICSA-TRICONEX-TEST-01",
        title: "Schneider Electric Triconex Tricon",
        date: "2026-03-05",
        summary: "A locally authenticated attacker could disable safety logic on the Triconex Tricon SIS controller.",
        sectors: ["Energy"],
        cves: ["CVE-2026-TRI01"],
        cvss_max: 9.1,
        cvss_severity: "critical",
        affected_products: [
          {
            vendor: "Schneider Electric",
            product: "Triconex Tricon",
            version: "vers:all/*",
            product_id: "CSAFPID-0001",
          },
        ],
        cisa_url: "https://www.cisa.gov/news-events/ics-advisories/icsa-triconex-test-01",
      },
    ],
  };

  return { plant, feed };
}

async function withTempFixtures(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "fox-spec-"));
  const plantPath = path.join(dir, "plant.json");
  const feedPath = path.join(dir, "feed.json");
  const kevPath = path.join(dir, "kev.json");
  const { plant, feed } = buildFixtures();
  await writeFile(plantPath, JSON.stringify(plant));
  await writeFile(feedPath, JSON.stringify(feed));
  await writeFile(kevPath, JSON.stringify({ vulnerabilities: [] }));
  try {
    await fn({ plantPath, feedPath, kevPath });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Helper: collect the set of advisory_ids matched against a given asset.
function advisoriesForAsset(findings, assetId) {
  return new Set(
    findings
      .filter((f) => f.asset_id === assetId)
      .map((f) => f.evidence_obj?.advisory_id)
      .filter(Boolean)
  );
}

test("foxboro specificity: Foxboro FCP270 matches ONLY the Foxboro advisory", async () => {
  await withTempFixtures(async ({ plantPath, feedPath, kevPath }) => {
    const { findings } = await scanAdvisories({
      plant: plantPath,
      feed: feedPath,
      kev: kevPath,
    });

    const foxboroMatches = advisoriesForAsset(findings, "a_foxboro_fcp270");

    assert.ok(
      foxboroMatches.has("ICSA-FOXBORO-TEST-01"),
      `Foxboro asset must match the Foxboro advisory. Got: ${[...foxboroMatches].join(", ") || "(none)"}`
    );
    assert.ok(
      !foxboroMatches.has("ICSA-MODICON-TEST-01"),
      `Foxboro asset MUST NOT match the Modicon advisory. Got: ${[...foxboroMatches].join(", ")}`
    );
    assert.ok(
      !foxboroMatches.has("ICSA-TRICONEX-TEST-01"),
      `Foxboro asset MUST NOT match the Triconex advisory. Got: ${[...foxboroMatches].join(", ")}`
    );
    assert.equal(
      foxboroMatches.size,
      1,
      `Foxboro asset must match exactly ONE advisory. Got ${foxboroMatches.size}: ${[...foxboroMatches].join(", ")}`
    );
  });
});

test("foxboro specificity: Modicon M580 matches ONLY the Modicon advisory", async () => {
  await withTempFixtures(async ({ plantPath, feedPath, kevPath }) => {
    const { findings } = await scanAdvisories({
      plant: plantPath,
      feed: feedPath,
      kev: kevPath,
    });

    const modiconMatches = advisoriesForAsset(findings, "a_modicon_m580");

    assert.ok(
      modiconMatches.has("ICSA-MODICON-TEST-01"),
      `Modicon asset must match the Modicon advisory. Got: ${[...modiconMatches].join(", ") || "(none)"}`
    );
    assert.ok(
      !modiconMatches.has("ICSA-FOXBORO-TEST-01"),
      `Modicon asset MUST NOT match the Foxboro advisory. Got: ${[...modiconMatches].join(", ")}`
    );
    assert.ok(
      !modiconMatches.has("ICSA-TRICONEX-TEST-01"),
      `Modicon asset MUST NOT match the Triconex advisory. Got: ${[...modiconMatches].join(", ")}`
    );
    assert.equal(
      modiconMatches.size,
      1,
      `Modicon asset must match exactly ONE advisory. Got ${modiconMatches.size}: ${[...modiconMatches].join(", ")}`
    );
  });
});

test("foxboro specificity: Triconex advisory matches NEITHER asset (not in inventory)", async () => {
  await withTempFixtures(async ({ plantPath, feedPath, kevPath }) => {
    const { findings } = await scanAdvisories({
      plant: plantPath,
      feed: feedPath,
      kev: kevPath,
    });

    const triconexMatched = findings.some(
      (f) => f.evidence_obj?.advisory_id === "ICSA-TRICONEX-TEST-01"
    );

    assert.equal(
      triconexMatched,
      false,
      "A Triconex-only advisory must not match a plant whose inventory contains no Triconex/Tricon assets."
    );
  });
});

test("foxboro specificity: each asset is matched by at least one advisory (sanity)", async () => {
  await withTempFixtures(async ({ plantPath, feedPath, kevPath }) => {
    const { findings, summary } = await scanAdvisories({
      plant: plantPath,
      feed: feedPath,
      kev: kevPath,
    });

    // Sanity: prevents the test from passing if the matcher returns nothing
    // for either asset (which would make the "no false positive" assertions
    // trivially true).
    const byAsset = new Map();
    for (const f of findings) {
      byAsset.set(f.asset_id, (byAsset.get(f.asset_id) || 0) + 1);
    }
    assert.ok(
      (byAsset.get("a_foxboro_fcp270") || 0) >= 1,
      "Foxboro asset must produce at least one finding (sanity check)."
    );
    assert.ok(
      (byAsset.get("a_modicon_m580") || 0) >= 1,
      "Modicon asset must produce at least one finding (sanity check)."
    );
    assert.equal(
      summary.advisories_matched,
      2,
      `Exactly 2 advisories should match (Foxboro + Modicon, Triconex unmatched). Got ${summary.advisories_matched}.`
    );
  });
});
