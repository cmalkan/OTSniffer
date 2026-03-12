const severityWeights = { critical: 1.0, high: 0.75, medium: 0.45, low: 0.2 };
const criticalAssetTypes = new Set(["plc", "scada", "hmi", "historians", "safety-system", "dcs"]);

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

  return lines
    .slice(1)
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

function inferZoneTrust(source, target) {
  const text = `${source} ${target}`.toLowerCase();
  if (["internet", "external", "corp", "level 5", "level5"].some((x) => text.includes(x))) return "untrusted";
  if (text.includes("dmz") || text.includes("3.5")) return "dmz";
  return "trusted";
}

function parseNetworkPdfText(pdfText) {
  const pattern = /([A-Za-z0-9 ._\-/()]+?)\s*(?:->|→|=>|to)\s*([A-Za-z0-9 ._\-/()]+)/g;
  const links = [];
  for (const line of String(pdfText || "").split(/\r?\n/)) {
    for (const match of line.matchAll(pattern)) {
      const source = match[1].trim();
      const target = match[2].trim();
      if (!source || !target) continue;
      const zone = inferZoneTrust(source, target);
      const seg = zone === "untrusted" ? 0.35 : zone === "dmz" ? 0.55 : 0.75;
      links.push({ source, target, zone_trust: zone, segmentation_strength: seg });
    }
  }

  const dedup = new Map();
  for (const l of links) dedup.set(`${l.source}|${l.target}|${l.zone_trust}`, l);
  return Array.from(dedup.values());
}

function computeRisk(assets, links) {
  const adjacency = {};
  for (const link of links) {
    adjacency[link.target] = adjacency[link.target] || [];
    adjacency[link.target].push(link);
  }

  const enriched = assets
    .map((asset) => {
      const criticality = criticalAssetTypes.has(asset.asset_type) ? 1.0 : 0.4;
      const vulnScore = Math.min(
        asset.vulnerabilities.reduce((acc, v) => acc + severityWeights[normalizeSeverity(v.severity)], 0),
        3.0,
      );
      const base = 10 * criticality;
      const vit = 20 * (vulnScore / 3.0);
      const exposure = asset.exposed_to_internet ? 25 : 0;
      const inbound = adjacency[asset.name] || [];
      const network = inbound.reduce((acc, link) => {
        const trust = { untrusted: 1.0, dmz: 0.6, trusted: 0.2 }[link.zone_trust];
        return acc + 15 * trust * (1 - link.segmentation_strength);
      }, 0);
      const risk_score = Math.min(base + vit + exposure + network, 100);
      return { ...asset, vit_score: Number(vit.toFixed(2)), inbound_links: inbound.length, risk_score: Number(risk_score.toFixed(2)) };
    })
    .sort((a, b) => b.risk_score - a.risk_score);

  const summary = !enriched.length
    ? { overall_score: 0, max_asset_score: 0, internet_exposed_count: 0, vulnerable_component_count: 0, critical_link_count: 0 }
    : {
        overall_score: Number((enriched.reduce((a, x) => a + x.risk_score, 0) / enriched.length).toFixed(2)),
        max_asset_score: Number(Math.max(...enriched.map((x) => x.risk_score)).toFixed(2)),
        internet_exposed_count: enriched.filter((x) => x.exposed_to_internet).length,
        vulnerable_component_count: enriched.filter((x) => x.vulnerabilities.length).length,
        critical_link_count: links.filter((l) => l.zone_trust === "untrusted" && l.segmentation_strength < 0.5).length,
      };

  return { assets: enriched, links, summary };
}

async function shodanSearchByComponents(components, limit) {
  const apiKey = process.env.SHODAN_API_KEY;
  if (!apiKey) return [];
  const rows = [];

  for (const comp of components.slice(0, limit)) {
    const query = `product:"${comp.name}"`;
    try {
      const u = `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}`;
      const resp = await fetch(u);
      const data = await resp.json();
      rows.push({ component: comp.name, query, matches: data.total || 0 });
    } catch (e) {
      rows.push({ component: comp.name, query, matches: `error: ${e.message}` });
    }
  }

  return rows;
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
    const shodan = body.enable_shodan ? await shodanSearchByComponents(result.assets, Number(body.shodan_limit || 5)) : [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result, shodan }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Invalid payload: ${err.message}` }),
    };
  }
};
