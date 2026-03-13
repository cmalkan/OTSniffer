export type AssetType =
  | "engineering-workstation"
  | "hmi"
  | "plc"
  | "rtu"
  | "historian"
  | "scada-server"
  | "industrial-switch"
  | "safety-controller";

export type TrustLevel = "low" | "medium" | "high";
export type AllowedDirection = "uni" | "bi";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Asset {
  asset_id: string;
  name: string;
  asset_type: AssetType;
  vendor: string;
  model: string;
  firmware_version: string;
  ip_address: string;
  zone_id: string;
  criticality_score: number;
  process_tag: string;
}

export interface Zone {
  zone_id: string;
  name: string;
  level: string;
  description: string;
}

export interface Vulnerability {
  vuln_id: string;
  cve: string;
  description: string;
  severity: Severity;
  exploitability: number;
  affected_vendor: string;
  affected_product: string;
  affected_version: string;
  asset_id: string;
}

export interface Connectivity {
  source_asset_id: string;
  target_asset_id: string;
  protocol: string;
  port: number;
  trust_level: TrustLevel;
  allowed_direction: AllowedDirection;
}

export interface ProcessFunction {
  process_id: string;
  name: string;
  criticality: number;
  primary_zone_id: string;
  dependent_asset_ids: string[];
}

export interface SimulationResult {
  compromised_asset_id: string;
  impacted_asset_ids: string[];
  impacted_zone_ids: string[];
  impacted_process_ids: string[];
  blast_radius_score: number;
  notes: string[];
}

export interface PlantData {
  plant_id: string;
  plant_name: string;
  sector: "energy" | "manufacturing";
  zones: Zone[];
  assets: Asset[];
  vulnerabilities: Vulnerability[];
  connectivity: Connectivity[];
  process_functions: ProcessFunction[];
  demo_scenarios: Array<{ scenario_id: string; title: string; compromised_asset_id: string; intent: string }>;
}
