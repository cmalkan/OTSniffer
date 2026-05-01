// Plant selector — dropdown variant. Persists selection via localStorage,
// reloads the page on change. Keeps the same renderPlantTabs() export name
// so existing import sites don't need to change.
import { api, getPlantKey, setPlantKey } from '/js/api.js';

const BUILTIN_KEYS = new Set(['energy', 'water']);

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
  container.classList.add('plant-selector');
  container.innerHTML = `
    <label class="plant-selector-label" for="plantSelect">Plant</label>
    <div class="plant-selector-row">
      <select id="plantSelect" class="plant-select" aria-label="Plant use case">
        ${plants.map(p => `
          <option value="${escapeHtml(p.key)}" ${p.key === current ? 'selected' : ''} ${p.available ? '' : 'disabled'}>
            ${escapeHtml(p.label)} · ${escapeHtml(p.sector)}${p.available ? '' : ' (missing)'}
          </option>
        `).join('')}
      </select>
      <button type="button" class="plant-selector-delete" id="plantDeleteBtn" title="Delete the selected plant" aria-label="Delete selected plant">Delete</button>
    </div>
  `;
  const select = container.querySelector('#plantSelect');
  const deleteBtn = container.querySelector('#plantDeleteBtn');

  const refreshDeleteState = () => {
    const k = select.value;
    const isBuiltin = BUILTIN_KEYS.has(k);
    deleteBtn.disabled = isBuiltin;
    deleteBtn.title = isBuiltin
      ? 'Built-in plant — cannot be deleted'
      : 'Delete the selected plant';
  };
  refreshDeleteState();

  select.addEventListener('change', () => {
    refreshDeleteState();
    const k = select.value;
    if (!k || k === getPlantKey()) return;
    setPlantKey(k);
    location.reload();
  });
  deleteBtn.addEventListener('click', () => {
    const k = select.value;
    if (BUILTIN_KEYS.has(k)) return;
    const opt = select.options[select.selectedIndex];
    deletePlant(k, opt ? opt.textContent.trim() : k);
  });
}

async function deletePlant(key, label) {
  const proceed = confirm(
    `Delete plant "${label}"?\n\n` +
    `This removes:\n` +
    `  · data/plant-${key}-demo.json\n` +
    `  · data/plant-${key}-enriched.json\n` +
    `  · data/uploads/${key}/ (any uploaded drawings)\n\n` +
    `This cannot be undone.`
  );
  if (!proceed) return;
  try {
    const r = await api.deletePlant(key);
    if (!r.ok) throw new Error(r.error || 'delete failed');
    // If we just deleted the active plant, switch back to energy.
    if (getPlantKey() === key) setPlantKey('energy');
    location.reload();
  } catch (err) {
    alert(`Delete failed: ${err.message}`);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));
}
