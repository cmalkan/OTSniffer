// Shared API service for Netlify-backed analyst pages.
export async function callJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON API response from ${url}. Check Netlify redirects/functions deployment.`);
  }

  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

export const api = {
  simulateBlastRadius: (payload) =>
    callJson('/api/simulate/blast-radius', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  topScenarios: () => callJson('/api/simulate/top-scenarios'),
  prebuiltScenarios: () => callJson('/api/scenarios/prebuilt'),
  assetPaths: (assetId) => callJson(`/api/assets/${encodeURIComponent(assetId)}/paths`),
  assetRisk: (assetId) => callJson(`/api/assets/${encodeURIComponent(assetId)}/risk`),
  assets: () => callJson('/api/assets'),
  graphSummary: () => callJson('/api/graph/summary'),
};
