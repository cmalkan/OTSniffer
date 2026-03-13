import fs from "node:fs";
import path from "node:path";

import { Asset, PlantData } from "@/lib/models/domain";
import { validatePlantData } from "@/lib/server/validation";

let cache: PlantData | null = null;

function loadPlantData(): PlantData {
  if (cache) return cache;
  const p = path.join(process.cwd(), "data", "plant-demo.json");
  const raw = fs.readFileSync(p, "utf8");
  const parsed: unknown = JSON.parse(raw);
  validatePlantData(parsed);
  cache = parsed;
  return cache;
}

export function getAssets(): Asset[] {
  return loadPlantData().assets;
}

export function getAssetById(assetId: string): Asset | undefined {
  return loadPlantData().assets.find((a) => a.asset_id === assetId);
}

export function getGraphSummary() {
  const d = loadPlantData();
  return {
    plant_id: d.plant_id,
    plant_name: d.plant_name,
    sector: d.sector,
    asset_count: d.assets.length,
    zone_count: d.zones.length,
    vulnerability_count: d.vulnerabilities.length,
    connectivity_count: d.connectivity.length,
    process_function_count: d.process_functions.length,
  };
}

export function getDemoScenarios() {
  return loadPlantData().demo_scenarios;
}
