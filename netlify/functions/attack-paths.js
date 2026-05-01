// Returns attack_paths[] for a specific asset. CONSUMES the schema produced
// by scripts/otsniff/attack-paths.mjs (validateAttackPath / buildAttackPath)
// and stored at the top level of the plant fixture by the merge pipeline.
//
// GET /api/assets/:assetId/attack-paths
//
// Query parameters:
//   assetId (required, validated)  — the asset under inspection
//   direction (optional, default "incoming")
//        "incoming"  → paths whose target_asset_id === assetId
//        "outgoing"  → paths whose compromised_asset_id === assetId
//   from (optional)                — narrow incoming paths to those starting at
//                                    this compromised asset (used for the
//                                    two-click "from A to B" flow on the
//                                    blast-radius view)
//   plant (optional)               — plant fixture key
//
// Response:
//   { asset_id, direction, paths: AttackPath[] }
//   sorted by: path_confidence desc, then kill_chain_phase severity, then hops asc
//
// Threat model: assess-only, local-operator. assetId is regex-restricted to
// canonical fixture format to refuse anything weird; no path data ever
// touches disk paths, so injection risk is bounded to the in-memory filter.

const { loadPlantData } = require('./_shared/data');

// Asset/path/finding IDs in this project all match this safe shape.
const SAFE_ID_RE = /^[a-z0-9_]{1,64}$/i;

// Sort priority for kill_chain_phase, mirrors scripts/otsniff/attack-paths.mjs
// and the spec doc: impair-control most severe, lateral-movement least.
const PHASE_RANK = {
  'impair-control': 5,
  'inhibit-response': 4,
  'loss-of-control': 3,
  'loss-of-view': 2,
  'lateral-movement': 1,
};

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const assetId = qs.assetId;
    const direction = qs.direction === 'outgoing' ? 'outgoing' : 'incoming';
    const fromAssetId = qs.from;
    const plantKey = qs.plant;

    if (!assetId) {
      return jsonResponse(400, { error: 'assetId is required' });
    }
    if (!SAFE_ID_RE.test(assetId)) {
      return jsonResponse(400, { error: 'assetId has invalid format' });
    }
    if (fromAssetId && !SAFE_ID_RE.test(fromAssetId)) {
      return jsonResponse(400, { error: 'from has invalid format' });
    }

    const data = loadPlantData(plantKey);
    const all = Array.isArray(data.attack_paths) ? data.attack_paths : [];

    let filtered = direction === 'outgoing'
      ? all.filter((p) => p && p.compromised_asset_id === assetId)
      : all.filter((p) => p && p.target_asset_id === assetId);

    if (fromAssetId && direction === 'incoming') {
      filtered = filtered.filter((p) => p.compromised_asset_id === fromAssetId);
    }

    filtered.sort((a, b) => {
      const ac = Number(a.path_confidence) || 0;
      const bc = Number(b.path_confidence) || 0;
      if (bc !== ac) return bc - ac;
      const pa = PHASE_RANK[a.kill_chain_phase] || 0;
      const pb = PHASE_RANK[b.kill_chain_phase] || 0;
      if (pb !== pa) return pb - pa;
      return (a.hops?.length || 0) - (b.hops?.length || 0);
    });

    // Decorate each path with the asset names it traverses, so the UI can
    // render plant-manager-readable labels without a second graph lookup.
    const assetById = new Map((data.assets || []).map((a) => [a.asset_id, a]));
    const decorated = filtered.map((p) => ({
      ...p,
      _decoration: {
        compromised_asset_name: assetById.get(p.compromised_asset_id)?.name || p.compromised_asset_id,
        target_asset_name: assetById.get(p.target_asset_id)?.name || p.target_asset_id,
        hop_asset_names: (p.hops || []).map((h) => ({
          from_name: assetById.get(h.from_asset_id)?.name || h.from_asset_id,
          to_name: assetById.get(h.to_asset_id)?.name || h.to_asset_id,
        })),
      },
    }));

    return jsonResponse(200, {
      asset_id: assetId,
      direction,
      from_asset_id: fromAssetId || null,
      paths: decorated,
      total: decorated.length,
    });
  } catch (err) {
    return jsonResponse(500, { error: String(err && err.message ? err.message : err) });
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
