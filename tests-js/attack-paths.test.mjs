// attack-paths.test.mjs
//
// Locks in the attack_paths[] schema validator and the 3 hand-built
// example paths used by the operator readout. These examples come
// straight from the energy-vertical kill-chain patterns documented in
// .claude/agents/blast-radius-pentester.md (Foxboro Evo / Mark VIe /
// Industroyer-class T&D).
//
// If these tests fail, either the validator changed shape (intentional —
// update the examples) or someone weakened a guard (unintentional —
// fix the guard).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateAttackPath,
  validateHop,
  computePathId,
  computePathConfidence,
  matchTtpCluster,
  buildAttackPath,
  KILL_CHAIN_PHASES,
  EXPLOIT_GATING,
  ICS_PROTOCOLS,
} from "../scripts/otsniff/attack-paths.mjs";

// ── Hand-built energy-refinery examples ────────────────────────────────
// These are the 3 examples in deliverable #4 (operator readout) of the
// blast-radius-pentester engagement. They match the KNPC plant fixture
// shape: a_eng_01 (Engineering WS), a_hist_01 (Plant Historian),
// a_foxboro_controllers (DCS controller), a_sis_01 (SIS).

export const EXAMPLE_PATHS = [
  // 1. TRITON/TRISIS-class: engineering workstation → SIS
  buildAttackPath({
    source_finding_id: "f_example_triton",
    compromised_asset_id: "a_eng_01",
    target_asset_id: "a_sis_01",
    kill_chain_phase: "inhibit-response",
    sector: "energy",
    rationale:
      "Attacker on the DCS engineering workstation reaches the Triconex SIS in 1 hop via the TSAA engineering protocol, downloads attacker-supplied safety logic, and silences the trip — TRITON/TRISIS pattern.",
    hops: [
      {
        from_asset_id: "a_eng_01",
        to_asset_id: "a_sis_01",
        protocol: "tsaa",
        leverage:
          "TriStation engineering session over TSAA with a cached project file and default keyswitch state on the Tricon",
        mitre_attack_for_ics: ["T0843", "T0858", "T0879"],
        exploit_gating: "requires-credentials",
        hop_confidence: 0.7,
      },
    ],
  }),

  // 2. Refinery DCS pivot: corporate IT → engineering WS → Foxboro controller
  buildAttackPath({
    source_finding_id: "f_example_foxboro",
    compromised_asset_id: "a_eng_01",
    target_asset_id: "a_foxboro_controllers",
    kill_chain_phase: "impair-control",
    sector: "energy",
    rationale:
      "Attacker on the Foxboro engineering workstation pivots to the FCP270 controller in 1 hop via the ENI engineering protocol, then issues unauthorized command messages to manipulate process setpoints.",
    hops: [
      {
        from_asset_id: "a_eng_01",
        to_asset_id: "a_foxboro_controllers",
        protocol: "eni",
        leverage:
          "Foxboro engineering session over ENI; default operator-role credential on the FCP270 still active",
        mitre_attack_for_ics: ["T0855", "T0831", "T0843"],
        exploit_gating: "requires-default-creds",
        hop_confidence: 0.75,
      },
    ],
  }),

  // 3. Volt-Typhoon-class: historian as dwell-and-pivot box
  buildAttackPath({
    source_finding_id: "f_example_pi_pivot",
    compromised_asset_id: "a_hist_01",
    target_asset_id: "a_foxboro_controllers",
    kill_chain_phase: "lateral-movement",
    sector: "energy",
    rationale:
      "Attacker dwelling on the Plant Historian uses cached PI Server credentials to reach the engineering workstation, then exploits an unauthenticated CIP service on the controller — Volt-Typhoon-class living-off-the-land.",
    hops: [
      {
        from_asset_id: "a_hist_01",
        to_asset_id: "a_eng_01",
        protocol: "osi-pi",
        leverage:
          "Cached PI Server service-account credential reused on the engineering workstation (T0859 valid accounts)",
        mitre_attack_for_ics: ["T0859", "T0886"],
        exploit_gating: "requires-credentials",
        hop_confidence: 0.7,
      },
      {
        from_asset_id: "a_eng_01",
        to_asset_id: "a_foxboro_controllers",
        protocol: "ethernet-ip",
        leverage:
          "Unauthenticated CIP service on the controller (CVE-class primitive — verified per matched advisory)",
        mitre_attack_for_ics: ["T0866", "T0843"],
        exploit_gating: "confirmed-remote-unauth",
        hop_confidence: 0.9,
      },
    ],
  }),
];

// ── Tests ──────────────────────────────────────────────────────────────

test("attack-paths: example paths all validate", () => {
  for (const p of EXAMPLE_PATHS) {
    const errors = validateAttackPath(p);
    assert.deepEqual(errors, [], `path ${p.path_id} invalid: ${errors.join("; ")}`);
  }
});

test("attack-paths: rejects self-loop hop", () => {
  const errors = validateHop({
    from_asset_id: "a", to_asset_id: "a",
    protocol: "modbus-tcp", leverage: "valid-account credential",
    mitre_attack_for_ics: ["T0859"], exploit_gating: "requires-credentials",
    hop_confidence: 0.5,
  });
  assert.ok(errors.some((e) => /self-loop/.test(e)), `expected self-loop rejection, got: ${errors.join("; ")}`);
});

test("attack-paths: rejects malformed T-code", () => {
  const errors = validateHop({
    from_asset_id: "a", to_asset_id: "b",
    protocol: "modbus-tcp", leverage: "valid-account credential",
    mitre_attack_for_ics: ["TICS-859", "T0859"],   // first one malformed
    exploit_gating: "requires-credentials", hop_confidence: 0.5,
  });
  assert.ok(errors.some((e) => /Txxxx format/.test(e)), `expected T-code format rejection, got: ${errors.join("; ")}`);
});

test("attack-paths: rejects chain break between hops", () => {
  const broken = {
    path_id: "ap_broken",
    source_finding_id: null,
    compromised_asset_id: "a",
    target_asset_id: "c",
    kill_chain_phase: "lateral-movement",
    hops: [
      { from_asset_id: "a", to_asset_id: "b",
        protocol: "modbus-tcp", leverage: "valid-account",
        mitre_attack_for_ics: ["T0859"], exploit_gating: "requires-credentials",
        hop_confidence: 0.7 },
      // chain break: from_asset_id should be "b" not "x"
      { from_asset_id: "x", to_asset_id: "c",
        protocol: "ethernet-ip", leverage: "unauth CIP service",
        mitre_attack_for_ics: ["T0866"], exploit_gating: "confirmed-remote-unauth",
        hop_confidence: 0.9 },
    ],
    path_confidence: 0.7,
    rationale: "broken chain test sentence here",
  };
  const errors = validateAttackPath(broken);
  assert.ok(errors.some((e) => /chain break/.test(e)), `expected chain-break rejection, got: ${errors.join("; ")}`);
});

test("attack-paths: rejects unknown protocol", () => {
  const bad = {
    path_id: "ap_bad",
    compromised_asset_id: "a",
    target_asset_id: "b",
    kill_chain_phase: "lateral-movement",
    hops: [{
      from_asset_id: "a", to_asset_id: "b",
      protocol: "carrier-pigeon",
      leverage: "homing instinct hopefully",
      mitre_attack_for_ics: ["T0859"],
      exploit_gating: "requires-credentials",
      hop_confidence: 0.5,
    }],
    path_confidence: 0.5,
    rationale: "carrier pigeon test rationale",
  };
  const errors = validateAttackPath(bad);
  assert.ok(errors.some((e) => /protocol invalid/.test(e)), `expected protocol rejection, got: ${errors.join("; ")}`);
});

test("attack-paths: path_id is deterministic across runs", () => {
  const inputs = {
    source_finding_id: "f_x",
    compromised_asset_id: "a",
    target_asset_id: "b",
    hops: [{ from_asset_id: "a", to_asset_id: "b", protocol: "modbus-tcp", leverage: "valid-account credential cached" }],
  };
  assert.equal(computePathId(inputs), computePathId(inputs));
});

test("attack-paths: confidence = min(hop) baseline (no cluster overlap)", () => {
  const hops = [
    { hop_confidence: 0.9, mitre_attack_for_ics: ["T0807"] },         // unrelated TTP
    { hop_confidence: 0.6, mitre_attack_for_ics: ["T0890"] },
  ];
  const c = computePathConfidence(hops, "energy");
  assert.equal(c, 0.6, `expected min hop confidence 0.6, got ${c}`);
});

test("attack-paths: TRITON/TRISIS-class chain earns cluster bonus", () => {
  const tritonPath = EXAMPLE_PATHS[0]; // T0843, T0858, T0879
  const cluster = matchTtpCluster(tritonPath.hops, "energy");
  assert.ok(cluster, "expected to identify TRITON/TRISIS cluster");
  assert.equal(cluster.cluster, "triton-trisis");
  assert.ok(cluster.overlap >= 2, `expected ≥2 TTP overlap, got ${cluster.overlap}`);
  // path_confidence should exceed min_hop_confidence (0.7) due to cluster bonus
  assert.ok(tritonPath.path_confidence > 0.7, `expected cluster bonus, got ${tritonPath.path_confidence}`);
});

test("attack-paths: vocabulary is closed and complete", () => {
  // sanity: the four phases the persona file mentions are all present
  for (const p of ["lateral-movement", "inhibit-response", "impair-control", "loss-of-view", "loss-of-control"]) {
    assert.ok(KILL_CHAIN_PHASES.includes(p), `KILL_CHAIN_PHASES missing: ${p}`);
  }
  // exploit_gating: requires-physical and confirmed-remote-unauth must both exist
  assert.ok(EXPLOIT_GATING.includes("requires-physical"));
  assert.ok(EXPLOIT_GATING.includes("confirmed-remote-unauth"));
  // ICS_PROTOCOLS: TSAA (Triconex), ENI (Foxboro), ICCP, OSI PI
  for (const p of ["tsaa", "eni", "iccp", "osi-pi", "ethernet-ip", "iec-61850-goose"]) {
    assert.ok(ICS_PROTOCOLS.includes(p), `ICS_PROTOCOLS missing: ${p}`);
  }
});

test("attack-paths: animation block obeys CLAUDE.md motion rules", () => {
  for (const p of EXAMPLE_PATHS) {
    assert.equal(p.animation.color_token, "--sev-critical", "must use design-system token, not raw red");
    assert.equal(p.animation.respects_prefers_reduced_motion, true, "must respect prefers-reduced-motion");
    assert.ok(/cubic-bezier/.test(p.animation.easing), "must declare a cubic-bezier easing per project rules");
    // requires-physical first hop must have lower opacity than confirmed-remote-unauth
    assert.ok(p.animation.opacity_by_gating["requires-physical"] < p.animation.opacity_by_gating["confirmed-remote-unauth"],
      "requires-physical must paint with reduced opacity");
  }
});
