import test from "node:test";
import assert from "node:assert/strict";
import { inferTopologyFromLines } from "../web/js/topology-extract.js";

const knpcLikeLines = [
  "8.2.1 Cybersecurity Zone (L3.2)",
  "The function of this zone is to segregate the cybersecurity network from different zones.",
  "The Cybersecurity Zone contains:",
  "- Cybersecurity virtualized host server - #1",
  "- Primary domain controller + RADIUS VM",
  "- Log server VM.",
  "- Cybersecurity virtualized host server - #2",
  "- Secondary domain controller + RADIUS VM",
  "- Centralized NAS Server (Backup)",
  "- CS Thin Client.",
  "Cybersecurity Zone VLANs:",
  "1 | CS_VHOST | CS Virtualization Host Server",
  "2 | CS_SRV | Cybersecurity Servers",
  "3 | CS_STORE | Backup Storage Servers",
  "8.2.2 Control System Zone",
  "The function of this zone is to segregate the DCS Systems from different zones.",
  "Control System Zone contains:",
  "- DCS Servers and Workstations (Both Physical & Virtual machines)",
  "- L2 MESH Network Switches",
  "- L3 VHN Network Switches",
  "- Foxboro Controllers",
  "- NTP Server",
  "Control System Zone VLANs:",
  "1 | FDCN | DCS Host Servers and Controllers",
  "2 | DCS_SRV | DCS GR, OWS, HIST, NTP Servers, Thin Client",
];

test("topology extractor: infers KNPC-like zones, assets, and conduits", () => {
  const inferred = inferTopologyFromLines(knpcLikeLines, []);

  assert.equal(inferred.zones.length, 2);
  assert.deepEqual(
    inferred.zones.map((zone) => [zone.zone_id, zone.level]),
    [
      ["z_cybersecurity_zone", "L3.5"],
      ["z_control_system_zone", "L2"],
    ]
  );

  const assetNames = inferred.suggestedAssets.map((asset) => asset.name);
  assert.ok(assetNames.includes("Cybersecurity Virtualized Host Server - 1"));
  assert.ok(assetNames.includes("DCS Servers"));
  assert.ok(assetNames.includes("DCS Workstations"));
  assert.ok(assetNames.includes("Foxboro Controllers"));

  const types = new Map(inferred.suggestedAssets.map((asset) => [asset.name, asset.asset_type]));
  assert.equal(types.get("Foxboro Controllers"), "plc");
  assert.equal(types.get("DCS Workstations"), "engineering-workstation");
  assert.equal(types.get("L2 MESH Network Switches"), "switch");

  assert.ok(
    inferred.connectivity.some(
      (conn) => conn.protocol === "https" && conn.port === 443 && conn.trust_level === "medium"
    ),
    "expected a cybersecurity-zone management conduit"
  );
  assert.ok(
    inferred.connectivity.some(
      (conn) => conn.protocol === "ethernet-ip" && conn.port === 44818
    ),
    "expected a controller conduit"
  );
});

test("topology extractor: maps inferred zones onto existing BOM assets", () => {
  const existingAssets = [
    { asset_id: "a_eng_01", name: "DCS Workstations", asset_type: "engineering-workstation", zone_id: "" },
    { asset_id: "a_plc_01", name: "Foxboro Controllers", asset_type: "plc", zone_id: "" },
  ];

  const inferred = inferTopologyFromLines(knpcLikeLines, existingAssets);
  const matchByAsset = new Map(inferred.matchedAssets.map((match) => [match.asset_id, match.zone_id]));

  assert.equal(matchByAsset.get("a_eng_01"), "z_control_system_zone");
  assert.equal(matchByAsset.get("a_plc_01"), "z_control_system_zone");
  assert.ok(
    inferred.suggestedAssets.every((asset) => asset.name !== "DCS Workstations" && asset.name !== "Foxboro Controllers"),
    "matched BOM assets should not be re-added as suggestions"
  );
});
