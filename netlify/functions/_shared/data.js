const fs = require('node:fs');
const path = require('node:path');

// Assumption: Month-2 demo keeps a single plant fixture file for deterministic outputs.
const DATA_FILE = path.join(process.cwd(), 'data', 'plant-demo.json');

function loadPlantData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Minimal runtime validation for Netlify function safety.
  for (const key of ['assets', 'zones', 'connectivity', 'vulnerabilities', 'process_functions', 'demo_scenarios']) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid demo data: missing array ${key}`);
    }
  }

  return data;
}

function indexPlantData(data) {
  const assetById = new Map(data.assets.map((a) => [a.asset_id, a]));
  const zoneById = new Map(data.zones.map((z) => [z.zone_id, z]));
  const vulnsByAsset = new Map();

  for (const v of data.vulnerabilities) {
    if (!vulnsByAsset.has(v.asset_id)) vulnsByAsset.set(v.asset_id, []);
    vulnsByAsset.get(v.asset_id).push(v);
  }

  return { assetById, zoneById, vulnsByAsset };
}

module.exports = { loadPlantData, indexPlantData };
