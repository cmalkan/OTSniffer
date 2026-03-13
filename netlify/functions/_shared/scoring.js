// Transparent scoring weights for demo explainability.
const SEVERITY_WEIGHT = { low: 0.25, medium: 0.5, high: 0.8, critical: 1.0 };
const TRUST_WEIGHT = { low: 0.45, medium: 0.7, high: 1.0 };

function severityOfVulns(vulns) {
  if (!vulns || !vulns.length) return 0.25; // Assumption: unknown risk is non-zero but low confidence.
  return Math.min(
    1,
    vulns.reduce((acc, v) => acc + (SEVERITY_WEIGHT[String(v.severity).toLowerCase()] || 0.4), 0) / vulns.length,
  );
}

function zoneSensitivity(zone) {
  // OT process layers deeper in Purdue model are treated as more operationally sensitive.
  if (!zone || !zone.level) return 0.7;
  if (String(zone.level).includes('1')) return 1.0;
  if (String(zone.level).includes('2')) return 0.9;
  if (String(zone.level).includes('3')) return 0.75;
  return 0.6;
}

function controllerMultiplier(assetType) {
  const t = String(assetType || '').toLowerCase();
  if (['plc', 'rtu', 'safety-controller'].includes(t)) return 1.2;
  if (['hmi', 'scada-server'].includes(t)) return 1.05;
  return 1.0;
}

function computeAssetRisk({ reachabilityFactor, vulnerabilitySeverity, assetCriticality, zoneSensitivityFactor, assetType }) {
  const base = reachabilityFactor * vulnerabilitySeverity * (assetCriticality / 10) * zoneSensitivityFactor * controllerMultiplier(assetType);
  return Math.min(100, Number((base * 100).toFixed(2)));
}

function pathRiskScore(path, trustLevels) {
  const trustAvg = trustLevels.length
    ? trustLevels.reduce((a, t) => a + (TRUST_WEIGHT[t] || 0.65), 0) / trustLevels.length
    : 0.6;
  const complexityPenalty = Math.max(0.55, 1 - (path.length - 1) * 0.08);
  return Number((100 * trustAvg * complexityPenalty).toFixed(2));
}

function confidenceScore(data) {
  const checks = [
    data.assets.length >= 4,
    data.connectivity.length >= 4,
    data.vulnerabilities.length >= 2,
    data.process_functions.length >= 2,
    data.zones.length >= 3,
  ];
  const ratio = checks.filter(Boolean).length / checks.length;
  return Number((ratio * 100).toFixed(2));
}

module.exports = {
  computeAssetRisk,
  pathRiskScore,
  confidenceScore,
  severityOfVulns,
  zoneSensitivity,
};
