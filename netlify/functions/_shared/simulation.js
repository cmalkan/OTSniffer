const { computeAssetRisk, pathRiskScore, confidenceScore, severityOfVulns, zoneSensitivity } = require('./scoring');

function buildAdjacency(connectivity) {
  const out = new Map();
  for (const edge of connectivity) {
    if (!out.has(edge.source_asset_id)) out.set(edge.source_asset_id, []);
    out.get(edge.source_asset_id).push({ ...edge, direction: 'forward' });

    // Assumption: bidirectional links allow reverse lateral movement.
    if (edge.allowed_direction === 'bi') {
      if (!out.has(edge.target_asset_id)) out.set(edge.target_asset_id, []);
      out.get(edge.target_asset_id).push({
        ...edge,
        source_asset_id: edge.target_asset_id,
        target_asset_id: edge.source_asset_id,
        direction: 'reverse-bi',
      });
    }
  }
  return out;
}

function explainEdge(edge, fromZone, toZone, vulnCount) {
  const reasons = [
    `${edge.protocol} connectivity on port ${edge.port}`,
    `${edge.allowed_direction} directional rule`,
    `trust level ${edge.trust_level}`,
  ];
  if (fromZone !== toZone) reasons.push(`zone transition ${fromZone} -> ${toZone}`);
  if (vulnCount > 0) reasons.push(`${vulnCount} downstream vulnerability signals`);
  return reasons.join('; ');
}

function simulateBlastRadius(data, indexes, request) {
  const { assetById, zoneById, vulnsByAsset } = indexes;
  const adjacency = buildAdjacency(data.connectivity);

  const start = assetById.get(request.start_asset_id);
  if (!start) throw new Error(`Unknown start_asset_id: ${request.start_asset_id}`);

  const maxDepth = Number(request.max_depth || 6);
  const queue = [{ assetId: start.asset_id, hop: 0, path: [start.asset_id], trust: [] }];
  const visitedHop = new Map([[start.asset_id, 0]]);
  const attackPaths = [];
  const pathExplanations = [];
  const segmentationBarriers = [];

  while (queue.length) {
    const current = queue.shift();
    if (current.hop >= maxDepth) continue;

    for (const edge of adjacency.get(current.assetId) || []) {
      const fromAsset = assetById.get(current.assetId);
      const toAsset = assetById.get(edge.target_asset_id);
      if (!toAsset || !fromAsset) continue;

      const fromZone = zoneById.get(fromAsset.zone_id);
      const toZone = zoneById.get(toAsset.zone_id);
      const downstreamVulns = vulnsByAsset.get(toAsset.asset_id) || [];
      const crossZone = fromAsset.zone_id !== toAsset.zone_id;

      // Barrier heuristic: low trust + zone crossing + no vulnerability signal = probable containment.
      if (request.include_zone_barriers && crossZone && edge.trust_level === 'low' && downstreamVulns.length === 0) {
        segmentationBarriers.push({
          from_asset_id: fromAsset.asset_id,
          to_asset_id: toAsset.asset_id,
          reason: `Low-trust transition from ${fromZone?.name || fromAsset.zone_id} to ${toZone?.name || toAsset.zone_id}`,
        });
        continue;
      }

      const nextHop = current.hop + 1;
      const knownHop = visitedHop.get(toAsset.asset_id);
      if (knownHop !== undefined && knownHop <= nextHop) continue;
      visitedHop.set(toAsset.asset_id, nextHop);

      const nextPath = [...current.path, toAsset.asset_id];
      const nextTrust = [...current.trust, edge.trust_level];

      attackPaths.push({
        path_id: `path-${attackPaths.length + 1}`,
        ordered_asset_ids: nextPath,
        ordered_assets: nextPath.map((id) => assetById.get(id)?.name || id),
        protocols_used: [...new Set([...current.path.slice(1).map(() => edge.protocol), edge.protocol])],
        zone_transitions: nextPath.map((id) => assetById.get(id)?.zone_id || 'unknown'),
        hop_count: nextPath.length - 1,
        path_risk_score: pathRiskScore(nextPath, nextTrust),
        path_explanation: explainEdge(edge, fromZone?.name || fromAsset.zone_id, toZone?.name || toAsset.zone_id, downstreamVulns.length),
      });

      pathExplanations.push({
        to_asset_id: toAsset.asset_id,
        explanation: `Reached ${toAsset.name} because ${explainEdge(edge, fromZone?.name || fromAsset.zone_id, toZone?.name || toAsset.zone_id, downstreamVulns.length)}`,
      });

      queue.push({ assetId: toAsset.asset_id, hop: nextHop, path: nextPath, trust: nextTrust });
    }
  }

  const impactedIds = [...visitedHop.keys()];
  const impactedAssets = impactedIds.map((id) => {
    const asset = assetById.get(id);
    const vulns = vulnsByAsset.get(id) || [];
    const hopDistance = visitedHop.get(id) || 0;
    const zone = zoneById.get(asset.zone_id);

    const reachabilityFactor = Math.max(0.25, 1 - hopDistance * 0.1);
    const risk = computeAssetRisk({
      reachabilityFactor,
      vulnerabilitySeverity: severityOfVulns(vulns),
      assetCriticality: asset.criticality_score,
      zoneSensitivityFactor: zoneSensitivity(zone),
      assetType: asset.asset_type,
    });

    const isController = ['plc', 'rtu', 'safety-controller', 'scada-server'].includes(String(asset.asset_type));
    const isSafety = String(asset.asset_type) === 'safety-controller' || String(asset.process_tag).includes('safety');

    return {
      asset_id: asset.asset_id,
      name: asset.name,
      asset_type: asset.asset_type,
      zone_id: asset.zone_id,
      criticality_score: asset.criticality_score,
      process_tag: asset.process_tag,
      hop_distance: hopDistance,
      reachability_reason: hopDistance === 0 ? 'Initial compromise point' : (pathExplanations.find((p) => p.to_asset_id === id)?.explanation || 'Reachable via OT lateral pathway'),
      exposure_type: asset.exposed_to_internet ? 'internet-adjacent' : 'internal-ot',
      associated_vulnerabilities: vulns,
      is_critical_controller: isController,
      is_safety_related: isSafety,
      risk_score: risk,
    };
  });

  const impactedZones = [...new Set(impactedAssets.map((a) => a.zone_id))].map((zoneId) => {
    const z = zoneById.get(zoneId);
    return { zone_id: zoneId, zone_name: z?.name || zoneId, level: z?.level || 'unknown' };
  });

  const impactedProcesses = data.process_functions
    .filter((p) => p.dependent_asset_ids.some((id) => impactedIds.includes(id)))
    .map((p) => ({
      process_id: p.process_id,
      name: p.name,
      criticality: p.criticality,
      impacted_assets: p.dependent_asset_ids.filter((id) => impactedIds.includes(id)),
    }));

  const impactedControllerTypes = [...new Set(impactedAssets.filter((a) => a.is_critical_controller).map((a) => a.asset_type))];
  const exploitedOrExploitable = impactedAssets.flatMap((a) => a.associated_vulnerabilities.map((v) => ({ asset_id: a.asset_id, ...v })));

  const blastRadiusScore = Number(Math.min(100, (impactedAssets.length / Math.max(1, data.assets.length)) * 100).toFixed(2));
  const avgAssetRisk = impactedAssets.reduce((s, a) => s + a.risk_score, 0) / Math.max(1, impactedAssets.length);
  const riskScore = Number(Math.min(100, avgAssetRisk * 0.7 + blastRadiusScore * 0.3).toFixed(2));
  const pathComplexityScore = Number(Math.min(100, attackPaths.reduce((s, p) => s + p.hop_count, 0) * 10 / Math.max(1, attackPaths.length)).toFixed(2));
  const operationalImpactScore = Number(Math.min(100,
    impactedProcesses.reduce((s, p) => s + p.criticality, 0) / Math.max(1, impactedProcesses.length) * 8 +
    impactedAssets.filter((a) => a.is_safety_related).length * 10
  ).toFixed(2));
  const confScore = confidenceScore(data);

  const severityLabel = riskScore >= 75 ? 'critical' : riskScore >= 55 ? 'high' : riskScore >= 35 ? 'moderate' : 'low';

  return {
    start_asset_id: start.asset_id,
    start_asset_name: start.name,
    start_asset_type: start.asset_type,
    total_impacted_assets: impactedAssets.length,
    total_impacted_zones: impactedZones.length,
    total_impacted_processes: impactedProcesses.length,
    impacted_assets: impactedAssets,
    impacted_zones: impactedZones,
    impacted_processes: impactedProcesses,
    impacted_controller_types: impactedControllerTypes,
    attack_paths: attackPaths,
    path_explanations: pathExplanations,
    segmentation_barriers_encountered: segmentationBarriers,
    exploited_or_exploitable_vulnerabilities: exploitedOrExploitable,
    blast_radius_score: blastRadiusScore,
    path_complexity_score: pathComplexityScore,
    risk_score: riskScore,
    operational_impact_score: operationalImpactScore,
    confidence_score: confScore,
    severity_label: severityLabel,
    analyst_summary: `Compromise of ${start.name} reached ${impactedAssets.length} OT assets across ${impactedZones.length} zones with ${attackPaths.length} lateral paths.`,
    executive_summary: `${severityLabel.toUpperCase()} blast radius: ${impactedAssets.length} assets and ${impactedProcesses.length} process functions are operationally exposed from the initial compromise.`,
  };
}

function rankTopScenarios(data, indexes) {
  // Deterministic ranking for demo clarity: simulate a fixed list of strategically meaningful start points.
  const candidates = data.demo_scenarios.length
    ? data.demo_scenarios.map((s) => ({ scenario_id: s.scenario_id, title: s.title, start_asset_id: s.compromised_asset_id }))
    : data.assets.slice(0, 5).map((a, i) => ({ scenario_id: `auto-${i + 1}`, title: `${a.name} compromise`, start_asset_id: a.asset_id }));

  const scored = candidates.map((s) => {
    const result = simulateBlastRadius(data, indexes, {
      start_asset_id: s.start_asset_id,
      max_depth: 6,
      include_vulnerabilities: true,
      include_zone_barriers: true,
      mode: 'analyst',
    });
    return {
      scenario_id: s.scenario_id,
      title: s.title,
      start_asset_id: s.start_asset_id,
      severity_label: result.severity_label,
      blast_radius_score: result.blast_radius_score,
      risk_score: result.risk_score,
      operational_impact_score: result.operational_impact_score,
      total_impacted_assets: result.total_impacted_assets,
      total_impacted_processes: result.total_impacted_processes,
      executive_summary: result.executive_summary,
    };
  }).sort((a, b) => b.risk_score - a.risk_score);

  return scored;
}

function getAssetPaths(data, indexes, assetId) {
  const result = simulateBlastRadius(data, indexes, {
    start_asset_id: assetId,
    max_depth: 6,
    include_vulnerabilities: true,
    include_zone_barriers: true,
    mode: 'analyst',
  });
  return { asset_id: assetId, paths: result.attack_paths, path_explanations: result.path_explanations };
}

function getAssetRisk(data, indexes, assetId) {
  const result = simulateBlastRadius(data, indexes, {
    start_asset_id: assetId,
    max_depth: 6,
    include_vulnerabilities: true,
    include_zone_barriers: true,
    mode: 'analyst',
  });
  return {
    asset_id: assetId,
    start_asset_name: result.start_asset_name,
    severity_label: result.severity_label,
    risk_score: result.risk_score,
    blast_radius_score: result.blast_radius_score,
    operational_impact_score: result.operational_impact_score,
    confidence_score: result.confidence_score,
    analyst_summary: result.analyst_summary,
  };
}

module.exports = {
  simulateBlastRadius,
  rankTopScenarios,
  getAssetPaths,
  getAssetRisk,
};
