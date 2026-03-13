const severityWeights = { critical: 1.0, high: 0.75, medium: 0.45, low: 0.2 };
const criticalAssetTypes = new Set(["plc", "scada", "hmi", "historian", "safety-controller", "rtu"]);

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
    version: comp.version || "n/a",
    asset_type: String(comp.asset_type || "other").toLowerCase(),
    exposed_to_internet: toBool(comp.exposed_to_internet),
    vulnerabilities: Array.isArray(comp.vulnerabilities)
      ? comp.vulnerabilities.map((v) => ({ severity: normalizeSeverity(v.severity) }))
      : [],
  }));
}

function parseNetworkCsv(csvText) {
  const lines = String(csvText || "").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

  return lines.slice(1)
    .map((line) => line.split(","))
    .filter((row) => row.length >= 4)
    .map((row) => {
      const source = row[idx.source]?.trim();
      const target = row[idx.target]?.trim();
      let zoneTrust = (row[idx.zone_trust] || "trusted").trim().toLowerCase();
      if (!["untrusted", "dmz", "trusted"].includes(zoneTrust)) zoneTrust = "trusted";
      let segmentationStrength = Number.parseFloat(row[idx.segmentation_strength] || "0.5");
      if (Number.isNaN(segmentationStrength)) segmentationStrength = 0.5;
      segmentationStrength = Math.max(0, Math.min(1, segmentationStrength));
      return { source, target, zone_trust: zoneTrust, segmentation_strength: segmentationStrength };
    })
    .filter((l) => l.source && l.target);
}

function inferTrust(source, target) {
  const s = `${source} ${target}`.toLowerCase();
  if (["internet", "external", "corp", "level 5"].some((t) => s.includes(t))) return "untrusted";
  if (s.includes("dmz") || s.includes("3.5")) return "dmz";
  return "trusted";
}

function parseNetworkPdfText(text) {
  const pattern = /([A-Za-z0-9 ._\-/()]+?)\s*(?:->|→|=>|to)\s*([A-Za-z0-9 ._\-/()]+)/g;
  const links = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    for (const m of line.matchAll(pattern)) {
      const source = m[1].trim();
      const target = m[2].trim();
      if (!source || !target) continue;
      const zone = inferTrust(source, target);
      const seg = zone === "untrusted" ? 0.35 : zone === "dmz" ? 0.55 : 0.75;
      links.push({ source, target, zone_trust: zone, segmentation_strength: seg });
    }
  }
  const dedupe = new Map();
  for (const l of links) dedupe.set(`${l.source}|${l.target}|${l.zone_trust}`, l);
  return [...dedupe.values()];
}

function vulnWeighted(vulns) {
  return Math.min((vulns || []).reduce((acc, v) => acc + severityWeights[normalizeSeverity(v.severity)], 0), 3.0);
}

function computeRisk(assets, links) {
  const inbound = new Map();
  for (const l of links) {
    if (!inbound.has(l.target)) inbound.set(l.target, []);
    inbound.get(l.target).push(l);
  }

  const scored = assets.map((a) => {
    const base = criticalAssetTypes.has(a.asset_type) ? 10 : 4;
    const vitScore = 20 * (vulnWeighted(a.vulnerabilities) / 3);
    const exposure = a.exposed_to_internet ? 25 : 0;
    let network = 0;
    for (const l of inbound.get(a.name) || []) {
      const trust = { untrusted: 1.0, dmz: 0.6, trusted: 0.2 }[l.zone_trust];
      network += 15 * trust * (1 - l.segmentation_strength);
    }
    const risk = Math.min(base + vitScore + exposure + network, 100);
    return { ...a, risk_score: Number(risk.toFixed(2)), vit_score: Number(vitScore.toFixed(2)) };
  }).sort((a, b) => b.risk_score - a.risk_score);

  if (!scored.length) {
    return {
      assets: [],
      links,
      summary: { overall_score: 0, max_asset_score: 0, internet_exposed_count: 0, vulnerable_component_count: 0, critical_link_count: 0 },
    };
  }

  const overall = scored.reduce((s, a) => s + a.risk_score, 0) / scored.length;
  const max = Math.max(...scored.map((a) => a.risk_score));

  return {
    assets: scored,
    links,
    summary: {
      overall_score: Number(overall.toFixed(2)),
      max_asset_score: Number(max.toFixed(2)),
      internet_exposed_count: scored.filter((a) => a.exposed_to_internet).length,
      vulnerable_component_count: scored.filter((a) => (a.vulnerabilities || []).length).length,
      critical_link_count: links.filter((l) => l.zone_trust === "untrusted" && l.segmentation_strength < 0.5).length,
    },
  };
}

async function shodanByComponent(assets, limit) {
  const key = process.env.SHODAN_API_KEY;
  if (!key) return [];
  const out = [];
  for (const asset of assets.slice(0, limit)) {
    const query = `product:\"${asset.name}\"`;
    try {
      const url = `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      out.push({ component: asset.name, query, matches: data.total || 0 });
    } catch (e) {
      out.push({ component: asset.name, query, matches: `error: ${e.message}` });
    }
  }
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const assets = parseSbom(body.sbom || {});
    let links = [];
    if (body.network_csv) links = parseNetworkCsv(body.network_csv);
    if (!links.length && body.network_pdf_text) links = parseNetworkPdfText(body.network_pdf_text);

    const result = computeRisk(assets, links);
    const shodan = body.enable_shodan ? await shodanByComponent(result.assets, Number(body.shodan_limit || 5)) : [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result, shodan }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
