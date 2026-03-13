const severityWeights = { critical: 1.0, high: 0.75, medium: 0.45, low: 0.2 };

function normalizeSeverity(value) {
  const cleaned = String(value || "medium").trim().toLowerCase();
  return severityWeights[cleaned] ? cleaned : "medium";
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return ["1", "true", "yes", "y"].includes(String(v || "").toLowerCase());
}

function parseSbom(sbomJson) {
  const raw = sbomJson && Array.isArray(sbomJson.components) ? sbomJson.components : [];
  return raw.map((comp) => ({
    name: comp.name || "unknown",
    exposed_to_internet: toBool(comp.exposed_to_internet),
    vulnerabilities: Array.isArray(comp.vulnerabilities)
      ? comp.vulnerabilities.map((v) => ({ severity: normalizeSeverity(v.severity) }))
      : [],
  }));
}

function computeRisk(assets) {
  const enriched = assets.map((a) => {
    const vuln = a.vulnerabilities.reduce((acc, v) => acc + severityWeights[normalizeSeverity(v.severity)], 0);
    const score = Math.min((a.exposed_to_internet ? 35 : 10) + vuln * 20, 100);
    return { ...a, risk_score: Number(score.toFixed(2)) };
  }).sort((a, b) => b.risk_score - a.risk_score);

  return {
    assets: enriched,
    summary: {
      overall_score: enriched.length ? Number((enriched.reduce((s, x) => s + x.risk_score, 0) / enriched.length).toFixed(2)) : 0,
      internet_exposed_count: enriched.filter((x) => x.exposed_to_internet).length,
      vulnerable_component_count: enriched.filter((x) => x.vulnerabilities.length).length,
    },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const assets = parseSbom(body.sbom || {});
    const result = computeRisk(assets);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: String(err) }) };
  }
};
