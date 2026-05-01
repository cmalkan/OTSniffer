// attack-paths.mjs
//
// Schema + validator + helpers for the `attack_paths[]` plant-fixture
// extension produced by the blast-radius pentester agent.
//
// Lives at the top level of the plant fixture (alongside `evidence_findings[]`
// and `vulnerabilities[]`). Each entry describes a defensible kill chain
// from a `compromised_asset_id` to a `target_asset_id`, derived from a
// matched supply-chain advisory and gated by per-hop protocol + leverage +
// MITRE ATT&CK for ICS T-codes.
//
// IMPORTANT: This file lives in `scripts/otsniff/` (ESM toolchain tier).
// Web tier (`netlify/functions/_shared/`) consumes attack_paths only as
// data — it does not import this validator. If web-tier validation is
// needed, dual-publish the constants per CLAUDE.md.

import { createHash } from "node:crypto";

// ── Vocabulary (closed sets) ───────────────────────────────────────────

export const KILL_CHAIN_PHASES = /** @type {const} */ ([
  "lateral-movement",     // attacker reaches another asset
  "loss-of-view",         // operator can no longer see process state (T0815, T0832)
  "loss-of-control",      // operator can no longer command the process (T0813, T0828)
  "inhibit-response",     // safety/SIS bypass (T0814, T0816, T0879)
  "impair-control",       // attacker writes setpoints / firmware (T0831, T0843)
]);

export const EXPLOIT_GATING = /** @type {const} */ ([
  "confirmed-remote-unauth",    // strongest — full saturation in UI
  "confirmed-remote-auth",
  "requires-credentials",       // valid/cached credentials needed
  "requires-default-creds",     // attacker exploits known default password
  "requires-adjacent",          // adjacent network access
  "requires-physical",          // weakest — reduced opacity in UI
  "requires-specific-firmware",
  "theoretical-only",           // no public exploit primitive
]);

// Common ICS protocols. Not exhaustive — extend as new field engagements
// surface vendor-proprietary protocols. Anything outside this set should
// be tagged "vendor-proprietary" with the actual name in `protocol_detail`.
export const ICS_PROTOCOLS = /** @type {const} */ ([
  "modbus-tcp",
  "modbus-rtu",
  "ethernet-ip",            // CIP over Ethernet — Rockwell, others
  "opc-ua",
  "opc-da",
  "s7comm",                 // Siemens
  "dnp3",
  "iec-104",
  "iec-61850-mms",
  "iec-61850-goose",        // L2 multicast — substation LAN
  "iccp",                   // TASE.2 — control center to substation
  "osi-pi",                 // PI Server protocol
  "eni",                    // Foxboro engineering protocol
  "fbm",                    // Foxboro back-end I/O bus
  "tsaa",                   // Triconex/Trident
  "tci-egd",                // GE Mark VIe Toolbox / EGD
  "proplus",                // Emerson DeltaV engineering
  "https",
  "http",
  "rdp",
  "smb",
  "ssh",
  "winrm",
  "vendor-proprietary",
]);

// MITRE ATT&CK for ICS — T-codes the matcher actually emits today. Add
// new ones as new kill-chain primitives are encoded; the validator only
// checks the format (Txxxx) so unknown codes still pass — but they must
// be Txxxx-formatted.
export const KNOWN_TTPS = /** @type {const} */ ([
  "T0807", // Command-Line Interface
  "T0813", // Denial of Control
  "T0814", // Denial of Service
  "T0815", // Denial of View
  "T0816", // Device Restart/Shutdown
  "T0828", // Loss of Productivity & Revenue
  "T0831", // Manipulation of Control
  "T0832", // Manipulation of View
  "T0843", // Program Download
  "T0855", // Unauthorized Command Message
  "T0858", // Change Operating Mode
  "T0859", // Valid Accounts
  "T0866", // Exploitation of Remote Services
  "T0879", // Damage to Property
  "T0883", // Internet Accessible Device
  "T0886", // Remote Services
  "T0890", // Exploitation for Privilege Escalation
]);

// TTP clusters that earn a small confidence bonus (capped at 1.15) when a
// path's TTP set substantially overlaps. The names are the public threat-
// actor reports — credit goes to the underlying primitives, not the names.
export const TTP_CLUSTERS = {
  "volt-typhoon": {
    description: "Living-off-the-land via valid accounts and remote services; persistence through legitimate RMM and AD pivots.",
    canonical_ttps: ["T0859", "T0866", "T0886"],
    sectors: ["energy", "water", "communications"],
  },
  "industroyer": {
    description: "Substation EMS to relay command via ICCP/IEC-104; designed to trip breakers (Ukraine 2016).",
    canonical_ttps: ["T0855", "T0813", "T0814"],
    sectors: ["energy"],
  },
  "industroyer2": {
    description: "Modular IEC-104 protocol-aware attacker; substation-targeted (Ukraine 2022).",
    canonical_ttps: ["T0855", "T0866", "T0813"],
    sectors: ["energy"],
  },
  "triton-trisis": {
    description: "Engineering-workstation to Triconex SIS via TSAA, replacing safety logic with attacker-supplied code (Saudi Aramco 2017).",
    canonical_ttps: ["T0843", "T0858", "T0879"],
    sectors: ["energy", "petrochemical"],
  },
  "crashoverride": {
    description: "Industroyer's broader name — see industroyer entry; multi-protocol substation attack framework.",
    canonical_ttps: ["T0855", "T0813", "T0814"],
    sectors: ["energy"],
  },
};

const PHASE_SET = new Set(KILL_CHAIN_PHASES);
const GATING_SET = new Set(EXPLOIT_GATING);
const PROTO_SET = new Set(ICS_PROTOCOLS);
const TTP_FORMAT = /^T\d{4}$/;

// ── Validation ─────────────────────────────────────────────────────────

// Validates a single hop. Returns array of errors (empty == valid).
export function validateHop(hop) {
  const errors = [];
  if (!hop || typeof hop !== "object") return ["hop must be an object"];
  if (typeof hop.from_asset_id !== "string" || !hop.from_asset_id) errors.push("hop.from_asset_id required");
  if (typeof hop.to_asset_id !== "string" || !hop.to_asset_id) errors.push("hop.to_asset_id required");
  if (hop.from_asset_id === hop.to_asset_id) errors.push("hop.from_asset_id === hop.to_asset_id (self-loop)");
  if (typeof hop.protocol !== "string" || !PROTO_SET.has(hop.protocol)) {
    errors.push(`hop.protocol invalid: ${hop.protocol} (must be in ICS_PROTOCOLS or "vendor-proprietary")`);
  }
  if (typeof hop.leverage !== "string" || hop.leverage.length < 6) {
    errors.push("hop.leverage must be a non-trivial string (the attacker's control-plane primitive)");
  }
  if (!Array.isArray(hop.mitre_attack_for_ics) || hop.mitre_attack_for_ics.length === 0) {
    errors.push("hop.mitre_attack_for_ics required (≥1 T-code)");
  } else {
    for (const t of hop.mitre_attack_for_ics) {
      if (!TTP_FORMAT.test(t)) errors.push(`hop.mitre_attack_for_ics entry must match Txxxx format: ${t}`);
    }
  }
  if (!GATING_SET.has(hop.exploit_gating)) {
    errors.push(`hop.exploit_gating invalid: ${hop.exploit_gating}`);
  }
  if (typeof hop.hop_confidence !== "number" || hop.hop_confidence < 0 || hop.hop_confidence > 1) {
    errors.push("hop.hop_confidence must be number in [0,1]");
  }
  return errors;
}

// Validates a single attack path. Returns array of errors (empty == valid).
export function validateAttackPath(p) {
  const errors = [];
  if (!p || typeof p !== "object") return ["attack_path must be an object"];
  if (typeof p.path_id !== "string" || !p.path_id) errors.push("path_id required");
  if (typeof p.compromised_asset_id !== "string" || !p.compromised_asset_id) errors.push("compromised_asset_id required");
  if (typeof p.target_asset_id !== "string" || !p.target_asset_id) errors.push("target_asset_id required");
  if (!PHASE_SET.has(p.kill_chain_phase)) errors.push(`kill_chain_phase invalid: ${p.kill_chain_phase}`);
  if (!Array.isArray(p.hops) || p.hops.length === 0) {
    errors.push("hops must be a non-empty array");
  } else {
    p.hops.forEach((h, i) => {
      const hopErrors = validateHop(h);
      for (const e of hopErrors) errors.push(`hops[${i}]: ${e}`);
    });

    // Hop chain consistency: hops[0].from_asset_id === compromised_asset_id,
    // hops[last].to_asset_id === target_asset_id, and consecutive hops chain.
    if (p.hops.length && p.hops[0].from_asset_id !== p.compromised_asset_id) {
      errors.push("hops[0].from_asset_id must equal compromised_asset_id");
    }
    if (p.hops.length && p.hops[p.hops.length - 1].to_asset_id !== p.target_asset_id) {
      errors.push("hops[last].to_asset_id must equal target_asset_id");
    }
    for (let i = 1; i < p.hops.length; i++) {
      if (p.hops[i].from_asset_id !== p.hops[i - 1].to_asset_id) {
        errors.push(`hops[${i}].from_asset_id must equal hops[${i - 1}].to_asset_id (chain break)`);
      }
    }
  }
  if (typeof p.path_confidence !== "number" || p.path_confidence < 0 || p.path_confidence > 1.15) {
    errors.push("path_confidence must be number in [0, 1.15] (1.0 base, +cluster_bonus up to 1.15)");
  }
  if (typeof p.rationale !== "string" || p.rationale.length < 10) {
    errors.push("rationale must be a plant-manager-readable sentence");
  }
  // source_finding_id is REQUIRED if the path was derived from a matched
  // advisory, but OPTIONAL for paths derived from non-CVE evidence
  // (validated_creds, exposure, mesh_gap).
  if (p.source_finding_id !== undefined && p.source_finding_id !== null) {
    if (typeof p.source_finding_id !== "string" || !p.source_finding_id) {
      errors.push("source_finding_id, if present, must be a non-empty string");
    }
  }
  // animation block is optional but if present must be well-formed.
  if (p.animation !== undefined) {
    if (!p.animation || typeof p.animation !== "object") {
      errors.push("animation must be an object if present");
    } else {
      if (typeof p.animation.color_token !== "string") errors.push("animation.color_token must be string");
      if (typeof p.animation.speed_ms_per_hop !== "number") errors.push("animation.speed_ms_per_hop must be number");
      if (typeof p.animation.respects_prefers_reduced_motion !== "boolean") {
        errors.push("animation.respects_prefers_reduced_motion must be boolean");
      }
    }
  }
  return errors;
}

// ── Determinism: path_id hash ──────────────────────────────────────────

// Deterministic path_id so re-running the pentester pipeline against the
// same plant fixture produces stable IDs (idempotent merge contract).
// Inputs (in order): source_finding_id (or "no-cve"), compromised, target,
// hop chain serialized as "from→to:protocol:leverage". Leverage is included
// because two paths between the same endpoints with different leverage
// ARE different paths (e.g., default-creds vs. cached-creds).
export function computePathId({ source_finding_id, compromised_asset_id, target_asset_id, hops }) {
  const chain = (hops || [])
    .map((h) => `${h.from_asset_id}->${h.to_asset_id}:${h.protocol}:${h.leverage}`)
    .join("|");
  const key = `${source_finding_id || "no-cve"}|${compromised_asset_id}|${target_asset_id}|${chain}`;
  return "ap_" + createHash("sha1").update(key).digest("hex").slice(0, 12);
}

// ── Confidence formula ─────────────────────────────────────────────────

// path_confidence = min(hop_confidence) * cluster_bonus
// cluster_bonus = 1.0 base, +0.05 per matched cluster TTP up to +0.15 cap.
//
// Rationale (per persona): "Confidence is per-hop, not per-path. A 5-hop
// path with one weak hop is a weak path. Take the minimum then apply a
// small bonus if the chain matches a known TTP cluster."
export function computePathConfidence(hops, sector = null) {
  if (!Array.isArray(hops) || hops.length === 0) return 0;
  const minHop = hops.reduce((m, h) => Math.min(m, h.hop_confidence ?? 0), 1);

  // Aggregate the path's full TTP set.
  const pathTtps = new Set();
  for (const h of hops) {
    for (const t of h.mitre_attack_for_ics || []) pathTtps.add(t);
  }

  let bestBonus = 0;
  for (const [_name, cluster] of Object.entries(TTP_CLUSTERS)) {
    if (sector && cluster.sectors && !cluster.sectors.includes(sector)) continue;
    const overlap = cluster.canonical_ttps.filter((t) => pathTtps.has(t)).length;
    const bonus = Math.min(0.15, overlap * 0.05);
    if (bonus > bestBonus) bestBonus = bonus;
  }

  return Math.min(1.15, Number((minHop * (1 + bestBonus)).toFixed(3)));
}

// Identifies which TTP cluster (if any) a path most closely matches. Used
// for plant-manager narratives: "this chain matches the TRITON/TRISIS
// cluster — engineering workstation pivot to SIS via TSAA."
export function matchTtpCluster(hops, sector = null) {
  const pathTtps = new Set();
  for (const h of hops || []) {
    for (const t of h.mitre_attack_for_ics || []) pathTtps.add(t);
  }
  let best = null;
  let bestOverlap = 0;
  for (const [name, cluster] of Object.entries(TTP_CLUSTERS)) {
    if (sector && cluster.sectors && !cluster.sectors.includes(sector)) continue;
    const overlap = cluster.canonical_ttps.filter((t) => pathTtps.has(t)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = { cluster: name, ...cluster, overlap };
    }
  }
  return bestOverlap >= 2 ? best : null;
}

// ── Default animation block ────────────────────────────────────────────

// Defaults that match CLAUDE.md UI guardrails (Emil Kowalski rules,
// prefers-reduced-motion respected). UI consumer can override.
export function defaultAnimation(firstHopGating) {
  // Speed proportional to inverse exploit-gating severity.
  const speedByGating = {
    "confirmed-remote-unauth": 480,
    "confirmed-remote-auth": 560,
    "requires-credentials": 640,
    "requires-default-creds": 600,
    "requires-adjacent": 700,
    "requires-physical": 880,
    "requires-specific-firmware": 720,
    "theoretical-only": 1000,
  };
  return {
    color_token: "--sev-critical", // existing design-system token
    speed_ms_per_hop: speedByGating[firstHopGating] ?? 600,
    easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    respects_prefers_reduced_motion: true,
    label_each_hop: true,
    opacity_by_gating: {
      "confirmed-remote-unauth": 1.0,
      "confirmed-remote-auth": 0.95,
      "requires-credentials": 0.85,
      "requires-default-creds": 0.9,
      "requires-adjacent": 0.75,
      "requires-physical": 0.55, // weakest visual weight
      "requires-specific-firmware": 0.7,
      "theoretical-only": 0.45,
    },
  };
}

// Builds a complete attack_path entry with derived fields filled in.
// Caller supplies the structural pieces; this function adds path_id,
// path_confidence, and a default animation block.
export function buildAttackPath({
  source_finding_id,
  compromised_asset_id,
  target_asset_id,
  kill_chain_phase,
  hops,
  rationale,
  sector = null,
}) {
  const path_id = computePathId({ source_finding_id, compromised_asset_id, target_asset_id, hops });
  const path_confidence = computePathConfidence(hops, sector);
  const animation = defaultAnimation(hops?.[0]?.exploit_gating);
  return {
    path_id,
    source_finding_id: source_finding_id || null,
    compromised_asset_id,
    target_asset_id,
    kill_chain_phase,
    hops,
    path_confidence,
    rationale,
    animation,
  };
}
