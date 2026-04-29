const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FILE = path.join(process.cwd(), 'data', 'plant-demo.json');
const ENRICHED_FILE = path.join(process.cwd(), 'data', 'plant-enriched.json');

// Resolve a plant-key to its on-disk fixture. Mirrors dev-server's
// PLANT_REGISTRY semantics: built-in keys map to fixed files, anything else
// is treated as a customer-onboarded key with a `plant-<key>-enriched.json`
// (preferred) or `plant-<key>-demo.json` companion.
function resolveDataFile(plantKey) {
  if (process.env.OTSNIFF_PLANT_FILE) return process.env.OTSNIFF_PLANT_FILE;
  const k = String(plantKey || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  if (k && k !== 'energy') {
    if (k === 'water') {
      const f = path.join(process.cwd(), 'data', 'plant-water-enriched.json');
      if (fs.existsSync(f)) return f;
    }
    const enriched = path.join(process.cwd(), 'data', `plant-${k}-enriched.json`);
    if (fs.existsSync(enriched)) return enriched;
    const demo = path.join(process.cwd(), 'data', `plant-${k}-demo.json`);
    if (fs.existsSync(demo)) return demo;
  }
  if (fs.existsSync(ENRICHED_FILE)) return ENRICHED_FILE;
  return DEFAULT_FILE;
}

function loadPlantData(plantKey) {
  const raw = fs.readFileSync(resolveDataFile(plantKey), 'utf8');
  const data = JSON.parse(raw);

  for (const key of ['assets', 'zones', 'connectivity', 'vulnerabilities', 'process_functions', 'demo_scenarios']) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid demo data: missing array ${key}`);
    }
  }
  if (data.evidence_findings && !Array.isArray(data.evidence_findings)) {
    throw new Error('Invalid demo data: evidence_findings must be array');
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
