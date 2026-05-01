// asset-function.js — infer the essential function (one-line description of
// what an asset *does*) from its name + asset_type + zone level + vendor/
// model. Used by both the onboarding form (suggest a value) and the BOM
// table (show inferred when stored value is empty).
//
// The output is a one-sentence operator-readable description, e.g.
//   "Primary process control loop execution (Foxboro DCS)"
//   "Engineering workstation — pushes program changes to PLCs"
//   "Domain controller — Active Directory authentication for OT users"
//
// Hard rules:
//   - Never invent vendor/model. Use what's on the asset only.
//   - Never claim certainty when inferring — "likely" / "presumed" is fine.
//   - One sentence, ≤ 110 chars.

const TYPE_TEMPLATES = {
  "scada-server":            "SCADA server — supervisory control and data aggregation",
  "historian":               "Plant historian — long-term process-data archive for compliance + analysis",
  "hmi":                     "Operator HMI — human-machine interface for plant operations staff",
  "engineering-workstation": "Engineering workstation — pushes logic and config changes to controllers",
  "plc":                     "PLC — executes process control logic on the plant floor",
  "safety-controller":       "Safety controller (SIS) — interlock and emergency-shutdown logic",
  "rtu":                     "Remote telemetry unit — field data acquisition over WAN/cellular",
  "firewall":                "Network firewall — zone boundary enforcement",
  "switch":                  "Network switch — Layer-2 segment for OT traffic",
};

// Specialized name patterns — checked BEFORE the generic asset_type template.
// Order matters: more specific patterns first.
const NAME_PATTERNS = [
  // Servers / VMs
  { re: /\b(domain controller|\bPDC\b|\bSDC\b)\b/i,    fn: "Domain controller — Active Directory authentication for OT users" },
  { re: /\bRADIUS\b/i,                                  fn: "RADIUS server — centralized authentication for network access" },
  { re: /\bWSUS\b/i,                                    fn: "WSUS server — Windows update distribution to OT endpoints" },
  { re: /\bNTP\b/i,                                     fn: "NTP server — time synchronization for control-system logging" },
  { re: /\b(epo|ePolicy)\b/i,                           fn: "Trellix ePO — endpoint protection policy + telemetry hub" },
  { re: /\b(Nozomi|IDS|intrusion detection)\b/i,        fn: "Network IDS — passive OT traffic monitoring + anomaly detection" },
  { re: /\b(NAS|Centralized Backup|file collector)\b/i, fn: "Centralized storage — file/backup target for control-system data" },
  { re: /\b(Log\s*Server|SIEM|syslog)\b/i,              fn: "Log aggregation — security event collection and retention" },
  { re: /\b(NPM|Network Performance)\b/i,               fn: "Network performance monitor — link health + latency metrics" },
  { re: /\b(CA Server|Certificate Authority)\b/i,       fn: "Certificate authority — issues TLS/identity certs for OT services" },
  { re: /\b(CS Virtualization Host|Virtual Host|VM Host)\b/i, fn: "Virtualization host — runs the cybersecurity-zone VMs" },
  { re: /\b(Thin Client|Zero Client)\b/i,               fn: "Thin client — operator workstation streaming a virtualized HMI" },
  { re: /\b(IP21|InfoPlus|Aspen)\b/i,                   fn: "Process information server (Aspen IP21) — historian + analytics" },
  { re: /\b(DMC|MPC|Advanced Process Control)\b/i,      fn: "Advanced Process Control (DMC/MPC) — model-based optimization" },
  { re: /\b(Dynamo)\b/i,                                fn: "Honeywell Dynamo — DCS data collector / gateway" },

  // Controllers
  { re: /\bFoxboro|FCP\d{2,3}|FDC\d{2,3}|FBM\d{2,3}\b/i, fn: "Foxboro DCS controller — primary process control loop execution" },
  { re: /\bTriconex|Trident|Tricon\b/i,                 fn: "Triconex SIS — emergency shutdown and process safety logic" },
  { re: /\bAB PLC|Allen-Bradley|ControlLogix\b/i,       fn: "Allen-Bradley PLC — discrete + sequential control logic" },
  { re: /\bGuardLogix\b/i,                              fn: "GuardLogix safety PLC — integrated safety + standard control" },
  { re: /\bExperion|C300\b/i,                           fn: "Honeywell Experion controller — DCS process control" },
  { re: /\bDeltaV\b/i,                                  fn: "Emerson DeltaV controller — DCS process control" },
  { re: /\bCENTUM\b/i,                                  fn: "Yokogawa CENTUM — DCS process control" },
  { re: /\b800xA|AC800M\b/i,                            fn: "ABB 800xA controller — DCS process control" },
  { re: /\bSIMATIC|S7-\d+\b/i,                          fn: "Siemens SIMATIC PLC — discrete + process control logic" },
  { re: /\bSCADAPack|FloBoss|ROC8\d+\b/i,               fn: "Field RTU — remote process telemetry over cellular/serial" },

  // Boundary / network
  { re: /\bConneXium|FortiGate|Forti|Palo Alto\b/i,     fn: "Industrial firewall — zone boundary enforcement + DPI" },
  { re: /\b(MESH|Edge|Distribution|Root)\s+Switch\b/i,  fn: "OT network switch — Layer-2 segment for control-system traffic" },

  // Process-area workstations
  { re: /\bDCS OWS|operator station\b/i,                fn: "DCS operator workstation — process operations console" },
  { re: /\bDCS AMS|asset management\b/i,                fn: "Asset management station — instrument calibration + diagnostics" },
  { re: /\bDisplay Wall|DWS\b/i,                        fn: "Display wall server — feeds large-screen control-room displays" },
];

export function inferAssetFunction(asset) {
  if (!asset) return "";
  const name = String(asset.name || "");
  const type = String(asset.asset_type || "");
  const text = `${name} ${asset.vendor || ""} ${asset.model || ""} ${asset.process_tag || ""}`;

  for (const p of NAME_PATTERNS) {
    if (p.re.test(text)) return p.fn;
  }
  if (TYPE_TEMPLATES[type]) return TYPE_TEMPLATES[type];
  if (name) return `${name} — function not yet captured`;
  return "Function not yet captured";
}

// What a successful compromise of this asset means in operational terms.
// Used by the blast-radius UI to give a non-CVE-driven impact narrative.
export function inferCompromiseImpact(asset, zone) {
  if (!asset) return "Compromise impact unknown — capture asset_type and zone first.";
  const t = String(asset.asset_type || "");
  const lvl = String(zone?.level || "");
  const crit = Number(asset.criticality_score || 0);

  const baseByType = {
    "plc":                     "Direct control over the physical process. Attacker can manipulate setpoints, force outputs, or stop the process. Safety implications.",
    "safety-controller":       "Defeat of plant safety interlocks. Attacker can suppress emergency shutdowns or trigger spurious trips. Personnel + equipment at risk.",
    "scada-server":            "Operator visibility lost or falsified. Attacker can blind operators, push false alarms, or pivot to controllers via legitimate channels.",
    "historian":               "Compliance + analytics data integrity at risk. Attacker can erase forensic trail or poison the dataset feeding APC and reporting.",
    "hmi":                     "Operator-facing interface compromised. Attacker can drive operator into wrong actions or use HMI as a pivot to controllers.",
    "engineering-workstation": "Logic upload path to every controller it can reach. Attacker pushing malicious program = persistence at the control layer.",
    "rtu":                     "Field-area telemetry compromised. Attacker can spoof readings to SCADA or impair lift-station / pipeline operation.",
    "firewall":                "Zone boundary collapsed. Attacker bypasses network segmentation and reaches deeper levels of the Purdue model.",
    "switch":                  "L2 segment exposed. Attacker can MITM control protocols or VLAN-hop into adjacent zones.",
  };

  const note = baseByType[t] || "Asset role not classified — compromise impact requires onsite review.";
  const levelClause = lvl
    ? ` Located at ${lvl} (${purdueLabel(lvl)}).`
    : "";
  const critClause = crit >= 9
    ? " Marked criticality 9+ — treat any compromise as a process-stop event."
    : crit >= 7
      ? " Marked criticality 7-8 — degraded-mode operation likely."
      : "";

  return `${note}${levelClause}${critClause}`.trim();
}

function purdueLabel(level) {
  const map = {
    "L0":  "field instruments",
    "L1":  "basic control",
    "L2":  "supervisory / HMI",
    "L3":  "operations",
    "L3.5":"OT DMZ",
    "L4":  "enterprise",
  };
  return map[level] || level;
}
