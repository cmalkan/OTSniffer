// Normalized finding schema shared by every toolchain phase.
// Keep tool-agnostic so scanners can be swapped without touching risk_engine / simulation.

export const FINDING_TYPES = /** @type {const} */ ([
  "secret_leak",
  "supply_chain",
  "mesh_gap",
  "validated_creds",
  "exposure",
]);

export const SEVERITIES = /** @type {const} */ (["critical", "high", "medium", "low", "info"]);

export const SOURCE_TOOLS = /** @type {const} */ ([
  "noseyparker",
  "gato-x",
  "snowcat",
  "trident",
  "chariot",
  "shodan",
  "manual",
]);

const SEVERITY_SET = new Set(SEVERITIES);
const TYPE_SET = new Set(FINDING_TYPES);
const TOOL_SET = new Set(SOURCE_TOOLS);

export function validateFinding(f) {
  const errors = [];
  if (!f || typeof f !== "object") return ["finding must be an object"];
  if (typeof f.finding_id !== "string" || !f.finding_id) errors.push("finding_id required");
  if (typeof f.asset_id !== "string" || !f.asset_id) errors.push("asset_id required");
  if (!TYPE_SET.has(f.finding_type)) errors.push(`finding_type invalid: ${f.finding_type}`);
  if (!SEVERITY_SET.has(f.severity)) errors.push(`severity invalid: ${f.severity}`);
  if (!TOOL_SET.has(f.source_tool)) errors.push(`source_tool invalid: ${f.source_tool}`);
  if (typeof f.evidence !== "string") errors.push("evidence must be string");
  if (typeof f.detected_at !== "string") errors.push("detected_at must be ISO-8601 string");
  if (typeof f.confidence !== "number" || f.confidence < 0 || f.confidence > 1)
    errors.push("confidence must be number in [0,1]");
  return errors;
}

const TYPE_TO_VULN_PREFIX = {
  secret_leak: "SECRET",
  supply_chain: "SUPPLY",
  mesh_gap: "MESH",
  validated_creds: "CRED",
  exposure: "EXPOSURE",
};

// Projects a finding into the vulnerability shape the existing simulation already consumes.
export function findingToVulnerability(finding) {
  return {
    vuln_id: finding.finding_id,
    cve: `${TYPE_TO_VULN_PREFIX[finding.finding_type] ?? "EVIDENCE"}-${finding.finding_id}`,
    description: finding.evidence.slice(0, 300),
    severity: finding.severity === "info" ? "low" : finding.severity,
    exploitability: Math.max(0, Math.min(1, finding.confidence)),
    asset_id: finding.asset_id,
    source_tool: finding.source_tool,
    evidence_finding_id: finding.finding_id,
  };
}
