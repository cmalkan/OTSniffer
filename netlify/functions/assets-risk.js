const { loadPlantData, indexPlantData } = require('./_shared/data');
const { getAssetRisk } = require('./_shared/simulation');

exports.handler = async (event) => {
  try {
    const assetId = event.queryStringParameters?.assetId;
    if (!assetId) return { statusCode: 400, body: JSON.stringify({ error: 'assetId is required' }) };

    const data = loadPlantData();
    const indexes = indexPlantData(data);
    const response = getAssetRisk(data, indexes, assetId);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(response) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(err) }) };
  }
};
