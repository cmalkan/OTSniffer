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
  { method: 'GET',  pattern: /^\/api\/assets\/([^/]+)\/attack-paths$/,   fn: 'attack-paths',   param: 'assetId' },
];

// Plant registry — labels are buyer-facing tab names, files are the merged
// fixtures sitting in data/. Built-in entries are seeded here; customer plants
// produced by the onboarding flow get auto-registered when their files exist.
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

// Discover any extra plant-*-enriched.json files at startup (and on each
// /api/plants call) so plants saved via the onboarding flow show up without
// a server restart.
function discoverPlantsFromDisk() {
  try {
    const files = require('node:fs').readdirSync(join(root, 'data'));
    for (const f of files) {
      const m = f.match(/^plant-([a-z0-9_-]+)-enriched\.json$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (PLANT_REGISTRY[key]) continue;
      try {
        const raw = require(join(root, 'data', f));
        PLANT_REGISTRY[key] = {
          key,
          label: raw.plant_label || raw.plant_name || key,
          sector: raw.sector || 'unknown',
          plant_id: raw.plant_id || `plant-${key}`,
          file: `data/${f}`,
        };
      } catch { /* ignore unreadable */ }
    }
  } catch { /* data dir may not exist on first boot */ }
}
discoverPlantsFromDisk();

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

// Persist a customer-built plant fixture from the onboarding form. Body is
// the plant JSON in our standard schema. We write it to data/plant-{key}-demo.json
// and run mergeFindings to produce the -enriched companion (so the new plant
// works with /api/posture immediately). The plant key is normalized from the
// supplied plant_id and added to the in-memory registry for this server's
// lifetime; restarting the server re-discovers it from disk via the registry
// in this file (see "discoverPlantsFromDisk" — assigned at startup).
async function handleOnboardingSave(req, res) {
  try {
    const body = await readBody(req);
    const plant = JSON.parse(body);
    if (!plant.plant_id || !plant.plant_name || !Array.isArray(plant.assets)) {
      throw new Error('plant_id, plant_name, and assets[] are required');
    }
    const key = (plant.onboarding_key || plant.plant_id.replace(/^plant-/, '')).replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const demoPath = join(root, 'data', `plant-${key}-demo.json`);
    const enrichedPath = join(root, 'data', `plant-${key}-enriched.json`);
    const overwriteConfirmed = plant.confirm_overwrite === true;
    delete plant.onboarding_key;
    delete plant.confirm_overwrite;

    // Block accidental overwrite. Built-in plants (energy, water) are locked
    // unless explicitly confirmed; customer plants warn but allow on confirm.
    const BUILTIN_KEYS = new Set(['energy', 'water']);
    if (existsSync(demoPath) && !overwriteConfirmed) {
      let existingMeta = null;
      try {
        const existing = JSON.parse(await (await import('node:fs/promises')).readFile(demoPath, 'utf8'));
        existingMeta = {
          plant_name: existing.plant_name,
          asset_count: Array.isArray(existing.assets) ? existing.assets.length : 0,
          saved_at: existing.onboarding_meta?.saved_at,
        };
      } catch { /* corrupt file is fine to overwrite */ }
      res.writeHead(409, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        error: 'plant_exists',
        message: BUILTIN_KEYS.has(key)
          ? `Key "${key}" is a built-in demo plant. Pick a different plant key.`
          : `A plant with key "${key}" already exists. Re-uploading will overwrite manual edits.`,
        existing: existingMeta,
        builtin: BUILTIN_KEYS.has(key),
      }));
      return;
    }

    // Ensure findings array exists for merge step
    const findings = plant.evidence_findings || [];
    delete plant.evidence_findings;
    delete plant.evidence_meta;
    delete plant.vulnerabilities;

    const { writeFile } = await import('node:fs/promises');
    await writeFile(demoPath, JSON.stringify(plant, null, 2));

    // Auto-run the SBOM → CISA-advisories scanner against the demo fixture
    // so every saved plant arrives at /api/posture already enriched with
    // supply_chain findings. Failures are logged, not fatal — saving still
    // succeeds with whatever findings the operator supplied directly.
    let advSummary = null;
    try {
      const { scanAdvisories } = await import('./otsniff/scanners/advisories.mjs');
      const adv = await scanAdvisories({ plant: demoPath });
      findings.push(...adv.findings);
      advSummary = adv.summary;

      // Apply asset patches (canonical vendor/model where empty) and rewrite
      // the demo file so the dashboard shows recognized vendors.
      if (Array.isArray(adv.asset_patches) && adv.asset_patches.length) {
        const patchById = new Map(adv.asset_patches.map(p => [p.asset_id, p]));
        for (const a of plant.assets) {
          const p = patchById.get(a.asset_id);
          if (!p) continue;
          if (!a.vendor && p.vendor) a.vendor = p.vendor;
          if (!a.model && p.model) a.model = p.model;
        }
        await writeFile(demoPath, JSON.stringify(plant, null, 2));
      }
    } catch (err) {
      console.error('[onboarding] advisories scan failed:', err.message);
    }

    // Merge to produce enriched
    const { mergeFindings } = await import('./otsniff/merge.mjs');
    const enriched = mergeFindings(plant, findings);
    await writeFile(enrichedPath, JSON.stringify(enriched, null, 2));

    // Register in plant registry so the tab strip picks it up
    PLANT_REGISTRY[key] = {
      key,
      label: plant.plant_label || plant.plant_name,
      sector: plant.sector || 'unknown',
      plant_id: plant.plant_id,
      file: `data/plant-${key}-enriched.json`,
    };

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      key,
      plant_id: plant.plant_id,
      assets: plant.assets.length,
      paths: { demo: `data/plant-${key}-demo.json`, enriched: `data/plant-${key}-enriched.json` },
      advisories: advSummary,
    }));
  } catch (err) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}

// Delete a customer-onboarded plant. Removes both the demo and enriched
// JSON files plus the per-plant uploads directory. Built-in plants
// (energy, water) are protected — they cannot be deleted via this endpoint.
async function handleOnboardingDelete(req, res, key) {
  try {
    const safeKey = String(key || '').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    if (!safeKey) throw new Error('plant key required');
    const BUILTIN_KEYS = new Set(['energy', 'water']);
    if (BUILTIN_KEYS.has(safeKey)) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'builtin_plant', message: `Built-in plant "${safeKey}" cannot be deleted.` }));
      return;
    }
    const { unlink, rm } = await import('node:fs/promises');
    const removed = [];
    const tryUnlink = async (p) => {
      if (existsSync(p)) { await unlink(p); removed.push(p.replace(root + '/', '').replace(root + '\\', '')); }
    };
    await tryUnlink(join(root, 'data', `plant-${safeKey}-demo.json`));
    await tryUnlink(join(root, 'data', `plant-${safeKey}-enriched.json`));
    const uploadsDir = join(root, 'data', 'uploads', safeKey);
    if (existsSync(uploadsDir)) {
      await rm(uploadsDir, { recursive: true, force: true });
      removed.push(`data/uploads/${safeKey}/`);
    }
    delete PLANT_REGISTRY[safeKey];
    // node ESM module cache holds onto the require()'d JSON — bust it so a
    // future re-upload of the same key reads from disk, not stale memory.
    try {
      const cachePath = join(root, 'data', `plant-${safeKey}-enriched.json`);
      delete require.cache[require.resolve(cachePath)];
    } catch { /* file already gone */ }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, key: safeKey, removed }));
  } catch (err) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}

// Accepts a multipart-or-base64 drawing upload, stores under data/uploads/.
// For simplicity we accept a JSON body { plant_key, filename, content_base64 }
// from the browser rather than wrestling with multipart parsing in raw Node.
async function handleDrawingUpload(req, res) {
  try {
    const body = await readBody(req);
    const { plant_key, filename, content_base64, content_type } = JSON.parse(body);
    if (!plant_key || !filename || !content_base64) {
      throw new Error('plant_key, filename, content_base64 required');
    }
    const safeKey = String(plant_key).replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    const dir = join(root, 'data', 'uploads', safeKey);
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(content_base64, 'base64');
    if (buf.length > 25 * 1024 * 1024) throw new Error('upload exceeds 25MB cap');
    const fullPath = join(dir, safeName);
    await writeFile(fullPath, buf);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      url: `/uploads/${safeKey}/${safeName}`,
      bytes: buf.length,
      content_type: content_type || 'application/octet-stream',
    }));
  } catch (err) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}

async function handleUpload(res, pathname) {
  // Serve uploaded files back to the browser (drawings, etc.)
  const requested = pathname.replace(/^\/+/, '');
  const full = join(root, 'data', requested);
  if (!existsSync(full) || !full.startsWith(join(root, 'data', 'uploads'))) {
    res.writeHead(404); res.end(); return;
  }
  const buf = await readFile(full);
  const ext = extname(full).toLowerCase();
  const ct = mime[ext] || (ext === '.png' ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
            : ext === '.svg' ? 'image/svg+xml'
            : ext === '.pdf' ? 'application/pdf'
            : 'application/octet-stream');
  res.writeHead(200, { 'content-type': ct });
  res.end(buf);
}

async function handlePlantsList(res) {
  // Re-discover so newly-onboarded plants surface without a restart
  discoverPlantsFromDisk();
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

  // Function-based connectivity inference. We always compute it; the renderer
  // chooses to draw it (dashed) when declared connectivity is sparse, or to
  // hide it when declared is rich. Threshold: declared edges < 0.4 per asset.
  const declared = data.connectivity || [];
  const assets = data.assets || [];
  let inferred = [];
  try {
    const { inferConnectivityFromFunction } = await import('../web/js/connectivity-infer.js');
    inferred = inferConnectivityFromFunction(assets, data.zones || [], declared);
  } catch (err) {
    console.error('[graph] connectivity-infer failed:', err.message);
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    plant_id: data.plant_id,
    plant_name: data.plant_name,
    sector: data.sector,
    zones: data.zones || [],
    assets: assets,
    connectivity: declared,
    inferred_connectivity: inferred,
    inference_active: assets.length > 0 && declared.length < assets.length * 0.4,
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

    if (url.pathname.startsWith('/uploads/') && req.method === 'GET')  { await handleUpload(res, url.pathname); return; }

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/plants'           && req.method === 'GET')  { await handlePlantsList(res); return; }
      if (url.pathname === '/api/assets'           && req.method === 'GET')  { await handleAssetsList(res, url); return; }
      if (url.pathname === '/api/graph'            && req.method === 'GET')  { await handleGraph(res, url); return; }
      if (url.pathname === '/api/posture'          && req.method === 'GET')  { await handlePosture(res, url); return; }
      if (url.pathname === '/api/onboarding/save'  && req.method === 'POST') { await handleOnboardingSave(req, res); return; }
      if (url.pathname === '/api/onboarding/drawing' && req.method === 'POST') { await handleDrawingUpload(req, res); return; }
      {
        const m = url.pathname.match(/^\/api\/onboarding\/plant\/([^/]+)$/);
        if (m && req.method === 'DELETE') { await handleOnboardingDelete(req, res, m[1]); return; }
      }
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
