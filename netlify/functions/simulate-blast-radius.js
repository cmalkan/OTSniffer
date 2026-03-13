const { loadPlantData, indexPlantData } = require('./_shared/data');
const { simulateBlastRadius } = require('./_shared/simulation');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const req = JSON.parse(event.body || '{}');
    const data = loadPlantData();
    const indexes = indexPlantData(data);

    const result = simulateBlastRadius(data, indexes, {
      start_asset_id: req.start_asset_id,
      max_depth: req.max_depth || 6,
      include_vulnerabilities: req.include_vulnerabilities !== false,
      include_zone_barriers: req.include_zone_barriers !== false,
      mode: req.mode || 'analyst',
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(err) }) };
  }
};
