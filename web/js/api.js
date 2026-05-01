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

// Plant key persistence — the tab strip selection survives navigation.
const PLANT_KEY = 'otsniff_plant_key';
export function getPlantKey() { return localStorage.getItem(PLANT_KEY) || 'energy'; }
export function setPlantKey(k) { localStorage.setItem(PLANT_KEY, k); }

const q = (path) => {
  const k = getPlantKey();
  return path + (path.includes('?') ? '&' : '?') + 'plant=' + encodeURIComponent(k);
};

export const api = {
  simulateBlastRadius: (payload) =>
    callJson(q('/api/simulate/blast-radius'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  topScenarios:   () => callJson('/api/simulate/top-scenarios'),
  prebuiltScenarios: () => callJson('/api/scenarios/prebuilt'),
  assetPaths:     (assetId) => callJson(`/api/assets/${encodeURIComponent(assetId)}/paths`),
  assetRisk:      (assetId) => callJson(`/api/assets/${encodeURIComponent(assetId)}/risk`),
  attackPaths:    (assetId, opts = {}) => {
    const params = new URLSearchParams();
    if (opts.direction) params.set('direction', opts.direction);
    if (opts.from) params.set('from', opts.from);
    const qs = params.toString();
    const path = `/api/assets/${encodeURIComponent(assetId)}/attack-paths${qs ? '?' + qs : ''}`;
    return callJson(q(path));
  },
  evidence:       (assetId) => callJson(`/api/evidence/${encodeURIComponent(assetId)}`),
  assets:         () => callJson(q('/api/assets')),
  graph:          () => callJson(q('/api/graph')),
  posture:        () => callJson(q('/api/posture')),
  plants:         () => callJson('/api/plants'),
  deletePlant:    (key) => callJson(`/api/onboarding/plant/${encodeURIComponent(key)}`, { method: 'DELETE' }),
};
