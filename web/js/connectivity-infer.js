// connectivity-infer.js — derive plausible OT/IT conduits from each asset's
// role + Purdue level when the customer-supplied connectivity[] is sparse
// or absent. Used by the architecture view to render an "expected flow"
// layer on top of the declared connectivity.
//
// All inferred conduits carry { _inferred: true, _reason: "<rule>" } so the
// renderer can style them differently (dashed, lower opacity) and the
// operator can audit each one.
//
// Hard rules:
//   - Never infer a conduit from a controller UP into IT zones (L4+) — those
//     are governed by ACLs, not visibility-based.
//   - Cap fan-out per source asset at 30 to avoid degenerating into a hairball.
//   - Skip if either endpoint is missing a zone or asset_type.
//   - Don't duplicate edges that already exist in declared[].

const LEVEL_RANK = { L0: 0, L1: 1, L2: 2, L3: 3, "L3.5": 3.5, L4: 4 };

const ROLE_RULES = [
  // Cyber-services hub — Active Directory authentication
  {
    id: "domain-controller-fans-out",
    when: (a, ctx) => /\b(domain controller|\bPDC\b|\bSDC\b|primary domain|secondary domain)\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      b.asset_type === "scada-server" &&
      ctx.lvl(b) >= 2 // anything L2 and above
    ),
    protocol: "ldap",
    port: 389,
    trust: "high",
    direction: "bi",
    reason: "Domain controller authenticates servers in OT zones (LDAP/Kerberos)",
  },
  // RADIUS — network access authentication
  {
    id: "radius-fans-out",
    when: (a) => /\bRADIUS\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["firewall", "switch", "scada-server"].includes(b.asset_type)
    ),
    protocol: "https",
    port: 1812,
    trust: "high",
    direction: "uni",
    reason: "RADIUS server authenticates network device + console access",
  },
  // WSUS — Windows update distribution
  {
    id: "wsus-fans-out",
    when: (a) => /\bWSUS\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["scada-server", "historian", "hmi", "engineering-workstation"].includes(b.asset_type)
    ),
    protocol: "https",
    port: 8530,
    trust: "high",
    direction: "uni",
    reason: "WSUS pushes Windows updates to OT endpoints",
  },
  // ePO — endpoint protection
  {
    id: "epo-fans-out",
    when: (a) => /\b(epo|ePolicy|trellix|mcafee endpoint)\b/i.test([a.name, a.vendor, a.model].join(" ")),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["scada-server", "historian", "hmi", "engineering-workstation"].includes(b.asset_type)
    ),
    protocol: "https",
    port: 443,
    trust: "high",
    direction: "bi",
    reason: "ePO collects telemetry + pushes policy to managed endpoints",
  },
  // NTP — time sync (everyone needs it)
  {
    id: "ntp-fans-out",
    when: (a) => /\bNTP\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["scada-server", "historian", "hmi", "engineering-workstation", "plc", "safety-controller", "rtu"].includes(b.asset_type)
    ),
    protocol: "tcp",
    port: 123,
    trust: "medium",
    direction: "uni",
    reason: "NTP time sync to control-system endpoints",
  },
  // Log/SIEM — collects from everywhere
  {
    id: "log-fans-in",
    when: (a) => /\b(log\s*server|SIEM|syslog)\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["scada-server", "historian", "firewall", "switch", "hmi", "engineering-workstation"].includes(b.asset_type)
    ),
    protocol: "tcp",
    port: 514,
    trust: "medium",
    direction: "uni",
    reason: "Endpoint syslog → centralized log server",
  },
  // CA Server — issues certs to zone services
  {
    id: "ca-fans-out",
    when: (a) => /\b(CA Server|Certificate Authority)\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["scada-server", "historian", "engineering-workstation"].includes(b.asset_type)
    ),
    protocol: "https",
    port: 443,
    trust: "high",
    direction: "bi",
    reason: "Certificate Authority issues TLS certs to OT services",
  },
  // SCADA / Historian → HMI in lower-level zone (OPC UA)
  {
    id: "scada-to-hmi",
    when: (a) => a.asset_type === "scada-server" || a.asset_type === "historian",
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      b.asset_type === "hmi" &&
      ctx.lvl(b) <= ctx.lvl(a)
    ),
    protocol: "opc-ua",
    port: 4840,
    trust: "high",
    direction: "bi",
    reason: "SCADA/Historian reads operator data from HMIs (OPC UA)",
  },
  // Engineering workstation → PLCs (logic push)
  {
    id: "ews-to-plcs",
    when: (a) => a.asset_type === "engineering-workstation",
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["plc", "safety-controller", "rtu"].includes(b.asset_type)
    ),
    protocol: "ethernet-ip",
    port: 44818,
    trust: "medium",
    direction: "bi",
    reason: "Engineering workstation pushes logic to controllers",
  },
  // HMI → PLCs in same zone (control)
  {
    id: "hmi-to-plc",
    when: (a) => a.asset_type === "hmi",
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      ["plc", "safety-controller"].includes(b.asset_type) &&
      Math.abs(ctx.lvl(b) - ctx.lvl(a)) <= 1
    ),
    protocol: "ethernet-ip",
    port: 44818,
    trust: "high",
    direction: "bi",
    reason: "HMI reads/writes control variables on PLC (EtherNet/IP)",
  },
  // PLC → Safety controller in same zone
  {
    id: "plc-to-safety",
    when: (a) => a.asset_type === "plc",
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      b.asset_type === "safety-controller" &&
      b.zone_id === a.zone_id
    ),
    protocol: "ethernet-ip",
    port: 44818,
    trust: "medium",
    direction: "uni",
    reason: "PLC ↔ SIS interlock signaling",
  },
  // RTU ← SCADA (telemetry pull)
  {
    id: "scada-to-rtu",
    when: (a) => a.asset_type === "scada-server",
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      b.asset_type === "rtu"
    ),
    protocol: "dnp3",
    port: 20000,
    trust: "medium",
    direction: "bi",
    reason: "SCADA polls RTU telemetry (DNP3)",
  },
  // Thin client → virtualization host (it streams from)
  {
    id: "thin-client-to-host",
    when: (a) => /\bthin client\b/i.test(a.name || ""),
    targets: (a, ctx) => ctx.assets.filter(b =>
      b.asset_id !== a.asset_id &&
      /\b(VM Host|Virtualization Host|virtual host)\b/i.test(b.name || "")
    ),
    protocol: "tcp",
    port: 3389,
    trust: "high",
    direction: "bi",
    reason: "Thin client streams desktop from virtualization host (RDP/PCoIP)",
  },
];

const MAX_FANOUT_PER_RULE = 30;

export function inferConnectivityFromFunction(assets, zones, declared = []) {
  if (!Array.isArray(assets) || !Array.isArray(zones)) return [];

  const zoneById = new Map(zones.map(z => [z.zone_id, z]));
  const lvl = (asset) => {
    const z = zoneById.get(asset.zone_id);
    return z ? (LEVEL_RANK[z.level] ?? 2) : 2;
  };
  const ctx = { assets, zones, zoneById, lvl };

  // Index of declared edges so we don't duplicate
  const declaredKeys = new Set(
    (declared || []).map(c => `${c.source_asset_id}|${c.target_asset_id}|${c.protocol}|${c.port}`)
  );

  const out = [];
  const seen = new Set();
  const pushEdge = (src, dst, rule) => {
    if (!src.asset_id || !dst.asset_id || src.asset_id === dst.asset_id) return;
    const k = `${src.asset_id}|${dst.asset_id}|${rule.protocol}|${rule.port}`;
    if (declaredKeys.has(k) || seen.has(k)) return;
    seen.add(k);
    out.push({
      source_asset_id: src.asset_id,
      target_asset_id: dst.asset_id,
      protocol: rule.protocol,
      port: rule.port,
      trust_level: rule.trust,
      allowed_direction: rule.direction,
      _inferred: true,
      _reason: rule.reason,
    });
  };

  for (const a of assets) {
    if (!a || !a.asset_type || !a.zone_id) continue;
    for (const rule of ROLE_RULES) {
      if (!rule.when(a, ctx)) continue;
      let targets = rule.targets(a, ctx) || [];
      // Cap fan-out per (source, rule) to avoid hairballs
      if (targets.length > MAX_FANOUT_PER_RULE) {
        targets = targets.slice(0, MAX_FANOUT_PER_RULE);
      }
      for (const t of targets) pushEdge(a, t, rule);
    }
  }
  return out;
}
