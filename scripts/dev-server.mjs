import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { loadFeeds, matchAllAssets, enrichAdvisoryWithNVD } from './feeds/match.mjs';

const require = createRequire(import.meta.url);
const port = Number(process.env.PORT || 3000);
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Route table mirrors netlify.toml redirects so the Evidence tab + other pages work locally.
const apiRoutes = [
  { method: 'POST', pattern: /^\/api\/analyze$/,                        fn: 'analyze' },
  { method: 'POST', pattern: /^\/api\/simulate\/blast-radius$/,         fn: 'simulate-blast-radius' },
  { method: 'GET',  pattern: /^\/api\/simulate\/top-scenarios$/,        fn: 'simulate-top-scenarios' },
  { method: 'GET',  pattern: /^\/api\/scenarios\/prebuilt$/,            fn: 'scenarios-prebuilt' },
  { method: 'GET',  pattern: /^\/api\/assets\/([^/]+)\/paths$/,         fn: 'assets-paths',   param: 'assetId' },
  { method: 'GET',  pattern: /^\/api\/assets\/([^/]+)\/risk$/,          fn: 'assets-risk',    param: 'assetId' },
  { method: 'GET',  pattern: /^\/api\/evidence\/([^/]+)$/,              fn: 'evidence',       param: 'assetId' },
];

// Plant registry — labels are buyer-facing tab names, files are the merged
// fixtures sitting in data/. Add new entries to wire up new use-case demos.
const PLANT_REGISTRY = {
  energy: {
    key: 'energy',
    label: 'Energy / Turbine',
    sector: 'energy',
    plant_id: 'plant-alpha',
    file: 'data/plant-enriched.json',
  },
  water: {
    key: 'water',
    label: 'Water Utility',
    sector: 'water',
    plant_id: 'plant-meadowbrook',
    file: 'data/plant-water-enriched.json',
  },
};

function resolvePlantKey(url) {
  const k = url?.searchParams?.get('plant');
  return (k && PLANT_REGISTRY[k]) ? k : 'energy';
}

function loadPlant(plantKey) {
  const reg = PLANT_REGISTRY[plantKey];
  if (!reg) throw new Error(`unknown plant key: ${plantKey}`);
  const filePath = join(root, reg.file);
  if (!existsSync(filePath)) throw new Error(`plant fixture missing: ${reg.file}`);
  return require(filePath);
}

async function handlePlantsList(res) {
  const list = Object.values(PLANT_REGISTRY).map(p => {
    const exists = existsSync(join(root, p.file));
    return {
      key: p.key, label: p.label, sector: p.sector,
      plant_id: p.plant_id, available: exists,
    };
  });
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ plants: list }));
}

async function handleAssetsList(res, url) {
  const plant = loadPlant(resolvePlantKey(url));
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ assets: plant.assets }));
}

// Aggregated posture endpoint — joins BOM, real CISA ICS-CERT advisory matches
// (loaded from data/feeds/, run through the BOM matcher), and toolchain-emitted
// evidence_findings. Returns the rollup the Plant Posture page renders.
async function handlePosture(res, url) {
  const data = loadPlant(resolvePlantKey(url));
  const SEV_W = { critical: 10, high: 6, medium: 3, low: 1, info: 0 };

  // Load real ICS-CERT advisories + KEV catalog from disk; gracefully fall back
  // if the feeds haven't been pulled yet.
  const feeds = await loadFeeds(root).catch(() => null);
  const matches = feeds ? matchAllAssets(data, feeds) : null;

  // Build per-asset advisory list (real CISA matches, NVD-enriched).
  const advisoriesByAsset = {};
  if (matches) {
    for (const [aid, m] of Object.entries(matches)) {
      advisoriesByAsset[aid] = m.advisory_hits.map(h => {
        const enriched = enrichAdvisoryWithNVD(h.advisory, feeds.nvd);
        return {
          advisory_id: h.advisory.advisory_id,
          title: h.advisory.title,
          date: h.advisory.date,
          cvss_max: h.advisory.cvss_max,
          cvss_severity: h.advisory.cvss_severity,
          cves: h.advisory.cves,
          summary: h.advisory.summary,
          sectors: h.advisory.sectors,
          cisa_url: h.advisory.cisa_url,
          match_tier: h.match_tier,
          matched_vendor: h.matched_vendor,
          matched_product: h.matched_product,
          nvd_cves: enriched.nvd_cves,
          cwes: [...new Set(enriched.nvd_cves.flatMap(c => c.cwes))],
          nvd_enriched_count: enriched.nvd_cves.length,
        };
      });
    }
  }

  const findingsByAsset = {};
  for (const f of data.evidence_findings || []) {
    (findingsByAsset[f.asset_id] ||= []).push(f);
  }

  const allAdvisories = Object.values(advisoriesByAsset).flat();
  const findingItems = data.evidence_findings || [];

  // Per-asset risk
  const assetRisk = (data.assets || []).map(a => {
    const adv = advisoriesByAsset[a.asset_id] || [];
    const fnd = findingsByAsset[a.asset_id] || [];
    const advWeight = adv.reduce((s, v) => s + (SEV_W[v.cvss_severity] || 0), 0);
    const fndWeight = fnd.reduce((s, f) => s + (SEV_W[f.severity] || 0), 0);
    const raw = (advWeight + fndWeight) * (a.criticality_score || 1) / 10;
    const score = Math.min(100, Math.round(raw * 0.45));
    return {
      asset_id: a.asset_id,
      name: a.name,
      asset_type: a.asset_type,
      vendor: a.vendor,
      model: a.model,
      zone_id: a.zone_id,
      criticality_score: a.criticality_score,
      advisory_count: adv.length,
      advisory_exact: adv.filter(x => x.match_tier === 'exact').length,
      advisory_vendor: adv.filter(x => x.match_tier === 'vendor').length,
      kev_count: matches ? matches[a.asset_id]?.kev_hits?.length || 0 : 0,
      finding_count: fnd.length,
      worst_severity: worstSev([
        ...adv.map(x => ({ severity: x.cvss_severity })),
        ...fnd,
      ]),
      risk_score: score,
    };
  }).sort((a, b) => b.risk_score - a.risk_score);

  const totalCrit = assetRisk.reduce((s, a) => s + (a.criticality_score || 1), 0) || 1;
  const weightedRisk = assetRisk.reduce((s, a) => s + a.risk_score * (a.criticality_score || 1), 0) / totalCrit;
  const postureScore = Math.round(weightedRisk);
  const postureLabel = postureScore >= 70 ? 'critical'
                     : postureScore >= 50 ? 'high'
                     : postureScore >= 30 ? 'medium'
                     : postureScore >= 10 ? 'low'
                     : 'minimal';

  // Top risks — merge advisories + findings, weight by severity × criticality
  const topRisks = [];
  for (const [aid, advList] of Object.entries(advisoriesByAsset)) {
    const a = (data.assets || []).find(x => x.asset_id === aid);
    if (!a) continue;
    for (const adv of advList) {
      topRisks.push({
        kind: 'advisory',
        source: 'CISA ICS-CERT',
        asset_id: aid,
        asset_name: a.name,
        severity: adv.cvss_severity,
        title: adv.title,
        detail: adv.summary || `${adv.cves.join(', ')} affecting ${adv.matched_vendor} ${adv.matched_product}`,
        advisory_id: adv.advisory_id,
        cves: adv.cves,
        cvss_max: adv.cvss_max,
        cisa_url: adv.cisa_url,
        match_tier: adv.match_tier,
        date: adv.date,
        weight: (SEV_W[adv.cvss_severity] || 0) * (a.criticality_score || 1) * (adv.match_tier === 'exact' ? 1.5 : 1),
      });
    }
  }
  for (const f of findingItems) {
    const a = (data.assets || []).find(x => x.asset_id === f.asset_id);
    if (!a) continue;
    topRisks.push({
      kind: 'finding',
      source: f.source_tool,
      asset_id: f.asset_id,
      asset_name: a.name,
      severity: f.severity,
      title: `${(f.finding_type || '').replace(/_/g, ' ')} · ${a.name}`,
      detail: f.evidence,
      finding_id: f.finding_id,
      weight: (SEV_W[f.severity] || 0) * (a.criticality_score || 1),
    });
  }
  topRisks.sort((x, y) => y.weight - x.weight);

  const sevTally = (items, sevField = 'severity') => items.reduce((acc, it) => {
    const s = it[sevField] || 'info';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Aggregate KEV hits across all assets
  const allKEV = matches ? Object.values(matches).flatMap(m => m.kev_hits) : [];
  const uniqueKEV = [...new Map(allKEV.map(k => [k.cveID, k])).values()];

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    plant_id: data.plant_id,
    plant_name: data.plant_name,
    sector: data.sector,
    bom: {
      asset_count: (data.assets || []).length,
      zone_count: (data.zones || []).length,
      conduit_count: (data.connectivity || []).length,
      vendor_count: new Set((data.assets || []).map(a => a.vendor).filter(Boolean)).size,
    },
    advisories: (() => {
      const allCveIds = new Set();
      const enrichedCveIds = new Set();
      for (const a of allAdvisories) {
        for (const c of (a.cves || [])) allCveIds.add(c);
        for (const c of (a.nvd_cves || [])) enrichedCveIds.add(c.cve_id);
      }
      return {
        count: allAdvisories.length,
        exact_count:  allAdvisories.filter(x => x.match_tier === 'exact').length,
        vendor_count: allAdvisories.filter(x => x.match_tier === 'vendor').length,
        severity_tally: sevTally(allAdvisories, 'cvss_severity'),
        cve_count_total:    allCveIds.size,
        nvd_enriched_count: enrichedCveIds.size,
        sources: ['CISA ICS-CERT (CSAF)', 'CISA Known Exploited Vulnerabilities', 'NVD CVE detail'],
        feed_meta: feeds?.meta || null,
        nvd_pulled_at: feeds?.nvd_pulled_at || null,
      };
    })(),
    kev: {
      count: uniqueKEV.length,
      entries: uniqueKEV.slice(0, 20),
    },
    scanner: {
      count: findingItems.length,
      severity_tally: sevTally(findingItems),
      tools: [...new Set(findingItems.map(f => f.source_tool))],
    },
    posture: { score: postureScore, label: postureLabel },
    asset_risk: assetRisk,
    advisories_by_asset: advisoriesByAsset,
    top_risks: topRisks.slice(0, 12),
  }));
}

function worstSev(items) {
  const order = ['critical', 'high', 'medium', 'low', 'info'];
  for (const s of order) if (items.some(i => i.severity === s)) return s;
  return null;
}

async function handleGraph(res, url) {
  const data = loadPlant(resolvePlantKey(url));
  const findingsByAsset = {};
  for (const f of data.evidence_findings || []) {
    (findingsByAsset[f.asset_id] ||= []).push({
      finding_id: f.finding_id,
      severity: f.severity,
      finding_type: f.finding_type,
      source_tool: f.source_tool,
      evidence: f.evidence,
      confidence: f.confidence,
    });
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    plant_id: data.plant_id,
    plant_name: data.plant_name,
    sector: data.sector,
    zones: data.zones || [],
    assets: data.assets || [],
    connectivity: data.connectivity || [],
    process_functions: data.process_functions || [],
    findings_by_asset: findingsByAsset,
  }));
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

async function dispatchApi(req, res, url) {
  for (const route of apiRoutes) {
    if (route.method !== req.method) continue;
    const m = url.pathname.match(route.pattern);
    if (!m) continue;
    const qs = Object.fromEntries(url.searchParams);
    if (route.param && m[1]) qs[route.param] = decodeURIComponent(m[1]);
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const mod = require(join(root, 'netlify', 'functions', `${route.fn}.js`));
    const result = await mod.handler({ httpMethod: req.method, queryStringParameters: qs, body });
    res.writeHead(result.statusCode || 200, result.headers || { 'content-type': 'application/json' });
    res.end(result.body || '');
    return true;
  }
  return false;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/plants'  && req.method === 'GET') { await handlePlantsList(res); return; }
      if (url.pathname === '/api/assets'  && req.method === 'GET') { await handleAssetsList(res, url); return; }
      if (url.pathname === '/api/graph'   && req.method === 'GET') { await handleGraph(res, url); return; }
      if (url.pathname === '/api/posture' && req.method === 'GET') { await handlePosture(res, url); return; }
      if (await dispatchApi(req, res, url)) return;
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `no route for ${req.method} ${url.pathname}` }));
      return;
    }

    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const candidates = [join(root, 'web', requested.replace(/^\/+/, '')), join(root, requested.replace(/^\/+/, ''))];
    const full = candidates.find(existsSync);

    if (!full) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const content = await readFile(full);
    res.writeHead(200, { 'content-type': mime[extname(full)] || 'application/octet-stream' });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`OTSniffer demo server on http://localhost:${port}`);
});
