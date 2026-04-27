// Onboarding — build a plant fixture from a customer BOM, with browser-side
// parsing of CSV / DOCX / PDF files. Customer data stays in the browser
// until the explicit Save click; the server only receives the structured
// JSON the operator confirmed.

import { setPlantKey } from '/js/api.js';

const $ = (id) => document.getElementById(id);
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));

// State
const state = {
  bom:   [],   // array of asset objects
  zones: [],
  conn:  [],
  drawings: [], // { url, name, size, content_type }
};

const ASSET_FIELDS  = ['asset_id', 'name', 'asset_type', 'vendor', 'model', 'firmware_version', 'ip_address', 'zone_id', 'criticality_score', 'process_tag'];
const ZONE_FIELDS   = ['zone_id', 'name', 'level', 'description'];
const CONN_FIELDS   = ['source_asset_id', 'target_asset_id', 'protocol', 'port', 'trust_level', 'allowed_direction'];
const ASSET_TYPES   = ['scada-server', 'historian', 'hmi', 'engineering-workstation', 'plc', 'safety-controller', 'rtu', 'firewall', 'switch'];
const TRUST_LEVELS  = ['high', 'medium', 'low'];
const DIRECTIONS    = ['bi', 'uni'];

// Auto-mapping aliases for column headers (case + punctuation insensitive).
// Maps any normalized header string to its canonical asset field.
const HEADER_ALIASES = {
  asset_id:          ['assetid', 'id', 'tag', 'tagname', 'asset', 'assetname', 'identifier'],
  name:              ['name', 'description', 'desc', 'label', 'asset_description', 'assetdescription', 'friendly', 'friendlyname'],
  asset_type:        ['type', 'asset_type', 'assettype', 'category', 'class', 'kind'],
  vendor:            ['vendor', 'manufacturer', 'make', 'mfr', 'oem'],
  model:             ['model', 'modelnumber', 'modelno', 'partnumber', 'partno', 'product', 'productname', 'pn'],
  firmware_version:  ['firmware', 'firmwareversion', 'version', 'fw', 'rev', 'revision', 'fwversion'],
  ip_address:        ['ip', 'ipaddress', 'address', 'ipaddr'],
  zone_id:           ['zone', 'zoneid', 'subnet', 'network', 'vlan', 'segment'],
  criticality_score: ['criticality', 'crit', 'priority', 'importance', 'criticalityscore', 'risk'],
  process_tag:       ['process', 'processtag', 'function', 'role', 'service'],
};

// ── init ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  bindIdentity();
  bindBOMUploader();
  bindBOMToolbar();
  bindZoneToolbar();
  bindConnToolbar();
  bindDrawingUploader();
  bindSave();
  // Seed one empty row in each table so the form looks alive
  addBOMRow(); renderBOM();
  addZoneRow(); renderZones();
  addConnRow(); renderConn();
});

// ── plant identity ──────────────────────────────────────────────────────

function bindIdentity() {
  const nameEl = $('plantName');
  const idEl = $('plantId');
  const keyEl = $('plantKey');
  nameEl.addEventListener('input', () => {
    const slug = slugify(nameEl.value);
    if (!idEl.dataset.touched) idEl.value = slug ? `plant-${slug.split('-')[0]}` : '';
    if (!keyEl.dataset.touched) keyEl.value = slug.split('-')[0] || '';
  });
  idEl.addEventListener('input', () => idEl.dataset.touched = '1');
  keyEl.addEventListener('input', () => keyEl.dataset.touched = '1');
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── BOM table ───────────────────────────────────────────────────────────

function bindBOMToolbar() {
  $('bomAddRow').addEventListener('click', () => { addBOMRow(); renderBOM(); });
  $('bomClear').addEventListener('click',   () => { state.bom = []; renderBOM(); });
  $('bomLoadSample').addEventListener('click', () => {
    state.bom = sampleBOM();
    state.zones = sampleZones();
    state.conn = sampleConn();
    if (!$('plantName').value) {
      $('plantName').value = 'Riverside Regional Water Utility';
      $('plantName').dispatchEvent(new Event('input'));
    }
    renderBOM(); renderZones(); renderConn();
    setStatus('bomStatus', `Loaded sample BOM: ${state.bom.length} assets, ${state.zones.length} zones, ${state.conn.length} conduits.`, false);
  });
}

function addBOMRow(initial = {}) {
  state.bom.push({
    asset_id: '', name: '', asset_type: 'plc',
    vendor: '', model: '', firmware_version: '',
    ip_address: '', zone_id: '', criticality_score: 5, process_tag: '',
    ...initial,
  });
}

function renderBOM() {
  const tbody = $('bomBody');
  tbody.innerHTML = state.bom.map((row, i) => `
    <tr data-i="${i}">
      <td><input data-f="asset_id" value="${escape(row.asset_id)}" placeholder="a_plc_01"></td>
      <td><input data-f="name" value="${escape(row.name)}" placeholder="Treatment PLC"></td>
      <td>
        <select data-f="asset_type">
          ${ASSET_TYPES.map(t => `<option value="${t}" ${t === row.asset_type ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td><input data-f="vendor" value="${escape(row.vendor)}" placeholder="Rockwell Automation"></td>
      <td><input data-f="model" value="${escape(row.model)}" placeholder="ControlLogix 1756-L75"></td>
      <td><input data-f="firmware_version" value="${escape(row.firmware_version)}" placeholder="33.011"></td>
      <td><input data-f="ip_address" value="${escape(row.ip_address)}" placeholder="10.40.1.11"></td>
      <td><input data-f="zone_id" value="${escape(row.zone_id)}" placeholder="z_process"></td>
      <td><input data-f="criticality_score" type="number" min="1" max="10" value="${row.criticality_score}"></td>
      <td><input data-f="process_tag" value="${escape(row.process_tag)}" placeholder="filtration_control"></td>
      <td class="row-action"><button title="remove" data-action="rm">×</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const i = Number(tr.dataset.i);
    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => {
        const f = el.dataset.f;
        let v = el.value;
        if (f === 'criticality_score') v = Number(v) || 0;
        state.bom[i][f] = v;
      });
    });
    tr.querySelector('[data-action="rm"]').addEventListener('click', () => {
      state.bom.splice(i, 1);
      renderBOM();
    });
  });
  $('bomMeta').textContent = `${state.bom.length} asset${state.bom.length === 1 ? '' : 's'}`;
}

// ── zone table ──────────────────────────────────────────────────────────

function bindZoneToolbar() {
  $('zoneAddRow').addEventListener('click', () => { addZoneRow(); renderZones(); });
}

function addZoneRow(initial = {}) {
  state.zones.push({ zone_id: '', name: '', level: 'L2', description: '', ...initial });
}

function renderZones() {
  const tbody = $('zoneBody');
  tbody.innerHTML = state.zones.map((row, i) => `
    <tr data-i="${i}">
      <td><input data-f="zone_id" value="${escape(row.zone_id)}" placeholder="z_process"></td>
      <td><input data-f="name" value="${escape(row.name)}" placeholder="Process Control"></td>
      <td>
        <select data-f="level">
          ${['L0','L1','L2','L3','L3.5','L4'].map(l => `<option ${l === row.level ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </td>
      <td><input data-f="description" value="${escape(row.description)}" placeholder="PLCs and safety controllers"></td>
      <td class="row-action"><button title="remove" data-action="rm">×</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const i = Number(tr.dataset.i);
    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => { state.zones[i][el.dataset.f] = el.value; });
    });
    tr.querySelector('[data-action="rm"]').addEventListener('click', () => {
      state.zones.splice(i, 1);
      renderZones();
    });
  });
  $('zoneMeta').textContent = `${state.zones.length} zone${state.zones.length === 1 ? '' : 's'}`;
}

// ── connectivity table ──────────────────────────────────────────────────

function bindConnToolbar() {
  $('connAddRow').addEventListener('click', () => { addConnRow(); renderConn(); });
}

function addConnRow(initial = {}) {
  state.conn.push({
    source_asset_id: '', target_asset_id: '',
    protocol: 'ethernet-ip', port: 44818,
    trust_level: 'high', allowed_direction: 'bi',
    ...initial,
  });
}

function renderConn() {
  const tbody = $('connBody');
  const protoOptions = ['opc-ua','modbus-tcp','ethernet-ip','s7','dnp3','profinet','https','http','tcp'];
  tbody.innerHTML = state.conn.map((row, i) => `
    <tr data-i="${i}">
      <td><input data-f="source_asset_id" value="${escape(row.source_asset_id)}"></td>
      <td><input data-f="target_asset_id" value="${escape(row.target_asset_id)}"></td>
      <td>
        <select data-f="protocol">
          ${protoOptions.map(p => `<option value="${p}" ${p === row.protocol ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </td>
      <td><input data-f="port" type="number" value="${row.port}"></td>
      <td>
        <select data-f="trust_level">
          ${TRUST_LEVELS.map(t => `<option value="${t}" ${t === row.trust_level ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td>
        <select data-f="allowed_direction">
          ${DIRECTIONS.map(d => `<option value="${d}" ${d === row.allowed_direction ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </td>
      <td class="row-action"><button title="remove" data-action="rm">×</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const i = Number(tr.dataset.i);
    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => {
        let v = el.value;
        if (el.dataset.f === 'port') v = Number(v) || 0;
        state.conn[i][el.dataset.f] = v;
      });
    });
    tr.querySelector('[data-action="rm"]').addEventListener('click', () => {
      state.conn.splice(i, 1);
      renderConn();
    });
  });
  $('connMeta').textContent = `${state.conn.length} conduit${state.conn.length === 1 ? '' : 's'}`;
}

// ── BOM file uploader (CSV / DOCX / PDF) ────────────────────────────────

function bindBOMUploader() {
  const drop = $('bomDrop');
  const input = $('bomFile');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.[0]) handleBOMFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files?.[0]) handleBOMFile(input.files[0]); });
}

async function handleBOMFile(file) {
  setStatus('bomStatus', `Parsing ${file.name} (${(file.size/1024).toFixed(1)} KB)…`, false);
  try {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let rows = [];
    if (ext === 'csv' || ext === 'txt') {
      rows = parseCSV(await file.text());
    } else if (ext === 'docx') {
      rows = await parseDOCX(file);
    } else if (ext === 'pdf') {
      rows = await parsePDF(file);
    } else {
      throw new Error(`Unsupported file type .${ext}. Use .csv, .docx, or .pdf.`);
    }
    if (!rows.length) throw new Error('No table rows extracted. Check the file or paste a CSV manually.');
    const mapped = mapRowsToAssets(rows);
    state.bom = mapped.assets;
    renderBOM();
    setStatus('bomStatus',
      `Extracted ${mapped.assets.length} rows from ${file.name}. Mapped columns: ${mapped.mappedColumns.join(', ') || 'none'}. Review and correct any wrong values.`,
      false);
  } catch (err) {
    setStatus('bomStatus', `Failed to parse ${file.name}: ${err.message}`, true);
  }
}

// CSV — handles double-quoted fields with embedded commas. Returns array of
// arrays; the first row is treated as headers downstream.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuote = false;
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

// DOCX — mammoth converts the document to HTML, then we walk the tables.
async function parseDOCX(file) {
  if (typeof mammoth === 'undefined') throw new Error('mammoth.js failed to load from CDN');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const doc = new DOMParser().parseFromString(result.value, 'text/html');
  // Pick the largest table, on the assumption the BOM is the dominant table
  const tables = [...doc.querySelectorAll('table')];
  if (!tables.length) throw new Error('No tables found in document');
  tables.sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length);
  const bestTable = tables[0];
  const rows = [...bestTable.querySelectorAll('tr')].map(tr =>
    [...tr.querySelectorAll('th, td')].map(td => td.textContent.replace(/\s+/g, ' ').trim())
  );
  return rows.filter(r => r.some(cell => cell.length > 0));
}

// PDF — pdf.js gives positioned text per page. Group by line via y-coordinate
// proximity, then split each line on tab/multiple-space gaps to get columns.
// Heuristic and imperfect. Tells the user when it falls back.
async function parsePDF(file) {
  if (!window.pdfjsLib) {
    await loadPDFjs();
  }
  const pdfjsLib = window.pdfjsLib;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    // Group items on the same y-coord (within 2pt) into lines
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    let currentY = null, line = [];
    for (const it of items) {
      if (currentY === null || Math.abs(it.y - currentY) > 2.5) {
        if (line.length) allLines.push(line);
        line = [it];
        currentY = it.y;
      } else {
        line.push(it);
      }
    }
    if (line.length) allLines.push(line);
  }
  // Convert each line into columns by detecting gaps between items
  const rows = allLines.map(items => {
    items.sort((a, b) => a.x - b.x);
    const cols = [];
    let cur = items[0]?.str || '';
    for (let i = 1; i < items.length; i++) {
      const prev = items[i-1];
      const it = items[i];
      const gap = it.x - (prev.x + prev.str.length * 5);  // rough char-width estimate
      if (gap > 14) { cols.push(cur.trim()); cur = it.str; }
      else cur += (cur && !cur.endsWith(' ') ? ' ' : '') + it.str;
    }
    cols.push(cur.trim());
    return cols;
  });
  return rows.filter(r => r.some(c => c.length > 0));
}

async function loadPDFjs() {
  // Lazy-load pdf.js from CDN. Worker URL must be set explicitly.
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs';
    s.type = 'module';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
    document.head.appendChild(s);
  });
  // pdf.js exposes pdfjsLib on globalThis when loaded as ES module via this CDN
  // Wait briefly for it to register
  for (let i = 0; i < 30 && !window.pdfjsLib; i++) await new Promise(r => setTimeout(r, 100));
  if (!window.pdfjsLib) throw new Error('pdf.js loaded but pdfjsLib global not found');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
}

// Auto-map raw rows (first row = headers) to asset objects.
function mapRowsToAssets(rows) {
  if (rows.length < 2) {
    // Single row — treat all as one asset, unmapped
    const single = { asset_id: '', name: rows[0]?.join(' ') || '', vendor: '', model: '', firmware_version: '', ip_address: '', zone_id: '', criticality_score: 5, process_tag: '', asset_type: 'plc' };
    return { assets: [single], mappedColumns: [] };
  }
  const headers = rows[0].map(h => normalizeHeader(h));
  const colMap = {};   // assetField -> headerIndex
  const mappedColumns = [];
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      if (aliases.includes(headers[i])) {
        if (colMap[field] === undefined) {
          colMap[field] = i;
          mappedColumns.push(`${rows[0][i]} → ${field}`);
          break;
        }
      }
    }
  }
  const assets = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const a = {
      asset_id: '', name: '', asset_type: 'plc',
      vendor: '', model: '', firmware_version: '',
      ip_address: '', zone_id: '', criticality_score: 5, process_tag: '',
    };
    for (const [field, idx] of Object.entries(colMap)) {
      let v = row[idx] ?? '';
      if (field === 'criticality_score') v = Math.max(1, Math.min(10, Number(v) || 5));
      a[field] = v;
    }
    if (!a.asset_id) a.asset_id = `a_${slugify(a.name || a.vendor || `asset_${r}`).slice(0, 24)}`;
    if (!a.name && a.vendor && a.model) a.name = `${a.vendor} ${a.model}`;
    assets.push(a);
  }
  return { assets, mappedColumns };
}

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── drawing uploader ────────────────────────────────────────────────────

function bindDrawingUploader() {
  const drop = $('drawingDrop');
  const input = $('drawingFile');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.[0]) handleDrawing(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files?.[0]) handleDrawing(input.files[0]); });
}

async function handleDrawing(file) {
  const key = $('plantKey').value.trim() || slugify($('plantName').value).split('-')[0] || 'draft';
  setStatus('drawingStatus', `Uploading ${file.name} for plant key "${key}"…`, false);
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error('Drawing exceeds 25 MB cap.');
    const buf = await file.arrayBuffer();
    const b64 = bytesToBase64(new Uint8Array(buf));
    const res = await fetch('/api/onboarding/drawing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plant_key: key, filename: file.name, content_type: file.type, content_base64: b64 }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    state.drawings.push({ url: json.url, name: file.name, size: json.bytes, content_type: json.content_type });
    renderDrawings();
    setStatus('drawingStatus', `Uploaded ${file.name} → ${json.url}`, false);
  } catch (err) {
    setStatus('drawingStatus', `Upload failed: ${err.message}`, true);
  }
}

function renderDrawings() {
  const list = $('drawingList');
  if (!state.drawings.length) { list.innerHTML = ''; return; }
  list.innerHTML = state.drawings.map(d => {
    const isImage = (d.content_type || '').startsWith('image/') || /\.(png|jpe?g|svg)$/i.test(d.name);
    return `
    <div class="ob-attach">
      <div class="thumb">${isImage ? `<img src="${escape(d.url)}" alt="${escape(d.name)}" />` : 'PDF'}</div>
      <div class="name">${escape(d.name)}<div class="size">${(d.size/1024).toFixed(1)} KB · <a href="${escape(d.url)}" target="_blank" rel="noopener">open</a></div></div>
      <div></div>
    </div>`;
  }).join('');
}

function bytesToBase64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

// ── save ────────────────────────────────────────────────────────────────

function bindSave() {
  $('saveBtn').addEventListener('click', save);
  $('downloadBtn').addEventListener('click', () => {
    const json = JSON.stringify(buildPlant(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${$('plantId').value || 'plant'}.json`;
    a.click();
  });
  $('previewBtn').addEventListener('click', () => {
    const box = $('previewBox');
    if (box.style.display === 'none') {
      box.textContent = JSON.stringify(buildPlant(), null, 2);
      box.style.display = 'block';
      $('previewBtn').textContent = 'hide preview';
    } else {
      box.style.display = 'none';
      $('previewBtn').textContent = 'Preview JSON';
    }
  });
}

function buildPlant() {
  return {
    plant_id:   $('plantId').value.trim() || `plant-${slugify($('plantName').value).split('-')[0] || 'draft'}`,
    plant_name: $('plantName').value.trim() || 'Untitled Plant',
    sector:     $('plantSector').value,
    onboarding_key: $('plantKey').value.trim() || slugify($('plantName').value).split('-')[0] || 'draft',
    zones:      state.zones.filter(z => z.zone_id).map(z => ({ ...z })),
    assets:     state.bom.filter(a => a.asset_id).map(a => ({
                  ...a,
                  criticality_score: Number(a.criticality_score) || 0,
                })),
    connectivity: state.conn.filter(c => c.source_asset_id && c.target_asset_id).map(c => ({
                  ...c, port: Number(c.port) || 0,
                })),
    process_functions: [],
    demo_scenarios: [],
    onboarding_meta: {
      saved_at: new Date().toISOString(),
      drawings: state.drawings.map(d => ({ name: d.name, url: d.url, size: d.size })),
    },
  };
}

async function save() {
  const plant = buildPlant();
  if (!plant.plant_name || plant.plant_name === 'Untitled Plant') {
    setStatus('saveStatus', 'Plant name is required.', true);
    return;
  }
  if (plant.assets.length === 0) {
    setStatus('saveStatus', 'At least one asset is required.', true);
    return;
  }
  setStatus('saveStatus', `Saving plant fixture (${plant.assets.length} assets, ${plant.zones.length} zones, ${plant.connectivity.length} conduits)…`, false);
  try {
    const res = await fetch('/api/onboarding/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(plant),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    setStatus('saveStatus',
      `Saved! Plant key "${json.key}" with ${json.assets} assets. Wrote ${json.paths.demo} and ${json.paths.enriched}. Switching to that plant…`,
      false);
    setPlantKey(json.key);
    setTimeout(() => { location.href = '/index.html'; }, 1200);
  } catch (err) {
    setStatus('saveStatus', `Save failed: ${err.message}`, true);
  }
}

// ── status helper ───────────────────────────────────────────────────────

function setStatus(id, msg, isError) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
  el.classList.toggle('is-error', !!isError);
}

// ── samples (from the existing energy/water fixtures, simplified) ───────

function sampleBOM() {
  return [
    { asset_id: 'a_scada_01', name: 'SCADA Primary',                 asset_type: 'scada-server',         vendor: 'AVEVA',           model: 'System Platform',     firmware_version: '2023 R2', ip_address: '10.40.3.10', zone_id: 'z_ops',       criticality_score: 9,  process_tag: 'plant_dispatch' },
    { asset_id: 'a_hist_01',  name: 'Plant Historian',               asset_type: 'historian',            vendor: 'AVEVA',           model: 'Historian',           firmware_version: '2023.2',  ip_address: '10.40.3.20', zone_id: 'z_ops',       criticality_score: 8,  process_tag: 'compliance_data' },
    { asset_id: 'a_hmi_01',   name: 'Operator HMI',                  asset_type: 'hmi',                  vendor: 'Rockwell',        model: 'FactoryTalk View SE', firmware_version: '13.0',    ip_address: '10.40.2.15', zone_id: 'z_treatment', criticality_score: 9,  process_tag: 'treatment_operator' },
    { asset_id: 'a_eng_01',   name: 'Engineering Workstation',       asset_type: 'engineering-workstation', vendor: 'Rockwell',     model: 'Studio 5000',         firmware_version: '35.00',   ip_address: '10.40.2.30', zone_id: 'z_treatment', criticality_score: 7,  process_tag: 'logic_changes' },
    { asset_id: 'a_plc_01',   name: 'Treatment PLC',                 asset_type: 'plc',                  vendor: 'Allen-Bradley',   model: 'ControlLogix 1756-L75', firmware_version: '33.011', ip_address: '10.40.1.11', zone_id: 'z_process',   criticality_score: 10, process_tag: 'filtration_dosing_control' },
    { asset_id: 'a_sis_01',   name: 'Chemical-Dosing Safety Controller', asset_type: 'safety-controller', vendor: 'Allen-Bradley',  model: 'GuardLogix 5580',     firmware_version: '33.011',  ip_address: '10.40.1.50', zone_id: 'z_process',   criticality_score: 10, process_tag: 'chlorine_residual_safety' },
    { asset_id: 'a_rtu_01',   name: 'Lift Station 7 RTU',            asset_type: 'rtu',                  vendor: 'Schneider',       model: 'SCADAPack 350E',      firmware_version: '8.16',    ip_address: '10.40.5.71', zone_id: 'z_field',     criticality_score: 7,  process_tag: 'sewer_lift_station' },
  ];
}
function sampleZones() {
  return [
    { zone_id: 'z_dmz',       name: 'OT DMZ',                  level: 'L3.5', description: 'Jump server, historian replication, vendor remote access' },
    { zone_id: 'z_ops',       name: 'Control Center',          level: 'L3',   description: 'Primary SCADA and historian' },
    { zone_id: 'z_treatment', name: 'Treatment Plant Floor',   level: 'L2',   description: 'Operator HMI and engineering workstation' },
    { zone_id: 'z_process',   name: 'Process Control',         level: 'L1',   description: 'Treatment PLC and chemical-dosing safety controller' },
    { zone_id: 'z_field',     name: 'Distribution Field',      level: 'L1',   description: 'Lift-station RTUs reaching back via cellular VPN' },
  ];
}
function sampleConn() {
  return [
    { source_asset_id: 'a_scada_01', target_asset_id: 'a_hmi_01',  protocol: 'opc-ua',      port: 4840,  trust_level: 'high',   allowed_direction: 'bi' },
    { source_asset_id: 'a_hmi_01',   target_asset_id: 'a_plc_01',  protocol: 'ethernet-ip', port: 44818, trust_level: 'high',   allowed_direction: 'bi' },
    { source_asset_id: 'a_eng_01',   target_asset_id: 'a_plc_01',  protocol: 'ethernet-ip', port: 44818, trust_level: 'medium', allowed_direction: 'bi' },
    { source_asset_id: 'a_plc_01',   target_asset_id: 'a_sis_01',  protocol: 'ethernet-ip', port: 44818, trust_level: 'medium', allowed_direction: 'uni' },
    { source_asset_id: 'a_hist_01',  target_asset_id: 'a_scada_01',protocol: 'https',       port: 443,   trust_level: 'high',   allowed_direction: 'uni' },
    { source_asset_id: 'a_scada_01', target_asset_id: 'a_rtu_01',  protocol: 'dnp3',        port: 20000, trust_level: 'medium', allowed_direction: 'bi' },
  ];
}
