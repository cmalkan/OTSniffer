const { loadPlantData } = require('./_shared/data');

exports.handler = async (event) => {
  try {
    const assetId = event.queryStringParameters?.assetId;
    if (!assetId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'assetId is required' }),
      };
    }

    const data = loadPlantData();
    const asset = data.assets.find((a) => a.asset_id === assetId);
    if (!asset) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `unknown asset ${assetId}` }),
      };
    }

    const findings = (data.evidence_findings || []).filter((f) => f.asset_id === assetId);

    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byTool = {};
    for (const f of findings) {
      if (counts[f.severity] != null) counts[f.severity]++;
      byTool[f.source_tool] = (byTool[f.source_tool] || 0) + 1;
    }
    const sorted = findings.slice().sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const sd = (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
      if (sd !== 0) return sd;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: assetId,
        asset_name: asset.name,
        finding_count: findings.length,
        severity_counts: counts,
        tool_counts: byTool,
        findings: sorted,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
