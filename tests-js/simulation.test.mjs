import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadPlantData, indexPlantData } = require('../netlify/functions/_shared/data.js');
const { simulateBlastRadius, rankTopScenarios } = require('../netlify/functions/_shared/simulation.js');

test('blast radius returns verbose analyst fields', () => {
  const data = loadPlantData();
  const idx = indexPlantData(data);

  const result = simulateBlastRadius(data, idx, {
    start_asset_id: 'a_eng_01',
    max_depth: 6,
    include_vulnerabilities: true,
    include_zone_barriers: true,
    mode: 'analyst',
  });

  assert.equal(result.start_asset_id, 'a_eng_01');
  assert.ok(result.total_impacted_assets >= 2);
  assert.ok(Array.isArray(result.attack_paths));
  assert.ok(Array.isArray(result.path_explanations));
  assert.ok(typeof result.executive_summary === 'string' && result.executive_summary.length > 10);
});

test('top scenarios are ranked by risk score descending', () => {
  const data = loadPlantData();
  const idx = indexPlantData(data);
  const scenarios = rankTopScenarios(data, idx);

  assert.ok(scenarios.length >= 2);
  for (let i = 1; i < scenarios.length; i += 1) {
    assert.ok(scenarios[i - 1].risk_score >= scenarios[i].risk_score);
  }
});
