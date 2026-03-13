const { loadPlantData, indexPlantData } = require('./_shared/data');
const { rankTopScenarios } = require('./_shared/simulation');

exports.handler = async () => {
  try {
    const data = loadPlantData();
    const indexes = indexPlantData(data);
    const scenarios = rankTopScenarios(data, indexes);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarios }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(err) }) };
  }
};
