export function severityBadge(label) {
  const normalized = String(label || 'low').toLowerCase();
  const cls = normalized === 'critical' ? 'badge-critical' : normalized === 'high' ? 'badge-high' : normalized === 'moderate' ? 'badge-moderate' : 'badge-low';
  return `<span class="badge ${cls}">${normalized}</span>`;
}

export function setTabs(root = document) {
  root.querySelectorAll('[data-tabs]').forEach((container) => {
    const tabs = container.querySelectorAll('[data-tab]');
    const panels = container.querySelectorAll('[data-panel]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const key = tab.dataset.tab;
        panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== key));
      });
    });
  });
}

export function fillTableBody(tbody, rows) {
  tbody.innerHTML = '';
  rows.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c) => {
      const td = document.createElement('td');
      td.innerHTML = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
