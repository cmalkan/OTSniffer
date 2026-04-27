// Plant-tab strip — renders into [data-plant-tabs] container, persists
// selection via localStorage, reloads the page on change so all data
// re-fetches under the new plant key.
import { api, getPlantKey, setPlantKey } from '/js/api.js';

export async function renderPlantTabs(container) {
  if (!container) return;
  let plants;
  try {
    const r = await api.plants();
    plants = r.plants || [];
  } catch {
    container.style.display = 'none';
    return;
  }
  const current = getPlantKey();
  container.classList.add('plant-tabs');
  container.setAttribute('role', 'tablist');
  container.setAttribute('aria-label', 'Plant use case');
  container.innerHTML = plants.map(p => `
    <button class="plant-tab ${p.key === current ? 'is-active' : ''}"
            data-plant-key="${p.key}"
            ${p.available ? '' : 'disabled'}
            role="tab"
            aria-selected="${p.key === current ? 'true' : 'false'}">
      ${escapeHtml(p.label)}<span class="sector-tag">${escapeHtml(p.sector)}</span>
    </button>
  `).join('');
  container.querySelectorAll('.plant-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.plantKey;
      if (!k || k === getPlantKey()) return;
      setPlantKey(k);
      location.reload();
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));
}
