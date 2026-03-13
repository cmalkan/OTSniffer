const { loadPlantData } = require('./_shared/data');

exports.handler = async () => {
  try {
    const data = loadPlantData();
    const prebuilt = data.demo_scenarios.map((s) => ({
      scenario_id: s.scenario_id,
      title: s.title,
      start_asset_id: s.compromised_asset_id,
      intent: s.intent,
    }));

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarios: prebuilt }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(err) }) };
  }
};
