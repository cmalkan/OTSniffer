// Mesh-gap scanner. Static graph analysis of zone-and-conduit isolation per
// IEC 62443. Reads the plant fixture's zones, assets, and connectivity and
// flags any reachability that the zone model says shouldn't exist.
//
// Scope is deliberately narrow to safety-critical and high-criticality assets;
// general cross-Purdue-level traversal is the exposure scanner's job.
//
// Rules implemented:
//   M1  Safety controller reachable from any source whose asset_type is not
//       a PLC. Operator HMIs, engineering workstations, and SCADA servers
//       must not have direct conduit access into a SIS.
//   M2  Safety controller with a bi-directional incoming connectivity entry.
//       A SIS conduit should be tightly controlled write-only or read-only,
//       not bi-directional.
//   M3  High-criticality PLC (criticality_score >= 9) reachable from a zone
//       two or more Purdue levels above it (i.e. control-plane reach without
//       a brokering layer between).
//
// All mesh-gap findings are tagged source_tool: "manual" — the planned upstream
// is the snowcat slot from the schema, not yet wired.

import { readFile } from "node:fs/promises";
import { makeFinding } from "./_base.mjs";

export async function scanMeshGap({ plantPath, plant: plantArg } = {}) {
  const plant = plantArg ?? (plantPath ? JSON.parse(await readFile(plantPath, "utf8")) : null);
  if (!plant) throw new Error("scanMeshGap: --plant or plant arg required");

  const assetById = new Map((plant.assets || []).map((a) => [a.asset_id, a]));
  const zoneById = new Map((plant.zones || []).map((z) => [z.zone_id, z]));
  const connectivity = plant.connectivity || [];
  const findings = [];

  // M1 — safety-controller reachable from a non-PLC source
  for (const c of connectivity) {
    const target = assetById.get(c.target_asset_id);
    const source = assetById.get(c.source_asset_id);
    if (!target || !source) continue;
    if (target.asset_type !== "safety-controller") continue;
    if (source.asset_type === "plc") continue;
    const targetZone = zoneById.get(target.zone_id);
    const sourceZone = zoneById.get(source.zone_id);
    findings.push(makeFinding({
      finding_type: "mesh_gap",
      severity: "critical",
      confidence: 0.85,
      evidence: `Safety controller ${target.name} (${target.vendor} ${target.model}) reachable from ${source.name} (${source.asset_type}) in zone ${sourceZone?.name ?? source.zone_id} — IEC 62443 zone isolation requires SIS conduits to originate only from a process-zone PLC, not from operator or engineering tier`,
      key: `mesh:sis-non-plc:${target.asset_id}:${source.asset_id}`,
      asset_id: target.asset_id,
      source_tool: "manual",
    }));
  }

  // M2 — safety-controller with bi-directional incoming
  for (const c of connectivity) {
    if (c.allowed_direction !== "bi") continue;
    const target = assetById.get(c.target_asset_id);
    const source = assetById.get(c.source_asset_id);
    if (!target || !source) continue;
    if (target.asset_type !== "safety-controller") continue;
    findings.push(makeFinding({
      finding_type: "mesh_gap",
      severity: "high",
      confidence: 0.75,
      evidence: `Safety controller ${target.name} has bi-directional ${c.protocol} conduit from ${source.name} — SIS conduits should be unidirectional (write or read), not bi; bi-directional traffic widens the attack surface for safety-function tampering`,
      key: `mesh:sis-bidi:${c.source_asset_id}:${c.target_asset_id}`,
      asset_id: target.asset_id,
      source_tool: "manual",
    }));
  }

  // M3 — high-criticality PLC reachable from two-or-more Purdue levels above
  for (const c of connectivity) {
    const target = assetById.get(c.target_asset_id);
    const source = assetById.get(c.source_asset_id);
    if (!target || !source) continue;
    if (target.asset_type !== "plc") continue;
    if ((target.criticality_score ?? 0) < 9) continue;
    const targetZone = zoneById.get(target.zone_id);
    const sourceZone = zoneById.get(source.zone_id);
    if (!targetZone || !sourceZone) continue;
    if (targetZone.zone_id === sourceZone.zone_id) continue;
    const sLvl = parsePurdueLevel(sourceZone.level);
    const tLvl = parsePurdueLevel(targetZone.level);
    if (sLvl == null || tLvl == null) continue;
    if (sLvl - tLvl < 2) continue;
    findings.push(makeFinding({
      finding_type: "mesh_gap",
      severity: "high",
      confidence: 0.7,
      evidence: `High-criticality PLC ${target.name} (criticality ${target.criticality_score}) in ${targetZone.name} (${targetZone.level}) reachable from ${source.name} in ${sourceZone.name} (${sourceZone.level}) — ${sLvl - tLvl} Purdue levels above; the zone model requires brokering through an intermediate conduit`,
      key: `mesh:plc-cross-level:${c.source_asset_id}:${c.target_asset_id}`,
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
