// Exposure scanner. Static graph analysis of a plant fixture — produces
// exposure findings from the assets / zones / connectivity declared in the
// fixture, without any live network probing. Live exposure (Shodan, real
// banner pulls) is the planned upstream slot tagged source_tool: "shodan";
// this fallback path tags findings as "manual" per the architecture rule.
//
// Rules implemented:
//   E1  Web management exposure — HTTP (port 80 or protocol "http") reaching
//       an HMI or SCADA asset.
//   E2  Cross-Purdue-level control protocol — control protocol connecting two
//       zones with a Purdue level delta >= 1.5 (i.e. crossing more than one
//       layer without a brokering DMZ).
//   E3  Field-zone RTU on a routable WAN protocol — an RTU asset in a field-
//       or distribution-style zone is reachable via DNP3, a common cellular
//       WAN exposure pattern at mid-size water utilities.
//   E4  Engineering workstation bi-directional control-protocol access to a
//       PLC — bi-directional access elevates project-import RCE blast radius.

import { readFile } from "node:fs/promises";
import { makeFinding } from "./_base.mjs";

const CONTROL_PROTOCOLS = new Set([
  "modbus-tcp", "ethernet-ip", "s7", "dnp3", "profinet", "opc-ua",
]);

export async function scanExposure({ plantPath, plant: plantArg } = {}) {
  const plant = plantArg ?? (plantPath ? JSON.parse(await readFile(plantPath, "utf8")) : null);
  if (!plant) throw new Error("scanExposure: --plant or plant arg required");

  const assetById = new Map((plant.assets || []).map((a) => [a.asset_id, a]));
  const zoneById = new Map((plant.zones || []).map((z) => [z.zone_id, z]));
  const connectivity = plant.connectivity || [];
  const findings = [];

  // E1 — web management exposed on HMI/SCADA
  for (const c of connectivity) {
    const target = assetById.get(c.target_asset_id);
    if (!target) continue;
    const isWeb = c.protocol === "http" || (c.port === 80 && c.protocol !== "https");
    if (!isWeb) continue;
    if (target.asset_type !== "hmi" && target.asset_type !== "scada-server") continue;
    findings.push(makeFinding({
      finding_type: "exposure",
      severity: "medium",
      confidence: 0.7,
      evidence: `HTTP/${c.port ?? 80} reachable on ${target.name} (${target.vendor} ${target.model}, ${target.asset_type}) from ${c.source_asset_id}; web management interface exposed — replace cert and restrict to management VLAN`,
      key: `exposure:web:${target.asset_id}:${c.source_asset_id}:${c.port ?? 80}`,
      asset_id: target.asset_id,
      source_tool: "manual",
    }));
  }

  // E2 — control protocol across more than one Purdue level
  for (const c of connectivity) {
    if (!CONTROL_PROTOCOLS.has(c.protocol)) continue;
    const source = assetById.get(c.source_asset_id);
    const target = assetById.get(c.target_asset_id);
    if (!source || !target) continue;
    const sourceZone = zoneById.get(source.zone_id);
    const targetZone = zoneById.get(target.zone_id);
    if (!sourceZone || !targetZone) continue;
    if (sourceZone.zone_id === targetZone.zone_id) continue;
    const sourceLvl = parsePurdueLevel(sourceZone.level);
    const targetLvl = parsePurdueLevel(targetZone.level);
    if (sourceLvl == null || targetLvl == null) continue;
    const delta = Math.abs(sourceLvl - targetLvl);
    if (delta < 1.5) continue;
    findings.push(makeFinding({
      finding_type: "exposure",
      severity: delta >= 2 ? "high" : "medium",
      confidence: 0.7,
      evidence: `${labelProto(c.protocol)} (TCP/${c.port}) from ${source.name} in ${sourceZone.name} (${sourceZone.level}) to ${target.name} in ${targetZone.name} (${targetZone.level}) traverses ${delta} Purdue levels — should be brokered through OT DMZ, not direct`,
      key: `exposure:cross-level:${c.source_asset_id}:${c.target_asset_id}:${c.protocol}`,
      asset_id: target.asset_id,
      source_tool: "manual",
    }));
  }

  // E3 — field RTU on DNP3 (cellular WAN exposure heuristic)
  for (const a of plant.assets || []) {
    if (a.asset_type !== "rtu") continue;
    const zone = zoneById.get(a.zone_id);
    if (!zone) continue;
    if (!/field|distribution|remote|lift|cell/i.test(`${zone.name} ${zone.description || ""}`)) continue;
    const usesDnp3 = connectivity.some(
      (c) => c.target_asset_id === a.asset_id && c.protocol === "dnp3",
    );
    if (!usesDnp3) continue;
    findings.push(makeFinding({
      finding_type: "exposure",
      severity: "high",
      confidence: 0.65,
      evidence: `Field RTU ${a.name} (${a.vendor} ${a.model}) at ${a.ip_address} in zone ${zone.name} reaches back via DNP3 — verify cellular WAN endpoint enforces source-IP allowlisting and DNP3-SA / TLS; common mid-utility exposure pattern at unmanaged lift stations`,
      key: `exposure:rtu-wan:${a.asset_id}`,
      asset_id: a.asset_id,
      source_tool: "manual",
    }));
  }

  // E4 — engineering workstation bi-directional control to a PLC
  for (const c of connectivity) {
    if (c.allowed_direction !== "bi") continue;
    if (!CONTROL_PROTOCOLS.has(c.protocol)) continue;
    const source = assetById.get(c.source_asset_id);
    const target = assetById.get(c.target_asset_id);
    if (!source || !target) continue;
    if (source.asset_type !== "engineering-workstation") continue;
    if (target.asset_type !== "plc") continue;
    findings.push(makeFinding({
      finding_type: "exposure",
      severity: "medium",
      confidence: 0.6,
      evidence: `Engineering workstation ${source.name} has bi-directional ${labelProto(c.protocol)} (TCP/${c.port}) access to ${target.name} — elevates blast radius of any project-import RCE on the workstation; consider read-only conduit or jumphost-mediated access`,
      key: `exposure:eng-ws-bi:${c.source_asset_id}:${c.target_asset_id}`,
      asset_id: target.asset_id,
      source_tool: "manual",
    }));
  }

  return findings;
}

function parsePurdueLevel(level) {
  const m = String(level || "").match(/L?(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : null;
}

function labelProto(p) {
  switch (p) {
    case "modbus-tcp": return "Modbus TCP";
    case "ethernet-ip": return "EtherNet/IP CIP";
    case "s7": return "Siemens S7comm";
    case "dnp3": return "DNP3";
    case "profinet": return "PROFINET";
    case "opc-ua": return "OPC UA";
    default: return p;
  }
}
